const MAX_BODY_BYTES = 16 * 1024;
const REQUIRED_TOP_LEVEL_FIELDS = new Set([
  "schemaVersion",
  "executionId",
  "build",
  "browser",
  "mode",
  "outcome",
  "phase",
  "errorCode",
  "download",
  "startedAt",
  "updatedAt",
  "durationMs",
  "counts",
  "detectionProfile",
  "phases",
]);
const TOP_LEVEL_FIELDS = new Set([
  ...REQUIRED_TOP_LEVEL_FIELDS,
  "runtime",
  "ocrInit",
]);
const COUNT_FIELDS = new Set([
  "pdfCount",
  "pclCount",
  "pagesTotal",
  "pagesInspected",
  "ocrPages",
  "identifiedPages",
  "unidentifiedPages",
  "duplicatePdfCount",
  "resultCount",
  "artifactCount",
  "downloadAttemptCount",
  "downloadCompletedCount",
  "downloadIncidentCount",
  "availableCount",
  "missingCount",
  "conflictCount",
  "retainedPages",
  "discardedPages",
  "manualAssignmentCount",
  "keptUnidentifiedCount",
]);
const DETECTION_FIELDS = new Set([
  "tableHeader",
  "adjacentText",
  "mitekFallback",
  "encodedText",
  "ocr",
  "ambiguous",
  "unidentified",
  "trussAndType",
]);
const PHASES = new Set([
  "preparing",
  "reading_pdf",
  "reading_pcl",
  "ocr",
  "indexing",
  "building_result",
  "planning_packages",
  "reviewing",
  "validating",
  "building_pdf",
  "building_individual_zip",
  "building_master_zip",
  "ready",
]);
const OCR_INIT_STATUSES = new Set([
  "not_started",
  "checking",
  "initializing",
  "ready",
  "unavailable",
  "timeout",
  "failed",
]);
const OCR_INIT_STAGES = new Set([
  "not_started",
  "preflight",
  "worker",
  "core",
  "language",
  "api",
  "ready",
  "unknown",
]);
const OCR_RESOURCE_FIELDS = new Set([
  "worker",
  "language",
  "coreStandard",
  "coreLstm",
  "coreSimd",
  "coreSimdLstm",
]);
const OCR_RESOURCE_OUTCOMES = new Set([
  "ok",
  "http_error",
  "network_error",
  "timeout",
  "unsupported",
]);

function hasExactFields(value, fields) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((field) => fields.has(field));
}

function isSafeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function validNumberMap(value, allowedFields) {
  return hasExactFields(value, allowedFields)
    && Object.keys(value).length <= allowedFields.size
    && Object.values(value).every(isSafeCount);
}

function validPhase(value) {
  return hasExactFields(value, new Set(["name", "startedAt", "durationMs"]))
    && Object.keys(value).length === 3
    && PHASES.has(value.name)
    && isIsoTimestamp(value.startedAt)
    && (value.durationMs === null || isSafeCount(value.durationMs));
}

function validRuntime(value) {
  const fields = new Set([
    "diagnosticsRevision",
    "online",
    "workerSupported",
    "wasmSupported",
    "secureContext",
    "crossOriginIsolated",
  ]);
  return hasExactFields(value, fields)
    && Object.keys(value).length === fields.size
    && Number.isSafeInteger(value.diagnosticsRevision)
    && value.diagnosticsRevision >= 1
    && value.diagnosticsRevision <= 999
    && [
      value.online,
      value.workerSupported,
      value.wasmSupported,
      value.secureContext,
      value.crossOriginIsolated,
    ].every((entry) => typeof entry === "boolean");
}

function validOcrResource(value) {
  const fields = new Set(["outcome", "httpStatus", "durationMs"]);
  return hasExactFields(value, fields)
    && Object.keys(value).length === fields.size
    && OCR_RESOURCE_OUTCOMES.has(value.outcome)
    && isSafeCount(value.httpStatus)
    && (value.httpStatus === 0 || (value.httpStatus >= 100 && value.httpStatus <= 599))
    && isSafeCount(value.durationMs)
    && value.durationMs <= 300000;
}

