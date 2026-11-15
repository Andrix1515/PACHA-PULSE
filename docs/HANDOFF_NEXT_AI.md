> Historical handoff. The current MODIS/ML and clarity implementation supersedes capability-absence statements below. Read MODIS_ML_IMPLEMENTATION.md and progress.md first.

# Pacha Pulse: development handoff

Prepared on 2026-11-15 at the user's explicit request to transfer the task to another AI.

## Read this first

The latest requested improvements **have NOT been implemented**. The previous turn only inspected the repository, current layout/renderer, and the new logo. The user then interrupted implementation to request this handoff. Do not report the requested simulator or collision fixes as finished.

The preceding task, combining main and TetoFan in a separate branch, **is complete and validated**. Continue from that integrated state rather than starting from an older TetoFan checkout.

## Workspace, instructions and authorization

- Correct working folder: `C:\Users\ANTONY\Documents\ANTONY\Farm_Project`.
- The separate `C:\Users\ANTONY\Documents\ANTONY\Project_Farm` belongs to the other team. Do not modify its files or stop its servers.
- Shell: PowerShell on Windows. Local Python virtual environment: `backend/.venv/Scripts/python.exe`. Node dependencies are installed under frontend/node_modules.
- Read root AGENTS.md. The parent directory also contains AGENTS.md and GUIA_CODEX_AGROSHIFT.md. Distinguish instructions from historical design proposals.
- Communicate with the user in Spanish. **All application text and current documentation must remain in English**, per the user's explicit instruction, overriding the old Spanish-UI guideline in AGENTS.md.
- Work locally. No push, PR, cloud deployment, paid services, exposed credentials, or automatic edits to original branches. The earlier branch/merge request explicitly authorized that particular local merge; it does not authorize future publication or extra Git mutations for the new feature.
- Preserve main's soil/terrain API implementations and scientific provenance. The user specifically prioritized these delicate connections during integration.
- Do not ask for confirmations already given. The user has authorized implementing the pending improvements, including necessary functional changes beyond visuals.
- Do not spawn parallel agents merely because the tools exist. The current request was to prepare a handoff, not to launch agents.
- Preserve existing user assets. Logo.jpeg was the only untracked file at the beginning of the pending task. This handoff adds another untracked file; neither is committed.

## Exact Git baseline

- Current branch: **integracion-visuales**.
- Current HEAD: **3c159be**, `Merge TetoFan experience with main earth-data services`.
- Merge parents:
  - fetched remote main: `dd63dfa30abaef1758047d85a4037793f9612a1c`;
  - TetoFan: `12e640dd203a95b95947f32179bd1e0b356c823b`.
- Original local main remains at `94f2ee8359cbf167acc5edab2c22aff1782a6877` (behind remote). Original local TetoFan remains at `12e640d`. These references were deliberately left intact.
- Remote name: Pacha-Pulse, URL `https://github.com/Andrix1515/PACHA-PULSE.git`.
- Integration branch has **no upstream**. No push or deployment occurred.
- Full integration decisions: docs/MAIN_INTEGRATION.md. Do not redo this completed merge.

## Latest user request: pending implementation

The user provided a screenshot where Pacha's body overlaps the title/name of its own speech card on the map. Similar collisions happen in other scenes. Their instructions are:

1. Correct Pacha's movement space globally. Its body, dialogue, map controls, important messages and page controls must not collide or obscure one another. Fix other overlapping UI blocks too.
2. Increase small text sizes throughout the interface where needed. For growers, use short, clear explanations and larger letters. For agronomists, retain enough technical details, evidence and assumptions for validation. Do not simply hide scientific limitations.
3. Replace the basic rectangular speech card with an **animated cloud-like speech bubble**, retaining accessible text, readable contrast, pause and reduced-motion support.
4. Add an important new module **after parcel selection**: an intuitive, interactive **3D planting simulator/planning playground**. Show the actual selected parcel shape, allow the grower to place crops in selected areas, animate area/crop selection, and specify planting/occupancy time.
5. The selected area and dates must be **real stored/computed input data**, not just decorative placement. Climate conditions must affect the assessment meaningfully. Pacha should explain this module step by step. The user considers it complex functional development, not merely a visual demo.
6. Integrate the supplied project logo.
7. Maintain a clean, calm screen, the original green/cream palette, friendly minimal typography and mobile support. Pacha should move fluidly and express emotions, while remaining clear of important content.

