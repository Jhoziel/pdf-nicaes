# PDF Nicaes

Sitio web para trabajar con planos PDF: separar por código TRUSS, combinar versiones y preparar paquetes por edificio usando archivos PCL.

## Publicar y mantener el sitio

**Empieza aquí: [Guía para publicar, actualizar y resolver problemas](GUIA-PARA-PUBLICAR.md).**

La guía explica cómo pedir los datos del servidor de Nicaes y preparar un ZIP con los archivos que debes subir. No necesitas programar para seguirla.

Desde PowerShell, dentro de la carpeta del proyecto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\preparar-sitio.ps1
```

El resultado queda en `dist/pdf-nicaes-web.zip`. Sigue la guía para publicarlo.

## Usar la herramienta

Abre la dirección del sitio en el navegador, carga tus archivos y elige:

- **Separar por código:** agrupa las páginas que pertenecen a la misma TRUSS.
- **Combinar todos:** conserva la versión del último archivo cargado cuando se repite una TRUSS. Puedes cambiar el orden antes de procesar.
- **Paquetes por PCL:** prepara un ZIP por edificio con las TRUSS disponibles y un reporte. También acepta un ZIP de entrada con PDFs y PCL.

Si aparecen páginas sin identificar o reemplazos, revisa el resultado y confírmalo antes de descargar.

Los documentos se procesan dentro del navegador. El servidor entrega la página y sus recursos; no recibe los PDFs ni los archivos PCL. El paquete para Nicaes conserva el diagnóstico descargable y no envía incidentes a un servidor. El despliegue alternativo en Cloudflare puede enviar únicamente diagnósticos técnicos sanitizados cuando ocurre un incidente.

## Documentación técnica

- [Desarrollo y pruebas](docs/desarrollo.md).
- [Publicación técnica y alternativa Cloudflare](deploy/README.md).
- [Vocabulario del proyecto](CONTEXT.md).
