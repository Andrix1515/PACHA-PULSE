# Especificación Técnica de Cierre de Proyecto (Production-Ready)
## NASA MODIS MOD13Q1 + Ingesta Incremental + ML Adaptativo con Reentrenamiento + Cierre Agronómico/Económico

> **Destinatario:** Agente de IA del equipo en la rama `main` (y posterior convergencia con `integracion-visuales`).  
> **Propósito:** Cerrar **Pacha Pulse (AgroShift)** como un producto completo, consistente y de nivel de producción (no una simple demo parcial), cumpliendo el 100 % de la arquitectura y límites científicos de `AGENTS.md` (Secciones 4, 6, 7, 8 y Fases 4, 5 y 6).

---

## 0. Contexto Actual del Repositorio y Reglas Inquebrantables

1. **Estado actual en `main` e `integracion-visuales`:**
   - Ya están operativos: **NASA POWER** (`backend/app/clients/power.py`), **ISRIC SoilGrids v2.0 WCS GeoTIFF** (`backend/app/providers/soilgrids.py`), **Copernicus DEM / SRTM Terrain** (`backend/app/providers/elevation.py`), **LocationService**, **FAO GAEZ v5**, **FAOSTAT**, **Copernicus ERA5-Land**, **SENAMHIService**, el catálogo de 24+ cultivos (`backend/app/crops/`), el motor determinista de rotaciones (`backend/app/simulation/rotations.py`), el asistente **Pacha** con *function calling* (`backend/app/assistant/service.py`) y, en `integracion-visuales`, el **Simulador 3D Interactivo de Parcela (Cultivo × Área × Tiempo × Clima)** (`frontend/src/features/field3d/`).
   - En `backend/app/providers/registry.py`, `nasa_modis_vi` ya aparece registrado como `StubProvider` con `DataSourceType.SATELLITE_VEGETATION`.
2. **Qué falta para cerrar el proyecto al 100 %:**
   - **Módulo 1:** Integrar el **segundo producto oficial de la NASA (`MODIS MOD13Q1 v6.1 — NDVI/EVI` a 250 m cada 16 días)** con datos reales verificables y filtro de calidad (`QA`).
   - **Módulo 2:** Implementar el **motor de ingesta incremental fuera del ciclo HTTP (`backend/scripts/update_observations.py` + `backend/app/ingestion/`)** que recibe nuevas observaciones de **NASA POWER** y **NASA MODIS** sin re-descargar el pasado.
   - **Módulo 3:** Implementar el **motor de Machine Learning adaptativo (`backend/app/ml/`) con `scikit-learn`** que se **reentrena automáticamente offline** cuando ingresan nuevas fechas de la NASA, se valida contra un *baseline* de persistencia sin *data leakage*, versiona sus artefactos/métricas en `backend/models/` y sirve inferencias en `POST /api/v1/ml/predict-ndvi`.
   - **Módulo 4:** Implementar el analizador estadístico de anomalías de monitoreo (`POST /api/v1/monitoring/analyze`) y actualizar `GET /api/v1/observations/vegetation` y `GET /api/v1/observations/status`.
   - **Módulo 5:** Completar el módulo opcional de **presupuesto/margen económico con insumos de usuario (`user_input`)** y el **indicador de reducción preventiva de pesticidas/agroquímicos**, respetando estrictamente `AGENTS.md`.
   - **Módulo 6:** Conectar todo en el Frontend (diferenciando modo **Campesino / `grower`** y modo **Agrónomo / `agronomist`**) y en las herramientas del agente Pacha.

> [!IMPORTANT]
> **Restricciones de `AGENTS.md` que DEBEN respetarse en todo momento:**
> - **Trabajo local:** No ejecutar `git push` ni desplegar servicios pagos sin autorización.
> - **Procedencia obligatoria en toda métrica:** `value`, `unit`, `status` (`observed` / `derived` / `user_input` / `scenario` / `predicted` / `unavailable`), `source`, `observed_at` (o periodo), `retrieved_at`, `spatial_resolution`, `quality`, `limitations`. En predicciones futuras incluir siempre `forecast_horizon` y `model_version`.
> - **Rigor científico:** Predicción de NDVI $\neq$ predicción de rendimiento $\neq$ salud del suelo $\neq$ diagnóstico de plagas. Nunca inventar curvas sintéticas y etiquetarlas como `observed`.