The user allows sensible improvements and necessary backend/functional changes. They explicitly disliked an old static dashboard full of tiny tables and cards. Preserve the guided scene idea and avoid overwhelming the grower with all parameters at once.

## New logo and existing character

- **Logo.jpeg** in repository root, 133039 bytes, inspected visually in the interrupted turn. White square background; green heart/pulse trace with a plant and leaves. This is the new team logo to integrate, not the rabbit reference.
- **Icon.jpeg** is the earlier rabbit reference, 143206 bytes. Keep the existing cream/green animated rabbit character; the logo is branding, not a character replacement.
- design.zip is the original design team's reference, already incorporated selectively. It is ignored by Git.
- Prefer copying the original logo into a public brand asset directory and using it appropriately in the app/project page. Do not overwrite the supplied JPEG. The logo has a white background; choose a sensible framed placement. No derived logo asset has been generated yet.

## Existing application and code map

Frontend: React 19.3.1, TypeScript 5.9.3, Vite 8.3.8, Leaflet 1.9.4 / React Leaflet 5, Three.js 0.187, Recharts 3.10, Lucide, Tailwind and CSS. Fonts: self-hosted Nunito Sans (OFL included).

Backend: FastAPI/Pydantic/HTTPX/Python, SQLite climate cache. Existing requirements are lightweight; no Shapely, NumPy, crop-growth engine or GIS database is currently required.

Important files:

| Area | Files and behavior |
| --- | --- |
| App/state/routing | frontend/src/app/App.tsx. Hash-based guided scenes; lazy modules; report/assistant context assembly. |
| Scene metadata | frontend/src/features/journey/journey.ts. Scene union, metadata, session validation and authored Pacha guidance. |
| Pacha layout/travel | frontend/src/features/journey/PachaStage.tsx. Independent fixed avatar, speech card, curved Web Animations API travel. Main collision source. |
| Pacha live model | frontend/src/features/assistant/Pacha3D.tsx, pachaModel.ts, PachaRobot.tsx SVG fallback. Model is actual Three.js, not a video. |
| Styling | features/journey/journey.css, depth.css, integration.css, plus src/styles.css. Several layered media-query overrides; inspect computed layout rather than adding arbitrary offsets. |
| Map/editor | features/map/LocationMap.tsx, PlaceSearch.tsx, features/parcel/geometry.ts, useParcelBoundary.ts. |
| Existing 3D illustration | features/field3d/FieldExplorer.tsx, fieldRenderer.ts, fieldGeometry.ts. Reusable normalized actual outline, camera controls, illustrative crop stages. This is NOT the new functional simulator. |
| Evidence UI | features/evidence/useFieldEvidence.ts, FieldEvidenceScene.tsx. Explicit soil/terrain queries and point/geometry-tagged response invalidation. |
| Crops | features/crops/CandidateScene.tsx, CropGuide.tsx, references.ts. Server catalogue/screening versus separate cited temperature-reference guide. |
| Rotations | features/rotations/RotationPlanner.tsx. Guided three-sequence editor, catalogue, scenario/calendar assumptions and main's agronomic assessment. |
| Climate | app/useClimate.ts; features/journey/ClimateScene.tsx. Historical observations and fixed authentic example. |
| Assistant UI | features/assistant/PachaCompanion.tsx. Local authored tour, optional Gemini chat, reviewed typed proposals, server-built charts. |
| API/types | frontend/src/services/api.ts, types/index.ts. Preserve current main-compatible contracts. |
| Backend entry | backend/app/main.py registers health, observations, rotations, assistant, location, crops, places. |
| Agent | backend/app/assistant/schemas.py, service.py, charts.py. Main's allowlisted tools plus optional journey context. |
| Main soil/terrain | backend/app/providers/soilgrids.py, elevation.py, location.py and routes/location.py, observations.py. Keep delicate implementations intact. |
| Crop science | backend/app/crops/catalog.py, models.py, suitability.py; simulation/rotations.py. Heuristic reference rules, not a validated growth model. |

