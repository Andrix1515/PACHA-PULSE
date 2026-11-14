# Metodología y validación prevista

Estado: demo con NASA POWER real y comparación estructural verificada. MODIS y evaluación de aptitud agronómica pendientes. No existen predicciones ML.

## Separación de significados

- `observed`: observación real del proveedor, con producto, periodo, calidad y resolución.
- `derived`: transformación reproducible de observaciones; fórmula y entradas documentadas.
- `user_input`: dato aportado por el usuario, sin presentarlo como medición verificada.
- `scenario`: hipótesis editable sobre condiciones futuras; no es pronóstico.
- `predicted`: salida de un modelo evaluado y versionado, solo en una fase opcional posterior.
- `unavailable`: ausencia de insumos, cobertura o calidad suficiente; valor ausente, nunca cero sustituto.

Los metadatos conservarán `value`, `unit`, `status`, `source`, `observed_at` o periodo, `retrieved_at` cuando corresponda, `spatial_resolution`, `quality` y `limitations`. Las predicciones, si llegan a existir, incluirán horizonte y versión del modelo.

## Monitoreo

POWER: validar coordenadas, fechas, parámetros, unidades y valores faltantes antes de producir estadísticas. Conservar origen y fechas de adquisición y observación; aplicar caché y reintentos limitados. La definición concreta de climatología y anomalías se documentará antes de implementarla; no hay un método estadístico elegido aún.

MODIS: verificar producto MOD13Q1 v6.1, escala, QA, periodo compuesto y resolución nominal. Mantener una serie real reproducible de una localidad piloto. Fuera de cobertura disponible, devolver ausencia explícita. No interpretar el píxel como una medición exacta de una parcela pequeña ni diagnosticar enfermedades con NDVI.

## Planificación

Comparar al menos tres secuencias por campaña, incluida la habitual. Incorporar restricciones conocidas, suelo aportado, disponibilidad de agua y escenarios climáticos. La presentación incluirá supuestos, diferencias, compromisos e insumos faltantes.

Solo calcular `ETc = Kc × ETo` cuando se disponga de ETo y coeficientes por cultivo y etapa justificables, con unidades y fuentes. Sin esos insumos no se mostrarán demandas hídricas numéricas. No inferir rendimientos, nutrientes, probabilidades de riesgo ni retornos económicos a partir de NDVI. No hay ranking ni pesos heurísticos aprobados.

## Verificación por fase

| Fase | Evidencia necesaria para aceptarla |
| --- | --- |
| 0 | Inventario real, versiones locales, documentación consistente y plan de dependencias |
| 1 | Build frontend, pruebas pertinentes de interacción y validación, arranque y petición HTTP real a `/api/v1/health`; móvil y teclado |
| 2 | pytest de normalización, límites, faltantes, timeout/error y caché; consulta NASA real separada de mocks; build y gráfico con procedencia |
| 3 | Tres secuencias editables, escenarios al 100 % y 70 %, invariantes, cruces de año, ambos hemisferios, suelo e insumos desconocidos; API y UI |
| 4 | Serie MODIS auténtica con referencia y QA, escala validada, QA malo y ausencia de cobertura, idempotencia de ingesta y fallos de red |
| 5 | Recorridos completos, trazabilidad, móvil/escritorio, errores de servidor, accesibilidad y evidencia de dos productos NASA |
| 6, opcional | Separación temporal/geográfica, prevención de leakage, MAE/RMSE contra persistencia y cobertura explícita; sin endpoint si no supera baseline |

En fases pertinentes se incluirán montaña, parcelas menores que un píxel MODIS y modelo ausente. Los fixtures sintéticos se etiquetarán como tales. Pruebas con mocks y pruebas de integración NASA se reportarán por separado; un fallo de red impide declarar la integración completa. Cada etapa actualizará el progreso y, si cambian supuestos, decisiones y metodología.

## Aplicación en Fase 1

Los campos del perfil y las coordenadas son entradas del usuario, sin verificación agronómica. Área vacía se representa con `null`, suelo y agua con `unknown`. La posición elegida no implica delimitación ni superficie medida de una parcela. No se asigna una fecha de observación satelital a estos valores.

