## Historical NASA timeout fix - 2026-11-15

The three-year MODIS request no longer waits for NASA inside a browser request. An explicit POST queues historical batches; bounded read-only polling displays saved readings and progress. Added point/period/kind deduplication, additive SQLite migration, successful historical batch checkpoints, explicit retry after source failure, readable network errors, polling cancellation and late-response isolation. History-only ingestion never downloads POWER or trains. Full model update jobs remain separate. Cold ORNL responses exceeded the old 25-second timeout; the offline client now allows 90-second reads and 10-second connects with three bounded attempts.

Verified the exact screenshot point (-12.0465, -75.1958), 2023-01-01 through 2025-12-31, through the live browser/API/worker/NASA flow: eight batches, 69 authentic composites, 61 usable and eight unreliable/missing. The real job completed in about four minutes fifty seconds while the UI remained usable; no browser page errors. Proof: docs/evidence/satellite-live-download.json and satellite-live-progress.png / satellite-live-completed.png. Synthetic transport tests are separately labelled in backend/tests/test_modis_period_jobs.py and frontend/tests/satellite-download.spec.ts; their screenshots are satellite-download-desktop.png / satellite-download-mobile.png.

Checks: backend full suite 135 passed; satellite/history/simulator browser suites 14 passed, then the eight new download tests passed again after the final empty-state and late-response checks; TypeScript/Vite build passed with the existing chunk-size advisory. Local servers and data worker are running. No commit, push or deployment. Production shared queue/storage, supervised worker and crash recovery remain separate work; successful batch checkpoints recover source failures, not abandoned running-job ownership after an OS process kill.

## Map overlap and private environment follow-up - 2026-11-15

Replaced separate absolute map title/search/actions/terrain blocks with one flowing, bounded context stack. Terrain uses an expandable summary. Closed Field tools and the confirmation bar reserve measured space outside the companion; the actor also avoids the map zoom/scale strip. The short Find your field heading reduces initial density. Added viewport regression checks at 320, 393, 942 and 1280 pixels, preserving pointer/keyboard polygon closure and coordinate alternatives. Full browser suite passed: 72 tests, 8 duplicate device-independent mobile checks skipped. TypeScript/Vite build passed with the existing chunk advisory.

The supplied custom-named environment file was copied into backend/.env (the application lookup path). Both default and custom *.env files are ignored by Git and excluded from deployment source. No credentials were logged. The restarted backend reported configured=true and a real Gemini chat returned HTTP 200. This is separate from the locally trained NDVI model. Safe evidence: evidence/assistant-env-verification.json. No soil/elevation provider implementation or ML calculation changed in this follow-up.

## MODIS, offline ML and clarity implementation - 2026-11-15

Added real MOD13Q1 QA-filtered history, hashed 69-composite pilot archive and 1,096 normalized historical POWER days. Live incremental history now holds 88 MODIS composites and 1,413 weather days. Repeated ingestion inserted zero duplicates. Offline temporal experiments beat persistence at this exact point; the latest held-out RMSE is 0.037166 vs 0.050059, with negative R2 (-0.290725) explicitly retained as a limitation. HTTP queues update requests; the owned local worker completed an actual browser-triggered update and returned a dated experimental outlook. Added descriptive monitoring, typed unavailable model states, read-only Pacha tools and user-input budget scenarios.

Simplified grower crop browsing, larger text, flowing 3D controls, role-aware satellite lessons and removed the unstable simulation render loop. Zone hectares now depend on geometric clipping rather than illustrative plants. Backend: 128 tests passed. Full browser run: 69 passed/7 duplicate skips; post-refinement targeted run: 26 passed/4 duplicate skips. Production build passed with its existing size advisory. No push, commit or deployment. Detailed status, commands, evidence and production boundaries: MODIS_ML_IMPLEMENTATION.md.

Earlier records below are historical; statements that MODIS is absent no longer describe this local checkout.

# Current local update - 2026-11-15: 3D Parcel Simulator, Animated Cloud Bubble, Role Modes & Brand Logo

## Implemented locally

