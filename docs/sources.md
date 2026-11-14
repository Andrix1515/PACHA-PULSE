# Fuentes previstas

Estas referencias proceden de AGENTS.md. **No se consultaron online ni se descargaron datos durante la Fase 0.** Los enlaces no constituyen evidencia de integración ni verificación actual del servicio.

| Fuente | Uso previsto | Estado |
| --- | --- | --- |
| [NASA POWER, API diaria](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) | Temperatura y precipitación históricas por ubicación y periodo | Integrado y consultado realmente; ejemplo con original y manifest |
| [MODIS MOD13Q1 v6.1](https://doi.org/10.5067/MODIS/MOD13Q1.061) | Serie NDVI/EVI con QA de una región piloto | No integrado: consultas de acceso ORNL con timeout |
| [FAO-56](https://www.fao.org/4/x0490e/x0490e00.htm) | Referencia para ETo/Kc cuando existan insumos suficientes | Consultado como referencia; sin insumos para calcular ETc |
| [OpenStreetMap: política de teselas](https://operations.osmfoundation.org/policies/tiles/) | Mapa y atribución; sin descargas masivas | Integrado como cartografía en Fase 1; no cuenta como producto NASA |
| [NASA HLS](https://hls.gsfc.nasa.gov/data-access-and-tools/) | Evolución opcional de mayor resolución | Fuera del MVP inicial |
| Usuario | Perfil agrícola, suelo conocido, rotación previa y restricciones | Interfaz implementada; datos no verificados y escenarios explícitos |

Referencia del reto, proporcionada en las instrucciones: [Field Shift](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/). No se ha verificado su contenido en esta fase.

Al integrar cada producto se registrarán URL y versión exactas, parámetros, unidades, tratamiento de faltantes, resolución, calidad, periodo y fecha de descarga. Para MODIS se documentarán además la selección espacial, escala y decodificación de QA, junto con un procedimiento reproducible. No se fija aún un canal de descarga ni se presupone acceso sin autenticación.

Solo se incorporarán fuentes verificadas que cumplan las restricciones del proyecto. No se incluirán credenciales en ejemplos, código ni logs; las futuras variables de configuración se documentarán en `.env.example`.

## Documentación consultada en Fase 1

Consultas públicas realizadas el 2026-11-14 antes de la implementación:

- [Vite actual](https://vite.dev/guide/) y [guía de Vite 6](https://v6.vite.dev/guide/), esta última solo como referencia inicial; se eligió Vite 8 al confirmar requisitos compatibles.
- [Instalación React Leaflet](https://react-leaflet.js.org/docs/start-installation/) y [MapContainer y hooks](https://react-leaflet.js.org/docs/api-map/).
- [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite).
- [FastAPI: primeros pasos](https://fastapi.tiangolo.com/tutorial/first-steps/).
- [Playwright: instalación y plataformas](https://playwright.dev/docs/intro).
- Política OSM enlazada en la tabla; se usa `https://tile.openstreetmap.org/{z}/{x}/{y}.png` en el navegador, con atribución y sin prefetch.

Además se consultaron metadatos públicos oficiales del registro npm (`npm view`) para versiones, `engines`, dependencias pares y opcionalidad. No se consultaron NASA ni se descargaron observaciones en esta fase. El mapa cargó teselas reales durante la verificación; su disponibilidad sigue dependiendo del servicio público.

## Fuente auténtica integrada en la entrega demo

POWER: `https://power.larc.nasa.gov/api/temporal/daily/point`, parámetros `T2M,T2M_MIN,T2M_MAX,PRECTOTCORR`, comunidad AG, formato JSON y tiempo UTC. La versión recibida fue v2.10.3, unidades C y mm/day, fill -999. Ejemplo Mantaro: -12.05°, -75.2°, 2025-01-01/2025-01-31; descarga original documentada en `backend/data/demo/power-mantaro-2025-01.source.json`. El script reproducible conserva URL, fecha, SHA-256 y `synthetic: false`.

La [documentación de servicios POWER](https://power.larc.nasa.gov/docs/services/) y la [fuente meteorológica MERRA-2](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/) sustentan la resolución nominal y la limitación espacial. La [evidencia HTTP](evidence/power-integration.json) registró una consulta real 200 a FastAPI/NASA y la siguiente servida desde caché.

Se consultaron [FAO-56](https://www.fao.org/4/x0490e/x0490e00.htm) y la [API de Recharts](https://recharts.github.io/en-US/api/LineChart/) antes de implementar la comparación y el gráfico. El catálogo local de siete nombres de cultivos/barbecho no contiene coeficientes, calendarios, aptitud regional ni datos económicos; sus secuencias iniciales son ejemplos de escenarios.

Intento MODIS: leída la [documentación REST ORNL DAAC](https://modis.ornl.gov/data/modis_webservice.html). Las solicitudes `GET /products` y un subset MOD13Q1 de un solo punto y seis composiciones (enero–marzo 2025) agotaron el timeout de 25 y 20 segundos respectivamente. La herramienta web tampoco pudo acceder al endpoint de bandas. No se descargó una serie MODIS, no se verificó su versión/QA y no se afirma integración. No hubo descargas globales ni uso de credenciales.

## Referencias del editor de parcelas

Consultados documentación pública y README oficiales de los módulos instalados Turf 7.4.0: [area](https://turfjs.org/docs/api/area), [kinks](https://turfjs.org/docs/api/kinks), [pointOnFeature](https://turfjs.org/docs/api/pointOnFeature) y [booleanPointInPolygon](https://turfjs.org/docs/api/booleanPointInPolygon). La primera consulta agrupada mediante herramienta web se canceló por demora; se accedió después a las referencias públicas por HTTP y a los README incluidos en los paquetes.

Accesibilidad: [W3C, WCAG 2.2 — alternativas a movimientos de arrastre](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Se implementan acciones equivalentes con clics/botones y entrada por teclado; no se atribuye una certificación a esa implementación.
