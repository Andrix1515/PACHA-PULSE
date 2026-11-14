# Pacha Pulse

Nombre anterior: AgroShift. La documentación histórica y algunos identificadores internos conservan ese nombre por compatibilidad.

## Perfiles y delimitación de parcelas

En “Modo de trabajo” elige **Cultivador** (pasos guiados y resumen) o **Agrónomo** (tablas, método y procedencia más visibles). Ambos comparten los mismos datos, geometría y motor; cambiar de perfil no cambia resultados ni crea permisos de seguridad.

Para delimitar: acerca el mapa al campo → “Dibujar o editar parcela” → añade los puntos del borde por clic/toque o por coordenadas → “Cerrar y guardar parcela”. Los marcadores se pueden mover; la lista permite editar, reordenar o eliminar puntos sin arrastrar. “Nuevo contorno” inicia un borrador sin sustituir lo guardado hasta confirmar. Hay escala métrica, zoom hasta 19, vista mundial, encuadre y ampliación del mapa.

Se guarda **una parcela activa** en este navegador, recuperable al recargar; el perfil agrícola sigue siendo de sesión. Puedes exportar/importar GeoJSON para conservar o cambiar de zona. Se validan cruces, duplicados, rangos y área. El área es aproximada, no catastral, y no reemplaza la superficie que declaraste. La consulta NASA continúa siendo por un punto de referencia, sin promedio zonal ni mayor resolución satelital.

Contrato para el equipo de UI/UX y límites de accesibilidad: [functional-handoff.md](docs/functional-handoff.md). La implementación mantiene la presentación existente salvo los controles funcionales necesarios.

Plataforma local de apoyo a decisiones agrícolas con dos recorridos: **Monitorear** cultivos existentes y **Planificar** futuras campañas comparando al menos tres secuencias de rotación, incluida la habitual.

La comparación de rotaciones es el núcleo del producto. El monitoreo aporta contexto ambiental; no determina automáticamente qué sembrar.

## Estado

Demo local preparada el 14 de noviembre de 2026: página del proyecto, mapa y perfil compartido, NASA POWER real con gráfico/tabla/procedencia y comparación de tres secuencias editables con escenarios. **La comparación es estructural y exploratoria: no calcula aptitud agrícola, rendimiento, demanda hídrica ni rentabilidad.** MODIS sigue pendiente por falta de respuesta del servicio de acceso probado; no se afirma cumplir todavía el mínimo de dos productos NASA.

## Abrir la demo con doble clic

1. Ejecuta [DEMO.cmd](DEMO.cmd). Inicia los dos servidores locales en segundo plano y abre el navegador.
2. Página del proyecto: la URL que muestra el lanzador (normalmente `http://localhost:5173/`).
3. Aplicación: esa URL seguida de `/#demo`.
4. Para cerrar los servidores, ejecuta [STOP_DEMO.cmd](STOP_DEMO.cmd).

El lanzador verifica los puertos, evita duplicar sus procesos y registra logs en `.local/`. Si otra copia ocupa 5173/8000, busca un par libre sin cerrarla. En la comprobación actual seleccionó **5174/8001**: proyecto `http://localhost:5174/`, demo `http://localhost:5174/#demo`. Solo administra procesos identificados con esta raíz, PID y fecha de creación. No modifica la política global de PowerShell; la opción de ejecución del `.cmd` solo afecta al proceso que abre. Los scripts requieren Windows y las dependencias locales ya instaladas.

**Recorrido de dos minutos:** abrir la demo → “Abrir ejemplo real: Valle del Mantaro” → observar clima y procedencia → Planificar → editar/confirmar secuencia habitual → comparar → cambiar al 70 % → volver a comparar → explicar datos faltantes. El [guion de presentación](docs/demo-guide.md) incluye pasos y límites.

Instrucciones del proyecto: [AGENTS.md](../AGENTS.md). Contexto complementario: [guía de AgroShift](../GUIA_CODEX_AGROSHIFT.md). Los ejemplos de prompts de la guía no se consideran tareas autorizadas.

## Documentación

- [Estado, verificaciones y siguiente paso](docs/progress.md).
- [Arquitectura y dependencias previstas](docs/architecture.md).
- [Decisiones](docs/decisions.md).
- [Metodología y criterios de validación](docs/methodology.md).
- [Fuentes previstas y estado de integración](docs/sources.md).
- [Limitaciones y riesgos](docs/limitations.md).

## Entorno local comprobado

| Herramienta | Resultado |
| --- | --- |
| Node.js | 22.15.0 |
| npm | 10.9.2 |
| Python mediante `python` | 3.12.10 |
| Python mediante `py` | Predeterminado 3.14; también disponible 3.12 |
| pip de Python 3.12 | 25.0.1 |
| SQLite de Python 3.12 | 3.49.1 |
| `venv` / `ensurepip` | Importaciones correctas |

