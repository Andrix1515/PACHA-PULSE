# Main and TetoFan: local integration report

## Result and ownership

Branch: **integracion-visuales**. Created from fetched remote main **dd63dfa30abaef1758047d85a4037793f9612a1c**, then merged **TetoFan 12e640dd203a95b95947f32179bd1e0b356c823b**. Both histories are preserved. The original local main and TetoFan references were not moved. Local main was behind the remote; the integration deliberately uses the fetched remote head, including its read-only-filesystem startup fix.

The user explicitly authorized this new branch and local combination. No push, PR, deployment or original-branch update was performed. The new branch has no upstream, so it does not accidentally track main for a plain push.

## Conflict decisions

Nine files conflicted and were reconciled deliberately:

| File | Resolution |
| --- | --- |
| frontend/src/app/App.tsx | TetoFan guided scenes, mobile layout and Pacha director; new adapters expose main's provider and crop functions. |
| frontend/src/features/map/LocationMap.tsx | TetoFan natural polygon closure, accessible controls, camera-only Photon search and 3D entry; main's exact Street/Satellite/Terrain URLs and attributions under Field tools. |
| frontend/src/features/rotations/RotationPlanner.tsx | TetoFan sequential editor and accessible results; main's dynamic crop catalogue, temperature scenario, campaign month, hemisphere and agronomic/calendar assessment. |
| frontend/src/types/index.ts | Main's provider/crop/terrain/rotation contracts, extended with optional TetoFan journey/proposal fields. |
| backend/app/main.py | Registers main's crop/location/observations routes plus TetoFan's places router. |
| backend/app/assistant/schemas.py | Main's country/region context and tool schemas plus validated optional journey scenes and proposals. |
| backend/app/assistant/service.py | Main's allowlisted soil/terrain/crop/sequence tools and dispatch remain intact; TetoFan's teaching guidance and English interface rules added to the prompt. |
| docs/progress.md | Current integration status followed by both teams' historical implementation records. |
| docs/sources.md | Both source inventories retained, with explicit qualifications on modeled soil, sampling and reference-only providers. |

## Preserved delicate connections

A final diff against main verifies that **backend/app/providers/**, **backend/app/api/routes/location.py**, **backend/app/api/routes/observations.py**, and **backend/app/simulation/rotations.py** remain unchanged. This includes the WCS URL, TIFF decoder, scaling, depth handling, elevation request, terrain sampling and main's agronomic calculations.

One separate compatibility bug was fixed in backend/app/api/routes/crops.py: screening had constructed a different cache key from the POWER route, so it could not reuse loaded historical weather. It now calls the existing shared cache_key, without rounding to a nearby point. The regression test covers correct reuse, a different point and a different period. No provider implementation is changed.

## Combined user flow

- Keep the role selection, clean scenes, animated live Pacha, pause/reduced motion, map search, accessible polygon editor, 3D illustration, historical weather, manual charts and exports.
- Open **Check soil & terrain** through the cloud menu or Field tools. Choose Location, Terrain, Soil or Sources and explicitly read that service. No external soil/terrain query fires merely because the map moved. New point/outline changes abort in-flight reads and clear old evidence.
- SoilGrids model estimates do not overwrite the farmer's soil input. Missing values remain unavailable; zero elevation or slope remains valid. The native 250 m model grid is averaged over main's WCS request window, not an exact field extraction.
- **Explore crops** browses main's 21-item catalogue one crop at a time, optionally screens the selected point through main's services, and compares catalogue profiles. Trying a crop changes only the first campaign of Alternative A, leaving the farmer's current crop intact.
- Main's temperature/calendar assumptions and rule-based sequence review are available within the guided rotation flow. The 3D view uses actual compared crop names, but stays a flat illustration: aggregate slope is not a measured height grid.
- Main's original FieldAnalysisPanel/CropExplorer components remain in source; their active functions are presented through the scene adapters rather than replacing the guided shell with the older card layout.

## Executed validation - 2026-11-15

- Backend: **110 pytest tests passed**, including both branches' suites and the climate-cache integration regression.
- Frontend: TypeScript and Vite production build passed. Existing advisory remains: the main and lazy Three.js chunks exceed 500 kB minified.
- Existing browser suite: **53 passed, 7 skipped** (duplicate device-independent arithmetic/geometry cases). Desktop Edge and Pixel 7 emulation.
- Additional integration browser suite: **6 passed**, checking exact polygon coordinate forwarding, attributed layer changes, zero/missing values, soil provenance, unchanged manual soil, stale-data invalidation, provider outage, main's full crop catalogue and crop comparison, Alternative A handoff, temperature/month/hemisphere request payload and actual backend calendar output. Automated WCAG/overflow checks included.
- Actual unchanged main providers were executed at Mantaro (-12.05, -75.2): terrain mean elevation **3296 m**; SoilGrids returned all properties with profile mean pH **6.34**, model-derived. Retrieved payloads, including their limitations, are archived in [live provider evidence](evidence/integration-live-providers.json). These are current service responses, not lab validation or a global availability guarantee.
- The running local app at http://localhost:5173 was also checked end to end in a real browser: Vite proxy -> FastAPI -> ISRIC WCS and elevation services -> guided screen. Soil showed pH 6.34 / clay loam; terrain showed 3296 m / sampled slope 8.3%. The manual soil answer stayed unknown. Health and the 21-crop catalogue returned successfully. Assistant status was configured=false, so no live Gemini response is claimed. Evidence: [browser/API record](evidence/integration-live-browser.json).
- Synthetic browser transport fixtures are explicitly labelled and separate from actual service checks. Screenshots are in evidence/integration-*.png.

## Remaining limits

MODIS integration is still pending. GAEZ, FAOSTAT and SENAMHI references and ERA5 configuration metadata do not prove live product downloads. Main's existing soil layer status strings can say observed even though the overall SoilGrids product is modeled; the guided interface explicitly calls it a model estimate. Actual Gemini interpretation still requires a separately verified configured model/account; automated Gemini tests use labelled synthetic transport. Manual screen-reader, low-end-device and farmer usability testing remain useful.

The owner can review this branch locally with main before deciding on a later publication. Neither original branch needs a force-push.
