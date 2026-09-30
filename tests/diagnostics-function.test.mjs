import assert from "node:assert/strict";
import { diagnosticContract, onRequest } from "../functions/api/diagnostics.js";

const payload = {
  schemaVersion: 1,
  executionId: "123e4567-e89b-42d3-a456-426614174001",
  build: {
    commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
    shortSha: "076c55c",
    channel: "production",
  },
  browser: { family: "Chromium", major: "128" },
  mode: "pcl",
  outcome: "incident",
  phase: "reading_pdf",
  errorCode: "PDF_INVALID",
  download: null,
  startedAt: "2026-08-25T12:00:00.000Z",
  updatedAt: "2026-08-25T12:00:02.000Z",
  durationMs: 2000,
  counts: { pdfCount: 1, pagesInspected: 12 },
  detectionProfile: { tableHeader: 10, trussAndType: 2 },
  phases: [
    { name: "preparing", startedAt: "2026-08-25T12:00:00.000Z", durationMs: 1000 },
    { name: "reading_pdf", startedAt: "2026-08-25T12:00:01.000Z", durationMs: 1000 },
  ],
};
const enrichedPayload = {
  ...payload,
  runtime: {
    diagnosticsRevision: 2,
    online: true,
    workerSupported: true,
    wasmSupported: true,
    secureContext: true,
    crossOriginIsolated: false,
  },
  ocrInit: {
    status: "failed",
    stage: "language",
    elapsedMs: 1200,
    timeoutMs: 60000,
    progressPercent: 34,
    resources: {
      worker: { outcome: "ok", httpStatus: 200, durationMs: 4 },
      language: { outcome: "http_error", httpStatus: 404, durationMs: 5 },
    },
  },
};

const logged = [];
const originalError = console.error;
console.error = (value) => logged.push(value);
try {
  const endpoint = "https://nicaes-pdf-tool.qualeadty.com/api/diagnostics";
  const requestFor = (body, options = {}) => new Request(endpoint, {
    method: options.method || "POST",
    headers: {
      "content-type": options.contentType || "application/json",
      origin: options.origin || "https://nicaes-pdf-tool.qualeadty.com",
    },
    body: (options.method || "POST") === "GET" ? undefined : body,
  });
  const response = await onRequest({
    request: requestFor(JSON.stringify(enrichedPayload)),
  });

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
  assert.deepEqual(logged, [JSON.stringify({ event: "pdf_nicaes_incident", diagnostic: enrichedPayload })]);

  const invalidChronology = {
    ...enrichedPayload,
    updatedAt: "2026-08-25T11:59:59.000Z",
  };
  const invalidResponse = await onRequest({
    request: requestFor(JSON.stringify(invalidChronology)),
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(logged.length, 1);
  assert.equal(diagnosticContract.validDiagnostic({
    ...enrichedPayload,
    browser: { family: "Unknown", major: "unknown" },
  }), true);
  assert.equal(diagnosticContract.validDiagnostic(payload), true);
  assert.equal(diagnosticContract.validDiagnostic({
    ...payload,
    phase: "reviewing",
    counts: { pdfCount: 1, manualAssignmentCount: 2, keptUnidentifiedCount: 1 },
    phases: [
      payload.phases[0],
      { name: "reviewing", startedAt: "2026-08-25T12:00:01.000Z", durationMs: 1000 },
    ],
  }), true);

  const rejectionCases = [
    [405, requestFor("", { method: "GET" })],
    [403, requestFor(JSON.stringify(enrichedPayload), { origin: "https://attacker.example" })],
    [415, requestFor(JSON.stringify(enrichedPayload), { contentType: "text/plain" })],
    [400, requestFor(JSON.stringify({ ...enrichedPayload, fileName: "ECHELON-secret.pdf" }))],
    [400, requestFor(JSON.stringify({
      ...enrichedPayload,
      ocrInit: { ...enrichedPayload.ocrInit, rawMessage: "PRIVATE" },
    }))],
    [400, requestFor(JSON.stringify({ ...enrichedPayload, schemaVersion: 2 }))],
    [413, requestFor(JSON.stringify({ ...enrichedPayload, padding: "x".repeat(17 * 1024) }))],
  ];
  for (const [expectedStatus, request] of rejectionCases) {
    const rejected = await onRequest({ request });
    assert.equal(rejected.status, expectedStatus);
    assert.equal(rejected.headers.get("cache-control"), "no-store");
  }

  const oversizedStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(diagnosticContract.MAX_BODY_BYTES + 1));
      controller.close();
    },
  });
  const chunkedOversizedResponse = await onRequest({
    request: {
      method: "POST",
      url: endpoint,
      headers: new Headers({
        "content-type": "application/json",
        origin: "https://nicaes-pdf-tool.qualeadty.com",
      }),
      body: oversizedStream,
      text() {
        throw new Error("The endpoint must not buffer an unbounded request body.");
      },
    },
  });
  assert.equal(chunkedOversizedResponse.status, 413);
  assert.equal(logged.length, 1);

  console.log(JSON.stringify([
    { name: "the endpoint accepts and logs the exact incident contract", passed: true },
    { name: "the endpoint rejects impossible diagnostic chronology", passed: true },
    { name: "the endpoint rejects method, origin, media type, forbidden fields, schema, and size", passed: true },
    { name: "the endpoint bounds streamed bodies without relying on Content-Length", passed: true },
    { name: "the endpoint accepts the producer's privacy-preserving unknown browser fallback", passed: true },
  ], null, 2));
} catch (error) {
  console.log(JSON.stringify([{
    name: "the endpoint accepts and logs the exact incident contract",
    passed: false,
    error: String(error?.stack || error),
  }], null, 2));
  process.exitCode = 1;
} finally {
  console.error = originalError;
}
