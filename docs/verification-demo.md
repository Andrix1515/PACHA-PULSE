# Verification record - team rabbit and chart agent (2026-11-14)

## Actual executed results

| Check | Result |
| --- | --- |
| `.venv/Scripts/python.exe -m pytest -q` from backend | 68 passed in 1.33 seconds |
| Frontend `npm run build` | TypeScript and production Vite build passed |
| Full Playwright run on free ports 5175/8002 | 42 passed, 4 intentionally skipped duplicate geometry cases, 50.2 seconds |
| Automated axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks | Passed on tested current desktop/mobile views, including Charts and agent receipt |
| Real restarted local proxy, port 5173 to API 8000 | Health/status HTTP 200; deterministic saved-source weekly chart HTTP 200, five groups totalling 60.64 mm |
| Live Gemini | Not executed; actual status configured=false |
| Cloud build/deployment | Not executed |

## New behavior covered

Polygon tests click/tap the first marker after three points, inspect the saved ring to verify three unique corners plus its required closing coordinate, and close with Enter. They also verify that a crossed ring fails without replacing saved data and that clicking the first point before three corners does not close or create a duplicate. Existing map tap, coordinate, geometry, import/export, persistence, undo and role tests remain in the passing suite. The first test run exposed immutable Leaflet marker title options and missing explicit key activation; both were fixed before the passing run.

Manual chart tests use the authentic saved Mantaro January 2025 source through the actual FastAPI chart endpoint. Daily temperature preserves the first 8.76 degree C observation. Weekly rainfall produces 22.95, 18.33, 8.83, 7.81 and 2.72 mm in consecutive groups (last group has three days), totalling 60.64 mm. Rotation counts are recomputed from sequences. Tests check typed missing-data errors, rejected arbitrary model values/unsupported options, missing-rain null groups, partial temperature means, accessible tables, CSV download, source-preserving snapshots after location changes and chart inclusion in report JSON.

Agent tests use synthetic Gemini HTTP responses with authentic local data tools. They verify inspect -> create chart -> final response across three bounded turns, exact stateless step/signature continuation, private reasoning exclusion from UI, terminal typed response, allowlisted dispatch, unknown-tool rejection, step limits, no fake chart without evidence and retention of a valid chart when the final provider request fails. These tests do not establish a live Gemini connection.

Browser agent tests mock only the conversation envelope; the attached chart artifact is calculated by the real backend. They verify ready-chart receipts, completed tool labels, the team's rabbit skin and opening the created chart in Charts. Existing profile proposals still require explicit confirmation. Reduced-motion and pause behavior, keyboard focus/close, 320px reflow and field/profile preservation remain covered. CSV text cells are quoted and protected against spreadsheet formulas.

Current screenshots: `pacha-agent-rabbit-desktop.png`, `pacha-agent-rabbit-mobile.png`, `pacha-charts-desktop.png`, `pacha-charts-mobile.png`, plus refreshed landing, overview, field, climate and guide images under `docs/evidence`. Desktop agent skin and mobile Charts were visually inspected. Full-page captures can show sticky UI at the scroll position used by the test; this is not a fixed page-content position.

## Scientific and execution boundaries

The authentic raw NASA record and its source hash are unchanged. No new NASA observations were invented or requested for these chart calculations. `power-integration.json` remains evidence of the earlier genuine live NASA request and cache check at 2026-11-14T21:53:51.145195+00:00; it was not rerun or relabelled as a new observation in this delivery.

Only saved/cached verified climate evidence and user-input structural sequences are charted. Missing live cloud cache can require reloading climate or using the labelled saved source. No satellite polygon aggregation, weather forecast, soil health, crop suitability or profitability is inferred.

The existing Vercel configuration is unchanged. Previous published-schema checks are historical configuration evidence, not a cloud deployment. The owner must configure Gemini privately, push and redeploy, verify real tool calling and test public/incognito jury access.
