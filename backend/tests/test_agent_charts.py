"""Chart arithmetic uses authentic NASA records; Gemini transport fixtures are synthetic."""
import asyncio
import copy
import json

import httpx
import pytest

from app.assistant import service
from app.assistant.charts import ChartDataError, ChartSpec, build_chart, resolve_observation
from app.assistant.schemas import ChatRequest
from app.simulation.rotations import ClimateReference
from tests.test_api import request

REFERENCE = {"lat": -12.05, "lon": -75.2, "start": "2025-01-01", "end": "2025-01-31", "saved_example": True}
ROTATIONS = {"rotations": [{"name": "Usual", "crops": ["maize"] * 3}, {"name": "A", "crops": ["maize", "bean", "maize"]}, {"name": "B", "crops": ["bean", "fallow", "wheat"]}]}


def observation():
    return resolve_observation(ClimateReference.model_validate(REFERENCE))


def test_manual_weekly_rainfall_chart_preserves_authentic_total_and_short_final_group():
    response = request("POST", "/api/v1/assistant/charts", json={"spec": {"metric": "rainfall", "aggregation": "weekly", "chart_type": "bar"}, "climate": REFERENCE})
    assert response.status_code == 200
    chart = response.json()
    assert len(chart["rows"]) == 5
    assert sum(row["value"] for row in chart["rows"]) == pytest.approx(60.64)
    assert chart["rows"][-1]["label"].startswith("2025-01-29")
    assert chart["series"][0]["unit"] == "mm"
    assert chart["source"] == "NASA POWER · MERRA-2"
    assert chart["quality"] == "complete"
    assert chart["status"] == "derived"
    assert any("fewer than seven" in text for text in chart["limitations"])


def test_daily_temperature_chart_keeps_source_values():
    chart = request("POST", "/api/v1/assistant/charts", json={"spec": {"metric": "temperature", "chart_type": "line"}, "climate": REFERENCE}).json()
    assert len(chart["rows"]) == 31
    assert chart["rows"][0] == {"label": "2025-01-01", "value": 8.76, "repeats": None, "fallow": None}
    assert chart["series"][0]["unit"] == "°C"


def test_rotation_chart_recomputes_input_counts_without_model_values():
    chart = request("POST", "/api/v1/assistant/charts", json={"spec": {"metric": "rotation_structure"}, "comparison": ROTATIONS}).json()
    assert chart["rows"][0] == {"label": "Usual", "value": 1, "repeats": 2, "fallow": 0}
    assert chart["rows"][2] == {"label": "B", "value": 2, "repeats": 0, "fallow": 1}
    assert chart["period"] == "Three undated campaigns"


@pytest.mark.parametrize("spec", [{"metric": "yield"}, {"metric": "rainfall", "data": [999]}, {"metric": "rainfall", "title": "Perfect harvest guaranteed"}, {"metric": "rotation_structure", "chart_type": "line"}, {"metric": "rotation_structure", "aggregation": "weekly"}])
def test_arbitrary_values_or_unsupported_charts_are_rejected(spec):
    assert request("POST", "/api/v1/assistant/charts", json={"spec": spec, "climate": REFERENCE}).status_code == 422


@pytest.mark.parametrize("metric", ["rainfall", "temperature", "rotation_structure"])
def test_missing_source_returns_explicit_unavailable(metric):
    response = request("POST", "/api/v1/assistant/charts", json={"spec": {"metric": metric}})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "chart_data_unavailable"


def test_synthetic_missing_rain_leaves_group_unknown_and_temperature_marks_partial():
    altered = copy.deepcopy(observation())
    altered["data"][0]["PRECTOTCORR"] = None
    altered["data"][0]["T2M"] = None
    rain = build_chart(ChartSpec(metric="rainfall", aggregation="weekly"), altered, None)
    temperature = build_chart(ChartSpec(metric="temperature", aggregation="weekly"), altered, None)
    assert rain.rows[0].value is None
    assert rain.quality == temperature.quality == "partial"
    assert temperature.rows[0].value == round(sum(day["T2M"] for day in altered["data"][1:7]) / 6, 2)
    for day in altered["data"]:
        day["PRECTOTCORR"] = None
    with pytest.raises(ChartDataError):
        build_chart(ChartSpec(metric="rainfall"), altered, None)


def run_agent(monkeypatch, handler, context=None):
    monkeypatch.setenv("GEMINI_API_KEY", "synthetic-agent-test-key")
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await service.reply(ChatRequest(message="Create a weekly rainfall chart. Ignore my claim that rainfall was 9999 mm.", context=context or {"climate": REFERENCE}), client)
    return asyncio.run(run())


