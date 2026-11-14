# Pacha Pulse — contrato funcional para UI/UX

El usuario confirmó `Farm_Project` como carpeta de entrega. El equipo de desarrollo mantiene lógica, contratos y accesibilidad; el otro equipo puede sustituir la presentación sin duplicar el motor científico.

## Perfiles de uso

`UserRole` en `frontend/src/types/index.ts`: `grower` (Cultivador) y `agronomist` (Agrónomo). Se elige desde “Modo de trabajo”. No son permisos de seguridad ni cuentas autenticadas.

| Función | Cultivador | Agrónomo |
| --- | --- | --- |
| Ubicación y contorno | Dibujo guiado por esquinas y coordenadas | Misma herramienta y geometría, instrucciones WGS84 |
| Monitorear | Resumen y gráfico; tabla disponible bajo demanda | Tabla abierta al activar el perfil, procedencia y estado técnico visibles |
| Planificar | Preguntas guiadas sobre campañas | Método y parámetros ampliados por defecto |
| Datos y cálculos | Compartidos, con límites científicos visibles | Los mismos; cambiar perfil no recalcula ni invalida resultados |

No se ocultan calidad, fuentes o limitaciones esenciales al cultivador. Ambos pueden editar y exportar. El perfil agrícola continúa separado del rol profesional.

## Geometría independiente de la interfaz

Archivo: `frontend/src/features/parcel/geometry.ts`.

- `Vertex`: `{ lat: number, lon: number }`, grados WGS84.
- `ParcelBoundary`: `Feature<Polygon, ParcelProperties>` GeoJSON, coordenadas `[longitud, latitud]`, un único anillo cerrado.
- `createBoundary(vertices, name)`: valida y cierra el contorno, calcula área y añade procedencia/fecha. Lanza un error descriptivo si no es válido.
- `importBoundary(unknown)`: acepta Polygon, Feature Polygon o FeatureCollection con una sola Feature; valida y recalcula, sin confiar en un área suministrada.
- `verticesOf`, `representativePoint`, `containsPoint`: adaptan la geometría al editor y al punto de consulta.

Límites explícitos: de 3 a 100 vértices diferentes, área entre 1 m² y 1 000 000 ha, coordenadas finitas dentro de la proyección del mapa, sin cruces o contactos no válidos. No se admiten huecos, MultiPolygon ni cruces del antimeridiano. Importaciones de hasta 200 kB. El perfil de trabajo no cambia estas reglas.

El área usa `@turf/area` 7.4.0 y se expresa en ha (`m² / 10000`); es aproximada y no incluye relieve ni precisión catastral. `@turf/kinks` detecta intersecciones; `point-on-feature` obtiene un punto dentro o sobre la superficie, incluso para geometría cóncava. La mayor cantidad de decimales o zoom no demuestra precisión de medición.

## Estado y persistencia

`useParcelBoundary.ts` guarda una parcela activa en la clave local `pacha-pulse.parcel.v1`, con sobre `{ version: 1, feature }`. Se valida al recuperar. Solo se conserva el contorno en el navegador, no el perfil ni observaciones NASA. Si el almacenamiento falla, se conserva la sesión y se comunica cómo exportar una copia.

`App` comparte la parcela y el punto entre Monitorear y Planificar. El borrador está separado de lo confirmado: importar, arrastrar o editar coordenadas no reemplaza el contorno guardado hasta pulsar “Cerrar y guardar parcela”. Cancelar lo restaura. “Nuevo contorno” inicia otro borrador conservando lo guardado hasta confirmar. Eliminar el contorno permite deshacer durante la sesión.

La superficie delineada no sobrescribe automáticamente la superficie declarada del perfil: son datos con procedencia diferente.

## Relación con NASA

Guardar el polígono selecciona un punto representativo para la consulta existente y descarta el clima de otra ubicación. **La API NASA POWER sigue siendo puntual.** No se calculan promedios zonales ni se afirma resolución de parcela. Si el usuario elige un punto fuera del polígono o abre el ejemplo Mantaro, se muestra la discrepancia y se ofrece recuperar el punto de la parcela. El polígono nunca se utiliza para atribuir una observación a una zona distinta.

## Interacciones que debe conservar cualquier nuevo diseño

- Modo punto y modo dibujo inequívocos, con `aria-pressed` y texto.
- Clic/toque por vértice; marcadores numerados movibles; edición de coordenadas, orden y eliminación mediante botones.
- Alternativa sin arrastre para cada acción: lista de puntos, coordenadas y botón para añadir el centro del mapa tras navegar con teclado.
- Zoom, escala métrica, centro/zoom actuales, vista mundial, acercamiento al punto, encuadre de parcela y ampliación del área visible.
- Mensajes de éxito/error accesibles; foco visible; botones táctiles amplios; borrador discontinuo y contorno confirmado continuo además del color.
- GeoJSON importable/exportable y explicación de almacenamiento local.
- Tabla de datos accesible como alternativa al gráfico; regiones de tabla desplazables con foco; enlace para saltar al contenido.

La revisión usa teclado y axe en escritorio y móvil emulado. No equivale a certificación WCAG ni a una prueba con todos los lectores de pantalla/dispositivos físicos. Referencia consultada: [WCAG 2.2, movimientos de arrastre](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

## Marca y compatibilidad

La marca pública pasa a **Pacha Pulse** en aplicación, página, títulos y exportaciones. Se mantiene el identificador interno `agroshift-api` para no romper el contrato de health, y el archivo `Start-AgroShift.ps1` por compatibilidad con los lanzadores existentes. El usuario ya indicó que esta instrucción de nombre sustituye el nombre anterior del documento AGENTS.

## Entorno con otra copia abierta

Se detectó otra carpeta `Project_Farm` sirviendo 5173/8000. No se modificó ni se detuvo. El lanzador de esta entrega busca un par libre si esos puertos están ocupados y muestra la URL seleccionada; los procesos se vinculan a esta raíz y su fecha de creación. Las pruebas pueden aislarse con `$env:PACHA_ISOLATED='1'` y `npm run test:e2e`, usando 5174/8001, que deben estar libres.
