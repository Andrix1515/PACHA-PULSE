# Verificación de la demo y página del proyecto

2026-11-14 · America/Lima. Demo local para presentar dentro del plazo de una hora solicitado. No publicada.

## Entregado

- Página del proyecto en `/`: problema, recorridos, fuentes, ejemplo, método y límites, con ilustración conceptual propia.
- Aplicación en `/#demo`: mapa, coordenadas WGS84 y perfil compartido entre Monitorear/Planificar.
- NASA POWER real: consulta histórica, caché SQLite, gráfico/tabla, unidades, periodo, calidad, versión y fecha de descarga; exportación JSON.
- Ejemplo auténtico Mantaro/enero 2025 con respuesta original, manifest y SHA-256; funciona sin conexión NASA.
- Tres secuencias editables y escenarios de lluvia: comparación de estructura y compromisos, sin rendimiento, aptitud, demanda hídrica ni rentabilidad inventados.
- Arranque de doble clic, parada de procesos propios y guion de presentación.

## Evidencia por frontera

| Frontera | Resultado y evidencia |
| --- | --- |
| Página → demo | Navegación real comprobada en escritorio/móvil; título y contenido cambian correctamente |
| Coordenadas/perfil → módulos | Persisten durante la sesión y entre recorridos; campos desconocidos conservados |
| Navegador → proxy → FastAPI | Health 200 y consulta del ejemplo auténtico; E2E sin interceptación en el recorrido satisfactorio |
| FastAPI → NASA POWER | HTTP 200 real, API v2.10.3, 31 días completos; [evidencia JSON](evidence/power-integration.json) |
| API → caché | Segunda solicitud `delivery=cache`, conservando procedencia y descarga |
| Respuesta → gráfico/tabla | Valores del original y periodo comprobados; tabla/exportación disponibles |
| Secuencias → motor → resultados | Tres resultados; escenario 100 % y 70 %; insumos faltantes no producen cifras inventadas |
| Resultados → navegación | Se conservan al alternar Monitorear/Planificar; cambios de escenario/secuencia/contexto invalidan resultados anteriores |
| Error de red/servidor | Fallos simulados explícitos permiten reintento o ejemplo; la interfaz permanece operativa |
| Lanzador → procesos locales | Inicio real, detección de instancias propias, HTTP 200 y parada; 0 listeners restantes en 5173/8000 |

## Comandos y resultados finales

Desde `backend/`: `.venv\Scripts\python.exe -m pytest -q` → **27 passed in 1.11s**. Desde `frontend/`: `npm run build` → TypeScript y build correctos, sin advertencia de chunk grande; `npm run test:e2e` → **22 passed (25.5s)**.

La suite de backend combina validaciones y pruebas unitarias con un archivo de observaciones auténtico. Las modificaciones de faltantes/unidades y el fallo 503 usan fixtures/mocks etiquetados; no se presentan como observaciones originales. La integración NASA real está separada en `scripts/verify_power_integration.py`; `scripts/refresh_demo.py` permite reproducir la descarga.

Navegador: Edge/Chromium local, escritorio 1440×1100 CSS px y emulación Pixel 7 393×727 CSS px. Sin desbordamiento horizontal de la página; tablas con desplazamiento local y foco de teclado. Axe sobre landing, formularios, gráfico y comparación con resultados, sin violaciones en las reglas comprobadas WCAG 2 A/AA y 2.1 AA. Teclado: salto al contenido, foco, Tab y Enter. No certifica accesibilidad integral ni funcionamiento en todos los dispositivos.

