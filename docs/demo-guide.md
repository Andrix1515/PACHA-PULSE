# Presentar AgroShift en dos minutos

## Antes de empezar

Ejecuta `DEMO.cmd` desde la raíz. Abre la página en `http://localhost:5173/`. Evita dejar un servidor anterior en 5173/8000: el lanzador avisa si están ocupados. Para apagar únicamente los procesos que abrió el lanzador, utiliza `STOP_DEMO.cmd`.

El ejemplo POWER está guardado con su respuesta original y procedencia. Aunque NASA no responda durante la presentación, ese ejemplo sigue funcionando. Las teselas del mapa sí dependen de internet; si no cargan, las coordenadas y los datos guardados permanecen utilizables.

## Guion sugerido

1. **Problema, 20 segundos.** En la página del proyecto: “Elegir la próxima campaña requiere entender el contexto ambiental y comparar alternativas. AgroShift reúne ambos recorridos sin ocultar la información que falta”.
2. **Observación, 35 segundos.** Pulsa “Explorar la demo” y luego “Abrir ejemplo real: Valle del Mantaro · enero 2025”. Se seleccionan -12.05°, -75.2° y el periodo 2025-01-01 a 2025-01-31. Explica que la serie viene de NASA POWER, no de una estación en la parcela. Muestra fuente, descarga y resolución, además de tabla o exportación.
3. **Contexto, 15 segundos.** Si quieres, guarda “Parcela de demostración” y un cultivo en el perfil. Son datos aportados por ti, no observaciones verificadas. No hace falta inventar suelo ni superficie.
4. **Alternativas, 30 segundos.** Entra a Planificar. Muestra las tres secuencias de tres campañas. Son ejemplos editables, no recomendaciones. Adapta la primera a la rotación que usarás como referencia; solo confirma que es habitual si realmente corresponde. Pulsa “Comparar tres rotaciones”.
5. **Escenario, 15 segundos.** Selecciona “70 % · más seco” y compara de nuevo. La lluvia histórica del periodo pasa de 60,64 mm a 42,45 mm (se muestran 60,6 y 42,5 por redondeo). Explica: es una multiplicación de escenario, no un pronóstico, ni agua de riego, ni demanda hídrica. La diversidad y repetición se calculan de las secuencias y no cambian con ese slider.
6. **Cierre, 15 segundos.** Muestra “Lo que aún falta para decidir”: ETo/Kc, datos de suelo y manejo, costos y validación local. “La herramienta ayuda a comparar y preguntar mejor; no decide automáticamente qué sembrar”.

## Datos concretos verificables del ejemplo

- Fuente: NASA POWER / MERRA-2, API v2.10.3, tiempo UTC.
- Temperatura media derivada de las 31 medias diarias: 9,41 °C.
- Precipitación acumulada de 31 días completos: 60,64 mm.
- Manifest y respuesta original: `backend/data/demo/`; descarga reproducible con `backend/scripts/refresh_demo.py`.
- Evidencia de consulta en línea y segunda consulta en caché: [power-integration.json](evidence/power-integration.json).

## Qué afirmar y qué dejar pendiente

Puede mostrarse: un producto NASA integrado, clima histórico, tres secuencias editables, comparación estructural, escenarios explícitos, procedencia y errores manejados.

Pendiente: segundo producto NASA MODIS NDVI. ORNL DAAC no respondió en dos consultas de acceso durante esta sesión. No se ha cumplido todavía el requisito del proyecto de dos productos NASA. No hay predicciones ML, rendimientos, diagnóstico de plagas, balance hídrico ni aptitud de rotaciones validada. El prototipo no está publicado y no tiene afiliación ni aval de NASA.
