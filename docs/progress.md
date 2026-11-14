# Progreso de AgroShift

Fecha: 2026-11-14, zona horaria America/Lima.

## Fase 0 — Completada

### Hecho

- Leídos `../AGENTS.md` y `../GUIA_CODEX_AGROSHIFT.md`; el primero rige el proyecto y la guía aporta contexto.
- Inspeccionada la carpeta abierta `C:\Users\ANTONY\Documents\ANTONY\Farm_Project`: cero entradas, incluidos archivos ocultos, antes de los cambios.
- Verificados Python, Node, npm, pip, SQLite y módulos de creación de entornos.
- Creados README y documentos de arquitectura, fuentes, metodología, decisiones, limitaciones y progreso.
- Definidos alcance, dependencias y criterios de aceptación por fase. No se creó código funcional, entorno virtual ni manifiestos de paquetes.

### Comprobaciones ejecutadas

| Comando / comprobación | Resultado |
| --- | --- |
| `Get-ChildItem -Force` e inventario JSON con `Get-Location` | Raíz confirmada; 0 entradas iniciales |
| `rg --files` filtrado por instrucciones, README y manifiestos | Sin coincidencias; código 1 esperado por carpeta vacía |
| `rg --version` | ripgrep 15.2.0 |
| `Get-Content` de los dos Markdown proporcionados | Leídos; AGENTS releído explícitamente como UTF-8 |
| `Get-Command node,npm,python,py` | Cuatro herramientas disponibles |
| `node --version` / `npm --version` | v22.15.0 / 10.9.2 |
| `python --version` / `py --list-paths` | Python 3.12.10; lanzador con 3.14 predeterminado y 3.12 disponible |
| `py -3.12 -c "import sys, sqlite3, venv, ensurepip; ..."` | Python 3.12.10, SQLite 3.49.1; importaciones correctas |
| `py -3.12 -m pip --version` | pip 25.0.1 para Python 3.12 |

Verificación documental ejecutada mediante un script Python enviado por PowerShell a `py -3.12 -`: 7 documentos UTF-8 válidos, 8 enlaces locales existentes y 0 archivos fuera del alcance; resultado OK, código de salida 0. Se comprobaron existencia, contenido no vacío, ausencia de caracteres de sustitución y coincidencia del inventario con los archivos previstos. No se comprobaron enlaces externos.

No se ejecutaron pytest, build ni peticiones HTTP: todavía no existe aplicación. No se han integrado productos NASA ni utilizado mocks para afirmar datos reales.

### Pendiente y bloqueos

No se detectaron bloqueos para finalizar la planificación. Sigue pendiente comprobar la compatibilidad de paquetes y los accesos externos cuando cada fase los requiera. No hay región piloto seleccionada ni acceso MODIS verificado.

| Fase | Estado |
| --- | --- |
| 0 — Plan y entorno | Completada |
| 1 — Interfaz compartida y health | Completada; evidencia abajo |
| 2 — NASA POWER | Implementada y verificada; entrega demo en curso |
| 3 — Rotaciones | Demo estructural implementada y verificada; aptitud agronómica fuera de alcance |
| 4 — MODIS e ingesta | Pendiente: ORNL no respondió; sin datos descargados |
| 5 — Auditoría integrada | Auditoría de demo realizada; MVP completo con dos NASA pendiente |
| 6 — ML opcional | No iniciada; requiere solicitud y fases previas verificadas |

## Fase 1 — Completada

### Hecho

- Creado `frontend/`: React/Vite/TypeScript, Tailwind, React Leaflet/Leaflet, iconos locales Lucide, estilos responsive y favicon SVG. Navegación Monitorear/Planificar, coordenadas manuales o mapa, perfil opcional compartido, vista técnica y estados sin datos honestos.
- Creado `backend/`: entorno Python 3.12, FastAPI, Pydantic, router `/api/v1/health` y sobre de errores JSON.
- Añadidos proxy local, timeout/cancelación y reintento de conexión, `.env.example`, exclusiones de generados y lockfiles. README con comandos reales de arranque y pruebas.
- Escritas 3 pruebas API y 6 recorridos E2E ejecutados en dos proyectos (12 pruebas: escritorio y móvil). Capturas y reporte en [verification-phase1.md](verification-phase1.md).
- Actualizados arquitectura, fuentes, decisiones, metodología y limitaciones.