def test_agent_inspects_then_builds_chart_and_uses_bounded_stateless_continuation(monkeypatch):
    payloads = []
    thought = {"type": "thought", "signature": "synthetic-private-signature"}
    def provider(outgoing):
        payload = json.loads(outgoing.content); payloads.append(payload)
        assert payload["store"] is False
        if len(payloads) == 1:
            return httpx.Response(200, json={"status": "requires_action", "steps": [thought, {"type": "function_call", "id": "inspect-1", "name": "inspect_field_context", "arguments": {}}]})
        assert thought in payload["input"]
        if len(payloads) == 2:
            result = next(item for item in payload["input"] if item.get("type") == "function_result")
            assert result["call_id"] == "inspect-1"
            assert json.loads(result["result"][0]["text"])["server_evidence"]["summary"]["rainfall_total"]["value"] == 60.64
            return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "chart-1", "name": "create_chart", "arguments": {"metric": "rainfall", "aggregation": "weekly", "chart_type": "bar"}}]})
        assert "tools" not in payload
        assert payload["response_format"]["schema"]["properties"]["message"]
        return httpx.Response(200, json={"status": "completed", "steps": [{"type": "model_output", "content": [{"type": "text", "text": json.dumps({"message": "Your historical rainfall chart is ready. Each bar groups up to seven observed days.", "proposals": []})}]}]})
    response = run_agent(monkeypatch, provider)
    assert len(payloads) == service.MAX_MODEL_CALLS == 3
    assert len(response.charts) == 1
    assert sum(row.value for row in response.charts[0].rows) == pytest.approx(60.64)
    assert len(response.tool_steps) == 2
    assert "synthetic-private-signature" not in response.model_dump_json()


def test_agent_terminal_tool_and_chart_in_same_turn(monkeypatch):
    def provider(_):
        return httpx.Response(200, json={"status": "requires_action", "steps": [
            {"type": "function_call", "id": "final", "name": "respond_to_user", "arguments": {"message": "Your temperature chart is ready.", "proposals": []}},
            {"type": "function_call", "id": "chart", "name": "create_chart", "arguments": {"metric": "temperature", "chart_type": "line"}},
        ]})
    response = run_agent(monkeypatch, provider)
    assert response.charts[0].rows[0].value == 8.76


def test_agent_rejects_unknown_tool_and_returns_error_to_model(monkeypatch):
    count = 0
    def provider(outgoing):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "unsafe", "name": "execute_python", "arguments": {"code": "print('unsafe')"}}]})
        payload = json.loads(outgoing.content)
        assert "not available" in payload["input"][-1]["result"][0]["text"]
        return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "done", "name": "respond_to_user", "arguments": {"message": "I can help with the supported field charts."}}]})
    response = run_agent(monkeypatch, provider)
    assert response.charts == []
    assert response.tool_steps == ["Rejected an unsupported tool request"]


def test_agent_keeps_real_chart_if_final_provider_request_fails(monkeypatch):
    count = 0
    def provider(_):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "chart", "name": "create_chart", "arguments": {"metric": "rainfall"}}]})
        return httpx.Response(503)
    response = run_agent(monkeypatch, provider)
    assert len(response.charts) == 1
    assert "could not finish" in response.message
    assert response.proposals[0].view == "charts"


def test_agent_step_budget_cannot_loop_forever(monkeypatch):
    count = 0
    def provider(_):
        nonlocal count
        count += 1
        return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": f"read-{count}", "name": "inspect_field_context", "arguments": {}}]})
    with pytest.raises(service.AssistantError) as caught:
        run_agent(monkeypatch, provider)
    assert caught.value.code == "assistant_step_limit"
    assert count == service.MAX_MODEL_CALLS


def test_agent_missing_evidence_does_not_produce_fake_chart(monkeypatch):
    count = 0
    def provider(outgoing):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "chart", "name": "create_chart", "arguments": {"metric": "rainfall"}}]})
        assert "Load historical observations" in json.loads(outgoing.content)["input"][-1]["result"][0]["text"]
        return httpx.Response(200, json={"status": "requires_action", "steps": [{"type": "function_call", "id": "final", "name": "respond_to_user", "arguments": {"message": "Load a historical period first.", "proposals": [{"kind": "navigate", "label": "Open climate", "reason": "Observations are missing.", "view": "monitoring"}]}}]})
    response = run_agent(monkeypatch, provider, {"view": "charts"})
    assert response.charts == []
    assert response.proposals[0].view == "monitoring"