function validOcrInit(value) {
  const fields = new Set([
    "status",
    "stage",
    "elapsedMs",
    "timeoutMs",
    "progressPercent",
    "resources",
  ]);
  return hasExactFields(value, fields)
    && Object.keys(value).length === fields.size
    && OCR_INIT_STATUSES.has(value.status)
    && OCR_INIT_STAGES.has(value.stage)
    && isSafeCount(value.elapsedMs)
    && value.elapsedMs <= 300000
    && isSafeCount(value.timeoutMs)
    && value.timeoutMs <= 300000
    && isSafeCount(value.progressPercent)
    && value.progressPercent <= 100
    && hasExactFields(value.resources, OCR_RESOURCE_FIELDS)
    && Object.keys(value.resources).length <= OCR_RESOURCE_FIELDS.size
    && Object.values(value.resources).every(validOcrResource);
}

function validDiagnostic(value) {
  if (!hasExactFields(value, TOP_LEVEL_FIELDS)) return false;
  if (![...REQUIRED_TOP_LEVEL_FIELDS].every((field) => Object.hasOwn(value, field))) return false;
  if (value.schemaVersion !== 1) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.executionId)) return false;
  if (!hasExactFields(value.build, new Set(["commitSha", "shortSha", "channel"]))) return false;
  if (!/^[0-9a-f]{40}$/.test(value.build.commitSha) || value.build.shortSha !== value.build.commitSha.slice(0, 7)) return false;
  if (value.build.channel !== "production") return false;
  if (!hasExactFields(value.browser, new Set(["family", "major"]))) return false;
  if (!/^[A-Za-z ]{1,24}$/.test(value.browser.family) || !/^(?:\d{1,3}|unknown)$/.test(value.browser.major)) return false;
  if (value.runtime !== undefined && !validRuntime(value.runtime)) return false;
  if (!["split", "merge", "pcl"].includes(value.mode) || value.outcome !== "incident") return false;
  if (!PHASES.has(value.phase) || !/^[A-Z][A-Z0-9_]{0,63}$/.test(value.errorCode)) return false;
  if (value.download !== null) {
    if (!hasExactFields(value.download, new Set(["attempt", "kind"]))) return false;
    if (!isSafeCount(value.download.attempt) || value.download.attempt < 1) return false;
    if (!["pdf", "individual_zip", "master_zip"].includes(value.download.kind)) return false;
  }
  if (!isIsoTimestamp(value.startedAt) || !isIsoTimestamp(value.updatedAt) || !isSafeCount(value.durationMs)) return false;
  if (Date.parse(value.updatedAt) - Date.parse(value.startedAt) !== value.durationMs) return false;
  if (!validNumberMap(value.counts, COUNT_FIELDS) || !validNumberMap(value.detectionProfile, DETECTION_FIELDS)) return false;
  if (!Array.isArray(value.phases) || value.phases.length < 1 || value.phases.length > 32) return false;
  if (!value.phases.every(validPhase)) return false;
  return value.ocrInit === undefined || validOcrInit(value.ocrInit);
}

function response(status, headers = {}) {
  return new Response(null, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

async function readBodyWithinLimit(request) {
  if (!request.body) return { rawBody: "" };

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The response is already determined; cancellation is best effort.
        }
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { invalid: true };
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { rawBody: new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes) };
  } catch {
    return { invalid: true };
  }
}

export async function onRequest({ request }) {
  if (request.method !== "POST") return response(405, { allow: "POST" });

  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) return response(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(415);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return response(413);

  const bodyResult = await readBodyWithinLimit(request);
  if (bodyResult.tooLarge) return response(413);
  if (bodyResult.invalid) return response(400);
  const { rawBody } = bodyResult;

  let diagnostic;
  try {
    diagnostic = JSON.parse(rawBody);
  } catch {
    return response(400);
  }
  if (!validDiagnostic(diagnostic)) return response(400);

  console.error(JSON.stringify({ event: "pdf_nicaes_incident", diagnostic }));
  return response(202);
}

export const diagnosticContract = Object.freeze({ MAX_BODY_BYTES, validDiagnostic });
