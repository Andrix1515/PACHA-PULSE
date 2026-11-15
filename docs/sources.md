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
