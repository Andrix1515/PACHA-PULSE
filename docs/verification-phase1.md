# Evidencia de Fase 1

Fecha: 2026-11-14, America/Lima. Trabajo local en Windows con Node 22.15.0 y Python 3.12.10.

## Recorrido verificado

El usuario selecciona ubicación y aporta datos agrícolas, cambia entre Monitorear y Planificar conservando contexto y consulta la procedencia. El navegador comprueba el estado de FastAPI a través del proxy de Vite. No hay consultas NASA ni cálculos científicos en esta fase.

| Frontera | Evidencia |
| --- | --- |
| Interfaz | Título, navegación, formularios y estados de ausencia visibles en escritorio y móvil emulado |
| Coordenadas → estado | Validación de vacíos/rangos, coma decimal, selección por clic, hemisferios norte/sur, ecuador, 0/0 y polo |
| Perfil → ambos módulos | Nombre/cultivo/rotación guardados visibles en Planificar; suelo desconocido y superficie ausente preservados |
| Navegador → API | Petición HTTP real a `/api/v1/health` a través de Vite, sin interceptación en la prueba de arranque |
| API → respuesta | Estado 200 con `{"status":"ok","service":"agroshift-api","version":"0.1.0"}` |
| Respuesta → interfaz | Indicador “API local conectada”; fallo 500 y contrato incorrecto simulados permiten reintentar contra API real |
| Mapa → proveedor | Teselas OSM reales visibles en capturas; atribución visible; fallo de teselas simulado permite seguir por coordenadas |

## Pruebas ejecutadas

Desde `backend/`: `.venv\Scripts\python.exe -m pytest -q` → **3 passed in 0.69s**. Contrato de health, 404 y 405 JSON. `pip check` → **No broken requirements found**.

Desde `frontend/`: `npm run build` → TypeScript sin errores y Vite completado; JS 396,64 kB, 121,77 kB gzip; CSS 34,42 kB. `npm run test:e2e` → **12 passed (16.6s)**, 6 recorridos por proyecto, 2 workers. Playwright arrancó y detuvo ambos servidores localmente; no reutilizó servidores externos.

Proyectos: escritorio 1440 × 1100 CSS px y emulación Pixel 7 (393 × 727 CSS px), ambos con Edge/Chromium local, headless. Axe escaneó Monitorear y Planificar con vista técnica según reglas WCAG 2 A/AA y 2.1 AA, sin violaciones detectadas al terminar. Se verificaron enlace de salto, foco del contenido, Tab entre coordenadas y envío con Enter; sin desbordamiento horizontal en los tamaños comprobados. No se registraron excepciones JavaScript de página en la prueba de arranque.

Primer pase: 10 pruebas E2E correctas, 2 fallidas por contraste. Se oscurecieron textos secundarios y se aumentaron tamaños. Segundo pase completo: 12 correctas. La advertencia inicial de deprecación de TestClient en pytest se resolvió utilizando HTTPX ASGITransport; pase final sin esa advertencia. Se mantuvo la comprobación HTTP real en navegador.

## Capturas

- [Escritorio](evidence/phase1-desktop.png).
- [Móvil emulado](evidence/phase1-mobile.png).

Capturadas por la prueba de arranque y revisadas visualmente. No usan datos NASA ni teselas ficticias. Las pruebas de fallos sí interceptan explícitamente la API o OSM, y están etiquetadas en `frontend/tests/workspace.spec.ts`.

## Límites

Estas pruebas no demuestran cobertura agrícola, disponibilidad NASA ni funcionamiento de futuros motores. No se probó Safari, dispositivo físico ni lector de pantalla. El perfil no persiste al recargar, por diseño explícito. El mapa no representa polos aunque se acepten sus coordenadas. OSM requiere conexión y su estado no determina la conectividad de la API. La demo no tiene autenticación y escucha solo localmente.

Habilidades aplicadas: Sites, react-best-practices y verification. Se utilizó únicamente la modalidad local, sin registro de sitio, repositorio, sincronización o publicación.
