# Development and design handoff

## Implemented modules

| Module | Grower | Agronomist |
| --- | --- | --- |
| Overview | Small next steps and current notebook status | Same current context |
| My field | Point selection, polygon drawing, manual alternatives, optional profile | Same validated WGS84 geometry and profile |
| NASA climate | Short explanation and historical summaries | Observation table opened by default |
| Rotation planner | Three editable sequences and explanatory results | Method details expanded by default |
| Charts | Rainfall, temperature and rotation plots; manual builder without AI | Same arithmetic, source metadata and accessible values |
| Reports | Export JSON or print current context | Same provenance and limitations |
| Help and sources | Workflow and source explanations | Same transparent implementation limits |
| Pacha | Six-step guide, optional Gemini questions and confirmed form proposals | Same evidence, no separate scientific model |

Work modes are not permissions. No account system is implied.

## Visual integration

Use the supplied forest/cream/paper direction and panorama, while preserving development functionality. Seven working modules replace the reference's larger conceptual sidebar. Soil, vegetation, irrigation, pest and economic modules are explicitly described as unavailable. No fake notification counts, identity, location-specific farmer profile or farm health score is added.

Current styles are in `frontend/src/styles.css`. The character follows the team's Icon.jpeg and is implemented as a code-native SVG in `features/assistant/PachaRobot.tsx`; motion is pausable and respects the operating system preference. A mobile navigation drawer, responsive cards and companion panel are implemented. The design team can replace visuals while retaining semantic controls and functional callbacks.

## API contracts

- `GET /api/v1/health`: availability; legacy service identifier retained.
- `GET /api/v1/observations/climate`: explicit point and historical dates.
- `GET /api/v1/observations/climate/demo`: authentic fixed Mantaro example.
- `GET /api/v1/crops`: name catalogue without suitability coefficients.
- `POST /api/v1/rotations/compare`: exactly three sequences of three campaigns; server resolves rainfall evidence.
- `GET /api/v1/assistant/status`: configuration availability; never returns a secret.
- `POST /api/v1/assistant/charts`: deterministic chart artifacts from saved/cached observations or recomputed rotations; no model key.
- `POST /api/v1/assistant/chat`: limited question/history/context; server-verified evidence; typed proposals only.

## Before a jury presentation

Follow [demo guide](demo-guide.md), [Vercel deployment](VERCEL_DEPLOYMENT.md) and [verification record](verification-demo.md). Configure the owner's Gemini key privately and verify a real explanation on the target deployment. Keep the saved historical example ready for upstream NASA outages. Do not claim two NASA products, deployed hosting or live Gemini verification until those checks actually occur.

The agent may create read-only chart artifacts and report the actual tool steps it completed. It still proposes profile and query-point edits for confirmation. It cannot change polygons or run arbitrary code. The first polygon marker becomes a labelled close/save action after three corners and supports pointer and keyboard activation.
