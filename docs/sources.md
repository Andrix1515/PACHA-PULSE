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


## Main-team provider reference

Imported from main at dd63dfa. Treat this as a source inventory, not proof that every listed product is fetched live. Current implementation qualifications follow below.

# Data Sources and Provenance — Pacha-Pulse

Every quantitative indicator in Pacha-Pulse preserves explicit data provenance:
`source`, `provider_id`, `spatial_resolution`, `temporal_resolution`, `data_quality`, `status`, and `limitations`.

---

## 1. NASA POWER (Daily Point Meteorology)
- **Source**: NASA Prediction of Worldwide Energy Resources (POWER) Project.
- **Provider**: NASA Langley Research Center (LaRC).
- **Endpoint**: `https://power.larc.nasa.gov/api/temporal/daily/point`
- **Variables**: `T2M` (°C), `T2M_MIN` (°C), `T2M_MAX` (°C), `PRECTOTCORR` (mm/day).
- **Underlying model**: MERRA-2 global atmospheric assimilation blended with satellite observations.
- **Spatial Resolution**: Nominal 0.5° latitude × 0.625° longitude grid cell.
- **Caching**: Local SQLite cache (`observations.sqlite`).
- **Authentic Saved Reference**: Mantaro Valley, Junín, Peru (-12.05°, -75.20°), January 2025 (31 days).
- **Limitations**: Represents a regional grid cell, not an on-farm microclimate sensor; does not represent future forecasts or crop-available water.

---

## 2. OpenStreetMap & SRTM Elevation (Location Intelligence)
- **Source**: OpenStreetMap Nominatim and SRTM / Copernicus 90m Digital Elevation Model.
- **Endpoints**: `https://nominatim.openstreetmap.org/reverse`, `https://api.open-meteo.com/v1/elevation`
- **Output**: Country code (ISO 3166-1 alpha-2), Country name, Administrative division, Hemisphere (Northern, Southern, Equatorial), Elevation (m.a.s.l.), Agro-climatic zone.
- **Offline Fallback**: Bounding-box lookup for Peru, United States, Colombia, Kenya, Brazil, Spain, and India ensuring immediate offline functionality.
- **Compliance**: Respectful User-Agent (`PachaPulse-AgroIntelligence/1.0`), caching, and timeout guards.

---

## 3. ISRIC SoilGrids v2.0 (Soil Physical & Chemical Properties)
- **Source**: International Soil Reference and Information Centre (ISRIC).
- **Service & Protocol**: ISRIC WCS 2.0.1 at `https://maps.isric.org/mapserv?map=/map/{property}.map`. The legacy REST endpoint (`rest.isric.org`) is suspended/deprecated.
- **Decoding**: Real-time tiled GeoTIFF parser with Deflate decompression and horizontal differencing predictor reversal (`predictor=2`).
- **Properties & Depths**:
  - `phh2o`: Soil pH in H₂O (scale factor ×0.1; depths: 0-5cm, 5-15cm, 15-30cm)
  - `soc`: Soil Organic Carbon (dg/kg -> %: scale factor ×0.01)
  - `nitrogen`: Total Nitrogen (cg/kg -> g/kg: scale factor ×0.01)
  - `clay`, `sand`, `silt`: Texture fractions (g/kg -> %: scale factor ×0.1)
  - `bdod`: Bulk density of fine earth (cg/cm³ -> g/cm³: scale factor ×0.01)
- **Derived Classification**: USDA Soil Texture Triangle (sand, loamy sand, sandy loam, loam, silt loam, silt, sandy clay loam, clay loam, silty clay loam, sandy clay, silty clay, clay).
- **Spatial Resolution**: Nominal 250 m × 250 m grid cell.
- **Fault Tolerance**: If a point is in ocean/polar gaps or server times out, variables report `unavailable` with explicit status. Never zero or invented.

---

