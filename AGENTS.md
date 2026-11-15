# AGENTS.md — AgroShift | NASA Space Apps Challenge 2026

> Instrucciones persistentes para Codex al abrir la raíz del proyecto. Actualización: 2026-11-14. Idioma de trabajo: español. Estas reglas sustituyen la versión anterior, que excluía ML por completo.

## 1. Misión y límites científicos

Crear **AgroShift**, plataforma web de apoyo a decisiones agrícolas para agricultores y profesionales. Debe resolver **dos necesidades complementarias** en un solo producto:

- **Monitorear cultivos existentes:** explorar clima reciente e histórico, series de índices de vegetación, anomalías observadas y, opcionalmente, predicciones experimentales validadas.
- **Planificar futuras campañas:** comparar como mínimo tres **secuencias de rotación de cultivos** (incluida la habitual) bajo escenarios climáticos y de disponibilidad de agua; exponer riesgos y compromisos, sin decisiones automáticas definitivas.

Reto oficial: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/

La comparación de rotaciones es el **núcleo evaluable del reto**; monitoreo es soporte y valor complementario. Alcance diseñado para múltiples regiones del mundo, pero **cobertura funcional y validación explícitas por localidad**. Un mapa mundial no autoriza afirmar que todas las predicciones funcionan mundialmente. Aplicación de ayuda a decisiones, NO certificación de aptitud agrícola ni sustituto profesional.

## 2. Restricciones de ejecución

- **Solo trabajo local** dentro de la carpeta abierta. NO inicializar Git, crear repositorios, commits, remotos, pushes, PRs, despliegues ni sincronizaciones. El usuario gestionará GitHub y publicación manualmente.
- No solicitar ni utilizar claves privadas sin necesidad. Proveer `.env.example`; nunca incluir credenciales, tokens o datos privados en código, ejemplos o logs.
- No utilizar servicios ni proveedores de datos de origen chino. Fuentes elegidas: NASA, FAO, OSM y otras fuentes verificadas no chinas, cuando sean pertinentes.
- No entrenar modelos pesados, descargar archivos mundiales masivos, instalar Docker, configurar PostgreSQL/PostGIS ni activar servicios de pago sin autorización expresa.
- Consultas online SOLO para fuentes públicas requeridas y explícitas; no realizar despliegues.
- Antes de modificar, inspeccionar los archivos existentes y proteger el trabajo del usuario. Cambios incrementales, pruebas y reporte después de cada etapa. No afirmar que una prueba pasó sin ejecutarla.

## 3. Stack base

**Frontend:** React + Vite + TypeScript, Tailwind CSS, React Leaflet/Leaflet, Recharts. Opcional Motion para microinteracciones no prioritarias, compatible con `prefers-reduced-motion`.

**Backend:** Python 3.11+, FastAPI (NO un microservicio Flask separado), Pydantic, HTTPX, pytest. Clientes externos, ingesta, caché, motor de simulación y evaluación desacoplados.

**Persistencia inicial:** SQLite para parcelas de demostración, observaciones normalizadas, caché, ejecuciones de simulación y referencias a modelos. Usar JSON/GeoJSON para fixtures. Diseñar repositorios/interfases de almacenamiento para migrar a PostgreSQL/PostGIS cuando sea justificado.

**ML opcional, después del MVP:** scikit-learn para experimento tabular pequeño; entrenar offline, versionar modelo/métricas y cargar artefactos verificados para inferencia. No incluir DL, GPU, streaming satelital global ni entrenamiento por petición. Sin dependencias ML si no se inicia esa fase.

**Operación local:** frontend `http://localhost:5173`, API `http://localhost:8000`, `/api/v1`. Usar proxy de Vite o CORS restringido. Sin autenticación para demo local; documentar riesgos y controles requeridos antes de exposición pública.

## 4. Datos y procedencia

Mínimo **dos productos NASA realmente integrados**, nunca una imagen decorativa o una curva sintética etiquetada como observación.

**NASA POWER — climático, dinámico:** https://power.larc.nasa.gov/docs/services/api/temporal/daily/ . Consultar series por ubicación y rango temporal usando parámetros verificados (p.ej. `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`). Validar latitud/longitud, unidades, valores ausentes, fechas y tiempos de respuesta. Caché local, reintentos limitados, atribución y registro de fecha de observación y de descarga. No vender climatologías como pronósticos. Tener cuidado en montañas por resolución de la cuadrícula.

**NASA MODIS MOD13Q1 v6.1 — NDVI/EVI:** https://doi.org/10.5067/MODIS/MOD13Q1.061 . Resolución nominal ~250 m, composiciones cada 16 días, máscaras de calidad y escala de NDVI (0.0001). Integrar al menos una **serie real verificable** de región piloto con script reproducible, referencia exacta y atributos de calidad; para ubicaciones sin producto disponible mostrar `unavailable`. No atribuir precisión de parcela pequeña al píxel MODIS.