### Probado

| Comando | Resultado final |
| --- | --- |
| `npm install` en frontend | Instalación correcta; auditoría inicial: 0 vulnerabilidades |
| `py -3.12 -m venv .venv` y pip con requirements en backend | Entorno y dependencias instalados localmente |
| `.venv\Scripts\python.exe -m pip check` | No broken requirements found |
| `.venv\Scripts\python.exe -m pytest -q` | 3 passed in 0.69s; sin advertencias tras ajustar transporte |
| `npm run build` | TypeScript y Vite correctos; JS 396,64 kB (121,77 kB gzip), CSS 34,42 kB |
| `npm run test:e2e` | 12 passed (16.6s), Edge headless escritorio + móvil emulado |
| HTTP real mediante proxy Vite | `/api/v1/health`: 200 y JSON esperado de FastAPI |
| Axe WCAG A/AA | Sin violaciones detectadas en ambos recorridos y tamaños probados |

El primer pase E2E tuvo 10 aprobadas y 2 fallidas por contraste; se oscurecieron textos secundarios y se aumentaron tamaños pequeños. El segundo pase completo aprobó las 12. Primer pytest tuvo aviso de deprecación del TestClient de Starlette; se usó ASGITransport sin nueva dependencia y el pase final quedó sin avisos. Las advertencias de entorno de consola `NO_COLOR/FORCE_COLOR` no afectaron la aplicación.

### Evidencia NASA, riesgos y cierre

**Cero productos NASA integrados**, conforme al alcance de esta fase; sin mocks presentados como observaciones. OSM real únicamente como cartografía. No hay cálculo de rotaciones, estadísticas climáticas, NDVI, persistencia de perfil ni ML. Móvil fue emulado, no físico. Conectividad NASA y piloto MODIS siguen pendientes. Los servidores de pruebas se cerraron al terminar; no se ejecutaron comandos Git ni despliegues.

## Próxima tarea concreta

### Cambio de alcance autorizado: demo en una hora

El usuario solicitó continuar hacia una demo y página del proyecto en una hora. Se autorizan etapas consecutivas para esta entrega, manteniendo implementación y verificación por etapa. Prioridad: POWER real, comparación explicable de tres secuencias y página del proyecto; ML excluido y MODIS solo si se integra de forma auténtica sin comprometer la entrega.

### Fase 2 — Evidencia 2026-11-14

Implementados cliente HTTPX, validación de coordenadas/fechas y límite de 366 días, unidades verificadas, faltantes normalizados a `null`, reintento limitado, caché SQLite de siete días y esquemas Pydantic/TypeScript. Monitorear permite elegir fechas, consultar, abrir una observación auténtica guardada, explorar gráfico Recharts/tabla y exportar JSON con procedencia.

Verificación: `pytest -q` → 12 passed; `npm run build` correcto; E2E → 16 passed (19.3s). `scripts/refresh_demo.py` descargó una serie NASA real de 31 días en enero de 2025, Mantaro (-12.05, -75.2), con manifest y SHA-256. `scripts/verify_power_integration.py` comprobó HTTP real 200 a FastAPI → NASA (delivery live), seguido de caché local. Evidencia: [power-integration.json](evidence/power-integration.json). Se conserva la fecha real de descarga, API v2.10.3, unidades y resolución nominal.

Riesgos: POWER es meteorología de rejilla, con limitaciones en montaña; no pronostica ni mide una parcela. El ejemplo guardado siempre cambia explícitamente a su ubicación; no sustituye consultas de otros lugares. MODIS aún no integrado. El build advierte de tamaño de bundle por Recharts; se dividirá antes del cierre de demo.