- **Brand Logo (`Logo.jpeg`)**: Integrated the official team logo into `frontend/public/art/logo.jpeg`, `frontend/index.html` favicon, the top workspace header (`App.tsx`), the cloud navigation menu (`JourneyMenu.tsx`), and the project landing page (`ProjectPage.tsx`).
- **Pacha Animated Cloud Bubble & Collision-Free Layout**:
  - Redesigned Pacha's dialog container in `PachaStage.tsx` and `depth.css` as an animated cloud speech bubble (`.pacha-cloud-bubble` with cloud puffs and `.pacha-cloud-tail`).
  - Dynamic bounding-box layout (`bubbleRect`) guarantees Pacha's 3D character and cloud bubble never overlap on desktop or mobile, and never cover scene controls.
  - Eliminated fixed-position element overlaps across scrollable scenes (`integration.css`, `journey.css`, `depth.css`) and hid unfocused `.skip-link`.
- **Grower vs. Agronomist Mode & Accessible Typography**:
  - Updated `guidanceFor(scene, focus, role)` in `journey.ts` to provide larger, concise, farmer-friendly summaries in `grower` mode (`17px` body, `25px` heading) and detailed technical validation notes in `agronomist` mode (resolutions, depth layers, FAO-56/ECOCROP thresholds, and auto-expanded `<details>` tables in `FieldEvidenceScene.tsx` and `RotationPlanner.tsx`).
  - Increased small font sizes (`9px–12px`) across the interface for comfortable reading.
- **Interactive 3D Parcel & Crop Simulator (`FieldExplorer.tsx`, `fieldGeometry.ts`, `fieldSimulation.ts`, `fieldRenderer.ts`)**:
  - Subdivides the user's saved parcel polygon into 4 interactive planting zones (`NW`, `NE`, `SW`, `SE`) with real area calculation in hectares (`ha`) derived from the polygon's spherical area (`computeParcelSectors`).
  - Supports toggling individual zones (via UI buttons or direct 3D raycast click on the parcel ground) with a 3D planting wave and sector pulse animation (`prefers-reduced-motion` aware).
  - Evaluates **Crop × Area (`ha`) × Cycle Duration (`days`) × Sowing Month × NASA POWER Climate** (`simulateParcelCrop`), showing thermal compatibility, frost watch, scaled cycle rainfall (`mm`), physical rainwater volume (`m³`) over the selected area, and biological N₂ fixation reference for legumes.
  - Connects live to Pacha's Cloud Bubble and allows saving the simulated crop and allocated area (`ha`) directly into the user's agricultural profile (`Use area & crop in my plan`) and exported JSON report (`field_simulation`).

---

# Current local integration - 2026-11-15

**integracion-visuales** combines fetched main dd63dfa and TetoFan 12e640d. Our visuals/interactivity take priority; main's soil/terrain providers and scientific engine remain unchanged. New explicit evidence/crop scenes connect those services to the guided flow. One crop-route cache-key mismatch was repaired with a regression test. See MAIN_INTEGRATION.md for the nine conflict resolutions and exact ownership.

Validation executed: 110 backend tests; production TypeScript/Vite build; 53 existing browser tests plus 6 new integration browser tests passing (7 duplicate device-independent checks skipped on mobile). Real main provider calls at Mantaro returned elevation 3296 m and model-derived pH 6.34. Old implementation/testing entries below belong to their original team sessions and are historical. No push or deployment was performed; original branch refs are preserved.

## Follow-up integration verification - 2026-11-15

- The guided evidence view presents Location, Soil profile, Terrain, Climate and Data sources using existing provider results. Climate provenance includes a directly visible NASA POWER request link; it does not trigger a new request.
- The field map exposes a terrain summary with a route to detailed terrain evidence. The guided crop explorer presents filterable crop cards, screening context and side-by-side comparison while retaining the existing candidate and planning APIs.
- Fixed the comparison heading and kept the NASA request link available in Grower mode. The map integration test closes the Field tools drawer before activating the terrain summary, and explicitly selects Soil profile when returning to the evidence scene.
- The first full E2E run found that the terrain card could cover parcel vertices on mobile. The card is now hidden while drawing, preserving map interactions.
- Targeted browser verification: `npm run test:e2e -- tests/branch-integration.spec.ts` — **8 passed** across desktop and mobile, including synthetic transport fixtures labelled as test-only. No live NASA response is claimed by this test.
- `npm run build` — passed TypeScript and Vite production build; Vite retains its advisory for chunks larger than 500 kB.
- `npm run test:e2e -- tests/agent-map.spec.ts` — **14 passed**. Full `npm run test:e2e` — **63 passed, 7 skipped** (duplicate mobile-only geometry cases). The runner also logged repeated React `Maximum update depth exceeded` warnings; they did not fail tests and should be investigated separately.
- No commit, merge, push or deployment was performed.

