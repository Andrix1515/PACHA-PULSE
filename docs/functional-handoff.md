# Development and design handoff — 2026-11-15

This local delivery is on **TetoFan** in **Farm_Project**. No commit, merge, push or deployment was performed. Main and the other team's Project_Farm folder were not modified.

## Guided journey

| Visible scene | Route | Grower | Agronomist |
| --- | --- | --- | --- |
| Start together | `/`, `/#demo` | Two role choices and Pacha | Same entry |
| Find my field | `/#field` | Full-screen map; optional location; drawing | Identical validated geometry |
| About my field | `/#profile` | Name, crop and water, one question at a time | Same questions and optional details |
| Understand the weather | `/#climate` | Rainfall, temperature and meaning, one lesson at a time | Source table expanded by default |
| Explore planting options | `/#rotations` | Usual sequence, A, B, scenario, then focused results | Identical counts; methods expanded |
| Make a chart | `/#charts` | Manual builder or explicit Gemini request; one snapshot shown | Same calculation and exports |
| Keep my findings | `/#reports` | Small summary, JSON export and print | Same provenance and limitations |
| Help & sources | `/#help` | Workflow, persistence, keyboard and scientific limits | Same information |
| About Pacha Pulse | `/#project` | Existing information page | Same page |

Modes are presentation preferences, not authentication. The cloud Menu explains unavailable steps. Weather examples and structural comparisons can be explored without inventing field information. Switching off **Guide me step by step** keeps tools available and reduces Pacha's explanations; the rotation editor then uses its existing combined layout.

## Code ownership and integration points

- `frontend/src/features/journey/`: scene metadata, authored teaching, profile questions, weather lessons, cloud-menu dialog and visual stylesheet.
- `frontend/src/app/App.tsx`: scene navigation, shared current evidence, proposal confirmation, source-preserving chart snapshots and report assembly.
- `frontend/src/features/assistant/Pacha3D.tsx` and `pachaModel.ts`: dynamically loaded Three.js character. The original `PachaRobot.tsx` remains the animated SVG fallback. Character motion is decorative; scientific state never depends on animation.
- Existing `LocationMap`, `RotationPlanner`, chart cards and backend arithmetic are reused. Manual coordinate/import/export paths and first-point polygon closure remain supported.
- `frontend/package.json` and lockfile add pinned `three` and `@types/three`. Run `npm ci` after pulling.

Styles preserve the original palette. The new scene stylesheet layers over the shared legacy styles, which still support the informational page and existing form/chat components. Keep semantic controls and source captions when replacing visuals.

## Small functional changes to coordinate with main

1. `AssistantContext.journey` is optional: `{scene, step, detail, mode}`. Gemini uses this to stay on the current question or lesson. Existing AppView values remain unchanged.
2. Navigation proposals can optionally include `scene`; the API validates that the scene belongs to `view`. This distinguishes `field` from `profile`, both under `parcel`. No model can silently change the scene or field: proposals remain reviewable.
3. Profile, query point, role, last scene and preferences use validated sessionStorage key `pacha-pulse.journey.v1`. They survive same-tab reload. The existing polygon localStorage format is unchanged. Climate, comparisons, charts and chat remain in page memory; restoring progress makes no automatic external data/model request.
4. **Find my location** invokes the browser's permission flow only after a click. Coordinates remain an alternative. No geocoding provider was added.

The backend changes are limited to `app/assistant/schemas.py` and the assistant's teaching instructions in `service.py`, plus contract tests. Observation, comparison and chart endpoints/calculations remain unchanged. Integrate the optional schema extensions with the frontend: an older API using `extra="forbid"` will reject the new journey field.

## API and evidence boundaries

Health, NASA daily/demo, crops, rotation comparison, manual charts, assistant status and assistant chat keep their existing URLs. Gemini chart tools remain allowlisted and bounded; values come from deterministic server calculations. The assistant cannot edit polygons, browse, run code, record voice or diagnose crops. Authoritative NASA evidence is reconstructed on the server; UI scene context is not scientific evidence.

The authentic Mantaro archive is unchanged. MODIS, soil sensing, yield, suitability ranking and economic forecasts remain unimplemented. Keep this distinction when integrating new main-branch work.

See [verification](verification-demo.md), [demo route](demo-guide.md) and [deployment instructions](VERCEL_DEPLOYMENT.md). Live Gemini still needs the owner's private key and a real provider check; no cloud deployment was performed.

## Additional map-depth delivery

Country/region search, illustrative parcel 3D, cited crop-reference groups and independent Pacha travel are now implemented locally. The new places router is the only added backend endpoint. No new assistant scene enum is needed; the parcel view uses detail `exploring_3d`. Read [MAIN_INTEGRATION.md](MAIN_INTEGRATION.md) for the checked branch heads, file ownership, conflict hotspots and a manual integration-branch workflow.