Siguiente etapa de esta entrega: comparación de secuencias y escenarios, sin inventar ETc, rendimientos ni idoneidad.

### Fase 3 — Demo de comparación

Implementados catálogo demostrativo y `POST /api/v1/rotations/compare`: tres secuencias editables de tres campañas, confirmación de referencia habitual, métricas deterministas de diversidad/repeticiones/descansos y lluvia de escenario a partir de la observación NASA recuperada por el backend. Suelo y manejo de agua se incluyen como contexto conocido o faltante. No se calcula aptitud, demanda, rendimiento ni rentabilidad. La comparación funciona sin clima, declarando la ausencia.

Backend inicial: 21 pruebas aprobadas (1.05s), incluyendo 100/70/0/150 %, invariancia estructural, faltantes y rechazo de datos inválidos. Build correcto. E2E de esa etapa: 20 passed (21.0s). La auditoría final amplió la cobertura, como se registra abajo.

### Página del proyecto y cierre de demo

Página de entrada `/` con presentación, recorridos, ejemplo Mantaro, fuentes y metodología, e ilustración SVG explícitamente conceptual. Aplicación en `/#demo`, accesos directos a Monitorear/Planificar y retorno a la página del proyecto. Añadido lanzador de doble clic `DEMO.cmd`, parada `STOP_DEMO.cmd` y [guion de presentación](demo-guide.md).

**Validación final ejecutada:**

- `backend/.venv/Scripts/python.exe -m pytest -q`: **27 passed in 1.11s**. Incluye contratos, errores, periodos/coords inválidos, archivo real, SHA-256, normalización/faltantes/unidades, caché y reglas estructurales/escenarios.
- `npm run build`: TypeScript y Vite correctos; chunk principal 424,79 kB / 130,00 kB gzip; panel climático diferido 405,97 kB / 115,53 kB gzip. Sin advertencia de chunk grande tras dividirlo.
- `npm run test:e2e`: **22 passed (25.5s)**. Escritorio 1440×1100 y móvil emulado Pixel 7. Incluye landing, navegación, fuente guardada auténtica, gráfico, tabla, errores y reintento, comparación 100/70 %, invalidación y conservación entre recorridos, teclado y axe en landing/monitoreo/planificación/resultados.
- `Start-AgroShift.ps1 -NoBrowser`: inicio correcto; HTTP 200 en raíz, proxy health y ejemplo guardado. Segunda ejecución detecta servicios propios activos. `-Stop`: detiene API y web, deja **0 listeners** en 5173/8000.

Hallazgos corregidos: contraste en dos textos de la landing, tabla horizontal móvil sin foco de teclado, pérdida de la comparación al alternar módulos, y lectura del manifiesto de procesos/parada del Python hijo del venv en Windows. No se ocultaron pruebas fallidas; se corrigieron y se ejecutó la suite final completa. El historial de Fase 1 conserva sus pruebas iniciales.

**MODIS:** consulta de `/products` con timeout de 25 s y subset de un punto/seis fechas con timeout de 20 s. Endpoint de bandas tampoco accesible mediante herramienta web. Sin descarga, sin QA ni segundo producto NASA. No se declara Fase 4 ni el MVP completo terminado. Se preserva el tiempo de entrega cerrando la demo funcional ya verificada.

Reporte: [verification-demo.md](verification-demo.md). Capturas en `docs/evidence/`. Fuentes, decisiones, arquitectura, metodología, limitaciones y README actualizados. Servicios de prueba/lanzador detenidos al finalizar las comprobaciones. No Git, despliegues, servicios de pago ni ML.

### Próxima tarea después de ensayar la demo

Resolver acceso a una serie MODIS MOD13Q1 v6.1 real con QA para la región piloto y su ingesta incremental; después auditar el MVP con dos productos NASA. Mientras tanto, presentar solo las capacidades demostradas y usar el ejemplo POWER guardado para un recorrido estable. Para esta entrega no se incorpora otra funcionalidad.