---

# Progress - 2026-11-15: map depth and live companion

## Implemented locally

- Added explicit country/region search through a separate Photon/OpenStreetMap route. Search moves the camera without assigning the country centroid as a field. It is cached, bounded and has typed failure states; coordinates remain available when the provider fails.
- Added a live 3D view of the saved polygon, including concave shapes, orbit/zoom/reset controls, crop preview and five illustrative stages. Current comparison sequences and campaigns can drive the displayed crop. The 2D map remains the drawing view. Flat ground, normalised geometry and plant stages are clearly illustrative and not to scale.
- Added a cited crop-reference guide. Within/outside-band groups compare complete historical temperatures for the selected point with general published references. Missing evidence/reference bands stay unknown; no crop is banned and no country-wide suitability is claimed.
- Moved the map scale to a dedicated top-right anchor and kept it clear of the confirmation bar. Reconciled mobile camera/timeline placement and normal guide flow so controls remain reachable.
- Separated Pacha's persistent live actor from the speech card. Short curved scene/lesson travel, pointing, curiosity, flight and expressive poses use the same canvas. Pause, reduced motion, quiet drawing and a lightweight SVG fallback remain supported.
- Replaced serif presentation with self-hosted Nunito Sans and retained forest/cream/paper colours. The font license is bundled; no external font request is needed at runtime.
- Added `docs/MAIN_INTEGRATION.md` with responsibility mapping, contract/merge hotspots and a manual integration-branch workflow. Read-only GitHub heads still both point to 94f2ee8; unseen teammate changes were not merged. The pre-task local state is backed up under ignored `.local/before-map-depth-v2`.

## Executed verification

- Backend: **85 tests passed** in 1.09 seconds, including new place parsing, bounds, deduplication, cache, burst limits, invalid input and provider-failure fixtures.
- Full browser suite: **53 passed, 7 skipped** in approximately 1.1 minutes on desktop Edge and Pixel 7 emulation. Skips are duplicate device-independent geometry/reference tests. Coverage includes actual WebGL camera changes, stage/campaign controls, same-canvas Pacha travel, pointer/keyboard flow, source/proposal preservation and axe checks.
- Production TypeScript/Vite build passed again after final labels. Main chunk approximately 513 kB minified / 156 kB gzip; lazy shared Three.js approximately 573 kB / 144 kB gzip. Vite's advisory remains visible; no warning suppression was added.
- Actual restarted local proxy on port 5173 searched Peru through the real Photon service: six place results, first the country Peru. The real browser displayed and selected the results without changing the field point. Evidence: `docs/evidence/pacha-place-search-live.json` and `pacha-v2-live-search.png`.
- Additional actual 320px 3D check: no axe violations and no horizontal overflow. Desktop/mobile scene, crop-guide and 3D screenshots were inspected.
- Final narrow-screen refinement: the six affected 3D/campaign/fallback tests passed again in 14.5 seconds; the actual 320px check and production build also passed again.
- Only this folder's registered launcher processes were restarted, at http://localhost:5173 / API 8000. No commit, fetch, branch switch, merge, push or deployment was performed. A read-only `git ls-remote` verified remote heads; the other project copy was not modified.

## Remaining limits

No real terrain/elevation, growth, soil-moisture/nutrient, crop-compatibility, yield or financial simulation was introduced. MODIS remains pending. Temperature reference groups need local agronomic review and a real growing-season context. Photon public availability and larger multi-instance traffic require an appropriate provider/limiter. Physical low-end device and screen-reader/farmer testing remain useful beyond emulation. Real Gemini is still unverified because local configuration has no key; the authored guide/manual tools work independently.

## Previous guided-scene delivery - 2026-11-15

## Current delivery: guided scenes and contextual Pacha