El mapa es cartografía de referencia, no un producto NASA. Las tarjetas usan únicamente “No disponible” y referencias a integraciones pendientes; no incluyen curvas ni cifras de observación. La vista técnica declara `user_input` y `unavailable` sin sugerir cobertura.

La verificación de Fase 1 prueba selección por clic y coordenadas manuales, coma decimal, ambos hemisferios, ecuador, límites y polos; perfil compartido, suelo desconocido, superficie ausente/inválida, reinicio al recargar, funcionamiento por teclado, ausencia de desbordamiento en dos tamaños y errores de API/red. La auditoría automatizada no sustituye una revisión con lector de pantalla ni pruebas en dispositivos físicos. La evidencia detallada está en [verification-phase1.md](verification-phase1.md).

## Método implementado en la demo

NASA POWER diario AG/UTC proporciona T2M, T2M_MIN, T2M_MAX (C) y PRECTOTCORR (mm/day). Se comprueban las unidades recibidas y se convierten faltantes, -999, valores no finitos y precipitación negativa a `null`. No se interpolan huecos. Las fechas ausentes se representan explícitamente. Se permite consultar como máximo 366 días históricos y se rechazan coordenadas no finitas, periodos invertidos y fechas futuras o anteriores a 1981.

La temperatura media del periodo es la media aritmética de las T2M válidas; su calidad es parcial si faltan días. La lluvia acumulada suma PRECTOTCORR solo si todos los días son válidos; de lo contrario el total es `unavailable`, sin completar con cero. Los agregados tienen estado `derived`, unidades, periodo, fuente, resolución, calidad y descarga. El estado `observed` de la serie identifica datos históricos suministrados por NASA, que incluyen productos de reanálisis; no implica medición directa sobre una parcela.

Comparación `structure-v1`, para exactamente tres secuencias de tres campañas:

1. Cultivos distintos = cardinalidad de cultivos ingresados, excluyendo descanso/barbecho.
2. Repeticiones consecutivas = número de pares adyacentes del mismo cultivo, excluyendo barbecho.
3. Descansos = campañas con barbecho en la secuencia.
4. Lluvia de escenario = lluvia histórica completa del periodo × porcentaje / 100, redondeada a dos decimales. Es la misma hipótesis climática para las tres secuencias; no mide sus consumos.

No se asignan estaciones, duraciones de campaña ni reglas por hemisferio. La primera secuencia solo se considera habitual cuando el usuario lo confirma. Si no, queda como referencia ilustrativa. Suelo y manejo de agua se reportan como contexto, sin inferir compatibilidad con un catálogo sin coeficientes. La mayor diversidad no demuestra mayor rendimiento ni menor riesgo; no hay ranking ni pesos.

Sin ETo/Kc, se devuelve demanda hídrica `null`; sin datos económicos, rendimiento y rentabilidad `null`. Cambiar escenario o secuencia invalida el resultado hasta volver a comparar. El backend vuelve a resolver el periodo NASA o su observación guardada auténtica; no acepta un total climático numérico suministrado por el cliente como observación NASA.

## Delimitación poligonal de Pacha Pulse

El contorno WGS84 es `user_input`; el área de Turf es `derived`, aproximada y sin relieve. Se valida un anillo simple de 3–100 vértices, sin duplicados ni autointersecciones, y superficie de 1 m² a 1 000 000 ha. Se rechazan huecos, multipolígonos y cruces del antimeridiano en esta versión. El mapa Mercator limita los vértices a ±85,05112878°; la entrada puntual geográfica conserva el rango hasta ±90° con advertencia de proyección.

Guardar selecciona un punto de consulta perteneciente al polígono, obtenido con `point-on-feature`. Esto no transforma la API puntual POWER en estadística zonal. Si se consulta fuera de la parcela, la diferencia se muestra explícitamente. Un zoom mayor o siete decimales de edición no aumentan la resolución del proveedor ni certifican precisión de campo.

Cultivador y Agrónomo comparten esos métodos y las observaciones. El rol solo cambia instrucciones y exposición inicial de tablas/método; no modifica resultados ni introduce recomendaciones. La accesibilidad incluye alternativas al arrastre y edición por coordenadas, con teclado y comprobaciones automatizadas; pendiente validación con lectores de pantalla y dispositivos reales.
