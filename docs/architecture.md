# Architecture

Pacha Pulse keeps a shared scientific layer for growers and agronomists.

- `frontend/src/app/App.tsx`: guided scene shell, compatible hash routes, role/preferences, shared evidence and proposal confirmation. `/` and `/#demo` enter role selection; `/#project` keeps the informational landing page.
- `features/journey`: scene availability, authored context-sensitive guidance, native cloud-menu dialog, one-question profile and lazily loaded weather stories. Scene styles layer the original palette through `journey.css`. Validated sessionStorage remembers profile/query point/preferences; only saved polygons use localStorage.
- `features/map` and `features/parcel`: React Leaflet polygon editor, coordinate alternatives, Turf validation and optional profile form. Only validated saved outlines enter versioned localStorage.
- `features/journey/ClimateScene.tsx`: lazily loaded Recharts lessons for rainfall, temperature and meaning, with confirmed dates, permanently visible source captions and an expandable exact-value table. The legacy monitoring component remains available in source.
- `features/charts`: manual chart builder and accessible chart cards, shared server calculations, immutable session snapshots, JSON/CSV exports. Charts load lazily and do not need a Gemini key.
- `features/rotations`: three editable sequences, three campaigns each, confirmed baseline and rainfall scenario. Guided mode presents one sequence/result at a time; freely exploring keeps the existing combined editor. Results invalidate on scenario, sequence, soil, water or climate changes.
- `features/assistant`: procedural Three.js rabbit following Icon.jpeg, with an animated SVG fallback, authored guide, modeless chat and explicit proposal review. The renderer loads dynamically, caps pixel density, stops idle motion after brief gestures and disposes GPU resources on unmount. Reduced motion, pause, document visibility and intersection visibility are respected. Chat remains in memory; confirmed profile values survive same-tab reload.
- `features/project`: English landing page using the supplied design's panorama and visual direction.
- `backend/app/clients/power.py`: bounded NASA requests and normalization.
- `backend/app/data`: typed observation schemas and SQLite cache (seven-day TTL).
- `backend/app/simulation/rotations.py`: pure deterministic structural comparison.
- `backend/app/assistant`: typed Gemini Interactions request, trusted context reconstruction and proposal validation. It cannot execute actions or write field data.

## Request flow

Vite proxies `/api/v1` to FastAPI during development. Vercel root routing sends `/api/*` to the Python service and everything else to the static web service. Paths are preserved. Browser API URLs stay relative; no production CORS dependency or embedded localhost API endpoint is needed.

`POST /api/v1/assistant/chat` validates a maximum 2,000-character question and eight recent messages, loads authentic saved or cached climate evidence on the server and recomputes structural comparisons. A bounded Gemini function-calling agent can use `inspect_field_context` and `create_chart`, then finish through the typed `respond_to_user` tool. Limits: three model requests, four nonterminal tool calls, three charts and a 48-second total agent deadline. The last request, when needed, has no tools and enforces the final JSON response schema. All returned model steps and signatures are retained for stateless continuation but never exposed as reasoning in the browser.

Chart arguments contain only an allowlisted metric, bar/line style and daily/weekly grouping. Numeric values, titles, units and provenance are supplied by deterministic backend code. Unknown tools and arbitrary values/code are rejected. Read-only chart creation follows the user's request; profile and coordinate changes still require explicit confirmation. No code execution, browsing, polygon editing or arbitrary tool dispatch is enabled. Charts already computed are retained with a deterministic notice if a later AI explanation fails.

`POST /api/v1/assistant/charts` provides the identical chart implementation without a model or key. The client stores at most six chart snapshots in memory, showing their fixed period/source even after a field change, and includes them in report exports. Missing cache or source data returns a typed unavailable response.

The Gemini key comes from the backend environment, with local `backend/.env` support. No key is returned to the browser or embedded in Vite assets. Conversation storage at the Gemini Interactions layer is disabled using `store:false`. Submitted context is still processed by Google.

## Public demo constraints

The API is intentionally unauthenticated for a jury demo. Chat has a bounded per-process/IP guard, input/output limits and at most three provider requests per submitted message within one bounded workflow. This guard is not distributed and resets on new instances. Configure edge rate limiting and provider spend controls before sharing an unrestricted public link. Do not treat work modes as permissions.

Vercel uses a writable temporary cache under `/tmp/pacha-pulse`. Separate instances can lack previous climate cache entries. The assistant then reports climate context unavailable rather than inventing observations. The authentic saved example works independently of that cache. No cross-device user accounts or persistent farm database are included.

## Scene context compatibility (2026-11-15)

Assistant context accepts optional `journey: {scene, step, detail, mode}`. Navigation proposals may include optional `scene`; the server rejects a scene/view mismatch. Older clients that omit both fields keep working. Internal AppView names and all observation/comparison/chart endpoints remain unchanged. Deploy frontend and API changes together: an older strict API rejects new context fields.

Pacha's scene explanations are deterministic authored guidance, not unprompted Gemini calls. Opening chat retrieves only configuration status. Sending a message shares the current small task with Gemini. The manual chart path remains model-independent. Native dialog focus handles the menu; scene changes focus the workspace; closing chat returns to Ask Pacha.

Renderer compatibility/lifecycle reference: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). WebGL 2 is required for that renderer; geometry/material/renderer disposal is handled by the companion controller.

## Map depth and live actor (2026-11-15)

`features/map/PlaceSearch.tsx` calls `GET /api/v1/places/search?q=...` only on submit. A selected place fits the map to a validated bounding box or center, leaving the saved field/query point untouched. The independent Photon route validates response size/types/coordinates, bounds requests to an eight-second HTTP timeout, caches 128 results with 24-hour TTL and rejects rapid uncached searches. It is not a general address or reverse-geocoding service. No Nominatim public endpoint is used.

`features/field3d` lazily loads a demand-rendered Three.js view of the existing saved polygon. Local planar projection normalises the footprint while preserving its approximate shape. A bounded illustrative grid stays inside concave outlines. Instanced stems/leaves/heads change with the selected crop and stage; OrbitControls and external camera buttons share a renderer. Without WebGL, a polygon diagram and stage text remain available. No live terrain, growth, nutrient or yield model is added.

`features/crops` keeps a cited, reviewed reference catalogue and pure comparison logic. Only complete daily temperatures for the selected weather point can be grouped against a configured band. No reference or missing/stale point data produces an unknown state. Crop ranges have different published scopes and are not a suitability ranking.

`PachaStage` now separates the actor from its speech card. Layout measurements drive a cancellable Web Animations path between anchors; one persistent 3D canvas changes pose/mood. Mobile uses reserved character slots and a small noninteractive dock when the guide scrolls away. Normal mobile speech flows with content to keep controls reachable. The 3D camera toolbar sits above the timeline; the map scale has a separate top-right anchor. `depth.css` applies the self-hosted font, refined map controls and actor positioning.


## Local branch integration - 2026-11-15

The integration branch retains TetoFan's scene shell, fullscreen Leaflet editor, Photon search, live Pacha actor and lazy flat 3D renderer. Main's providers, observation/location routes, crop schemas and rotation engine remain the shared data authority. useFieldEvidence is an adapter with explicit user-triggered queries, independent abort controllers and point/geometry-tagged results. FieldEvidenceScene presents location, terrain, soil and provider metadata separately. CandidateScene calls main's catalogue, screening and crop-comparison routes; a reviewed crop seeds Alternative A only. RotationPlanner sends main's temperature/calendar fields. Assistant schemas combine optional journey context with main's location context and tool set. main.py registers both main's location/crops routers and TetoFan's places router. No duplicate backend is introduced.
