# Arquitectura prevista

Estado: demo local con página del proyecto, interfaz, mapa y perfil en memoria, API de estado, cliente NASA POWER, caché SQLite y comparación estructural de tres rotaciones. MODIS e ingesta satelital incremental siguen pendientes; no existe motor de aptitud agronómica ni ML.

## Componentes

| Capa | Responsabilidad | Dependencias previstas |
| --- | --- | --- |
| Interfaz | Ubicación y perfil compartidos; recorridos Monitorear y Planificar | React, Vite, TypeScript, Tailwind CSS |
| Mapa | Selección global, entrada manual y atribución cartográfica | React Leaflet, Leaflet, teselas OSM según política |
| Gráficos | Series temporales con unidades, procedencia y faltantes | Recharts, desde Fase 2 |
| API | Validar contratos y coordinar servicios | Python 3.12, FastAPI, Pydantic, Uvicorn |
| Clientes | Consultar proveedores con timeout y reintentos limitados | HTTPX, desde Fase 2 |
| Persistencia | Parcelas, observaciones, caché y ejecuciones normalizadas | SQLite mediante repositorios desacoplados |
| Ciencia | Indicadores descriptivos y comparación de escenarios | Módulos Python independientes de HTTP e interfaz |
| Ingesta | Actualizar observaciones fuera de peticiones web | Script local incremental, desde Fase 4 |
| Pruebas | Contratos, errores, reglas y recorridos | pytest y herramientas de interfaz por seleccionar |

Versiones principales verificadas e instaladas: React 19.3.1, Vite 8.3.8, TypeScript 5.9.x, React Leaflet 5.0.0, Leaflet 1.9.4, Tailwind 4.3.5 y plugin React 6.3.0; FastAPI 0.163.0, Pydantic 2.14.3, Uvicorn 0.54.0 y HTTPX 0.28.1. Los árboles resueltos se conservan en `frontend/package-lock.json` y `backend/requirements.lock.txt`. Recharts y ML no se instalaron: se incorporarán cuando se implementen sus funciones.

`App` mantiene la ubicación confirmada, el perfil guardado, el recorrido activo y la vista técnica. `useClimate` conserva la consulta climática y cancela peticiones anteriores al cambiar de ubicación. `RotationPlanner` conserva borradores y resultado al alternar Monitorear/Planificar; los invalida si cambia el contexto climático o suelo/agua. El perfil y los escenarios no persisten al recargar. La consulta `getHealth` tiene cancelación, timeout de cinco segundos, validación de respuesta y reintento manual. El estado de salud solo certifica que la API responde.

El backend separa el router `health` del punto de entrada y usa esquemas Pydantic. Errores HTTP, de validación e internos comparten el sobre `error` con `code` y `message`. El proxy de Vite mantiene las llamadas del navegador en el mismo origen, sin CORS abierto. Las pruebas API utilizan HTTPX con transporte ASGI y las de navegador Playwright con Edge local; estas últimas recorren también el proxy y FastAPI reales.

## Módulos de la entrega demo

- `features/project/ProjectPage.tsx`: página de presentación con ilustración SVG conceptual y fuentes. Ruta de entrada `/` o `/#proyecto`; la app se abre en `/#demo`, `/#monitorear` o `/#planificar`.
- `features/monitoring/ClimatePanel.tsx`: fechas confirmadas, gráfico Recharts, tabla, métricas, procedencia y exportación. Carga diferida separada del bundle principal.
- `clients/power.py`: HTTPX, timeout de 25 segundos por intento, máximo dos intentos, normalización y agregados. Sin llamadas por cada movimiento del mapa.
- `data/climate_cache.py`: SQLite local con TTL de siete días y payload con versión de producto. `data/climate_schemas.py`: contratos explícitos de respuesta.
- `api/routes/observations.py`: consulta climática y ejemplo auténtico guardado, siempre vinculado a sus coordenadas y fechas.
- `simulation/rotations.py`: motor puro de conteos estructurales y escenario, independiente de HTTP e interfaz. `api/routes/rotations.py` resuelve la referencia climática desde el backend, sin confiar en cifras NASA enviadas por el cliente.
- `scripts/refresh_demo.py` y `scripts/verify_power_integration.py`: descarga reproducible y evidencia HTTP real. No son una ingesta satelital global ni automatización completa.
- `Start-AgroShift.ps1`, `DEMO.cmd`, `STOP_DEMO.cmd`: arranque y parada de procesos propios, escucha local, logs y PIDs con fecha de creación en `.local/`.

## Actualización funcional Pacha Pulse

`UserRole` (`grower`/`agronomist`) modifica instrucciones y apertura de tablas/método sobre el mismo estado y motor. `features/parcel/geometry.ts` contiene validación y cálculo del polígono, independiente de React, con Turf 7.4.0. `useParcelBoundary.ts` conserva una Feature GeoJSON en localStorage versionado. `features/map/LocationMap.tsx` es el adaptador interactivo: mapa, borrador, coordenadas, marcadores, importación/exportación y anuncios accesibles. `App` comparte el contorno confirmado y el punto de consulta entre recorridos. El backend sigue recibiendo coordenadas puntuales; no se añade un servicio de promedio zonal.

Los estilos añadidos son controles funcionales aislados; el contrato para sustituir la presentación está en [functional-handoff.md](functional-handoff.md). El lanzador selecciona puertos libres y vincula cada proceso a su raíz/PID/fecha para no interferir con otra copia del proyecto. Playwright admite puertos aislados 5174/8001 para la comprobación de esta carpeta.

## Distribución prevista

```text
frontend/
  src/
    app/
    components/
    features/{map,parcel,monitoring,rotations,scenarios,results}/
    services/api.ts
    types/
backend/
  app/
    main.py
    api/routes/
    clients/{power,modis}/
    data/{models,repository,schemas}/
    ingestion/
    monitoring/
    simulation/
    evaluation/
  scripts/
  data/{demo,cache}/
  tests/
docs/
```

La estructura se creará incrementalmente. No habrá módulo ni dependencias ML hasta una fase opcional autorizada.

## Recorridos y contratos

Monitorear: ubicación confirmada → API → cliente/caché de observaciones → normalización y control de calidad → estadísticas descriptivas → vista agricultor o técnica sobre los mismos resultados.

Planificar: ubicación y perfil → tres secuencias, campañas y restricciones → escenarios de agua/clima → motor independiente → comparación con datos faltantes y compromisos. Las observaciones dan contexto; no constituyen una recomendación automática.

La ubicación y el perfil serán compartidos entre módulos. El cliente consultará datos al confirmar parámetros; mover un slider no disparará consultas satelitales.

Operación prevista: frontend en `http://localhost:5173`, backend en `http://localhost:8000`, prefijo `/api/v1`, proxy de Vite hacia el backend local. Los procesos se limitarán a la interfaz local. API y cliente tendrán esquemas Pydantic/TypeScript explícitos, errores JSON consistentes y estados de carga, error y ausencia de datos.

Cada dato relevante conservará valor, unidad, estado, fuente, periodo o fecha de observación, fecha de descarga cuando proceda, resolución, calidad y limitaciones. Un valor ausente no se convertirá en cero.

SQLite se accederá mediante interfaces de repositorio para poder migrar posteriormente sin acoplar la lógica científica. La ingesta utilizará una clave única equivalente a fuente, versión del producto, celda/ubicación y fecha de observación.
