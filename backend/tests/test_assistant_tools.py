"""Tests for expanded function calling and assistant tools integration."""

import asyncio
import json
import httpx
import pytest

from app.assistant import service
from app.assistant.schemas import ChatRequest
from tests.test_agent_charts import REFERENCE, run_agent


def test_agent_tool_soil_analysis(monkeypatch):
    count = 0
    def provider(outgoing):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(
                200,
                json={
                    "status": "requires_action",
                    "steps": [
                        {"type": "function_call", "id": "soil_1", "name": "get_soil_analysis", "arguments": {}}
                    ],
                },
            )
        payload = json.loads(outgoing.content)
        result_text = payload["input"][-1]["result"][0]["text"]
        soil_data = json.loads(result_text)
        assert "ph_h2o" in soil_data or "error" in soil_data
        return httpx.Response(
            200,
            json={
                "status": "requires_action",
                "steps": [
                    {
                        "type": "function_call",
                        "id": "done_1",
                        "name": "respond_to_user",
                        "arguments": {"message": "I inspected your soil properties from SoilGrids."},
                    }
                ],
            },
        )

    response = run_agent(monkeypatch, provider)
    assert "SoilGrids" in response.tool_steps[0]
    assert response.message == "I inspected your soil properties from SoilGrids."


def test_agent_tool_crop_candidates(monkeypatch):
    count = 0
    def provider(outgoing):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(
                200,
                json={
                    "status": "requires_action",
                    "steps": [
                        {"type": "function_call", "id": "crop_cand_1", "name": "get_crop_candidates", "arguments": {"water_regime": "rainfed"}}
                    ],
                },
            )
        payload = json.loads(outgoing.content)
        result_text = payload["input"][-1]["result"][0]["text"]
        data = json.loads(result_text)
        assert "candidates" in data
        assert len(data["candidates"]) > 0
        return httpx.Response(
            200,
            json={
                "status": "requires_action",
                "steps": [
                    {
                        "type": "function_call",
                        "id": "done_2",
                        "name": "respond_to_user",
                        "arguments": {"message": "Here are the top candidate crops tailored to your field's climate and soil."},
                    }
                ],
            },
        )

    response = run_agent(monkeypatch, provider)
    assert any("candidate" in step.lower() for step in response.tool_steps)


def test_agent_tool_rotation_evaluation(monkeypatch):
    count = 0
    def provider(outgoing):
        nonlocal count
        count += 1
        if count == 1:
            return httpx.Response(
                200,
                json={
                    "status": "requires_action",
                    "steps": [
                        {
                            "type": "function_call",
                            "id": "rot_eval_1",
                            "name": "evaluate_rotation",
                            "arguments": {"crops": ["potato", "potato", "maize"]},
                        }
                    ],
                },
            )
        payload = json.loads(outgoing.content)
        result_text = payload["input"][-1]["result"][0]["text"]
        data = json.loads(result_text)
        assert data["solanaceae_repetition"] is True
        assert data["pest_disease_risk_level"] == "critical"
        return httpx.Response(
            200,
            json={
                "status": "requires_action",
                "steps": [
                    {
                        "type": "function_call",
                        "id": "done_3",
                        "name": "respond_to_user",
                        "arguments": {"message": "Your sequence has consecutive potato planting, which severely increases late blight and nematode risks."},
                    }
                ],
            },
        )

    response = run_agent(monkeypatch, provider)
    assert any("potato" in step.lower() for step in response.tool_steps)
