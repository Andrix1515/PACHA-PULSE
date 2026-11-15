# Progress - 2026-11-15

## Pacha-Pulse Agricultural Intelligence & AI Assistant Upgrade

- **Geospatial & Location Intelligence**:
  - Implemented `LocationService` with reverse geocoding via OpenStreetMap Nominatim (respecting OSM usage policies with caching and custom User-Agent) and a resilient offline bounding-box catalog.
  - Automatically identifies country (ISO-2 code), country name, administrative state/department/region, hemisphere (Northern, Southern, Equatorial), elevation (m.a.s.l. via SRTM/Copernicus DEM), and agro-climatic zone.
  - Deploys `DataProviderRegistry` registering NASA POWER, OpenStreetMap, ISRIC SoilGrids, FAO GAEZ v5, FAOSTAT, Copernicus ERA5-Land, and SENAMHI (Peru).
  - Handles per-provider statuses (`active`, `degraded`, `disabled_outside_peru`, `not_applicable`), ensuring a failed external source never crashes the application.

- **ISRIC SoilGrids v2.0 Provider**:
  - Implemented `SoilGridsService` querying standardized physical and chemical properties across depth layers (0-5cm, 5-15cm, 15-30cm): pH in H₂O, Soil Organic Carbon (SOC), Total Nitrogen, Clay/Sand/Silt texture fractions, and Bulk Density.
  - Derives USDA soil texture classification triangle (e.g. loam, clay loam, sandy loam).
  - Explicitly tags data as `modeled` / `derived` at ~250m resolution; honestly reports `unavailable` if ISRIC REST is unreachable, never inventing fictitious soil chemistry.

- **FAO GAEZ v5 Agro-Ecological Suitability**:
  - Implemented `GAEZService` providing biophysical suitability classes (Very Suitable, Suitable, Moderately Suitable, Marginally Suitable, Not Suitable) under rainfed and irrigated regimes.
  - Includes a documented file adapter for official GAEZ GeoTIFF rasters in `backend/data/gaez/` and an agro-climatic zone matrix for global agricultural regions.

- **FAOSTAT National Agricultural Statistics**:
  - Implemented `FAOSTATService` providing country-level harvested area (ha), production (tonnes), and average yield (kg/ha).
  - Explicitly clarifies that high national production reflects commercial supply and seed value chains, but does not guarantee on-farm parcel suitability.

- **Copernicus ERA5-Land Reanalysis**:
  - Implemented `ERA5Service` providing ~9 km reanalysis climate data (temperature, precipitation, solar radiation, humidity).
  - Explains scientific methodology differences between NASA POWER (MERRA-2 0.5° × 0.625°) and ERA5-Land (ECMWF 0.1°).
  - Handles optional CDS API credentials gracefully via `.env.example`.

- **SENAMHI Peru Regional Provider**:
  - Implemented `SENAMHIService` cataloging official in-situ surface weather stations across Peruvian agricultural valleys (Huayao, Viques, Jauja, Tarma, La Molina, Granja Kayra).
  - Automatically deactivates for coordinates outside Peru (`disabled_outside_peru`).

- **Dynamic Crop Knowledge Base & Crop Explorer**:
  - Replaced the fixed 7-crop list with an extensible 24+ crop knowledge base spanning Cereals, Legumes, Tubers, Vegetables, Cover crops, Forages, Oilseeds, and Pseudo-cereals.
  - Stores verified botanical family, thermal thresholds, water demands (mm), soil pH limits, rooting depths, cycle lengths, and biological N₂ fixation capacity.
  - Created `CropExplorer` frontend UI with dynamic candidate ranking, search, family/category filters, expandable evidence accordions, and a side-by-side Crop Comparator modal.

- **Rotation Intelligence Engine**:
  - Implemented `evaluate_sequence_agronomy`: evaluates consecutive botanical family repetition (critical warnings for Solanaceae -> Solanaceae and Poaceae -> Poaceae), biological nitrogen fixation balance, root depth stratification (alternating shallow and deep taproots), and agricultural calendar viability.
  - Added hypothetical climate scenarios (rainfall % and temperature delta °C).

- **AI Agricultural Assistant Upgrade (Pacha)**:
  - Connected Gemini tool calling directly to backend intelligence services:
    - `inspect_field_context`
    - `get_soil_analysis`
    - `get_crop_candidates`
    - `get_crop_details`
    - `compare_crops`
    - `evaluate_rotation`
    - `simulate_climate_scenario`
    - `create_chart`
    - `respond_to_user`
  - Bilingual natural language support (English and Spanish) grounded strictly in server tool results.
  - Strict security: API keys remain server-side; model cannot execute arbitrary code or fabricate measurements.

## Executed Validation

- Backend: 87 pytest unit and integration tests passing in 2.06 seconds.
- Frontend: TypeScript check and Vite production bundle passing cleanly in 1.16 seconds.
- Verified coordinate scenarios:
  1. Junín, Peru (-12.05, -75.20): Andean Highland, SENAMHI active, Potato/Quinoa/Faba bean suitable, Cassava unsuitable due to elevation.
  2. US Midwest, Iowa (42.03, -93.64): Temperate Continental, SENAMHI disabled, Maize/Soybean suitable.
  3. Valle del Cauca, Colombia (3.45, -76.53): Tropical Mountain / Equatorial, Common bean/Maize/Cassava evaluated.

## SoilGrids availability follow-up - 2026-11-15

