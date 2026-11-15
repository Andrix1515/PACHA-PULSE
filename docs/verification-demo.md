# Verification record - map depth and character travel (2026-11-15)

| Check | Actual result |
| --- | --- |
| Backend pytest | 85 passed, 1.09 seconds |
| Full Playwright suite, isolated 5175/8002 | 53 passed, 7 duplicate arithmetic cases skipped, about 1.1 minutes |
| TypeScript + Vite production build | Passed after final labels; base/shared-Three chunk advisory retained |
| Automated WCAG checks | Passed on tested new/existing scenes, search results, 3D controls/fallback and crop-reference dialog |
| Additional 320px 3D check | No axe violations; no horizontal overflow |
| Real Photon through actual local proxy | HTTP 200, six Peru results, country first; original provider retrieval time preserved on cache hit |
| Real browser search | Displayed/selected actual service results; field point stayed unselected |
| Live 3D / actor | Camera screenshots change after rotation; stage/crop/campaign controls use current values; the same Pacha canvas travels between scene anchors |
| Deliberately unsupported WebGL | SVG/outline fallback and stage text work; expected renderer diagnostics appear in these negative tests |
| Main/TetoFan remote comparison | Read-only ls-remote reports both at 94f2ee8359cbf167acc5edab2c22aff1782a6877 |
| Gemini live / cloud deployment | Not performed |

New browser checks assert explicit search submission without autocomplete, failures without geometry loss, field/country separation, scale/confirmation-bar non-overlap, keyboard camera controls, actual compared sequence crop IDs, reference-filter empty states without crop bans, unknown wheat/missing temperatures, dialog focus return, 3D fallback, normal-motion Pacha travel and persistent actor canvas identity. Existing map closure, geometry, NASA archive, charts, rotation and proposal regression tests remain in the full passing suite.

After the final narrow-screen refinement, all six affected 3D/campaign/fallback browser tests passed again in 14.5 seconds. The 320px check and the production build passed again.

Pure reference tests use the authentic archive for ordinary checks; modified temperature copies are explicitly synthetic arithmetic fixtures and are never presented as observations. Backend Photon tests use synthetic transports. Separate real search evidence is saved in `evidence/pacha-place-search-live.json`; the browser capture is `pacha-v2-live-search.png`. No additional NASA fetch is claimed for this visual change.

Actual images inspected: `pacha-v2-welcome-desktop.png`, `pacha-v2-3d-desktop.png`, `pacha-v2-3d-mobile.png`, `pacha-v2-3d-320.png` and crop-guide views. Early runs exposed a static-font download mismatch, narrow-screen fixed-guide interference and a camera reset button under the timeline. These were corrected before the passing suite; the current camera toolbar and map scale have independent anchors. Mid-implementation captures with `-review` in their filename are historical work-in-progress snapshots, not final evidence.

See `MAIN_INTEGRATION.md` for checked branch state and the unexecuted integration workflow. No local or remote Git mutation was performed. Actual target-device performance, screen-reader testing, provider quotas and public deployment access still require their own checks.

## Previous guided-scene verification (2026-11-15)

| Check | Executed result |
| --- | --- |
| Backend pytest | 73 passed in 1.06 seconds |
| Production build | TypeScript and Vite passed; lazy 3D chunk advisory retained |
| Full browser run, isolated ports 5175/8002 | 36 passed, 4 duplicate mobile geometry cases skipped, 50.7 seconds |
| Automated axe and reflow | Passed on tested desktop/Pixel 7 scenes, cloud menu, assistant and charts; 320px quiet-mode reflow included |
| Actual character rendering | WebGL model visible in inspected desktop/mobile captures; forced unsupported WebGL switches to SVG |
| Real motion/pause probe | Animated frames differ; paused frames are identical (`evidence/pacha-motion-check.json`) |
| Restarted local app, 5173 to 8000 | Health/status HTTP 200; manual archived-source weekly rainfall chart HTTP 200, 5 groups / 60.64 mm |
| Real Gemini conversation | Not executed; local status configured=false |
| Cloud deployment | Not executed |

After the final current-step resume fix, all 18 scene tests passed again in 30.5 seconds. After adding a visible outside-outline weather-point warning, the four affected profile/polygon tests passed on both devices and the production build passed again.

The browser suite covers role entry, menu prerequisites/focus, single-question profile inputs, unknown soil/water, validation, same-tab profile/query-point persistence, report export, weather lessons/source tables, agronomist detail expansion, three planting sequences and 70% scenarios, reduced motion, SVG fallback, failed historical requests, invalid saved state, contextual AI proposals with confirmation, polygon closure/import/persistence/undo, deterministic charts/exports and source-preserving snapshots. Synthetic Gemini browser replies are explicitly fixtures; the attached chart artifact comes from the actual backend.

Automated accessibility tests use reduced motion so contrast is not sampled halfway through a fade. The independent real-motion probe uses no-preference instead. These checks establish behavior in the tested browser/emulation, not universal device performance or screen-reader certification.

The first redesign runs exposed insufficient secondary-text contrast, overlapping mobile map tools, a lost manual point on reload and focus loss after applying an AI proposal. Those issues were corrected before the passing run. The later resume check verifies that returning to the welcome scene uses the current journey step rather than the initial restored step.

Current inspected images under `docs/evidence`: `pacha-welcome-{desktop,mobile}.png`, `pacha-world-{desktop,mobile}.png`, `pacha-weather-{desktop,mobile}.png`, `pacha-options-{desktop,mobile}.png`, refreshed chart/assistant images and `pacha-menu-{desktop,mobile}.png`. The actual WebGL model was also inspected with normal motion through the local app. Full-page captures can show sticky elements at the capture scroll position.

The authentic NASA archive and its hash are unchanged. This redesign uses the existing authentic January 2025 Mantaro data; no additional live NASA request was relabelled as new evidence. Optional assistant scene fields preserve legacy API clients but require the updated strict backend alongside this frontend. Root Vercel service settings and scientific calculations are unchanged.

## Previous verification record - team rabbit and chart agent (2026-11-14)

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
