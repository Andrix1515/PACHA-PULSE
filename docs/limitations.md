# Limitaciones y riesgos abiertos

## Estado actual

Existe una demo local con página del proyecto, NASA POWER real, perfil compartido y comparación estructural de tres secuencias. El perfil y escenarios solo se guardan en memoria; recargar los elimina. No hay series MODIS, predicciones ML, evaluación de aptitud agronómica ni rendimientos. ORNL DAAC agotó el timeout en las consultas de acceso probadas.

**Solo se ha integrado un producto NASA.** La demo no cumple aún el mínimo de dos productos exigido por AGENTS.md. El monitoreo de vegetación y la auditoría del MVP completo no pueden declararse terminados. La disponibilidad real POWER se probó para el ejemplo Mantaro, no se valida precisión mundial con esa prueba.

## Riesgos y tratamiento previsto

| Riesgo | Tratamiento y fase |
| --- | --- |
| Incompatibilidad al actualizar el stack | Compatibilidad inicial verificada en Fase 1 y lockfiles conservados; volver a comprobar antes de actualizaciones |
| Confusión de Python por versión predeterminada de `py` | Crear el entorno con `py -3.12` y usar luego su ejecutable |
| Mapa visible interpretado como cobertura científica mundial | Separar cartografía de disponibilidad de observaciones y validación por localidad |
| Resolución climática insuficiente en montaña | Mostrar resolución y limitaciones del producto; no atribuir precisión de parcela |
| MODIS grueso para parcelas pequeñas, nubes, QA malo o latencia | Mostrar escala, periodo, calidad y estados de ausencia; elegir piloto verificable |
| Acceso MODIS o conectividad no disponibles | Dos consultas ORNL con timeout; Fase 4 pendiente, sin sustitución por datos ficticios |
| Falta de ETo/Kc, suelo, manejo o precios | Conservar datos desconocidos; omitir estimaciones no justificadas |
| Escenario confundido con pronóstico | Categorías y explicaciones visibles; sin promesas de rendimiento o siembra |
| Fallos o límites de servicios públicos | Caché, timeouts, reintentos limitados, estados de error y respeto de políticas |
| Demo local expuesta accidentalmente | Limitar escucha local; revisar autenticación, límites y privacidad antes de cualquier publicación futura |

La plataforma apoyará decisiones y no certificará aptitud agrícola ni sustituirá revisión profesional. NDVI no equivale a rendimiento, salud del suelo, diagnóstico de plagas o idoneidad de rotación.

La comprobación móvil utilizó emulación Chromium/Edge, no un dispositivo físico ni Safari. Axe y las pruebas de teclado no certifican cumplimiento integral de accesibilidad ni reemplazan pruebas con lectores de pantalla. El mapa no cubre polos en su proyección; las coordenadas manuales se conservan y se muestra una advertencia.

Para ejecutar las pruebas E2E con la configuración actual se necesita Edge y puertos 5173/8000 libres. Las teselas OSM dependen de internet y pueden revelar al proveedor las áreas visualizadas. Si fallan, las coordenadas manuales y el perfil siguen funcionando. El estado “API local conectada” no implica disponibilidad de NASA ni de un modelo.

La comparación solo cuenta estructura de secuencias y multiplica una lluvia histórica por un escenario común. No compara balances hídricos por cultivo, no proyecta esa lluvia sobre campañas sin fechas y no demuestra ventajas agronómicas. El tipo de suelo es contexto del usuario, no un análisis de laboratorio. Los ejemplos de rotación no han sido validados para el Valle del Mantaro ni para otras regiones.

La caché POWER distingue coordenadas exactas, con TTL siete días; antes de uso intensivo se requiere deduplicación por celda y controles de concurrencia/rate limiting. El límite temporal es 366 días por solicitud. El respaldo histórico funciona sin NASA, pero las consultas nuevas y teselas requieren red. El lanzador solo es para Windows y la configuración actual.

## Editor poligonal y modos Pacha Pulse

La delimitación implementa una parcela activa por navegador: un anillo simple de 3 a 100 puntos, sin huecos, multipolígonos ni cruce de antimeridiano, dentro de la proyección Mercator. No es un catastro ni una medición topográfica; el área no incluye pendientes. La superficie del perfil agrícola no se reemplaza automáticamente por la calculada.

Solo se persiste el contorno en este origen del navegador; otro puerto/navegador tiene almacenamiento distinto, y borrar datos del sitio lo elimina. Exportar GeoJSON permite conservarlo. No hay sincronización entre equipos ni almacenamiento de polígonos en el backend. Los modos Cultivador/Agrónomo son ayudas de presentación, sin autenticación ni separación de permisos.

Las alternativas de teclado/coordenadas permiten evitar el arrastre. Axe y pruebas móviles emuladas pasaron, pero siguen pendientes lector de pantalla y dispositivo real; no se afirma cubrir todas las discapacidades ni conformidad integral WCAG. La cartografía de mayor zoom no aumenta la resolución del producto NASA: se consulta un punto representativo, no la totalidad de la superficie.