---

## 1. Módulo 1 — Segundo Producto NASA Real: `NASA MODIS MOD13Q1 v6.1 (NDVI / EVI)`

### 1.1. Fuente pública verificable y cliente HTTP (`backend/app/clients/modis.py`)
Integrar el servicio público **NASA ORNL DAAC MODIS Global Subset REST API** (que no requiere descarga de HDF4 mundiales masivos ni tokens privados para consultas puntuales/locales):
- **Endpoint base:** `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset`
- **Parámetros:**
  - `latitude={lat}&longitude={lon}`
  - `startDate=A{YYYY}{DDD}&endDate=A{YYYY}{DDD}` (conversión de `datetime.date` a día juliano `YYYYDDD`, ej. `A2024001`).
  - `kmAboveBelow=0&kmLeftRight=0` (píxel central de 250 m sobre la coordenada consultada).
- **Bandas requeridas de `MOD13Q1.061`:**
  - `250m_16_days_NDVI` (factor de escala oficial: `0.0001`, rango válido `-2000` a `10000` $\rightarrow$ `-0.2000` a `1.0000`).
  - `250m_16_days_EVI` (factor de escala oficial: `0.0001`).
  - `250m_16_days_pixel_reliability` (máscara QA: `0 = Good data`, `1 = Marginal data`, `2 = Snow/Ice`, `3 = Cloudy`, `-1 = Fill/No data`).

### 1.2. Reglas de normalización y control de calidad (`QA`)
1. Si `pixel_reliability` es `0` (`good`) o `1` (`marginal`), el punto es utilizable; etiquetar cada observación con `quality="good"` o `quality="marginal"`.
2. Si `pixel_reliability >= 2` o el valor crudo está fuera de `[-2000, 10000]`, marcar el valor de esa fecha como `ndvi=None`, `evi=None`, `quality="cloudy_or_unreliable"` (nunca interpolar silenciosamente haciéndolo pasar por observación limpia).
3. Persistir un archivo semilla real y verificable en `backend/data/demo/modis-mantaro-2023-2025.raw.json` (y su `.source.json` con URL exacta, `retrieved_at` y DOI `https://doi.org/10.5067/MODIS/MOD13Q1.061`) para la región piloto del Valle del Mantaro (`lat=-12.05, lon=-75.20`), de modo que las pruebas deterministas y el modo offline cuenten con al menos 2 años (46 composiciones de 16 días) de datos auténticos de MODIS.
4. En ubicaciones fuera de cobertura o si el servicio externo falla y no hay datos ingeridos en SQLite para esa celda, devolver `status="unavailable"` con `limitations` explícitas (incluyendo advertencia de resolución espacial: *"MODIS pixel size is 250 m × 250 m (~6.25 ha); parcels smaller than 6.25 ha share pixel reflectance with surrounding land"*).

### 1.3. Proveedor en el registro central (`backend/app/providers/modis.py` y `registry.py`)
- Crear `MODISService(BaseProvider)` heredando de `BaseProvider` en `backend/app/providers/base.py`.
- Reemplazar el stub `nasa_modis_vi` en `backend/app/providers/registry.py` por `self.register(MODISService())`.

---

## 2. Módulo 2 — Ingesta Incremental de Datos NASA (`backend/app/ingestion/` y `backend/scripts/update_observations.py`)

El proyecto debe recibir datos nuevos de la NASA a lo largo del tiempo sin descargar todo desde cero ni entrenar dentro de una petición HTTP.

### 2.1. Esquema SQLite Incremental (`backend/app/ingestion/store.py`)
En `observations.sqlite` (usando la ruta canónica de `DEFAULT_PATH`), crear las tablas:

```sql
CREATE TABLE IF NOT EXISTS observations_timeseries (
    source TEXT NOT NULL,              -- 'NASA_POWER' | 'NASA_MODIS_MOD13Q1'
    product_version TEXT NOT NULL,     -- ej. 'v2.0_MERRA2' | '061'
    cell_id TEXT NOT NULL,             -- celda/tile o coordenada normalizada (ej. '-12.0500:-75.2000')
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    observation_date TEXT NOT NULL,    -- ISO YYYY-MM-DD
    metrics_json TEXT NOT NULL,        -- JSON con T2M, T2M_MIN, T2M_MAX, PRECTOTCORR o NDVI, EVI, QA
    quality TEXT NOT NULL,             -- 'complete' | 'good' | 'marginal' | 'cloudy_or_unreliable'
    retrieved_at TEXT NOT NULL,        -- ISO UTC timestamp de descarga
    PRIMARY KEY (source, product_version, cell_id, observation_date)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    run_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    location_key TEXT NOT NULL,
    power_new_rows INTEGER NOT NULL,
    modis_new_rows INTEGER NOT NULL,
    retrained_model_version TEXT,
    status TEXT NOT NULL,
    notes TEXT
);
```

### 2.2. Proceso de actualización incremental (`backend/scripts/update_observations.py`)
Crear el script CLI ejecutable (manualmente o por tarea programada/cron local):
```bash
python -m scripts.update_observations --lat -12.05 --lon -75.20 --retrain
```
Flujo exacto del script:
1. Consulta en `observations_timeseries` la última `observation_date` registrada para `(NASA_POWER, cell_id)` y `(NASA_MODIS_MOD13Q1, cell_id)`.
2. Si la base está vacía para la región piloto, carga primero la semilla histórica verificada y luego consulta a **NASA POWER** y **NASA MODIS ORNL DAAC** únicamente el rango faltante `(last_date + 1 día) -> fecha actual` (restando el lag de publicación satelital).
3. Inserta con `INSERT OR IGNORE` / actualización por clave primaria compuesta para garantizar idempotencia (ejecutarlo 2 veces seguidas el mismo día debe insertar `0` filas duplicadas).
4. Maneja límites de API, *timeouts* y reintentos con *exponential backoff*.
5. Si `--retrain` está activo (o si ingresaron nuevos compuestos de MODIS y días de POWER), invoca automáticamente `train_and_evaluate_adaptive_model(cell_id, lat, lon)` del Módulo 3.

---

## 3. Módulo 3 — Machine Learning Adaptativo con Reentrenamiento (`backend/app/ml/`)

### 3.1. Dependencia
Añadir `scikit-learn>=1.5,<2.0` a `backend/requirements.txt`. No añadir PyTorch, TensorFlow ni dependencias pesadas de GPU.

### 3.2. Ingeniería de Features Agroclimáticos (`backend/app/ml/features.py`)
Para cada compuesto válido de 16 días de MODIS en la fecha $t$ (`observation_date`), construir el vector de características $X_t$ para predecir el objetivo $y_{t+1} = \text{NDVI}_{t+1}$ (el índice de vegetación dentro de 16 días):
- **Features satelitales pasados (MODIS):**
  - `ndvi_t`: NDVI en la fecha $t$.
  - `ndvi_lag1`: NDVI en $t - 16\text{ d}$.
  - `ndvi_lag2`: NDVI en $t - 32\text{ d}$.
  - `ndvi_delta`: $\text{NDVI}_t - \text{NDVI}_{t-16\text{d}}$ (velocidad de crecimiento o senescencia).
  - `evi_t`: EVI en la fecha $t$.
- **Features climáticos acoplados (NASA POWER agregados sobre la ventana $(t - 16\text{ d}, t]$ y $(t - 32\text{ d}, t]$):**
  - `rain_sum_16d`: Precipitación acumulada (`PRECTOTCORR`, $\text{mm}$) en los últimos 16 días.
  - `rain_sum_32d`: Precipitación acumulada ($\text{mm}$) en los últimos 32 días (memoria hídrica del suelo).
  - `t2m_mean_16d`: Temperatura media (`T2M`, $^\circ\text{C}$) en los últimos 16 días.
  - `t2m_min_abs_16d`: Temperatura mínima extrema (`T2M_MIN`, $^\circ\text{C}$) en los últimos 16 días (estrés por frío/helada).
  - `t2m_max_mean_16d`: Media de temperaturas máximas (`T2M_MAX`, $^\circ\text{C}$).
  - `thermal_range_16d`: Amplitud térmica diurna media ($\text{T2M\_MAX} - \text{T2M\_MIN}$).
- **Features de fase estacional:**
  - `sin_doy` y `cos_doy`: $\sin(2\pi \cdot \text{DOY}/365.25)$ y $\cos(2\pi \cdot \text{DOY}/365.25)$.

