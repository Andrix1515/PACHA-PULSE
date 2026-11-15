# Pacha Pulse

A guided field journey for growers and agronomists: a searchable full-screen polygon map, an interactive illustrative 3D field, one-question field inputs, historical NASA POWER weather stories, three planting sequences and exportable charts. Pacha, the team's cream-and-green 3D companion, explains each step; optional Gemini tools add personalised interpretation and chart creation. All current application text and documentation are in English.

## Local integration branch

`integracion-visuales` combines remote main at `dd63dfa` with TetoFan at `12e640d`. It retains the guided visual experience and main's unchanged soil/terrain providers. **Check soil & terrain** queries one source at a time; **Explore crops** uses main's 21-crop catalogue, screening and comparison APIs. Rotation scenarios retain temperature, campaign month and hemisphere inputs. See [integration report](docs/MAIN_INTEGRATION.md). Nothing was pushed or deployed.

## Satellite history and offline adaptive models

Open **Understand the weather -> Satellite greenness** to read authentic MODIS observations, QA and a validated-model outlook when available. The Mantaro 2023?2025 archive has 69 composites. Models are experimental and exact-point only. **Sync NASA & update model** queues work for the separate offline worker; DEMO.cmd starts that worker and STOP_DEMO.cmd stops it with this folder's servers. Budget calculations use your own local harvest/cost/price assumptions. Grower screens show fewer items and larger text; technical evidence remains available to agronomists. See [implementation, commands and limits](docs/MODIS_ML_IMPLEMENTATION.md).

## Run locally on Windows

Requirements: Python 3.12 and Node.js 22.12 or later (Node 24 LTS is suitable).

```powershell
cd C:\Users\ANTONY\Documents\ANTONY\Farm_Project
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
cd frontend
npm ci
cd ..
.\DEMO.cmd
```

`DEMO.cmd` opens the guided role-selection scene. The project information page remains at `/#project`. The launcher chooses a free web/API port pair and prints the addresses; another copy of the project remains untouched. Use `STOP_DEMO.cmd` to stop only this folder's registered processes. The legacy launcher filename `Start-AgroShift.ps1` is retained for compatibility.

## Enable Gemini privately

