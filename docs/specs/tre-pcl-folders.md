# Carpetas de archivos TRE por PCL

## Objetivo

Permitir cargar archivos `.TRE` y uno o más PCL, copiar los archivos TRE solicitados a una carpeta por PCL y descargar todas las carpetas en un ZIP.

## Reglas

- Cada fila interpretable del PCL solicita un archivo cuyo nombre base sea el código seguido de `.tre`; la comparación ignora mayúsculas y minúsculas y exige el nombre completo.
- No se modifican los bytes del archivo TRE seleccionado.
- Entradas repetidas dentro de un PCL se consideran una sola solicitud y aparecen en el reporte.
- Si no hay coincidencia, el nombre se reporta como faltante.
- Si hay varios archivos TRE con el mismo nombre base, se reporta un conflicto y no se selecciona ninguno.
- Cada PCL produce una carpeta propia, con nombre basado en el PCL. Los nombres repetidos reciben sufijos para evitar que las carpetas colisionen.
- Cada carpeta incluye `reporte.txt`, incluso cuando el PCL no tiene coincidencias; así la carpeta puede representarse en el ZIP y explicar el resultado.
- El ZIP maestro incluye las carpetas y sus TRE disponibles. Los PCL inválidos también reciben una carpeta con el reporte.
- Los documentos permanecen en el navegador y la descarga se genera localmente.

## Diagnóstico

El modo se registra como `tre-pcl`. Se permite contar archivos TRE y PCL, resultados y solicitudes disponibles, faltantes o en conflicto. No se incluyen nombres, códigos, contenido ni filas del PCL.
