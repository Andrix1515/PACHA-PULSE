# Architecture

Pacha Pulse keeps a shared scientific layer for growers and agronomists.

- `frontend/src/app/App.tsx`: application shell, hash routes, role preference and shared session context.
- `features/map` and `features/parcel`: React Leaflet polygon editor, coordinate alternatives, Turf validation and optional profile form. Only validated saved outlines enter versioned localStorage.
- `features/monitoring`: lazily loaded Recharts climate view with date confirmation, source attribution, export and accessible observation table.
- `features/rotations`: three editable sequences, three campaigns each, confirmed baseline and rainfall scenario. Results invalidate on scenario, sequence, soil, water or climate changes.
- `features/assistant`: original SVG/CSS robot, six-step local guide, modeless keyboard-accessible chat panel and explicit proposal review. Chat and profile state remain in memory.
- `features/project`: English landing page using the supplied design's panorama and visual direction.
- `backend/app/clients/power.py`: bounded NASA requests and normalization.
- `backend/app/data`: typed observation schemas and SQLite cache (seven-day TTL).
- `backend/app/simulation/rotations.py`: pure deterministic structural comparison.
- `backend/app/assistant`: typed Gemini Interactions request, trusted context reconstruction and proposal validation. It cannot execute actions or write field data.

## Request flow

Vite proxies `/api/v1` to FastAPI during development. Vercel root routing sends `/api/*` to the Python service and everything else to the static web service. Paths are preserved. Browser API URLs stay relative; no production CORS dependency or embedded localhost API endpoint is needed.

`POST /api/v1/assistant/chat` validates a maximum 2,000-character question and eight recent messages, loads authentic saved or cached climate evidence on the server, recomputes any structural comparison, then makes one bounded Gemini request. The model returns structured text and at most three proposals. Neither the endpoint nor Gemini changes profile or geometry. A user confirms an allowed proposal in the browser; unknown actions are rejected. No code execution, browsing, agent loop or arbitrary tool calls are enabled.

The Gemini key comes from the backend environment, with local `backend/.env` support. No key is returned to the browser or embedded in Vite assets. Conversation storage at the Gemini Interactions layer is disabled using `store:false`. Submitted context is still processed by Google.

## Public demo constraints

The API is intentionally unauthenticated for a jury demo. Chat has a bounded per-process/IP guard, input/output limits and one provider call per submitted message. This guard is not distributed and resets on new instances. Configure edge rate limiting and provider spend controls before sharing an unrestricted public link. Do not treat work modes as permissions.

Vercel uses a writable temporary cache under `/tmp/pacha-pulse`. Separate instances can lack previous climate cache entries. The assistant then reports climate context unavailable rather than inventing observations. The authentic saved example works independently of that cache. No cross-device user accounts or persistent farm database are included.