El backend utiliza un entorno virtual Python 3.12. No se necesita modificar la política global de PowerShell. Las versiones instaladas quedaron registradas en `frontend/package-lock.json` y `backend/requirements.lock.txt`.

## Arrancar localmente en PowerShell

Desde la raíz del proyecto, abre dos terminales. Las dependencias ya están instaladas en este equipo.

Terminal 1, API:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2, interfaz:

```powershell
cd frontend
npm run dev
```

Abre `http://localhost:5173`. La API responde en `http://localhost:8000/api/v1/health`; el frontend utiliza `/api/v1/health` mediante el proxy de Vite. Ambos procesos escuchan solo localmente. Para detenerlos usa `Ctrl+C` en cada terminal. Los servidores de verificación se detuvieron al finalizar las pruebas.

Para reinstalar las dependencias locales, desde la raíz:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
cd ..\frontend
npm ci
```

Los archivos `.env.example` documentan la configuración opcional; no contienen secretos y no hace falta copiarlos para el arranque predeterminado. El proxy se puede cambiar con `API_PROXY_TARGET` en `frontend/.env.local`. Los valores `VITE_*`, si se añaden en el futuro, serán públicos: no deben contener credenciales.

Selecciona una ubicación en el mapa o introduce coordenadas WGS84; se acepta coma o punto decimal. Completa y guarda los datos agrícolas que conozcas. La ubicación y el perfil permanecen al cambiar de recorrido y se eliminan al recargar. Los escenarios y el contexto de suelo/agua se envían a FastAPI al comparar, sin persistencia del perfil. OSM recibe las peticiones cartográficas normales del navegador. NASA solo se consulta al confirmar fechas y ubicación; mover el mapa no descarga datos climáticos.

El ejemplo histórico auténtico se sirve desde el disco local: no necesita conexión NASA durante la presentación. Cambia explícitamente a Mantaro (-12.05, -75.2), enero de 2025; nunca se atribuye esa serie a otra ubicación. La consulta en línea permite otros puntos y periodos históricos de hasta 366 días. Los resultados normalizados se guardan en SQLite con caché de siete días, conservando fecha de descarga y versión. Reproducir la descarga: desde `backend/`, `.venv\Scripts\python.exe scripts/refresh_demo.py`. Verificar integración NASA real por HTTP: `.venv\Scripts\python.exe scripts/verify_power_integration.py` (puerto 8000 libre).

## Verificación

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run build
npm run test:e2e
```

Las pruebas de navegador arrancan y detienen los dos servidores; deben estar libres los puertos 5173 y 8000. Utilizan Microsoft Edge instalado en Windows, en modo headless, con escritorio y emulación móvil. No se descargó un navegador adicional. En otro equipo se requiere Edge para ejecutar esta configuración.

Resultado actual: **27 pruebas de backend y 34 de frontend aprobadas** (30 recorridos de navegador y 4 de geometría), build correcto; 4 duplicados móviles de geometría omitidos. Contrato funcional actual en [functional-handoff.md](docs/functional-handoff.md). [Reporte actual de evidencia y límites](docs/verification-demo.md). El [reporte de Fase 1](docs/verification-phase1.md) se conserva como historial. Capturas actuales: [proyecto](docs/evidence/project-desktop.png), [clima real](docs/evidence/climate-desktop.png) y [comparación](docs/evidence/comparison-desktop.png).

## Plan de ejecución

| Fase | Entrega | Depende de |
| --- | --- | --- |
| 0 | Inspección, entorno y plan documentados | Instrucciones del proyecto |
| 1 | React/Vite/TypeScript, mapa, ubicación y perfil compartidos, Monitorear/Planificar; FastAPI `/api/v1/health` | 0 |
| 2 | NASA POWER real, normalización, caché y gráfico climático | 1 |
| 3 | Tres secuencias editables y escenarios comparables con supuestos explícitos | 2 |
| 4 | MODIS real para una región piloto, QA e ingesta incremental local | 3 |
| 5 | Auditoría y recorrido completo de ambos módulos | 4 |
| 6, opcional | Experimento NDVI contra baseline de persistencia | 1–5 verificadas y solicitud expresa |

En cada fase se inspeccionan los archivos, se presenta el alcance, se implementa y se ejecutan las verificaciones pertinentes. La solicitud de demo en una hora autorizó continuar por las etapas necesarias de esta entrega. Fase 4 está pendiente por acceso MODIS; la auditoría del MVP completo con dos fuentes NASA también sigue pendiente.

Trabajo exclusivamente local: sin repositorios, commits, sincronizaciones ni despliegues. No se incorporan datos NASA inventados ni predicciones sin validación.