## 4. FAO GAEZ v5 (Global Agro-Ecological Zones)
- **Source**: Food and Agriculture Organization (FAO) & International Institute for Applied Systems Analysis (IIASA).
- **Portal**: `https://gaez.fao.org/`
- **Outputs**: Biophysical suitability classes (Very Suitable, Suitable, Moderately Suitable, Marginally Suitable, Not Suitable).
- **Water Regimes**: Rainfed (RF) vs Irrigated (IR).
- **Input Levels**: Intermediate vs High.
- **Local Raster Adapter**: Official GAEZ GeoTIFF files can be placed in `backend/data/gaez/` for local pixel extraction.
- **Scientific Limitation**: GAEZ suitability estimates biophysical agro-climatic potential; it does not predict actual farm yield or commercial profitability.

---

## 5. FAOSTAT (National Agricultural Statistics)
- **Source**: Statistics Division of the Food and Agriculture Organization (FAO).
- **Portal**: `https://www.fao.org/faostat/`
- **Domain**: Crops and Livestock Products (QCL).
- **Outputs**: Annual harvested area (ha), production volume (tonnes), and average yield (kg/ha) by country.
- **Agronomic Rule**: High national production indicates established seed supply and market channels; it NEVER proves that a specific parcel has adequate microclimate or soil.

---

## 6. Copernicus ERA5-Land Reanalysis
- **Source**: European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Climate Change Service (C3S).
- **Portal**: `https://cds.climate.copernicus.eu/`
- **Spatial Resolution**: 0.1° × 0.1° (~9 km grid cell).
- **Methodology Distinction**: Physical land surface reanalysis (H-TESSEL) providing higher horizontal resolution in rugged terrain than MERRA-2 (50 km).
- **Credentials**: Registered CDS users can supply `CDS_API_KEY` in `backend/.env`.

---

## 7. SENAMHI Peru (Regional In-Situ Weather Stations)
- **Source**: Servicio Nacional de Meteorología e Hidrología del Perú (SENAMHI).
- **Portal**: `https://www.senamhi.gob.pe/`
- **Outputs**: Nearest surface weather station, station distance (km), altitude (m.a.s.l.), and climatological normals.
- **Coverage**: Activated exclusively for coordinates within Peru (`country_code == 'PE'`); auto-disabled elsewhere.


---

## 8. Copernicus DEM & SRTM Terrain Service
- **Source**: European Space Agency (ESA) Copernicus DEM (GLO-90) & NASA SRTM (GL1 30m).
- **Service Endpoint**: `https://api.open-meteo.com/v1/elevation`
- **Capabilities**:
  - Point ground elevation (m.a.s.l.)
  - Polygon multi-point terrain profiling (vertices + centroid)
  - Relief variation (`elevation_max - elevation_min`)
  - Slope gradient (% and degrees derived from relief and great-circle horizontal distance)
  - Downslope drainage aspect (N, NE, E, SE, S, SW, W, NW, flat)
- **Spatial Resolution**: 90 m (Copernicus DEM) / 30 m (SRTM).


## Integration qualifications - 2026-11-15

- SoilGrids uses main's ISRIC WCS GeoTIFF decoder and scaling, not the suspended REST service. The native model grid is nominally 250 m; this implementation averages pixels in a small WCS request window (plus/minus 0.03 degrees). It is not an exact parcel extraction or a field laboratory measurement. Some legacy layer statuses say observed; the guided interface explicitly describes the entire output as model estimates.
- Terrain uses main's Open-Meteo elevation connection and sampled polygon vertices/centroid (or point neighbours), with relief-derived slope/aspect. Main's provider metadata names Copernicus/SRTM; the wrapper response does not independently identify which underlying DEM supplied each sample. No second verified NASA product is claimed from this label alone.
- GAEZ currently returns an in-code agro-climatic matrix with raster_source_attached=false. No official live GAEZ raster was queried in this integration. FAOSTAT and SENAMHI supply curated reference profiles/stations, not new live national statistics or station observations. ERA5 reports complementary product/configuration metadata; configured credentials alone do not prove a downloaded reanalysis series.
- Street, Satellite and Terrain layers retain main's exact OSM, Esri World Imagery and OpenTopoMap URLs/attributions. These basemaps do not turn the 3D illustration into measured elevation. Photon explicit place search remains the visual branch's camera-only geocoder; it does not replace main's location identification service.
- Actual SoilGrids and terrain provider responses from this session are archived in evidence/integration-live-providers.json. Browser transport fixtures are labelled synthetic and are separate from those live responses.