Existing scene IDs: welcome, field, profile, evidence, crops, climate, planning, charts, summary, help; project information is a separate route. Hashes include #demo, #field, #profile, #evidence, #crops, #climate, #rotations, #charts, #reports, #help and #project.

Current field confirmation sends the user to profile. A new simulator scene will need deliberate integration into this flow, cloud menu availability, back navigation, session validation, report export, assistant context and accessible focus management. Preserve the option to use a query point without a saved polygon; a simulator should require an actual outline and explain that requirement.

## Why Pacha currently collides

PachaStage calculates desktop avatar positions from fixed fractional viewport anchors. It reserves a CSS pocket only on mobile, while the character itself is positioned independently. It knows scene/focus, but does not solve collisions against the bubble, scale, controls or content bounds. Travel can cross occupied regions. Existing desktop anchors include field [.85,.18], evidence [.82,.60], crops [.80,.60]. The actor can be 210px wide and 1.35 times as tall; welcome is larger.

The bubble is separately positioned by several CSS rules and media queries. On mobile the map speech card is fixed near the bottom, and the avatar becomes a floating dock when the original pocket scrolls away. This can obscure messages and controls. Fixing only one anchor on the map will not satisfy the user.

Recommended direction (not yet implemented): allocate an explicit companion rail/region with non-overlapping actor and cloud slots on desktop; use normal flow or a genuinely reserved region on narrow screens. Bound travel within safe space, react to real measured container geometry, avoid travelling across essential controls, and preserve canvas continuity. Keep full details expandable. Add geometry assertions for actor/bubble/important controls, including after transitions and resize.

## Functional simulator: design considerations, not completed code

The interrupted turn had only begun considering architecture. There is **no finalized simulator design, new schema, endpoint, file or dependency**. The next AI must make and implement a coherent choice.

A feasible first complete version could use selectable parcel subplots/tiles in a live Three.js view, with equivalent accessible buttons and a fallback. Store actual WGS84 subarea geometry, crop IDs and date intervals. Compute hectares from the geometry, not plant counts or arbitrary screen percentages. Validate containment and reject overlapping area/time assignments; permit the same area to be reused in a later campaign. Bound cells/vertices/plan sizes. Persist/export the plan with its parcel identity and invalidate results when geometry, dates, crops or scenarios change.

Triangulation/subdivision of the actual field was one possible approach considered because Three.js already exists and only basic Turf modules are installed. This was **not selected or implemented**. Alternatives are fine if geometry remains correct, accessible and backend-validated. Do not claim this handoff prescribes a finished geometric algorithm.

Climate should influence a deterministic, explainable assessment, with exact period/location, coverage and source. Historical daily min/max/mean temperatures and rainfall can support exposure summaries, missing-day counts and crop-reference comparisons. Rainfall depth over a computed area can yield a labelled gross incident rain volume (not irrigation need, usable root water or yield). Planned future dates must be separated from an explicit historical replay/reference scenario. Do not silently pretend last January's weather predicts the next growing season, or stretch a 31-day series across a long crop cycle without disclosing missing coverage.

Crop animations can show illustrative age/stage progression, selected areas, time navigation and scenario changes. Make clear what is a visual stage convention and what is actually computed. Do not fabricate calibrated growth, disease, yield, moisture or nutrient models. Reuse catalogue coefficients only in their documented scope. Unknown evidence stays unknown. Pacha can provide deterministic step guidance without Gemini; optional AI should inspect trusted backend results rather than invent numbers or secretly change plans.