El nuevo alcance de demo en una hora se atendió mediante las etapas descritas; quedan explícitos los pendientes científicos y de cobertura.

## Actualización Pacha Pulse — perfiles, mapa y accesibilidad

Solicitud del usuario: modos Cultivador/Agrónomo, delimitación poligonal por puntos, accesibilidad, marca Pacha Pulse y prioridad funcional para integrarse con otro equipo de UI/UX. El usuario confirmó que la carpeta de entrega es **Farm_Project**.

### Implementado

- Marca pública Pacha Pulse en aplicación, página, títulos y archivos exportados. Contrato interno `agroshift-api` y nombre del script de arranque conservados por compatibilidad.
- Selector de modo: Cultivador con pasos y preguntas guiadas; Agrónomo con tabla y método ampliados, procedencia técnica. Mismo estado, datos y cálculos en ambos.
- Editor de parcela con clic/toque por vértice, marcadores numerados movibles y alternativa de edición por coordenadas, orden y eliminación. Nuevo borrador, cierre validado, cancelación, eliminación reversible y GeoJSON.
- Escala métrica, centro/zoom, zoom hasta 19, encuadre, vista mundial, acercamiento al punto y mapa ampliable. Límites claros de precisión cartográfica y de la consulta puntual NASA.
- Geometría desacoplada con Turf 7.4.0: 3–100 puntos, rechazo de duplicados/cruces/degeneración/rangos, área aproximada con procedencia y punto perteneciente al polígono.
- Un contorno activo guardado localmente en el navegador, validado al recuperar. Perfil agrícola sin persistencia; superficie declarada y delineada separadas.
- Controles de teclado y táctiles, alternativas al arrastre, foco visible, anuncios y errores, distinción textual y de trazo además del color. Contrato de integración para UI/UX en [functional-handoff.md](functional-handoff.md).

### Validación ejecutada

- `npm run build`: TypeScript y Vite correctos; principal 456,88 kB / 139,91 kB gzip y panel climático 406,25 kB / 115,65 kB gzip.
- `$env:PACHA_ISOLATED='1'; npm run test:e2e`: **34 passed, 4 skipped (1.7m)**. Los 4 skips son duplicados móviles de pruebas de geometría pura, ya ejecutadas en escritorio. Son 30 recorridos de navegador y 4 pruebas de geometría; mapa, perfiles, importación/exportación, persistencia, teclado, axe WCAG 2.2 AA en el editor y regresiones de clima/rotaciones/página.
- `.venv\Scripts\python.exe -m pytest -q`: **27 passed in 2.49s**.
- Lanzador: eligió 5174/8001 con 5173/8000 ocupados; HTTP 200, título Pacha Pulse y health de esta API. Reentrada detecta instancia propia. Parada: **0 listeners propios**, los **2 listeners de la otra copia conservados**.

El primer intento E2E reutilizó 5173 y encontró una aplicación distinta ejecutada desde Project_Farm; se interrumpió, se identificó la raíz servida y se aisló la verificación sin modificar esa copia. Después se corrigió una ambigüedad de etiqueta en el selector de rol y se ejecutó la suite completa satisfactoriamente. Las capturas actuales del editor están en `docs/evidence/pacha-parcel-desktop.png` y `pacha-parcel-mobile.png`.

### Límites y siguiente paso

No se certifica precisión catastral ni conformidad integral de accesibilidad; faltan lector de pantalla y dispositivos físicos. Un polígono activo simple, sin huecos ni antimeridiano. NASA sigue consultándose por punto, no por promedio zonal. MODIS/segundo producto NASA sigue pendiente. No se alteró el motor científico ni hubo Git, publicación o servicios de pago.

Próximo paso concreto: el equipo UI/UX puede consumir los tipos, funciones y estados del contrato funcional sin duplicar lógica; validar con un cultivador y un agrónomo el flujo por teclado y lector de pantalla antes de aplicar el diseño definitivo.
