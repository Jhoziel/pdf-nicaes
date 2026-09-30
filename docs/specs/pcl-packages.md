# Generar paquetes por PCL

## Objetivo

Permitir que una persona cargue uno o varios PCL de edificio junto con PDFs fuente y obtenga un paquete ZIP independiente por PCL. Cada paquete contiene un PDF por código TRUSS disponible y un reporte auditable.

## Entradas

- Uno o más PDFs fuente.
- Uno o más archivos `.PCL`.
- Como atajo, se puede cargar un ZIP que contenga PDFs y archivos `.PCL`; la interfaz los extrae localmente y los coloca en sus colas correspondientes.
- El nombre base del PCL identifica el paquete de salida.
- Cada fila interpretable del PCL aporta el nombre base de un archivo `.tre`; la ruta, cabecera y campos restantes se ignoran.
- La comparación de códigos normaliza mayúsculas y minúsculas y después exige igualdad exacta. No elimina ceros, sufijos ni hace coincidencias parciales.
- Las filas no interpretables se reportan sin invalidar las filas correctas.
- Un PCL sin códigos interpretables es inválido.
- Una entrada repetida dentro del mismo PCL se solicita una sola vez y se reporta como duplicada.

## Selección de TRUSS

- Varias páginas con el mismo código dentro de un único PDF fuente forman un solo PDF TRUSS de varias páginas.
- Un código encontrado en más de un PDF fuente distinto es un conflicto, se reporta y no se incluye.
- Dos copias byte a byte idénticas de un PDF se consideran una sola fuente; la copia adicional se omite y se informa globalmente.
- Una TRUSS sin coincidencias es faltante.
- Una misma TRUSS puede incluirse independientemente en varios paquetes PCL.
- Las páginas sin código identificable se excluyen de los paquetes y se informan globalmente.
- Los códigos no solicitados por ningún PCL no se incluyen.

## Resultados

- `EdificioNorte.PCL` produce `EdificioNorte.zip`.
- Cada paquete contiene `<CODIGO>.pdf` por TRUSS disponible y `reporte.txt`.
- Los códigos se presentan en el orden del PCL; las páginas conservan su orden en el PDF fuente.
- Los nombres de paquete repetidos se desambiguan con ` (2)`, ` (3)` y siguientes.
- Cada PCL tiene uno de cuatro estados: satisfactorio, parcial, sin coincidencias o PCL inválido.
- El reporte individual incluye solicitadas, disponibles, faltantes, conflictos, entradas duplicadas, filas inválidas, PDF fuente y páginas utilizadas.
- El reporte se muestra en la interfaz y se incluye como texto UTF-8 en el idioma activo al comenzar el proceso.
- Un PCL válido siempre genera resultado, aunque el ZIP solo contenga el reporte.
- Un PCL inválido genera un ZIP con reporte y no detiene otros PCL.
- Un PDF dañado detiene el lote completo para evitar falsos faltantes.
- La descarga conjunta se llama `paquetes-pcl.zip`, contiene los ZIP individuales y `reporte-general.txt`.

## Interfaz

- Existe un tercer modo llamado `Generar paquetes por PCL`.
- Al seleccionarlo aparece una carga independiente para múltiples PCL.
- La acción `Generar paquetes` requiere al menos un PDF y un PCL.
- La lista de PCL permite añadir, quitar y limpiar archivos.
- La interfaz muestra un resultado por PCL con su estado, conteos y descarga individual.
- La interfaz y los reportes mantienen soporte en español e inglés.

## Escala y compatibilidad

- El índice de PDFs se construye secuencialmente y libera cada documento después de inspeccionarlo.
- No se conservan en memoria los bytes de todos los PDFs ni todos los PDFs TRUSS generados.
- Los paquetes individuales se generan bajo demanda desde el índice.
- El ZIP maestro se ofrece solo cuando una estimación conservadora indica que puede materializarse con seguridad; los paquetes individuales permanecen disponibles siempre.
- La capacidad se evalúa por bytes y páginas además de la cantidad de archivos. La aplicación no promete procesar cualquier lote de 2,000 PDFs sin importar su tamaño.
- Chrome y Edge actuales sobre HTTPS o `localhost` son los navegadores objetivo para lotes grandes; se mantiene un flujo de descarga tradicional para lotes pequeños.
- La cancelación deja de iniciar nuevas unidades de trabajo y libera recursos temporales conocidos.

## Suposiciones adoptadas al iniciar la implementación

El usuario inició la implementación antes de cerrar la tercera ronda del diseño. Se adoptaron las recomendaciones propuestas: preservar el orden del PCL, usar un cuarto estado para PCL inválido, emplear el flujo visual de tercer modo, omitir PDFs idénticos, generar reportes en el idioma activo y proteger adaptativamente el ZIP maestro.