- Rebuilt the English entry and workspace as a clean sequence: two role choices, full-screen world map, field questions, one-metric weather lessons, one-sequence planting steps, focused chart snapshots and exportable findings. The cloud Menu replaces the permanent dashboard sidebar and explains prerequisites.
- Preserved the original forest/moss/cream/paper palette. Ordinary mobile scenes keep compact guidance above content; the map keeps controls separate from Pacha. Source captions stay visible, while technical tables and optional details remain available.
- Added an actual procedural Three.js model based on Icon.jpeg, with brief greeting, explaining, listening, thinking and celebration gestures. The SVG skin remains a loading/unsupported fallback. Motion respects pause, reduced motion and visibility; drawing quiets the character. The model is loaded dynamically and GPU resources are disposed.
- Pacha's authored scene guidance works without a provider key. Optional Gemini context now includes the scene and current question/lesson; optional navigation scene proposals distinguish the profile from the map. Existing bounded tool calling, deterministic chart arithmetic and explicit profile/location confirmation remain intact.
- Confirmed profile, selected query point, role, last scene and preferences survive a same-tab reload through validated sessionStorage. Polygon persistence is unchanged. Climate, comparisons, charts and chat are not silently restored as current observations.
- Work remains local on TetoFan. The pre-redesign implementation was backed up under ignored `.local/before-guided-scenes`. No main changes, Git writes, push or deployment were performed. The other Project_Farm folder was not modified.

## Executed validation

- Backend: **73 passed**, latest run 1.06 seconds. Includes optional scene contract compatibility, invalid scene/range/unknown-field rejection, scene/view matching, actual context forwarded through synthetic Gemini transport, and the existing scientific/tool tests.
- Full browser suite: **36 passed, 4 skipped** in 50.7 seconds, using desktop Edge and Pixel 7 emulation on isolated ports 5175/8002. The skips are duplicate device-independent geometry cases. Scene regression coverage replaces selectors for the retired dashboard shell.
- Follow-up: all 18 scene tests passed after the resume fix; the four affected profile/polygon tests passed after making outside-outline query points visible in Pacha guidance and the map caption.
- TypeScript and production Vite build passed again after the final map-caption change. The lazy 3D chunk is approximately 561 kB minified / 141 kB gzip; Vite reports its advisory over 500 kB. No warning suppression was added.
- Automated axe WCAG 2 A/AA, 2.1 AA and 2.2 AA checks pass on tested scenes/menu/chat/chart views, with narrow-screen reflow and keyboard alternatives. Tests run reduced motion to avoid mid-transition contrast sampling; the explicit unsupported-WebGL test confirms the SVG fallback.
- Actual WebGL rendering was inspected in desktop/mobile screenshots. A separate no-reduced-motion probe confirmed changing animated frames and identical frames after Pause. Evidence: `docs/evidence/pacha-motion-check.json`.
- Restarted only this folder's registered app: http://localhost:5173, API 8000. The real proxy returned health/status HTTP 200 and a manual weekly chart with 5 groups: 22.95, 18.33, 8.83, 7.81 and 2.72 mm, totalling 60.64 mm from the unchanged authentic saved record.

## Remaining boundaries

Actual local Gemini status is **configured=false**. Live provider access and personalised AI tool calling remain unverified; mocked transport tests are labelled. Authored guidance, field tools, saved observations, rotation calculations and manual charts work without a key.

Only NASA POWER is integrated. MODIS, crop suitability, yield, soil sensing, pests, irrigation demand and financial forecasts remain unavailable. No new NASA fetch was claimed for this redesign. Physical low-end phone, screen-reader and farmer usability testing should follow automated/emulated checks. Public deployment remains the owner's task.

## Previous delivery record - 2026-11-14

## Current delivery: team character, chart agent and natural polygon closure

- Adapted the supplied Icon.jpeg character into a cream-and-green SVG rabbit with striped ears, leaf details, blink, ear sway, greeting, thinking and celebration states. Existing animation pause and reduced-motion controls apply to the new skin. The original JPEG is unchanged.
- Clicking/tapping point 1 after at least three corners now closes and saves the polygon without a duplicate vertex. Enter and Space are supported. Crossed or invalid outlines remain editable drafts. Coordinate input and the explicit save button remain available.
- Added Charts as a seventh English workspace module. Rainfall, temperature and rotation structure charts use deterministic backend values and retain source, period, quality and limitations. Daily/7-day climate grouping, accessible exact-value tables, JSON/CSV exports, six session snapshots and report export are implemented. The manual builder needs no Gemini key.
- Upgraded the assistant to a bounded Gemini function-calling agent with allowlisted context inspection, chart creation and typed final response tools. All chart data comes from backend calculations; the model cannot submit arbitrary data arrays or code. Profile and coordinate changes still require confirmation. Completed tool steps and ready-chart links appear in chat.
- Preserved the authentic NASA archive, existing climate/rotation behavior, validated geometry, keyboard alternatives, mobile layout and current Vercel service configuration. No Git write, push or cloud deployment was performed.