Arranque/parada: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Start-AgroShift.ps1 -NoBrowser` y luego `-Stop`. Se verificaron reentrada, respuestas HTTP y puertos libres al parar. El lanzador emplea ventanas ocultas y solo para procesos propios. La opción de ejecución afecta al proceso, no a políticas globales.

## Hallazgos resueltos durante esta entrega

- Contraste bajo en textos secundarios de la landing: colores ajustados, pruebas repetidas.
- Tabla móvil desplazable sin foco: región accesible con `tabIndex=0` y contorno visible.
- Comparación reiniciada al alternar módulos: se conserva el componente una vez abierto; contexto cambiado sigue invalidando resultados.
- Lectura de array de procesos del lanzador y Python hijo del venv: corregidas enumeración y parada, comprobando PID/fecha y relación parental/comando/puerto del hijo.
- Bundle de Recharts superior a 500 kB con todo unido: carga diferida, chunk principal ~425 kB y panel climático ~406 kB.

## Capturas generadas

- [Proyecto, escritorio](evidence/project-desktop.png) y [móvil](evidence/project-mobile.png).
- [Clima, escritorio](evidence/climate-desktop.png) y [móvil](evidence/climate-mobile.png).
- [Comparación, escritorio](evidence/comparison-desktop.png) y [móvil](evidence/comparison-mobile.png).

La cartografía es real cuando el servicio OSM responde; puede estar todavía cargando al capturar. El gráfico climático se basa en el original NASA guardado. La ilustración de la página es conceptual y no representa una medición satelital.

Se revisaron visualmente las capturas de escritorio de proyecto, clima y comparación. Los dos tamaños cuentan además con las comprobaciones automatizadas descritas. La revisión documental final comprobó 10 Markdown y 33 enlaces locales: sin errores. Puertos de la demo libres al cerrar la verificación.

## Pendientes que impiden declarar el MVP completo

MODIS no integrado: los dos intentos REST ORNL terminaron en timeout. No hay segundo producto NASA, QA NDVI ni ingesta satelital incremental. Tampoco hay validación agronómica regional, modelo de rendimiento, ETc sin insumos o ML. La prueba de clima se demostró con una ubicación/periodo reales; no acredita precisión mundial. El perfil no persiste tras recargar, no hay autenticación y la app escucha solo localmente.

Próximo paso: ensayar el [guion de demo](demo-guide.md); después resolver el acceso MODIS con evidencia auténtica, sin cambiar los límites de lo que se presenta hoy.

## Actualización de perfiles, polígono y nombre Pacha Pulse

Verificación posterior en la carpeta Farm_Project confirmada por el usuario: **34 passed, 4 skipped (1.7m)** en Playwright (30 recorridos de navegador + 4 pruebas de geometría; se omiten solo duplicados móviles de geometría pura). Backend **27 passed in 2.49s**. Build TypeScript/Vite correcto: principal 456,88 kB y panel climático 406,25 kB. Axe incluye reglas WCAG 2.2 AA en el editor poligonal; sin violaciones detectadas en los casos comprobados.

La suite comprueba dibujo por clics/coordenadas y teclado sin arrastre, edición, persistencia local, importación inválida/válida, GeoJSON exportado, eliminación/deshacer y cambio de modo sin perder datos. Pruebas puras cubren área de referencia, cierre del anillo, concavidad, punto dentro de geometría, cruces, duplicados, rango, área nula, antimeridiano y rechazo de archivos no admitidos.

Las primeras pruebas sobre el puerto 5173 encontraron otra copia desde Project_Farm y se interrumpieron. Tras confirmar el usuario que la entrega era Farm_Project, se aislaron puertos y se corrigió una etiqueta ambigua del selector. Suite final completa satisfactoria. No se alteró la otra carpeta ni su servidor.

Lanzador nuevo verificado: seleccionó 5174/8001 con 5173/8000 ocupados; página Pacha Pulse 200 y proxy health correcto. Reentrada correcta. La parada dejó 0 listeners de esta copia y conservó los 2 de la otra. Contrato y límites: [functional-handoff.md](functional-handoff.md). Capturas del editor: [escritorio](evidence/pacha-parcel-desktop.png) y [móvil](evidence/pacha-parcel-mobile.png). Se revisó visualmente la captura de escritorio; la comprobación móvil es automatizada.