### 3.3. Entrenamiento, Validación Temporal y Gobernanza (`backend/app/ml/trainer.py`)
1. **Cero *Data Leakage*:** Ordenar estrictamente por `observation_date` ascendente. Partición cronológica:
   - Primer `70 %` de la serie temporal $\rightarrow$ `Train`
   - Siguiente `15 %` $\rightarrow$ `Validation`
   - Último `15 %` (más reciente) $\rightarrow$ `Test`
   - Si la serie crece con nuevas ingestas de la NASA, la ventana de entrenamiento se expande/adapta automáticamente incluyendo las nuevas observaciones verificadas.
2. **Baseline obligatorio (Persistencia):**
   - Calcular métricas de persistencia $\hat{y}_{t+1}^{\text{base}} = \text{NDVI}_t$ en `Validation` y `Test` (`baseline_mae`, `baseline_rmse`).
3. **Modelos candidatos (`scikit-learn`):**
   - Evaluar `Pipeline([StandardScaler(), Ridge(alpha=1.0)])` y `RandomForestRegressor(n_estimators=80, max_depth=5, random_state=42)` (o `HistGradientBoostingRegressor`).
   - Seleccionar el candidato con menor `RMSE` en `Validation`.
4. **Criterio de promoción (`AGENTS.md` Fase 6):**
   - Verificar que en `Test` el modelo supere al *baseline* (`model_rmse < baseline_rmse`).
   - Calcular `skill_score = 1.0 - (model_rmse / baseline_rmse)`.
   - Guardar el modelo entrenado y su manifiesto de metadatos en `backend/models/ndvi_model_registry.json` (y el artefacto serializado en `backend/models/`):
     - `model_version` (ej. `"agroshift-ndvi-ridge-v2026.11.15"`).
     - `trained_at`, `training_window_start`, `training_window_end`, `n_samples`.
     - `metrics`: `{"mae": ..., "rmse": ..., "r2": ..., "baseline_mae": ..., "baseline_rmse": ..., "skill_score": ...}`.
     - `feature_importances` / coeficientes normalizados para explicabilidad.
     - `validated_regions`: lista de celdas/bounding boxes habilitados (ej. Valle del Mantaro `lat: [-12.6, -11.5], lon: [-75.8, -74.8]` + cualquier celda que acumule $\ge 24$ compuestos MODIS válidos en SQLite).

### 3.4. Inferencia y Rechazo Tipado (`backend/app/ml/predictor.py`)
- Si el usuario solicita predicción para una coordenada `(lat, lon)` fuera de `validated_regions` (y sin serie MODIS local suficiente en SQLite), devolver HTTP `200` (o `422` según contrato) con estado tipado explícito:
  ```json
  {
    "status": "model_unavailable_for_region",
    "reason": "This coordinate does not yet have a validated MODIS + NASA POWER historical training series.",
    "fallback": "Using deterministic observational rules and FAO-56 agronomic thresholds."
  }
  ```
- Si la coordenada está cubierta, devolver la predicción con:
  - `predicted_ndvi`: `Metric` con `status="predicted"`, `forecast_horizon="16_days"`, `target_date`, `uncertainty_band=[pred - rmse, pred + rmse]`.
  - `current_ndvi`: último NDVI observado real y su fecha.
  - `expected_delta`: cambio proyectado ($\hat{y}_{t+1} - \text{NDVI}_t$) e interpretación descriptiva (`"increasing_vigor"`, `"stable_canopy"`, `"senescence_or_water_stress"`).
  - `model_metadata`: `model_version`, `trained_at`, `training_window`, `metrics` (`mae`, `rmse`, `r2`, `baseline_rmse`, `skill_score`), `top_drivers`.
  - `limitations`: lista obligatoria recordando que NDVI mide verdor de dosel a 250 m y no equivale a rendimiento en toneladas ni diagnóstico fitosanitario.

---

## 4. Módulo 4 — Endpoints REST y Herramientas de Pacha IA

### 4.1. Nuevos Endpoints y Actualizaciones en `backend/app/api/routes/`
1. **`GET /api/v1/observations/vegetation?lat=&lon=&start=&end=`** (en `observations.py`):
   - Devuelve la serie temporal de **NASA MODIS MOD13Q1 v6.1** (`NDVI`, `EVI`, `pixel_reliability`, `quality`), resumen estadístico (`ndvi_mean`, `ndvi_min`, `ndvi_max`, `valid_composites_count`, `cloudy_composites_count`) y metadatos de procedencia completos.