The user wants substantive spatial/time/climate behavior, so adding another illustrative crop viewer alone is insufficient. Explain any limits honestly while still delivering working area selection, dates, persistence, validation, climate-linked output and role-appropriate interpretation.

## Existing behavior that must remain working

- Natural polygon closure by click/tap on first point, Enter or Space; no duplicate closing vertex. Explicit coordinate/save alternatives remain.
- 3..100 vertex simple WGS84 polygon validation, no holes/self-intersection, approximate spherical area; import/export/delete/undo. Antimeridian and unsupported polar outlines rejected.
- Full-screen map, manual coordinates, geolocation and explicit Photon place search. Country search moves the camera only; never silently assigns a country centroid as a farm.
- Street/Esri Satellite/OpenTopoMap layer URLs and attributions inherited from main under Field tools.
- Existing 3D flat illustrative outline, orbit camera controls and SVG fallback. Actual compared crop IDs drive the illustration's sequence selector.
- Grower/agronomist modes use the same backend evidence. Present simplified interpretation versus technical detail rather than inventing different science.
- Explicit soil/terrain provider reads. Changing point/geometry aborts requests and clears stale data. Soil model output never overwrites manual profile soil.
- All essential controls accessible by keyboard; pause/reduced motion, no color-only meaning, mobile controls and exact-value alternatives to charts.
- Manual charts require no Gemini key and retain immutable source/period with exports. Max six chart snapshots.

Storage: polygon uses localStorage key pacha-pulse.parcel.v1. Role, profile, point, last scene and preferences use validated sessionStorage pacha-pulse.journey.v1. Climate/results/charts/chat are page-memory only. New persistent plan data needs versioning/size validation and a clear association with parcel geometry.

## Scientific/data constraints and API details

- NASA POWER historical climate is genuinely integrated. Authentic saved Mantaro January 2025 archive at (-12.05,-75.2): 31 days, rainfall 60.64mm, mean temperature 9.41C. Original raw/source files under backend/data/demo must remain authentic.
- MODIS remains pending. Do not claim two independently verified NASA products merely because terrain metadata names SRTM.
- Main SoilGrids implementation uses ISRIC WCS GeoTIFF decoding/scaling for seven properties across three depths. It averages a small WCS window (plus/minus .03 degrees), not an exact parcel sample. Overall provenance is modeled/derived; some legacy layer status strings misleadingly say observed. UI explicitly labels model estimates. Up to 21 HTTP requests can take time.
- Main terrain returns elevation/min/max/relief/slope/aspect from samples, **not a terrain raster/height mesh**. Do not deform a 3D field as if those aggregate metrics provided measured topography.
- GAEZ returns an in-code climatic matrix (raster_source_attached=false). FAOSTAT/SENAMHI are curated references. ERA5 currently exposes complementary metadata/configuration, not a verified live reanalysis series.
- Crop catalogue is **21 Crop objects as an array**, GET /api/v1/crops. Main screening GET /crops/candidates takes lat, lon, water and optional historical start/end. POST /crops/compare compares catalogue profiles.
- POST /rotations/compare accepts rainfall_percent 0..200, temperature_delta_c -5..10, start_month 1..12 and hemisphere. Main's equatorial threshold is abs(latitude)<=2.5. Keep scenario assumptions explicit.
- Previous integration repaired one crop-route cache-key mismatch by using the canonical POWER cache_key. Preserve this regression fix.
- Agent currently supports bounded main soil/terrain/crop/sequence tools, chart creation and reviewed navigation/profile/location proposals. New scene unions/mappings must agree on frontend and backend; unknown scene fields otherwise cause validation failures.
- Gemini status last checked configured=false. No live Gemini answer is verified; synthetic transport tests are explicitly labelled. Do not read or print .env secrets.

## Last executed validation: baseline only

Before the pending task, all of the following actually passed:

- Backend: **110 pytest tests**.
- Browser: **53 existing + 6 integration = 59 passed**, with seven duplicate device-independent geometry/arithmetic checks skipped on mobile. Desktop Edge and Pixel 7 emulation.
- Production TypeScript/Vite build. Existing advisory: main JS approx 524kB and lazy Three.js approx 573kB minified exceed the default 500kB advisory; no warning suppression was added.
- Actual browser -> Vite proxy -> FastAPI -> unchanged main soil/elevation services -> guided UI verified: Mantaro soil pH 6.34, clay loam; terrain 3296m, sampled slope 8.3%. Manual soil remained unknown.
- Baseline evidence: docs/evidence/integration-live-browser.json, integration-live-providers.json, integration-live-soil-desktop.png; synthetic integration screenshots clearly identify fixtures.

No new feature tests have run because the new feature is not implemented. Previous passing tests are not proof of collision-free movement or a functional simulator.

Testing commands:

```powershell
cd C:\Users\ANTONY\Documents\ANTONY\Farm_Project\backend
.\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run build
$env:PACHA_TEST_WEB_PORT='5175'
$env:PACHA_TEST_API_PORT='8002'
npx playwright test
```

playwright.config.ts starts isolated API/web servers and uses installed Microsoft Edge. Use unused ports; do not start test servers on occupied 5173/8000. Automated axe checks use reduced motion to avoid mid-transition contrast artifacts. Separate tests verify actual motion and WebGL fallback.

Existing browser specs: agent-map.spec.ts, geometry.spec.ts, map-depth.spec.ts, reference-geometry.spec.ts, workspace.spec.ts, branch-integration.spec.ts.

Add meaningful backend geometry/time/climate tests and browser checks for the new module. Cover containment/overlap, exact hectares, overlapping versus successive occupancy, missing/partial climate, source location mismatch, future reference disclosure, stale-result invalidation, export/reload, mobile/keyboard/fallback, Pacha/cloud collisions and agronomist detail. Keep real source probes separate from synthetic tests.

## Local runtime and operational cautions

- Last launched app: http://localhost:5173, API http://localhost:8000. Check health before assuming it is still running.
- .local/servers.json currently records owned API PID 22096 and web PID 21712, with root/start-time checks. Do not trust old PID numbers without validation.
- Start-AgroShift.ps1 supports -Stop and -NoBrowser -WebPort 5173 -ApiPort 8000; its ownership checks protect other projects. Backend needs restart after Python edits; Vite hot reloads frontend.
- .local is ignored. Previous references/backups and small QA scripts live there. Do not commit .env, caches, node_modules, .venv or runtime metadata.
- No file deletion/cleanup is required. On Windows, use native PowerShell paths and verify any recursive target before destructive operations.
- Use rg first for searches. Batch independent reads; avoid dumping huge one-line TSX/CSS files. PowerShell here-string -> Python pipes can corrupt non-ASCII; use apply_patch for Unicode or plain ASCII in generated text.

## Suggested continuation order

1. Re-read current user requirements and relevant source; inspect computed layout on desktop/mobile. Read applicable skills if available (Sites local implementation, React review, verification; backend guidance if introducing the new API). Do not publish through Sites or Vercel.
2. Fix companion layout structurally across scenes, implement readable role-aware cloud guidance and integrate original logo.
3. Implement the simulator end to end: typed plan, spatial/time validation, actual area data, 3D interaction and accessible equivalents, climate-linked deterministic evaluation, persistence/export and Pacha teaching.
4. Integrate navigation/session/report/assistant schemas coherently, preserving existing APIs and manual tools.
5. Run appropriate tests/build, inspect actual screenshots at narrow widths and intermediate desktop widths, and validate actual browser-to-API flow. Update docs/progress.md, decisions.md, methodology.md, limitations and sources for new assumptions.
6. Report in Spanish what works, what was tested, and actual simulation limits. Leave changes local without new commits/push/deploy unless the user explicitly asks.

The user values concrete completion and frequent concise progress updates. Do not leave them with a mock-up described as a simulator, or claim collision fixes without testing them across modules.
