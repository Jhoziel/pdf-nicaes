# Publicación técnica

Para la persona que sube y mantiene el sitio: **[Guía para publicar](../GUIA-PARA-PUBLICAR.md)**.

Para conservar el despliegue alternativo: [Cloudflare Workers y Pages](cloudflare.md). Sus comandos y rutas no cambian.

## Paquete para un servidor estático

En Windows, desde la raíz del repositorio:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\preparar-sitio.ps1
```

Publica el contenido de `dist/sitio/` o extrae `dist/pdf-nicaes-web.zip` en la raíz web asignada. No publiques la raíz del repositorio. El paquete incluye las dependencias enumeradas en el manifiesto SHA-256 y sus licencias; ignora archivos adicionales dentro de `assets/`.

El script genera `build-info.js` con `local-dev` para conservar desactivado el envío de incidentes a `/api/diagnostics`, incluso si el entorno contiene variables de Cloudflare. El informe local sigue disponible. No se necesita backend, base de datos ni servicio de procesamiento. No marques ese archivo como `production`: el alojamiento estático no tiene receptor de diagnósticos.

El indicador de versión muestra `local-dev`; registra la fecha y revisión del código entregado junto al ZIP, fuera de la carpeta pública.

## Requisitos del alojamiento

- Servir los archivos con GET y HEAD, rutas relativas intactas y tipos MIME correctos para HTML, CSS, JavaScript, fuentes e imágenes.
- Entregar `eng.traineddata.gz` intacto, sin `Content-Encoding: gzip`: Tesseract hace la descompresión del modelo ([documentación de Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md)). Si se configura `gzip_static`, excluir este recurso.
- Usar HTTPS para la dirección final y configurar el acceso según las reglas de Nicaes. La aplicación no aporta autenticación.
- Evitar servir HTML como respuesta alternativa a recursos inexistentes. Un archivo de OCR ausente debe devolver 404, no una página de inicio con estado 200.
- Configurar `Cache-Control: no-store` para `/`, `/index.html` y `/build-info.js`; `no-cache` para JS y CSS propios; `public, max-age=31536000, immutable` para `/assets/vendor/` con versiones fijadas.
- Si se aplica CSP, permitir los workers y WebAssembly. La política del despliegue Cloudflare está en `pages/_headers`; ese archivo no se interpreta automáticamente en Nginx, IIS o un panel genérico.

La política de referencia es:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' blob:; img-src 'self' blob: data:; style-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

## Ejemplos Nginx para el administrador

Los ejemplos sirven el sitio desde `/var/www/pdf-nicaes`, en la raíz del host:

- `nginx-port-8080.conf`: escucha en 8080. Sirve como configuración de comprobación aislada; requiere que ese puerto esté disponible y permitido en la red.
- `nginx-public-ip.conf`: escucha en 80 como `default_server`. Úsalo únicamente si corresponde que este sea el sitio por defecto. Puede entrar en conflicto con otro servidor por defecto.

Ambos permiten únicamente los recursos públicos necesarios, incluido `review-domain.js`. Los archivos no contemplados y `/api/` devuelven 404.

El administrador debe adaptar la ruta, nombre del host y HTTPS al servidor real, comprobar con `nginx -t` y recargar solo si la comprobación es correcta. No se debe eliminar la configuración de otras páginas para instalar estos ejemplos. La instalación de Nginx, el certificado y las reglas de red dependen del entorno de Nicaes. Al añadir cabeceras, revisar su herencia entre bloques según la [documentación de Nginx](https://nginx.org/en/docs/http/ngx_http_headers_module.html).

Los ejemplos no incluyen certificado ni configuración TLS. Si el sitio se publica bajo una subruta, adaptar también las ubicaciones y redirigir la dirección sin barra final hacia la que sí la incluye.

## Actualizaciones

Conservar un respaldo completo y, cuando el alojamiento lo permita, preparar cada versión en una carpeta aparte y cambiar la raíz de publicación de una vez. Probar la versión extraída antes de reemplazar la activa. No guardar ZIPs, respaldos o datos de prueba dentro de la raíz pública.

La preparación estática y los builds Cloudflare comparten `dist/`. Ejecutarlos de forma secuencial; Cloudflare limpia esa carpeta. El último paso antes de entregar un ZIP debe ser preparar de nuevo el paquete estático.