- Reproduced the public SoilGrids query for Junín (-12.05, -75.20); it timed out after 15 seconds. The API therefore has no verified soil values to return for this request; `Unavailable` is preferable to fabricated values.
- Changed the provider to avoid caching unavailable responses, so a temporary upstream failure does not persist for the lifetime of the backend process.
- The field summary now explains unavailable/error states and marks SoilGrids accordingly instead of implying a successful lookup. Zero-valued measurements are no longer mistaken for missing values.
- Validation: the mocked recovery regression test passed; `npm run build` passed. No live SoilGrids data was obtained, so source availability remains an upstream limitation.


## Geospatial Intelligence, Soil WCS & Map Experience Upgrade - 2026-11-15

### 1. ISRIC SoilGrids WCS 2.0.1 Migration
- **Root Cause Resolution**: Replaced the degraded/suspended REST endpoint (`rest.isric.org`) with official ISRIC WCS 2.0.1 (`https://maps.isric.org/mapserv?map=/map/{property}.map`).
- **GeoTIFF Tile Engine**: Built a zero-dependency Python GeoTIFF decoder utilizing `struct` and `zlib`. Parses tiled TIFF structures (Tags 322, 323, 324, 325), decompresses Deflate payloads, and accurately reverses the horizontal differencing predictor (`predictor=2`) per row.
- **7 Physical & Chemical Properties**: Extracts authentic multi-depth layers (0-5cm, 5-15cm, 15-30cm) for `phh2o` (pH), `soc` (organic carbon %), `nitrogen` (total N g/kg), `clay` (%), `sand` (%), `silt` (%), and `bdod` (bulk density g/cm³).
- **Live Verification**: Verified live in Mantaro Valley, Junín Peru (-12.05, -75.20), successfully returning genuine SoilGrids values: pH 6.54, SOC 3.20%, Nitrogen 2.70 g/kg, Clay 30.7%, Sand 39.8%, Silt 29.5%, and Bulk Density 1.30 g/cm³ in ~1.5s per property!

### 2. Copernicus DEM & SRTM Elevation and Terrain Service
- **New Standalone Service**: Implemented `ElevationService` in `backend/app/providers/elevation.py` querying the Open-Meteo elevation API (Copernicus DEM 90m / SRTM GL1 30m).
- **Point & Polygon Topography**: Supports both single query points (with micro-slope sampling) and full polygon boundaries (vertices + centroid).
- **Terrain Metrics**: Computes mean elevation, min elevation, max elevation, local relief range (`max - min` in meters), estimated slope gradient (% and degrees via Haversine distance), and downslope drainage aspect (N, NE, E, SE, S, SW, W, NW, flat).
- Exposed via `GET /api/v1/location/terrain` and integrated into the assistant tools (`get_terrain_analysis`).

### 3. Granular Provider Health System
- Upgraded `ProviderStatus` enum in `backend/app/providers/base.py` to distinguish:
  `CONFIGURED`, `CHECKING`, `CONNECTED`, `DATA_AVAILABLE`, `PARTIAL_DATA`, `EMPTY_RESPONSE`, `DEGRADED`, `TIMEOUT`, `UNAVAILABLE`, `NOT_CONFIGURED`, `OUTSIDE_COVERAGE`, `DISABLED`, `NOT_APPLICABLE`.
- Safely configured Copernicus CDS credentials (`CDS_API_KEY` and `CDS_API_URL`) in `backend/.env` without exposing them in frontend or git.

### 4. Advanced Agricultural Map Experience
- **Layer Switcher**: Added an interactive base layer controller in `LocationMap.tsx` with:
  - Street Map: OpenStreetMap standard.
  - Satellite Imagery: Esri World Imagery high-resolution satellite tiles.
  - Topographic Terrain: OpenTopoMap with contour lines and hillshading.
- **Geolocation Tool**: "My Location" button with browser geolocation API and permission handling.
- **Place Search Bar**: Live place search geocoding via OpenStreetMap Nominatim with debouncing and camera fly-to.
- Preserved all existing boundary drawing, vertex editing, and polygon export/import capabilities.

### 5. Field Analysis Module (5-Tab Panel)
- Implemented `FieldAnalysisPanel` with 5 organized tabs:
  - **Tab A — Location**: Country, ISO code, Region, Subregion, Hemisphere, Agro-climatic zone, Ground elevation, Coordinates.
  - **Tab B — Soil Profile**: Soil pH with visual color scale and acidity label, USDA texture class, USDA texture triangle reference, and full multi-depth table (0-5cm, 5-15cm, 15-30cm) for all 7 properties.
  - **Tab C — Terrain**: Elevation min/max/mean, Local relief difference, Slope % and degrees, Downslope aspect, and DEM attribution.
  - **Tab D — Climate**: NASA POWER vs. ECMWF ERA5-Land reanalysis comparison.
  - **Tab E — Data Sources**: Granular provider health badges and a one-click "Retry all" button.

### 6. Executed Validation
- **Backend**: 91 pytest unit and integration tests passing cleanly in 3.95 seconds.
- **Frontend**: `tsc --noEmit && vite build` built cleanly in 1.47 seconds with 0 TypeScript errors.

## Vercel read-only filesystem startup fix - 2026-11-15

- Removed the directory-creation side effect from `GAEZService` initialization. The provider registry is created while importing the FastAPI app, and Vercel does not permit writes to `/var/task`.
- Added a regression test that rejects creation of the configured GAEZ data directory during provider initialization.
- Validation: the targeted GAEZ regression and suitability tests passed (2 passed); importing `app.main` with the project virtual environment succeeded. `git diff --check` reported no whitespace errors.
