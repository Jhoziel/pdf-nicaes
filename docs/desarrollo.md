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

## Preparar el entorno de pruebas en Windows

Python y Playwright se usan únicamente para desarrollo y pruebas; no son requisitos del sitio publicado.

Desde la raíz del repositorio, con Python 3 instalado:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

Las pruebas de los builds de Cloudflare también necesitan Git Bash (incluido en Git para Windows). Las pruebas aisladas de su Worker y receptor usan Node si está disponible; el resumen indica cuando se omiten. Los contratos del receptor también se comprueban en las pruebas de navegador.

## Ejecutar las pruebas

```powershell
.\.venv\Scripts\python.exe tests\run_all.py
```

Incluye regresiones de dominio, interfaz, revisión, diagnóstico, auditoría visual, lotes grandes, builds de Cloudflare y paquete estático. El empaquetado comprueba archivos y hashes; sus pruebas sirven el ZIP extraído y verifican OCR, descargas y revisión sin red externa. Los datos sintéticos de las pruebas no necesitan documentos de Nicaes.

Para probar solo el paquete estático:

```powershell
.\.venv\Scripts\python.exe tests\run_static_package.py
```

## Vista local del paquete

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\preparar-sitio.ps1
.\.venv\Scripts\python.exe -m http.server 8765 --bind 127.0.0.1 --directory dist/sitio
```

Abre `http://127.0.0.1:8765/`. Termina el servidor con `Ctrl + C`. Sirve únicamente el paquete; el servidor de prueba no es un alojamiento de producción.

La auditoría visual está en `audit-output/audit_capture.py`. `tests/run_existing_audit.py` inicia su servidor temporal y guarda las capturas en una carpeta temporal, sin reemplazar las referencias guardadas en el repositorio.

## Archivos generados

`dist/` está excluido de Git. El comando estático reemplaza solo `dist/sitio/` y `dist/pdf-nicaes-web.zip`. El build histórico de Cloudflare limpia todo `dist/`; vuelve a preparar el ZIP después de ejecutarlo si necesitas entregar un paquete.

Las herramientas de escritorio anteriores se retiraron. Si necesitas investigar una versión antigua, consulta el historial de Git; no son parte de la publicación web.
