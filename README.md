# Pacha Pulse

A field notebook for growers and agronomists: polygon mapping, historical NASA POWER climate, three crop rotations, exportable reports, and Pacha, a friendly guided companion with optional Gemini chat. All current application text and documentation are in English.

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

`DEMO.cmd` opens the project page. The launcher chooses a free web/API port pair and prints the addresses; another copy of the project remains untouched. Use `STOP_DEMO.cmd` to stop only this folder's registered processes. The legacy launcher filename `Start-AgroShift.ps1` is retained for compatibility.

## Enable Gemini privately

Copy `backend/.env.example` to `backend/.env`, enter your own `GEMINI_API_KEY` in that local file, and restart the backend. Never put credentials in the frontend or commit `.env`. Default model: `gemini-3.5-flash-lite`; override using `GEMINI_MODEL` if your account requires another supported model. Obtain a key privately in [Google AI Studio](https://aistudio.google.com/api-keys).

The built-in six-step tour works without Gemini. AI chat explains the active module and available results, and proposes navigation, profile updates or explicit coordinates. You review proposed values and press **Confirm and apply** before forms change. Messages, recent conversation and current field context are sent to Google only when you send a question. `store:false` disables Interactions conversation storage; Google's account terms and processing policies still apply.

## Demo route

1. Open `/#demo`, then **My field**. Select a query point or draw a polygon. Save known profile details.
2. In **NASA climate**, load a historical period or select **Open real example: Mantaro Valley - January 2025**. The saved example explicitly moves the query point to Mantaro.
3. In **Rotation planner**, edit your usual sequence and two alternatives, confirm the reference, and compare at 100% or 70% rainfall.
4. Use **Ask Pacha** for guided steps or configured AI chat. Export your evidence through **Reports**.

**Grower** starts with simpler explanations. **Agronomist** expands the observation table and calculation method. Both use identical data and calculations. Work modes are presentation preferences, not authentication or access control.

## Deploy for the jury

Follow [the complete Vercel guide](docs/VERCEL_DEPLOYMENT.md). Root `vercel.json` defines the Vite web service and FastAPI API service under one domain. This uses Vercel Services (currently Beta), and keeps the key server-side. No deployment has been created by this local change.

## Scientific limits

NASA POWER is the only integrated NASA product. The saved Mantaro record is authentic, includes a source manifest and raw SHA-256, and contains 31 daily observations for January 2025. Rainfall total: 60.64 mm; mean temperature: 9.41 degrees C. These summaries describe a historical grid point, not a parcel sensor or a forecast.

Rotations are structural comparisons: distinct crops, adjacent repeats and fallow campaigns. Rainfall scenarios multiply the historical total; no crop suitability ranking, yield, soil health, disease diagnosis, irrigation requirement or economic forecast is calculated. MODIS integration and its validation remain pending. The illustrated landscape from the supplied design is decorative.

Only the saved polygon persists in this browser. Profile, chat and results last for the current page session. Export JSON and GeoJSON before leaving. Vercel's SQLite cache is temporary, not a persistent database.

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

Backend tests should be run from `backend` (`.venv/Scripts/python.exe -m pytest -q`) so the app import resolves. Browser tests use installed Microsoft Edge and start their own servers. [Verification record](docs/verification-demo.md) distinguishes actual tests from mocked Gemini responses.

See [architecture](docs/architecture.md), [methods](docs/methodology.md), [sources](docs/sources.md), [limitations](docs/limitations.md), [team handoff](docs/functional-handoff.md), and [progress](docs/progress.md).