Copy `backend/.env.example` to `backend/.env`, enter your own `GEMINI_API_KEY` in that local file, and restart the backend. Never put credentials in the frontend or commit `.env`. Default model: `gemini-3.5-flash-lite`; override using `GEMINI_MODEL` if your account requires another supported model. Obtain a key privately in [Google AI Studio](https://aistudio.google.com/api-keys).

The scene guide and optional six-step tour work without Gemini. The agent receives the active scene and question/lesson, explains that small task, inspects current evidence and prepares charts through allowlisted server tools. Try "Create a 7-day rainfall bar chart from my loaded observations." It can also propose navigation, profile updates or explicit coordinates. Chart values come from deterministic server calculations, never model-generated arrays. Each question is bounded to three model requests, five nonterminal tools, three charts and a 48-second agent deadline. You review proposed values and press **Confirm and apply** before forms change. Messages, recent conversation and current field context are sent to Google only when you send a question. `store:false` disables Interactions conversation storage; Google's account terms and processing policies still apply.

## Demo route

1. Open `/` or `/#demo`. Choose **I grow crops** or **I advise growers**.
2. Find the field on the full-screen map, use **Find my location**, or enter coordinates under **Field tools**. Search a country/region explicitly to move the camera; the result does not select a farm. Choose **Draw my field**, add three or more corners, then tap point 1 to close and save. Keyboard and explicit save controls remain available. **Explore in 3D** opens the saved shape with camera controls and illustrative stages. **Crop guide** groups published temperature references without approving or banning crops.
3. Continue to **About my field**. Answer one question at a time: name, crop, water. Unknown answers can stay unknown; optional soil/area/history inputs are under **Other details I know**.
4. **Understand the weather** reads a confirmed historical period. **Explore the Mantaro example** explicitly changes the query point to Mantaro. Rainfall, temperature and meaning appear as separate lessons with source metadata.
5. **Explore planting options** edits the usual sequence, alternative A and alternative B in turn, then compares a hypothetical rainfall scenario. Results show one option at a time; methods remain expandable.
6. Use the floating cloud **Menu** for **Make a chart**, **Keep my findings**, preferences and sources. Availability reasons explain missing prerequisites. **Ask Pacha** opens AI chat, or the built-in guided steps.

**Grower** starts with simpler explanations. **Agronomist** expands the observation table and calculation method. Both use identical data and calculations. Work modes are presentation preferences, not authentication or access control.

## Deploy for the jury

Follow [the complete Vercel guide](docs/VERCEL_DEPLOYMENT.md). Root `vercel.json` defines the Vite web service and FastAPI API service under one domain. This uses Vercel Services (currently Beta), and keeps the key server-side. No deployment has been created by this local change.

## Scientific limits

NASA POWER and MODIS MOD13Q1 are integrated; MODIS QA and pilot ML limits are described in docs/MODIS_ML_IMPLEMENTATION.md. The saved Mantaro record is authentic, includes a source manifest and raw SHA-256, and contains 31 daily observations for January 2025. Rainfall total: 60.64 mm; mean temperature: 9.41 degrees C. These summaries describe a historical grid point, not a parcel sensor or a forecast.

Rotation results retain structural counts and now include main's rule-based agronomic/calendar review. Rainfall scenarios multiply the historical total. Crop screening uses preliminary catalogue/context heuristics; no validated field suitability probability, yield, soil health, disease diagnosis, irrigation requirement or economic forecast is calculated. Wider regional/operational MODIS model validation remains pending. The illustrated landscape from the supplied design is decorative. The 3D field is flat, normalised and not to scale; plant geometry, spacing and stages are illustrations, not terrain data, yield or growth modelling. Crop-reference groups compare complete historical temperature data with published general bands; they do not determine regional suitability.

The saved polygon persists in this browser. Profile, selected query point, role, last step and motion/guide preferences use validated sessionStorage and survive reload in the same tab. Chat, climate results, comparisons and up to six chart snapshots stay in page memory and clear on reload. No automatic NASA or Gemini request runs when restoring progress. Chart sources and periods remain fixed when the current field changes, and chart snapshots are included in report exports. Export report JSON and field GeoJSON to keep a separate copy. Vercel's SQLite cache is temporary, not a persistent database.

## Checks

```powershell
cd backend
.venv/Scripts/python.exe -m pytest -q
cd ..
cd frontend
npm run build
# Choose unused ports if another copy is running:
$env:PACHA_TEST_WEB_PORT='5175'
$env:PACHA_TEST_API_PORT='8002'
npm run test:e2e
```

Backend tests should be run from `backend` (`.venv/Scripts/python.exe -m pytest -q`) so the app import resolves. Browser tests use installed Microsoft Edge, desktop and Pixel 7 emulation, and start their own servers. Automated accessibility runs use reduced motion to avoid sampling mid-transition contrast. A separate SVG fallback case deliberately blocks WebGL. [Verification record](docs/verification-demo.md) distinguishes actual tests from mocked Gemini responses.

Read [the completed local integration report](docs/MAIN_INTEGRATION.md) before combining this experience with new main functionality. No branch publication is performed by the local development workflow.

See [architecture](docs/architecture.md), [methods](docs/methodology.md), [sources](docs/sources.md), [limitations](docs/limitations.md), [team handoff](docs/functional-handoff.md), and [progress](docs/progress.md).

## Place search and character motion

Place search uses a small backend proxy to [Photon by komoot](https://github.com/komoot/photon) over OpenStreetMap data. It runs on explicit submission, caches up to 128 queries for 24 hours per process and rejects bursts. The public demo service has no availability guarantee and is intended for reasonable traffic. `PHOTON_SEARCH_URL` can select an operator-controlled HTTPS Photon endpoint. Production multi-instance deployments need shared throttling or a suitable hosted/self-hosted service; no paid service is configured here.

Pacha is a live Three.js character, not a video. A viewport-aware director moves the existing actor along short curved paths between scenes and lesson anchors. Travel, pointing, curiosity and other expressions share the same canvas. Pause/reduced motion stop automatic movement. The self-hosted Nunito Sans font and original green/cream palette keep the interface simpler and friendlier.
