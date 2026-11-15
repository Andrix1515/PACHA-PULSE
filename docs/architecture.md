# Architecture

Pacha Pulse keeps a shared scientific layer for growers and agronomists.

- `frontend/src/app/App.tsx`: application shell, hash routes, role preference and shared session context.
- `features/map` and `features/parcel`: React Leaflet polygon editor, coordinate alternatives, Turf validation and optional profile form. Only validated saved outlines enter versioned localStorage.
- `features/monitoring`: lazily loaded Recharts climate view with date confirmation, source attribution, export and accessible observation table.
- `features/charts`: manual chart builder and accessible chart cards, shared server calculations, immutable session snapshots, JSON/CSV exports. Charts load lazily and do not need a Gemini key.
- `features/rotations`: three editable sequences, three campaigns each, confirmed baseline and rainfall scenario. Results invalidate on scenario, sequence, soil, water or climate changes.
- `features/assistant`: SVG/CSS rabbit skin adapted from the team's Icon.jpeg, six-step local guide, modeless keyboard-accessible chat panel and explicit proposal review. Chat and profile state remain in memory.
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
