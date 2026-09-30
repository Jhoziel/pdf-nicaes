# Desarrollo y pruebas

Esta documentación es para quien modifica el código. Para administrar la publicación, usa la [guía sencilla](../GUIA-PARA-PUBLICAR.md).

## Arquitectura

La aplicación es HTML, CSS y JavaScript estático. Procesa PDFs y PCL en el navegador. Las bibliotecas, fuentes, workers, núcleos WebAssembly y modelo OCR se sirven desde `assets/vendor/`, sin depender de CDN durante el procesamiento.

- `app.js`: detección, procesamiento, revisión de resultados y descargas.
- `pcl-domain.js`, `review-domain.js`: contratos de paquetes PCL y revisión.
- `archive-import.js`, `zip-writer.js`, `ocr-loader.js`: importación de ZIP, generación incremental de paquetes e inicialización de OCR.
- `diagnostics.js`, `build-info.js`: diagnóstico sanitizado e identificación del despliegue.
- `worker.js`, `functions/`, `wrangler.jsonc`: alternativa de Cloudflare; no forman parte del ZIP estático.

La fuente codificada de algunos planos se reconoce directamente (`7UXVV` se decodifica como `TRUSS`). OCR es el respaldo cuando no se puede leer el texto. La inicialización tiene un límite de 60 segundos y registra códigos técnicos, sin guardar contenido de documentos.

Antes de cambiar reglas de negocio, consulta [CONTEXT.md](../CONTEXT.md) y las decisiones de [docs/adr](adr/). Actualiza juntas las versiones de dependencias, sus licencias y el manifiesto SHA-256. No cambies recursos de una ruta marcada como inmutable sin cambiar su versión.