## Executed validation

- Backend: 68 tests passed in 1.33 seconds, including new deterministic chart arithmetic, missing-value rules, typed unsupported-data responses, multi-turn synthetic Gemini tool contracts, step limits, unknown-tool rejection and partial-success recovery.
- Browser: 42 passed in 50.2 seconds on desktop Edge and Pixel 7 emulation. Four duplicate device-independent geometry tests are intentionally skipped on mobile. Includes pointer/keyboard polygon closure, invalid outlines, manual chart creation/export, report snapshots, synthetic agent UI, prior flows and automated WCAG checks.
- Production TypeScript/Vite build passed again after final documentation and label cleanup.
- Local web/API launcher restarted at http://localhost:5173, API 8000. The real local proxy returned HTTP 200 for health, status and the manual weekly chart: five groups, 60.64 mm total from the authentic saved January 2025 observations.
- Screenshots for team skin/agent and manual charts were inspected. Detailed evidence is in `verification-demo.md`.

## Remaining external checks

The actual local assistant status reports configured=false. A real Gemini answer remains unverified; synthetic provider tests are labelled accordingly. Configure the owner's private key and test a real tool-call exchange before demonstrating AI live. The manual chart builder and local guide already work.

No Vercel cloud build or deployment was executed. The user must push this version and redeploy, then test the public URL. Existing deployment instructions now include Charts and the agent's bounded request budget.

MODIS remains unimplemented. Crop suitability, soil measurements, pest diagnosis, yield/economic forecasts and persistent farm accounts are unavailable. Manual screen-reader and farmer usability testing remains useful beyond automated checks.


## Historical main-team implementation record

Imported from main at dd63dfa. The following is the other team's implementation and validation record, not a claim that this integration session executed those older checks. The integration report at the top supersedes historical descriptions.

# Progress - 2026-11-15

## Pacha-Pulse Agricultural Intelligence & AI Assistant Upgrade

- **Geospatial & Location Intelligence**:
  - Implemented `LocationService` with reverse geocoding via OpenStreetMap Nominatim (respecting OSM usage policies with caching and custom User-Agent) and a resilient offline bounding-box catalog.
  - Automatically identifies country (ISO-2 code), country name, administrative state/department/region, hemisphere (Northern, Southern, Equatorial), elevation (m.a.s.l. via SRTM/Copernicus DEM), and agro-climatic zone.
  - Deploys `DataProviderRegistry` registering NASA POWER, OpenStreetMap, ISRIC SoilGrids, FAO GAEZ v5, FAOSTAT, Copernicus ERA5-Land, and SENAMHI (Peru).
  - Handles per-provider statuses (`active`, `degraded`, `disabled_outside_peru`, `not_applicable`), ensuring a failed external source never crashes the application.

- **ISRIC SoilGrids v2.0 Provider**:
  - Implemented `SoilGridsService` querying standardized physical and chemical properties across depth layers (0-5cm, 5-15cm, 15-30cm): pH in H₂O, Soil Organic Carbon (SOC), Total Nitrogen, Clay/Sand/Silt texture fractions, and Bulk Density.
  - Derives USDA soil texture classification triangle (e.g. loam, clay loam, sandy loam).
  - Explicitly tags data as `modeled` / `derived` at ~250m resolution; honestly reports `unavailable` if ISRIC REST is unreachable, never inventing fictitious soil chemistry.

- **FAO GAEZ v5 Agro-Ecological Suitability**:
  - Implemented `GAEZService` providing biophysical suitability classes (Very Suitable, Suitable, Moderately Suitable, Marginally Suitable, Not Suitable) under rainfed and irrigated regimes.
  - Includes a documented file adapter for official GAEZ GeoTIFF rasters in `backend/data/gaez/` and an agro-climatic zone matrix for global agricultural regions.

- **FAOSTAT National Agricultural Statistics**:
  - Implemented `FAOSTATService` providing country-level harvested area (ha), production (tonnes), and average yield (kg/ha).
  - Explicitly clarifies that high national production reflects commercial supply and seed value chains, but does not guarantee on-farm parcel suitability.