2. **`GET /api/v1/observations/status?lat=&lon=`** (en `observations.py`):
   - Incluir en el diccionario de respuesta:
     - Estado real de `nasa_modis_vi` (`"data_available"` en región con serie activa, `"outside_coverage"` o `"unavailable"` fuera de ella).
     - Bloque `ingestion_sync`: `last_power_date`, `last_modis_date`, `last_sync_at`.
     - Bloque `adaptive_ml`: `model_version`, `trained_at`, `is_covered_for_ml`, `rmse`, `skill_score`.
3. **`POST /api/v1/monitoring/analyze`** (nuevo router `backend/app/api/routes/monitoring.py`):
   - Recibe `{ "lat": float, "lon": float, "start": date, "end": date }`.
   - Calcula **anomalías descriptivas verificables** (nunca diagnósticos de plagas):
     - Anomalías térmicas (días con `T2M_MIN < 2 °C` para alerta de helada, días sobre percentil 90 de calor).
     - Anomalías de lluvia (racha máxima de días secos consecutivos `dry_spell_days`, proporción de lluvia concentrada).
     - Anomalías de vegetación MODIS (si hay serie disponible: $z$-score del último NDVI frente a la media del periodo y caída abrupta $\Delta\text{NDVI} < -0.12$).
4. **`POST /api/v1/ml/predict-ndvi`** (nuevo router `backend/app/api/routes/ml.py`):
   - Recibe `{ "lat": float, "lon": float, "trigger_update": bool = False }`.
   - Si `trigger_update=True`, ejecuta primero una sincronización incremental rápida de observaciones para la celda y, si hay nuevos datos, reentrena el modelo antes de devolver la inferencia.
   - Registra `monitoring_router` y `ml_router` en `backend/app/main.py`.

### 4.2. Herramientas del Asistente Pacha (`backend/app/assistant/service.py` y `schemas.py`)
Agregar a las herramientas permitidas de Gemini:
- `get_vegetation_ndvi`: consulta la serie MODIS MOD13Q1 y las anomalías de monitoreo para el campo activo.
- `predict_future_ndvi`: consulta la predicción ML adaptativa a +16 días y explica al usuario tanto el valor proyectado como las métricas de confiabilidad del modelo.

---

## 5. Módulo 5 — Cierre de Valor Agronómico y Económico (`user_input` + Reducción de Pesticidas)

Para que el proyecto resuelva de forma redonda las necesidades del jurado sin violar ninguna regla de `AGENTS.md`:

1. **Indicador Explícito de Reducción de Pesticidas y Agroquímicos (`ipm_chemical_reduction`):**
   - En `evaluate_sequence_agronomy` (`backend/app/simulation/rotations.py`), añadir a `SequenceAgronomicAssessment`:
     - `pesticide_dependency_reduction`: `"high" | "moderate" | "low"` (calculado en función de la ruptura de ciclos de hospederos por alternancia de familias botánicas + supresión natural de malezas por `soil_cover_rating`).
     - `synthetic_fertilizer_offset_kg_n_ha`: nitrógeno biológico fijado por leguminosas en la secuencia que evita compra innecesaria de fertilizante nitrogenado sintético (y reduce susceptibilidad foliar a plagas chupadoras por exceso de nitrógeno nítrico).
2. **Evaluación Económica Transparente Basada en Datos del Usuario (`user_input`):**
   - En `CompareRequest` (`backend/app/simulation/rotations.py`) y en el Simulador 3D (`frontend/src/features/field3d/fieldSimulation.ts`), permitir un bloque opcional aportado por el usuario:
     - `economic_inputs`: `{ "area_ha": float, "cost_per_ha": float, "expected_yield_t_ha": float, "price_per_ton": float, "currency": str }`.
   - Regla estricta (`AGENTS.md` Sección 7):
     - Si el usuario **no** ingresa costos/precios, mantener `profitability: null` con la nota explicativa actual.
     - Si el usuario **sí** ingresa sus costos/precios locales, devolver `economic_summary` etiquetado explícitamente como `status="user_input"` / `status="scenario"`, calculando `total_cost`, `gross_revenue`, `net_margin`, `break_even_yield_t_ha` y el ahorro estimado por fijación biológica de nitrógeno sobre las hectáreas reales de su parcela (`allocatedAreaHa`).

