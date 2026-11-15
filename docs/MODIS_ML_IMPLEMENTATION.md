# MODIS, offline adaptive ML and interface clarity

Implemented locally on integracion-visuales, 2026-11-15. The user's two FINAL_PRODUCTION_SPEC_MODIS_ML_INGESTION.md files are preserved. This report describes actual implementation and verification; the specification's title does not certify production readiness.

## What works

- NASA ORNL DAAC MOD13Q1 point subsets, nominal 250 m and 16-day composites. Three historical years at Mantaro are archived with original numeric band values, exact request URLs, retrieval dates, DOI and SHA-256. There are **69 composites, 59 usable NDVI readings and 10 missing/unreliable**. QA 0/1 are retained and labelled; fill, cloud/snow and invalid values remain null. No interpolation fills the chart.
- An independently hashed archive contains **1,096 normalized NASA POWER daily records** for 2023–2025. It is explicitly a normalized archive, not an original raw response. The original January 2025 demo archive remains unchanged.
- SQLite observation keys combine source, product version, exact query identity and observation date. Offline updates insert missing dates, record runs and retry bounded source calls. The current local history contains **1,413 POWER days and 88 MODIS composites** through the recent source cutoffs. Repeating the updater returned zero new rows from both sources.
- Small Ridge and Random Forest experiments use vegetation lags, complete historical weather windows and seasonality. Chronological 70/15/15 partitions are purged so training targets precede validation prediction times, and validation targets precede test prediction times. No imputation bridges QA gaps. Composite availability is anchored to the end of its 16-day window rather than its start.
- A model is promoted only if test RMSE beats persistence. Failed/insufficient attempts are recorded without inventing predictions. Artifacts are plain JSON with SHA-256 verification; serving inference does not unpickle executable objects or import scikit-learn. Coverage is the exact verified query point, not an untested Mantaro bounding box.
- Vegetation, monitoring and prediction endpoints expose observed/derived/predicted/unavailable states. Dry spells break at missing days. NDVI changes and within-period statistics are descriptive, not pest diagnoses.
- HTTP requests enqueue updates; they never train or ingest years of data. A separate owned local data worker updates observations and retrains offline. DEMO.cmd starts it; STOP_DEMO.cmd stops only this folder's registered processes, including its worker.
- Pacha has read-only vegetation and prediction tools. It cannot secretly trigger training. Its prompt distinguishes short grower explanations from technical agronomist evidence.
- Weather now offers a separate **Satellite greenness** lesson. Growers see a short reading and optional details; agronomists see QA, exact values, model periods and metrics. Missing/stale/unvalidated outlooks explain why they are unavailable. Satellite context can also accompany the 3D field.
- Local budget calculations use entered costs, expected harvest, price and currency over selected hectares. Revenue, margin and break-even are hypothetical arithmetic. Unknown nitrogen credit is not converted into guaranteed fertilizer savings. Crop-rotation IPM opportunity is explicitly heuristic; no measured pesticide reduction is claimed.
- Crop browsing initially shows four cards for growers, with an explicit show-all option. The agronomist retains the complete catalogue. The 3D simulator uses document flow for the model, timeline and controls, with larger text and a reserved companion region. A useMemo fix removes the repeated simulation-to-parent render loop.
- Four-zone hectares now come from polygon centroid/quadrant clipping and area integrals, scaled to the outline's approximate spherical hectares. Decorative plant counts no longer determine area or budgets. This is still an approximate geometric subdivision, not surveyed or cadastral area.

## Executed experiments

The fixed 2023–2025 archive produced 43 complete supervised pairs. Random Forest held-out RMSE was 0.033058 versus persistence 0.059446 (skill 0.443896). The subsequent real incremental update produced 53 pairs and a newly evaluated model: RMSE **0.037166**, persistence **0.050059**, MAE **0.030357**, skill **0.257558**, R² **-0.290725**. Negative R² means this small test set does not demonstrate strong absolute fit, even though it beats the requested persistence baseline. These are pilot experiments, not multi-region or independent field validation.

