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