---

## 6. Módulo 6 — Integración en el Frontend (`React + TypeScript`)

1. **Tipado y cliente API (`frontend/src/types/index.ts` y `frontend/src/services/api.ts`):**
   - Añadir interfaces `VegetationResponse`, `MonitoringAnalysisResponse`, `NdviPredictionResponse` y las funciones `fetchVegetation`, `analyzeMonitoring` y `predictNdvi`.
2. **Escena de Monitoreo / Clima (`frontend/src/features/journey/ClimateScene.tsx`):**
   - Añadir la pestaña/lección **"Canopy greenness (NASA MODIS) & 16-day ML forecast"**:
     - Gráfico o tarjeta con la serie real de **NASA MODIS MOD13Q1 (NDVI/EVI)** cada 16 días, mostrando qué puntos tuvieron cobertura limpia (`good`) y cuáles nubes (`cloudy`).
     - Tarjeta de **Predicción ML Adaptativa (+16 días)** con botón **"Sync NASA & update model"**:
       - **Vista Campesino (`role === 'grower'`):** Explicación en letra grande y sencilla (ej. *"Satellite greenness is 0.64 and our adaptive model projects 0.68 in the next 16 days thanks to recent rainfall"*).
       - **Vista Agrónomo (`role === 'agronomist'`):** Muestra `model_version`, fecha de último reentrenamiento, ventana de datos, métricas `MAE`, `RMSE`, `R²`, comparación contra el *baseline* de persistencia (`skill_score`), resolución `250 m` y tabla de anomalías ($z$-score).
3. **Simulador 3D de Parcela (`frontend/src/features/field3d/FieldExplorer.tsx`):**
   - Mostrar dentro de la tarjeta del simulador:
     - El sello de **Prevención de Plagas / Reducción de Agroquímicos** (según familia botánica y fijación de $\text{N}_2$).
     - Si hay serie MODIS/ML cargada para la ubicación, mostrar el estado actual del dosel (`MODIS NDVI`) y la tendencia ML a +16 días.
     - Sección desplegable opcional **"My local costs & harvest estimate (user input)"** para que el agricultor calcule su presupuesto en función de las hectáreas (`allocatedAreaHa`) seleccionadas en las 4 zonas 3D (`NW`, `NE`, `SW`, `SE`).

---

## 7. Plan de Pruebas y Criterios de Aceptación Obligatorios

Antes de dar por cerrado el trabajo, ejecutar y reportar:

1. **Pruebas unitarias e integración en Backend (`pytest`):**
   - Crear `backend/tests/test_modis_and_ingestion.py` y `backend/tests/test_adaptive_ml.py`:
     - Verificar decodificación de escala `0.0001` y filtro de calidad `pixel_reliability` de MODIS.
     - Verificar idempotencia de `update_observations.py` (no duplica fechas ya existentes en SQLite y sí agrega fechas nuevas).
     - Verificar que el entrenamiento ML respeta el orden temporal (sin *leakage*), calcula `baseline_rmse`, supera al *baseline* en datos reales del Mantaro y guarda `model_version`.
     - Verificar que una coordenada fuera de la región validada devuelve `status == "model_unavailable_for_region"`.
     - Verificar el cálculo económico con `user_input` y que sin insumos de usuario `profitability` sigue siendo `None`.
2. **Compilación y Pruebas E2E en Frontend:**
   - `npm run build` (`tsc --noEmit && vite build`) con **0 errores**.
   - Pruebas Playwright (`npx playwright test`) verificando la visualización de MODIS NDVI, la predicción ML (+16 días), el cambio entre vistas `Grower` y `Agronomist`, y cero violaciones de accesibilidad WCAG (`@axe-core/playwright`).
3. **Documentación (`docs/`):**
   - Actualizar `docs/progress.md`, `docs/methodology.md`, `docs/sources.md` y `docs/limitations.md` reflejando la integración real de **NASA MODIS MOD13Q1 v6.1** y el pipeline de **ML adaptativo con ingesta incremental**.