The latest local forecast in the verified run was 0.2193 NDVI for the composite window ending **2026-11-16**. The last usable input window ends 2026-10-31. This is a 16-day *composite-to-composite* target, not 16 days after clicking the button: publication latency leaves much less lead time. That dated forecast expires; do not reuse it as a permanent demonstration of current conditions.

The actual browser path was verified: page -> Vite proxy -> FastAPI -> queued SQLite job -> owned offline worker -> source update checks -> temporal retraining -> JSON model registry -> prediction response. The job completed and the UI displayed the new result. See [round-trip evidence](evidence/modis-worker-roundtrip.json) and [live data/model evidence](evidence/modis-ml-live-verification.json).

## Run locally

Install backend requirements from requirements.lock.txt, then launch DEMO.cmd. Open http://localhost:5173/#climate and choose **Satellite greenness**. Leave Check NASA unchecked to read the authentic stored/archive period; check it only for an explicit source query. **Sync NASA & update model** queues a recent update while the page remains usable.

Manual offline alternatives, run from backend:

```powershell
.\.venv\Scripts\python.exe -m scripts.archive_modis_pilot
.\.venv\Scripts\python.exe -m scripts.update_observations --lat -12.05 --lon -75.2 --retrain
.\.venv\Scripts\python.exe -m scripts.update_observations --pending
.\.venv\Scripts\python.exe -m scripts.update_observations --watch
```

Archive refresh checkpoints already fetched batches, so it can resume without redownloading completed chunks. The first pilot update can bootstrap the authentic archives and continue only after their latest dates. Model files and SQLite remain local/ignored; do not commit private runtime data.

Endpoints: GET /api/v1/observations/vegetation, POST /api/v1/monitoring/analyze, POST /api/v1/ml/predict-ndvi, POST /api/v1/planning/budget. GET /observations/status adds ingestion and model coverage. CompareRequest accepts optional economic_inputs and CompareResponse includes an economic_summary; absent inputs preserve null profitability. Existing soil and elevation clients were not changed.

## Verification

- Backend: **128 pytest tests passed**. Includes scale/QA, null/zero handling, idempotence, missing-day dry spells, queue-only HTTP behavior, chronological purging, outside-point rejection, artifact integrity, synthetic ML contracts, authentic archived-data training and budget arithmetic.
- Full browser suite: **69 passed, 7 duplicate device-independent checks skipped on mobile**. After the geometric area refinement, the affected geometry, map/simulator and satellite suites passed again: **26 passed, 4 duplicate checks skipped**. The additional geometry case verifies valid hectares even with no decorative plants.
- TypeScript/Vite production build passed. The existing main/Three.js chunk-size advisory remains; it was not suppressed.
- Automated WCAG/overflow checks passed for tested desktop/mobile flows; a separate live 320px check found no horizontal overflow. Browser tests assert no repeated update-depth warning in the simulator and no model/control rectangle overlap.
- Live browser worker completion and current forecast were checked separately from synthetic transport tests. No live Gemini exchange, deployment or Git publication was performed.

## Boundaries and departures from unsafe assumptions

1. Training in the prediction HTTP handler, as one specification paragraph proposed, conflicts with the offline architecture and would make requests fragile. The implemented handler queues work, and the worker performs it. A queued response is not a claim that synchronization has finished.
2. Generic biological nitrogen fixation is not a verified synthetic-fertilizer replacement rate. synthetic_fertilizer_offset_kg_n_ha stays null. Optional budget nitrogen credit needs both an explicit user-supplied credit and its price; it is kept separate from net margin to avoid double counting.
3. Alternating crop families/cover cannot establish an actual pesticide reduction. The new legacy-named reduction field expresses an IPM review opportunity with explicit limitations, not a measured percentage or causal benefit.
4. MODIS processing/publication latency has not been calibrated as an operational forecasting service. Its composites are historical, overlap small fields and surrounding land, and cannot diagnose pests, soil health or yield. Test-RMSE bands are not calibrated confidence intervals. Repeated adaptive holdouts are not independent validation.
5. Current storage, queue and worker are local. Production needs durable shared storage, a separately supervised worker, authentication/abuse controls for queued updates, observability, backup and recovery procedures, plus broader scientific validation. A Vercel request cannot host a persistent polling worker; do not deploy the Windows launcher there. Unavailable artifacts/storage must remain an honest unavailable state, not silently load a fictional model.
6. Existing 3D crop stages are still illustrative. The older constant historical rain-rate extrapolation is a scenario, not a growth/water/yield model. Budget results are page-memory calculations, not a farm accounting database. Manual farmer, screen-reader and low-end-device testing remain necessary beyond automated checks.

