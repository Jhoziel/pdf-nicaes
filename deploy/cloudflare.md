# Cloudflare (alternativa técnica)

## Cloudflare Workers Builds

Publish the site from the GitHub repository with these Workers Builds settings:

- Production branch: `main`
- Build command: `sh deploy/build-pages.sh` (legacy filename retained so the
  existing Cloudflare build configuration does not need a dashboard change)
- Deploy command: `npx wrangler deploy`

Workers Builds injects `WORKERS_CI_COMMIT_SHA` and `WORKERS_CI_BRANCH`. The build
script writes those values into `dist/build-info.js`; missing or invalid metadata
forces `local-dev` and disables remote diagnostics. Before creating the bundle,
the build verifies the pinned vendor SHA-256 manifest and Cloudflare's 25 MiB
per-asset limit. It creates a clean static bundle containing `index.html`,
`styles.css`, `app.js`, `diagnostics.js`, `build-info.js`, `pcl-domain.js`, `tre-pcl-domain.js`, `review-domain.js`,
`zip-writer.js`, `_headers`, and the curated `assets/` directory. The browser
bundle also includes `archive-import.js`, `ocr-loader.js`, and same-origin PDF,
ZIP, font, WebAssembly, and OCR resources.

`worker.js` is the Wrangler entrypoint. It sends only `/api/diagnostics` to the
sanitized receiver in `functions/api/diagnostics.js`, rejects other `/api/`
paths, and delegates ordinary requests to the `ASSETS` binding. This prevents
development files, repository metadata, and Pages-only
`_routes.json` from being published.

Before enabling production diagnostics, create a Cloudflare rate-limiting rule
for `POST /api/diagnostics`. Choose the threshold from observed legitimate
incident volume and monitor HTTP 429 responses; the Worker itself additionally
requires same-origin JSON, enforces a 16 KiB body limit, rejects unknown fields,
and never exposes a read endpoint.

Attach `nicaes-pdf-tool.qualeadty.com` as the Worker's custom domain. If the zone
does not already redirect HTTP, add a Cloudflare Single Redirect scoped to this
hostname:

```text
When:  (http.host eq "nicaes-pdf-tool.qualeadty.com" and not ssl)
Then:  Dynamic redirect to concat("https://", http.host, http.request.uri.path)
Code:  301
Preserve query string: enabled
```


Esta alternativa conserva los comandos y rutas existentes. Para el servidor de Nicaes, usa [la guía principal](../GUIA-PARA-PUBLICAR.md). El build de Cloudflare limpia todo dist/; regenera el paquete estático después si vas a entregarlo.