**HLS/HLS-VI — evolución opcional:** https://hls.gsfc.nasa.gov/data-access-and-tools/ . Mejor resolución (~30 m), mayor costo de integración; no bloquear el MVP.

**Fuentes externas:** criterios agronómicos de FAO-56 (https://www.fao.org/4/x0490e/x0490e00.htm), cartografía OSM bajo su política (https://operations.osmfoundation.org/policies/tiles/). Permitir datos de suelo provistos por el usuario. No hacer dependiente el sistema de SoilGrids REST si no está operativo. No inventar rendimientos, precios, nutrientes del suelo ni enfermedades.

Toda cifra relevante debe incluir: `value`, `unit`, `status` (`observed`/`derived`/`user_input`/`scenario`/`predicted`/`unavailable`), `source`, `observed_at` o periodo, `retrieved_at` si procede, `spatial_resolution`, `quality`, `limitations` cuando corresponda. Para datos futuros mantener `forecast_horizon` y `model_version`.

**Regla crítica:** predicción de NDVI ≠ predicción de rendimiento ≠ medición de salud del suelo ≠ idoneidad de una rotación. No inferir causalidad a partir de correlaciones satelitales. No diagnosticar plagas con NDVI.

## 5. Arquitectura modular y dos flujos

```text
agroshift/
├── AGENTS.md
├── README.md
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── sources.md
│   ├── methodology.md
│   ├── decisions.md
│   ├── progress.md
│   └── limitations.md
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/{map,parcel,monitoring,rotations,scenarios,results}/
│       ├── services/api.ts
│       └── types/
└── backend/
    ├── .env.example
    ├── app/
    │   ├── main.py
    │   ├── api/routes/
    │   ├── clients/{power,modis}/
    │   ├── data/{models,repository,schemas}/
    │   ├── ingestion/
    │   ├── monitoring/
    │   ├── simulation/
    │   ├── evaluation/
    │   └── ml/  # solo cuando fase ML esté autorizada
    ├── scripts/
    ├── data/demo/
    ├── data/cache/  # ignorar
    ├── models/      # ignorar artefactos grandes; datos de procedencia
    └── tests/
```

**Flujo 1 — monitoreo:** el usuario elige coordenadas o parcela → API lee observaciones verificadas y procesadas → muestra temperaturas, lluvias, NDVI (cuando hay), evolución y posibles anomalías estadísticas (con método explícito). Información insuficiente = advertencia. ML de NDVI futuro es independiente y opcional.

**Flujo 2 — planificación:** el usuario describe rotación previa, cultivo, temporadas, agua, suelo conocido, preferencias → API compara 3 rotaciones (secuencias por campaña), escenarios de lluvia/agua y estimaciones permitidas por los coeficientes disponibles → presenta ventajas, riesgos y datos faltantes. Las observaciones del flujo 1 pueden contextualizar, NO determinar automáticamente una rotación óptima.

**Vista agricultor:** preguntas sencillas y explicación en lenguaje accesible. **Vista técnica/asesor:** procedencia, parámetros, supuestos, intervalos, calidad y advertencias. No crear dos backends ni duplicar lógica de ciencia.

## 6. Automatización e inferencia: no procesar el mundo entero

- Crear un proceso de actualización **fuera del ciclo HTTP** (`backend/scripts/update_observations.py`) para regiones piloto y parcelas registradas, inicialmente ejecutado manualmente o por programador local. NO utilizar entrenamiento dentro de un endpoint web.
- Controlar incrementalidad con `source + product_version + tile/cell + location + observation_date` o una clave equivalente. No reingestar el mismo dato; guardar fechas de adquisición y observación.
- Respetar latencia, nubes, QA, faltantes, límites API, backoff y errores temporales. Data nueva no garantiza datos utilizables de hoy.
- Guardar **features** y metadatos en SQLite en vez de depender de imágenes completas para cada consulta. No descargar datos espaciales mundialmente por defecto.
- Para predicciones ML: inferencia sobre features de zonas cubiertas. Reentrenamiento **offline** programado solo tras disponer de datos adicionales y validación. Mantener `model_version`, métricas, cobertura espacial/temporal, calibración si procede, estado de vigencia; el backend debe seguir funcionando sin modelo.
- Si hay una región no validada para ML, retornar `model_unavailable_for_region` y utilizar únicamente información observacional y simulación documentada.

## 7. Motor de evaluación y límites

- Separar rigurosamente: `observation` (dato NASA) → `derived indicator` (estadística) → `prediction` (ML evaluado) → `scenario` (hipótesis de usuario) → `assessment` (interpretación agronómica).
- Para demanda hídrica cuantitativa, solo si hay insumos: `ETc = Kc × ETo`, con Kc de cultivo/etapa, ETo y unidades justificables. Si faltan, no mostrar milímetros inventados. Preferir `unknown` a 0.
- No convertir automáticamente la predicción de NDVI en toneladas, diagnóstico de enfermedad, probabilidad de riesgo o «mejor cultivo».
- Comparar alternativas por métricas disponibles y mostrar compensaciones. Describir fórmulas, limitaciones y factores. Si existe ranking heurístico, exponer sus pesos y NO presentarlo como probabilidad científica.
- Valores económicos solo si hay rendimientos, costos y precios aportados o fuentes verificadas; incluir moneda y fecha.
- La idoneidad debe depender de compatibilidad cultivo-suelo-clima-manejo, restricciones conocidas y prioridades, no únicamente NDVI.
- No presentar decisiones como «siembra garantizada» ni ocultar los datos insuficientes. Ofrecer revisión profesional cuando corresponda.

## 8. API sugerida

- `GET /api/v1/health`
- `GET /api/v1/observations/climate?lat=&lon=&start=&end=`
- `GET /api/v1/observations/vegetation?lat=&lon=&start=&end=`
- `GET /api/v1/observations/status?lat=&lon=`
- `GET /api/v1/crops` (catálogo documentado)
- `POST /api/v1/monitoring/analyze` (anomalías descriptivas, no diagnósticos)
- `POST /api/v1/rotations/compare` (3 estrategias, hipótesis, restricciones)
- `POST /api/v1/ml/predict-ndvi` (solo fase ML; retornar rechazo tipado si no disponible)

Diseñar esquemas de API Pydantic / TypeScript explícitos. Errores JSON consistentes, validación de tamaños, rangos y fechas. No consultar satélites por cada movimiento de slider; caché y parámetros confirmados primero.

## 9. Fases con criterios de aceptación (no mezclar)

**Fase 0 — plan + entorno:** inspeccionar proyecto, README, docs, entorno Python/Node, mapa de dependencias. Nada de despliegue.

**Fase 1 — interfaz compartida:** React, mapa global, selector de ubicación, perfil agrícola, navegación «Monitorear» y «Planificar» y estado responsive; backend FastAPI `/health`. Sin datos NASA ficticios etiquetados como reales. Pruebas de interfaz y arranque.

**Fase 2 — NASA POWER real:** consulta regional, normalización, fechas, unidades, caché y gráfico en Monitorear. Testear error NASA, datos ausentes y límites.

**Fase 3 — motor de rotaciones:** tres secuencias editables, escenarios hídrico/climáticos y comparaciones explicables; pruebas de invariantes y limitaciones. El resultado NO usa ML por defecto.

**Fase 4 — segundo NASA y monitoreo:** MODIS NDVI real para región piloto, QA, fechas, fuente, variación temporal y estados `unavailable` fuera de cobertura configurada; script de ingesta incremental local. Demostrar dos NASA genuinos.

**Fase 5 — integración y auditoría:** recorrido extremo a extremo, procedencia en todos los resultados, demo móvil y escritorio, revisar calidad y fallos. Preparar evidencia de ejecución.

**Fase 6 — ML opcional si fases 1–5 están verificadas:** experimento de predicción NDVI temporal con features POWER + MODIS, scikit-learn, train/validation/test por tiempo y regiones, comparar con persistencia, evitar leakage. Añadir API solo si supera baseline y se conoce ámbito de aplicación. Si falla, documentar resultados y mantener sistema determinista.

## 10. Convenciones Codex y pruebas obligatorias

1. Antes de cada fase, mostrar plan acotado con archivos a modificar, riesgo y criterios de aceptación. Implementar SOLO una fase solicitada.
2. Ejecutar tests + build y comprobar respuestas API reales cuando la fase lo requiera. Informar comandos ejecutados, salidas resumidas y fallos.
3. Actualizar `docs/progress.md` (hecho, pendiente, probado, bloqueos), `docs/decisions.md` y `docs/methodology.md` cuando cambien los supuestos. Nunca inventar estado completado.
4. Mantener separadas pruebas con mocks deterministas (etiquetados) y pruebas de integración con NASA real. Si falla la conexión externa, documentar y NO declarar integración completa.
5. Casos críticos: ambos hemisferios, montaña, cruces de año, NDVI sin datos, suelo desconocido, parcelas menores que un píxel MODIS, slider en 100 % y 70 %, datos con QA malo, red caída, modelo ML ausente y error del servidor.
6. UI accesible: texto en español, teclado, contraste, colores + iconos, móvil, lat/lon manual y atribución OSM. Preparada para internacionalización, sin moneda/estacionalidad peruana fija.
7. Consultar documentación actual de paquetes antes de introducir código sensible a versiones. No sobrescribir archivos existentes sin revisarlos.
8. Al finalizar cada fase: resumen de archivos, pruebas efectivamente ejecutadas, evidencia de datos NASA, riesgos abiertos y **próxima tarea concreta**. No continuar automáticamente a otra fase salvo indicación del usuario.