## Historical download timeout follow-up (2026-11-15)

Checking NASA now queues a MODIS-only point/period job and returns HTTP 202 immediately with existing observations. The worker fetches bounded batches and persists each successful historical batch, including empty results. The page polls stored observations every three seconds while open; source latency does not hold an HTTP request open. Checkpoints avoid redownloading successful batches on retry, without jumping over earlier gaps. Recent/unpublished batches remain eligible on later requests. Full POWER/MODIS/retraining updates remain a separate job kind. Stopping browser polling does not cancel queued work; changing dates or point discards late responses. A complete batch count means source requests finished, not that all observations passed QA.

Live verification used the screenshot's exact point (-12.0465, -75.1958), not the nearby pilot archive: eight batches returned 69 composites for 2023–2025, 61 usable and eight unreliable/missing. The job ran from 19:46:39 to 19:51:29 UTC while the browser displayed partial readings; it completed without page errors. Evidence: [live job and provenance](evidence/satellite-live-download.json), [progress](evidence/satellite-live-progress.png), [completed browser view](evidence/satellite-live-completed.png). A direct one-composite probe returned HTTP 200 after about 30 seconds; the offline client now allows a bounded 90-second read, 10-second connect and three attempts. No API key is required for this ORNL subset path. The initial live attempt with the original 25-second limit failed and was not counted as successful integration.

Backend: 135 full-suite tests passed. Browser: 14 satellite/history/simulator checks passed; the final download suite was repeated after the late-response assertion and empty-state refinement, eight passed. Build passed with the existing bundle-size advisory. Synthetic fixtures and their screenshots are separate from live-source evidence. Persistent shared queue storage, supervised worker deployment and abandoned-job recovery remain production work; the local queue does not yet lease or automatically reclaim a job interrupted by an OS process kill.

## Primary references

- [ORNL DAAC subset service](https://modis.ornl.gov/data/modis_webservice.html) and [API documentation](https://modis.ornl.gov/rst/ui/).
- [MOD13Q1 Collection 6.1 product DOI](https://doi.org/10.5067/MODIS/MOD13Q1.061).
- [scikit-learn time-series validation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) and [model persistence guidance](https://scikit-learn.org/stable/model_persistence.html).


## Where to demonstrate ML in the interface

Open Menu -> Understand the weather -> Satellite greenness -> Read canopy history. **A cautious look ahead** is the trained-model inference; the historical NDVI graph is an observation, not an ML prediction. **Model validation and update status** shows the model version, training period, RMSE, persistence baseline, skill and R2 (expanded by default for Agronomist). Use the explicit Mantaro weather example to select the already trained pilot point (-12.05, -75.20); another field needs its own verified observations and promoted model. Sync NASA & update model queues work for the offline worker. The illustrated crop stages and budget arithmetic do not become ML because they share the page.

Program path: app/ml/features.py -> app/ml/trainer.py (offline candidate training and validation) -> app/ml/predictor.py (JSON artifact inference) -> POST /api/v1/ml/predict-ndvi -> frontend/src/features/journey/VegetationLesson.tsx. Gemini explains evidence through Pacha; its API key does not train or unlock this local model. A later environment verification on 2026-11-15 received an actual Gemini HTTP 200 response; the earlier no-live-Gemini validation entry records the preceding task's boundary.
