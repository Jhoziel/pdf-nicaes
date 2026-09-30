import assert from "node:assert/strict";
import worker from "../worker.js";

const endpoint = "https://nicaes-pdf-tool.qualeadty.com/api/diagnostics";
const payload = {
  schemaVersion: 1,
  executionId: "123e4567-e89b-42d3-a456-426614174001",
  build: {
    commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
    shortSha: "076c55c",
    channel: "production",
  },
  browser: { family: "Chromium", major: "128" },
  runtime: {
    diagnosticsRevision: 2,
    online: true,
    workerSupported: true,
    wasmSupported: true,
    secureContext: true,
    crossOriginIsolated: false,
  },
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

const assetRequests = [];
const env = {
  ASSETS: {
    async fetch(request) {
      assetRequests.push(request.url);
      return new Response("static asset", { status: 200 });
    },
  },
};

const logged = [];
const originalError = console.error;
console.error = (value) => logged.push(value);

try {
  const incidentResponse = await worker.fetch(new Request(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://nicaes-pdf-tool.qualeadty.com",
    },
    body: JSON.stringify(payload),
  }), env);

  assert.equal(incidentResponse.status, 202);
  assert.equal(assetRequests.length, 0);
  assert.deepEqual(logged, [JSON.stringify({ event: "pdf_nicaes_incident", diagnostic: payload })]);

  const methodResponse = await worker.fetch(new Request(endpoint), env);
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get("allow"), "POST");
  assert.equal(assetRequests.length, 0);

  const unknownApiResponse = await worker.fetch(
    new Request("https://nicaes-pdf-tool.qualeadty.com/api/unknown"),
    env,
  );
  assert.equal(unknownApiResponse.status, 404);
  assert.equal(unknownApiResponse.headers.get("cache-control"), "no-store");
  assert.equal(assetRequests.length, 0);

  const assetResponse = await worker.fetch(
    new Request("https://nicaes-pdf-tool.qualeadty.com/styles.css"),
    env,
  );
  assert.equal(assetResponse.status, 200);
  assert.equal(await assetResponse.text(), "static asset");
  assert.deepEqual(assetRequests, ["https://nicaes-pdf-tool.qualeadty.com/styles.css"]);

  console.log(JSON.stringify([
    { name: "the Worker routes diagnostics without exposing other API paths", passed: true },
    { name: "the Worker delegates non-API requests to static assets", passed: true },
  ], null, 2));
} catch (error) {
  console.log(JSON.stringify([{
    name: "the Worker exposes diagnostics and static assets",
    passed: false,
    error: String(error?.stack || error),
  }], null, 2));
  process.exitCode = 1;
} finally {
  console.error = originalError;
}
