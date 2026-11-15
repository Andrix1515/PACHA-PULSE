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
