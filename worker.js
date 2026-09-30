import { onRequest as handleDiagnosticRequest } from "./functions/api/diagnostics.js";

const DIAGNOSTICS_PATH = "/api/diagnostics";

function noStoreResponse(status) {
  return new Response(null, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function fetch(request, env) {
  const pathname = new URL(request.url).pathname;

  if (pathname === DIAGNOSTICS_PATH) {
    return handleDiagnosticRequest({ request });
  }

  if (pathname.startsWith("/api/")) {
    return noStoreResponse(404);
  }

  if (!env?.ASSETS || typeof env.ASSETS.fetch !== "function") {
    console.error(JSON.stringify({
      event: "pdf_nicaes_configuration_error",
      errorCode: "ASSETS_BINDING_MISSING",
    }));
    return noStoreResponse(503);
  }

  return env.ASSETS.fetch(request);
}

export default { fetch };
