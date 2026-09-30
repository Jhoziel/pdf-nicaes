# Datos locales

Esta carpeta separa los archivos de prueba y las salidas de trabajo del código
fuente. Git ignora todo su contenido excepto este documento.

## Estructura

- `inputs/archives/`: paquetes ZIP usados en pruebas manuales.
- `inputs/pcl/`: archivos PCL individuales.
- `inputs/pdf/`: documentos PDF individuales.
- `fixtures/seals-pcl/`: PDFs y PCL relacionados usados para probar paquetes.
- `fixtures/audit-capture/`: PDF temporales creados por la captura automatizada
  de la auditoría.
- `outputs/diagnostics/`: diagnósticos exportados durante pruebas locales.
- `outputs/product-design/`: capturas y evidencia visual todavía no seleccionada
  para versionarse.

Las evidencias definitivas que formen parte de la documentación deben moverse a
una ubicación versionada, como `audit-output/`, antes de crear el commit.