- **Copernicus ERA5-Land Reanalysis**:
  - Implemented `ERA5Service` providing ~9 km reanalysis climate data (temperature, precipitation, solar radiation, humidity).
  - Explains scientific methodology differences between NASA POWER (MERRA-2 0.5° × 0.625°) and ERA5-Land (ECMWF 0.1°).
  - Handles optional CDS API credentials gracefully via `.env.example`.

- **SENAMHI Peru Regional Provider**:
  - Implemented `SENAMHIService` cataloging official in-situ surface weather stations across Peruvian agricultural valleys (Huayao, Viques, Jauja, Tarma, La Molina, Granja Kayra).
  - Automatically deactivates for coordinates outside Peru (`disabled_outside_peru`).

- **Dynamic Crop Knowledge Base & Crop Explorer**:
  - Replaced the fixed 7-crop list with an extensible 24+ crop knowledge base spanning Cereals, Legumes, Tubers, Vegetables, Cover crops, Forages, Oilseeds, and Pseudo-cereals.
  - Stores verified botanical family, thermal thresholds, water demands (mm), soil pH limits, rooting depths, cycle lengths, and biological N₂ fixation capacity.
  - Created `CropExplorer` frontend UI with dynamic candidate ranking, search, family/category filters, expandable evidence accordions, and a side-by-side Crop Comparator modal.

- **Rotation Intelligence Engine**:
  - Implemented `evaluate_sequence_agronomy`: evaluates consecutive botanical family repetition (critical warnings for Solanaceae -> Solanaceae and Poaceae -> Poaceae), biological nitrogen fixation balance, root depth stratification (alternating shallow and deep taproots), and agricultural calendar viability.
  - Added hypothetical climate scenarios (rainfall % and temperature delta °C).

- **AI Agricultural Assistant Upgrade (Pacha)**:
  - Connected Gemini tool calling directly to backend intelligence services:
    - `inspect_field_context`
    - `get_soil_analysis`
    - `get_crop_candidates`
    - `get_crop_details`
    - `compare_crops`
    - `evaluate_rotation`
    - `simulate_climate_scenario`
    - `create_chart`
    - `respond_to_user`
  - Bilingual natural language support (English and Spanish) grounded strictly in server tool results.
  - Strict security: API keys remain server-side; model cannot execute arbitrary code or fabricate measurements.

## Executed Validation

- Backend: 87 pytest unit and integration tests passing in 2.06 seconds.
- Frontend: TypeScript check and Vite production bundle passing cleanly in 1.16 seconds.
- Verified coordinate scenarios:
  1. Junín, Peru (-12.05, -75.20): Andean Highland, SENAMHI active, Potato/Quinoa/Faba bean suitable, Cassava unsuitable due to elevation.
  2. US Midwest, Iowa (42.03, -93.64): Temperate Continental, SENAMHI disabled, Maize/Soybean suitable.
  3. Valle del Cauca, Colombia (3.45, -76.53): Tropical Mountain / Equatorial, Common bean/Maize/Cassava evaluated.

## SoilGrids availability follow-up - 2026-11-15

- Reproduced the public SoilGrids query for Junín (-12.05, -75.20); it timed out after 15 seconds. The API therefore has no verified soil values to return for this request; `Unavailable` is preferable to fabricated values.
- Changed the provider to avoid caching unavailable responses, so a temporary upstream failure does not persist for the lifetime of the backend process.
- The field summary now explains unavailable/error states and marks SoilGrids accordingly instead of implying a successful lookup. Zero-valued measurements are no longer mistaken for missing values.
- Validation: the mocked recovery regression test passed; `npm run build` passed. No live SoilGrids data was obtained, so source availability remains an upstream limitation.


## Geospatial Intelligence, Soil WCS & Map Experience Upgrade - 2026-11-15

