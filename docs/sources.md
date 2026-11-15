# Sources

## Integrated data and cartography

- [NASA POWER daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/): historical point temperature and precipitation. Parameters and units are checked at ingestion. Source URL, observation period, API version, retrieval date, quality and limitations accompany results.
- Authentic saved observation: `backend/data/demo/power-mantaro-2025-01.raw.json`. Its adjacent `.source.json` records the original request, retrieval time, API version, coordinates and SHA-256. `synthetic` is false. Tests verify the raw file's hash. The record contains January 2025 daily values at -12.05, -75.2.
- [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) and [tile policy](https://operations.osmfoundation.org/policies/tiles/): standard map tiles. Mapping is distinct from NASA data coverage or parcel measurement.
- User-drawn or imported GeoJSON: WGS84 geometry and approximate Turf spherical area. Field profiles and scenario selections are user inputs.

## Method references and pending integration

- [FAO-56](https://www.fao.org/4/x0490e/x0490e00.htm): ETc = Kc times ETo. Required inputs are missing, so no crop water-demand estimates are shown.
- [MODIS MOD13Q1 v6.1](https://doi.org/10.5067/MODIS/MOD13Q1.061): planned vegetation product, not integrated. It must not be represented as functioning NDVI or parcel health in this demo.

## Assistant and deployment references

- [Gemini models](https://aistudio.google.com/docs/models): configurable default `gemini-3.5-flash-lite`.
- [Gemini Interactions API](https://aistudio.google.com/api-reference/interactions-api/create-interaction) and [structured output](https://aistudio.google.com/docs/structured-output), and [stateless function calling](https://aistudio.google.com/docs/function-calling#stateless-function-calling): bounded tool workflow, `store:false`, typed reply, deterministic chart tools and reviewable field proposals.
- [Vercel Services](https://vercel.com/docs/services), [service configuration](https://vercel.com/docs/services/config-reference), [routing](https://vercel.com/docs/services/routing), and [FastAPI](https://vercel.com/docs/frameworks/backend/fastapi): same-domain web/Python deployment preparation.

The panorama is reused unchanged from the user's design archive (`public/art/panorama.jpg` within the archive). It is an illustration, not an observation. The animated SVG/CSS character is adapted from the team-supplied Icon.jpeg. The original JPEG remains unchanged. The archive's fabricated measurements and fictional farmer identity are not imported.

## Place search and crop references — reviewed 2026-11-15

- [Photon by komoot](https://github.com/komoot/photon) and [API format](https://github.com/komoot/photon/blob/master/docs/api-v1.md): explicit place searches over OpenStreetMap data. The public demo is for reasonable traffic and has no availability guarantee. This project caches modest queries, bounds response/request sizes, rejects bursts, displays attribution and allows an operator-controlled HTTPS endpoint. It does not use the public Nominatim API.
- [FAO/IIASA GAEZ maize profile](https://s3.eu-west-1.amazonaws.com/data.gaezdev.aws.fao.org/crop_profiles/GAEZ_Crop_profile_maize.pdf): general optimum maize growth/photosynthesis temperatures of 20–30 °C, not universal cultivar suitability.
- [FAO International Year of the Potato 2008](https://www.fao.org/4/i0500e/i0500e.pdf): favourable mean daily temperatures of 18–20 °C for tuber production, not the full survival range or a local field guarantee.
- [FAO quinoa background](https://www.fao.org/4/aq287e/aq287e.pdf): indicative favourable cultivation temperatures of 15–20 °C, with ecotype dependence.
- [FAO/INRAE/CIRAD/AFZ Feedipedia: common bean](https://feedipedia.review.fao.org/node/266): published average-temperature range of 15–23 °C. Local varieties and management still require review.
- [FAO climate and crop growth](https://www.fao.org/4/s2022e/s2022e06.htm): climate is one part of growing conditions. Wheat deliberately has no configured comparable numerical band in this tool.

These cited bands have different reference contexts. The frontend compares them only with a complete selected historical temperature period and labels the result as reference context. No approved/banned regional crop list, growing-season validation, soil compatibility model or yield estimate is inferred.

The 3D field and live character use [Three.js](https://threejs.org/docs/pages/WebGLRenderer.html) and [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). The field is a flat, normalised illustration of user geometry, without measured terrain or plant density. Camera/stage actions render on demand.

The self-hosted font is [Nunito Sans from Google Fonts](https://github.com/google/fonts/tree/main/ofl/nunitosans), obtained through the Google Fonts stylesheet endpoint. Its SIL Open Font License is included at `frontend/public/fonts/NunitoSans-OFL.txt`. Runtime rendering makes no external font request. The team character is a procedural live 3D adaptation of Icon.jpeg, with the SVG fallback retained.