### 1. ISRIC SoilGrids WCS 2.0.1 Migration
- **Root Cause Resolution**: Replaced the degraded/suspended REST endpoint (`rest.isric.org`) with official ISRIC WCS 2.0.1 (`https://maps.isric.org/mapserv?map=/map/{property}.map`).
- **GeoTIFF Tile Engine**: Built a zero-dependency Python GeoTIFF decoder utilizing `struct` and `zlib`. Parses tiled TIFF structures (Tags 322, 323, 324, 325), decompresses Deflate payloads, and accurately reverses the horizontal differencing predictor (`predictor=2`) per row.
- **7 Physical & Chemical Properties**: Extracts authentic multi-depth layers (0-5cm, 5-15cm, 15-30cm) for `phh2o` (pH), `soc` (organic carbon %), `nitrogen` (total N g/kg), `clay` (%), `sand` (%), `silt` (%), and `bdod` (bulk density g/cm³).
- **Live Verification**: Verified live in Mantaro Valley, Junín Peru (-12.05, -75.20), successfully returning genuine SoilGrids values: pH 6.54, SOC 3.20%, Nitrogen 2.70 g/kg, Clay 30.7%, Sand 39.8%, Silt 29.5%, and Bulk Density 1.30 g/cm³ in ~1.5s per property!

### 2. Copernicus DEM & SRTM Elevation and Terrain Service
- **New Standalone Service**: Implemented `ElevationService` in `backend/app/providers/elevation.py` querying the Open-Meteo elevation API (Copernicus DEM 90m / SRTM GL1 30m).
- **Point & Polygon Topography**: Supports both single query points (with micro-slope sampling) and full polygon boundaries (vertices + centroid).
- **Terrain Metrics**: Computes mean elevation, min elevation, max elevation, local relief range (`max - min` in meters), estimated slope gradient (% and degrees via Haversine distance), and downslope drainage aspect (N, NE, E, SE, S, SW, W, NW, flat).
- Exposed via `GET /api/v1/location/terrain` and integrated into the assistant tools (`get_terrain_analysis`).

### 3. Granular Provider Health System
- Upgraded `ProviderStatus` enum in `backend/app/providers/base.py` to distinguish:
  `CONFIGURED`, `CHECKING`, `CONNECTED`, `DATA_AVAILABLE`, `PARTIAL_DATA`, `EMPTY_RESPONSE`, `DEGRADED`, `TIMEOUT`, `UNAVAILABLE`, `NOT_CONFIGURED`, `OUTSIDE_COVERAGE`, `DISABLED`, `NOT_APPLICABLE`.
- Safely configured Copernicus CDS credentials (`CDS_API_KEY` and `CDS_API_URL`) in `backend/.env` without exposing them in frontend or git.

### 4. Advanced Agricultural Map Experience
- **Layer Switcher**: Added an interactive base layer controller in `LocationMap.tsx` with:
  - Street Map: OpenStreetMap standard.
  - Satellite Imagery: Esri World Imagery high-resolution satellite tiles.
  - Topographic Terrain: OpenTopoMap with contour lines and hillshading.
- **Geolocation Tool**: "My Location" button with browser geolocation API and permission handling.
- **Place Search Bar**: Live place search geocoding via OpenStreetMap Nominatim with debouncing and camera fly-to.
- Preserved all existing boundary drawing, vertex editing, and polygon export/import capabilities.

### 5. Field Analysis Module (5-Tab Panel)
- Implemented `FieldAnalysisPanel` with 5 organized tabs:
  - **Tab A — Location**: Country, ISO code, Region, Subregion, Hemisphere, Agro-climatic zone, Ground elevation, Coordinates.
  - **Tab B — Soil Profile**: Soil pH with visual color scale and acidity label, USDA texture class, USDA texture triangle reference, and full multi-depth table (0-5cm, 5-15cm, 15-30cm) for all 7 properties.
  - **Tab C — Terrain**: Elevation min/max/mean, Local relief difference, Slope % and degrees, Downslope aspect, and DEM attribution.
  - **Tab D — Climate**: NASA POWER vs. ECMWF ERA5-Land reanalysis comparison.
  - **Tab E — Data Sources**: Granular provider health badges and a one-click "Retry all" button.

### 6. Executed Validation
- **Backend**: 91 pytest unit and integration tests passing cleanly in 3.95 seconds.
- **Frontend**: `tsc --noEmit && vite build` built cleanly in 1.47 seconds with 0 TypeScript errors.

## Vercel read-only filesystem startup fix - 2026-11-15

- Removed the directory-creation side effect from `GAEZService` initialization. The provider registry is created while importing the FastAPI app, and Vercel does not permit writes to `/var/task`.
- Added a regression test that rejects creation of the configured GAEZ data directory during provider initialization.
- Validation: the targeted GAEZ regression and suitability tests passed (2 passed); importing `app.main` with the project virtual environment succeeded. `git diff --check` reported no whitespace errors.
