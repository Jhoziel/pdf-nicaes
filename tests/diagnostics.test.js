(async function runDiagnosticsTests(root) {
  "use strict";

  const Diagnostics = root.NicaesDiagnostics
    || (typeof require === "function" ? require("../diagnostics.js") : null);
  const results = [];

  function assertDeepEqual(actual, expected) {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
      throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
    }
  }

  async function test(name, callback) {
    try {
      await callback();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({ name, passed: false, error: String(error?.stack || error) });
    }
  }

  await test("a completed execution yields a versioned local report without remote telemetry", () => {
    const sent = [];
    const clock = [0, 1000, 2500];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174000",
      transport: (payload) => sent.push(payload),
    });

    tracker.start({ mode: "pcl", pdfCount: 2, pclCount: 1 });
    tracker.enterPhase("reading_pdf", { pagesInspected: 3 });
    tracker.complete("completed_with_review", { resultCount: 1 });

    const report = tracker.getCurrent();
    assertDeepEqual({
      schemaVersion: report.schemaVersion,
      executionId: report.executionId,
      build: report.build,
      browser: report.browser,
      mode: report.mode,
      outcome: report.outcome,
      phase: report.phase,
      counts: report.counts,
      phases: report.phases,
      sentCount: sent.length,
    }, {
      schemaVersion: 1,
      executionId: "123e4567-e89b-42d3-a456-426614174000",
      build: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        shortSha: "076c55c",
        channel: "production",
      },
      browser: { family: "Chromium", major: "128" },
      mode: "pcl",
      outcome: "completed_with_review",
      phase: "ready",
      counts: { pdfCount: 2, pclCount: 1, pagesInspected: 3, resultCount: 1 },
      phases: [
        { name: "preparing", startedAt: "1970-01-01T00:00:00.000Z", durationMs: 1000 },
        { name: "reading_pdf", startedAt: "1970-01-01T00:00:01.000Z", durationMs: 1500 },
        { name: "ready", startedAt: "1970-01-01T00:00:02.500Z", durationMs: null },
      ],
      sentCount: 0,
    });
  });

  await test("an incident retries a sanitized payload without leaking document data", async () => {
    const attempts = [];
    const clock = [0, 1000, 2000];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174001",
      transport: async (payload) => {
        attempts.push(payload);
        if (attempts.length === 1) throw new Error("offline");
        return { ok: true };
      },
    });

    tracker.start({
      mode: "pcl",
      pdfCount: 1,
      fileName: "ECHELON-secret.pdf",
      trussCode: "F01",
    });
    tracker.enterPhase("reading_pdf", {
      pagesInspected: 12,
      extractedText: "secret drawing content",
    });
    tracker.recordDetection("tableHeader", 10);
    tracker.recordDetection("trussAndType", 2);
    await tracker.recordIncident("PDF_INVALID", {
      fileName: "ECHELON-secret.pdf",
      rawMessage: "F01 failed with secret drawing content",
    });

    const report = tracker.getCurrent();
    const serialized = tracker.toJson(report);
    assertDeepEqual({
      attemptCount: attempts.length,
      outcome: report.outcome,
      phase: report.phase,
      errorCode: report.errorCode,
      remoteStatus: report.remoteStatus,
      detectionProfile: report.detectionProfile,
      payload: attempts[1],
      leaked: /ECHELON|F01|secret drawing/i.test(serialized),
    }, {
      attemptCount: 2,
      outcome: "incident",
      phase: "reading_pdf",
      errorCode: "PDF_INVALID",
      remoteStatus: "sent",
      detectionProfile: { tableHeader: 10, trussAndType: 2 },
      payload: {
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
        startedAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:02.000Z",
        durationMs: 2000,
        counts: { pdfCount: 1, pagesInspected: 12 },
        detectionProfile: { tableHeader: 10, trussAndType: 2 },
        phases: [
          { name: "preparing", startedAt: "1970-01-01T00:00:00.000Z", durationMs: 1000 },
          { name: "reading_pdf", startedAt: "1970-01-01T00:00:01.000Z", durationMs: 1000 },
        ],
      },
      leaked: false,
    });
  });

  await test("OCR initialization telemetry identifies the failing stage without leaking raw details", async () => {
    const sent = [];
    const clock = [0, 100, 1300];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      runtimeInfo: {
        diagnosticsRevision: 2,
        online: true,
        workerSupported: true,
        wasmSupported: true,
        secureContext: true,
        crossOriginIsolated: false,
        userAgent: "PRIVATE user agent",
      },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174015",
      transport: async (payload) => {
        sent.push(payload);
        return { ok: true };
      },
    });

    tracker.start({ mode: "pcl", pdfCount: 1, pclCount: 3 });
    tracker.enterPhase("ocr");
    tracker.recordOcrInit({
      status: "checking",
      stage: "preflight",
      elapsedMs: 12,
      timeoutMs: 60000,
      progressPercent: 0,
      resources: {
        worker: { outcome: "ok", httpStatus: 200, durationMs: 4, url: "PRIVATE URL" },
        language: { outcome: "http_error", httpStatus: 404, durationMs: 5 },
        forbiddenResource: { outcome: "ok", httpStatus: 200, durationMs: 1 },
      },
      rawMessage: "PRIVATE OCR failure",
    });
    tracker.recordOcrInit({
      status: "failed",
      stage: "language",
      elapsedMs: 1200,
      progressPercent: 34,
    });
    await tracker.recordIncident("OCR_INIT_FAILED");

    const report = tracker.getCurrent();
    const serialized = tracker.toJson(report);
    assertDeepEqual({
      runtime: report.runtime,
      ocrInit: report.ocrInit,
      remoteRuntime: sent[0].runtime,
      remoteOcrInit: sent[0].ocrInit,
      leaked: /PRIVATE|user agent|rawMessage|url|forbiddenResource/i.test(serialized),
    }, {
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
      remoteRuntime: {
        diagnosticsRevision: 2,
        online: true,
        workerSupported: true,
        wasmSupported: true,
        secureContext: true,
        crossOriginIsolated: false,
      },
      remoteOcrInit: {
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
      leaked: false,
    });
  });

  await test("a failed download stays correlated with its completed execution", async () => {
    const sent = [];
    const clock = [0, 1000, 2000, 3000];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174009",
      transport: async (payload) => {
        sent.push(payload);
        return { ok: true };
      },
    });

    tracker.start({ mode: "pcl", pdfCount: 1, pclCount: 1 });
    tracker.complete("completed", { resultCount: 1 });
    tracker.startDownload("master_zip");
    await tracker.failDownload("ZIP_MASTER_FAILED");

    const report = tracker.getCurrent();
    assertDeepEqual({
      executionId: report.executionId,
      outcome: report.outcome,
      phase: report.phase,
      downloads: report.downloads,
      sentDownload: sent[0].download,
    }, {
      executionId: "123e4567-e89b-42d3-a456-426614174009",
      outcome: "incident",
      phase: "building_master_zip",
      downloads: [{
        attempt: 1,
        kind: "master_zip",
        phase: "building_master_zip",
        startedAt: "1970-01-01T00:00:02.000Z",
        durationMs: 1000,
        outcome: "incident",
        errorCode: "ZIP_MASTER_FAILED",
      }],
      sentDownload: { attempt: 1, kind: "master_zip" },
    });
  });

  await test("a successful download returns to ready without changing the completed outcome", () => {
    const sent = [];
    const clock = [0, 1000, 2000, 3000];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174010",
      transport: (payload) => sent.push(payload),
    });

    tracker.start({ mode: "pcl", pdfCount: 1, pclCount: 1 });
    tracker.complete("completed", { resultCount: 1 });
    tracker.startDownload("individual_zip");
    tracker.finishDownload({ artifactCount: 1 });

    const report = tracker.getCurrent();
    assertDeepEqual({
      outcome: report.outcome,
      phase: report.phase,
      durationMs: report.durationMs,
      artifactCount: report.counts.artifactCount,
      downloads: report.downloads,
      sentCount: sent.length,
    }, {
      outcome: "completed",
      phase: "ready",
      durationMs: 3000,
      artifactCount: 1,
      downloads: [{
        attempt: 1,
        kind: "individual_zip",
        phase: "building_individual_zip",
        startedAt: "1970-01-01T00:00:02.000Z",
        durationMs: 1000,
        outcome: "completed",
        errorCode: null,
      }],
      sentCount: 0,
    });
  });

  await test("a user-reported incident can be previewed without mutating the completed execution", () => {
    const clock = [0, 1000, 2000];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174011",
    });

    tracker.start({ mode: "split", pdfCount: 1 });
    tracker.complete("completed", { pagesTotal: 2, resultCount: 2 });
    const preview = tracker.previewIncident("USER_REPORTED_INCORRECT");

    assertDeepEqual({
      currentOutcome: tracker.getCurrent().outcome,
      previewOutcome: preview.outcome,
      previewErrorCode: preview.errorCode,
      previewDuration: preview.durationMs,
      previewDownload: preview.download,
      hasLocalOnlyFields: "remoteStatus" in preview || "downloads" in preview,
    }, {
      currentOutcome: "completed",
      previewOutcome: "incident",
      previewErrorCode: "USER_REPORTED_INCORRECT",
      previewDuration: 2000,
      previewDownload: null,
      hasLocalOnlyFields: false,
    });
  });

  await test("a later user report does not misattribute a successful prior download", () => {
    const clock = [0, 1000, 2000, 3000, 4000];
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => clock.shift(),
      uuid: () => "123e4567-e89b-42d3-a456-426614174012",
    });

    tracker.start({ mode: "split", pdfCount: 1 });
    tracker.complete("completed", { resultCount: 1 });
    tracker.startDownload("pdf");
    tracker.finishDownload({ artifactCount: 1 });
    const preview = tracker.previewIncident("USER_REPORTED_INCORRECT");

    assertDeepEqual({ download: preview.download, errorCode: preview.errorCode }, {
      download: null,
      errorCode: "USER_REPORTED_INCORRECT",
    });
  });

  await test("only the three latest diagnostics remain in memory and cancellation stays local", () => {
    const sent = [];
    let time = 0;
    let sequence = 0;
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => {
        const current = time;
        time += 100;
        return current;
      },
      uuid: () => `123e4567-e89b-42d3-a456-42661417400${sequence += 1}`,
      transport: (payload) => sent.push(payload),
    });

    for (const mode of ["split", "merge", "pcl", "split"]) {
      tracker.start({ mode, pdfCount: 1 });
      tracker.cancel({ pagesInspected: 0 });
    }

    assertDeepEqual({
      executionIds: tracker.getRecent().map((report) => report.executionId),
      outcomes: tracker.getRecent().map((report) => report.outcome),
      sentCount: sent.length,
    }, {
      executionIds: [
        "123e4567-e89b-42d3-a456-426614174004",
        "123e4567-e89b-42d3-a456-426614174003",
        "123e4567-e89b-42d3-a456-426614174002",
      ],
      outcomes: ["cancelled", "cancelled", "cancelled"],
      sentCount: 0,
    });
  });

  await test("missing build metadata forces local development mode and disables remote delivery", async () => {
    const sent = [];
    const tracker = Diagnostics.createTracker({
      buildInfo: { commitSha: "missing", channel: "production" },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => 0,
      uuid: () => "123e4567-e89b-42d3-a456-426614174013",
      transport: (payload) => sent.push(payload),
    });

    tracker.start({ mode: "split", pdfCount: 1 });
    await tracker.recordIncident("PDF_INVALID");

    assertDeepEqual({
      build: tracker.getCurrent().build,
      remoteStatus: tracker.getCurrent().remoteStatus,
      sentCount: sent.length,
    }, {
      build: { commitSha: "local-dev", shortSha: "local-dev", channel: "local-dev" },
      remoteStatus: "not_required",
      sentCount: 0,
    });
  });

  await test("repeated downloads keep the local report bounded and attempt numbers monotonic", () => {
    let time = 0;
    const tracker = Diagnostics.createTracker({
      buildInfo: { commitSha: "local-dev", channel: "local-dev" },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => {
        time += 10;
        return time;
      },
      uuid: () => "123e4567-e89b-42d3-a456-426614174014",
    });

    tracker.start({ mode: "split", pdfCount: 1 });
    tracker.complete("completed", { resultCount: 1 });
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      tracker.startDownload("pdf");
      tracker.finishDownload({ artifactCount: attempt });
    }
    const report = tracker.getCurrent();
    const byteLength = new TextEncoder().encode(tracker.toJson(report)).byteLength;

    assertDeepEqual({
      lastAttempt: report.downloads.at(-1).attempt,
      retainedDownloads: report.downloads.length,
      retainedPhases: report.phases.length,
      downloadAttemptCount: report.counts.downloadAttemptCount,
      downloadCompletedCount: report.counts.downloadCompletedCount,
      bounded: byteLength <= Diagnostics.MAX_REPORT_BYTES,
    }, {
      lastAttempt: 100,
      retainedDownloads: 24,
      retainedPhases: 32,
      downloadAttemptCount: 100,
      downloadCompletedCount: 100,
      bounded: true,
    });
  });

  await test("a delayed incident delivery cannot mutate a newer execution", async () => {
    let releaseTransport;
    let sequence = 0;
    const tracker = Diagnostics.createTracker({
      buildInfo: {
        commitSha: "076c55c7ce9570f958f5b01ea872f3a93e6e83ec",
        channel: "production",
      },
      browserInfo: { family: "Chromium", major: "128" },
      now: () => sequence * 100,
      uuid: () => `123e4567-e89b-42d3-a456-4266141740${String(sequence += 1).padStart(2, "0")}`,
      transport: () => new Promise((resolve) => { releaseTransport = resolve; }),
    });

    tracker.start({ mode: "split", pdfCount: 1 });
    const incidentDelivery = tracker.recordIncident("PDF_INVALID");
    tracker.start({ mode: "merge", pdfCount: 2 });
    releaseTransport({ ok: true });
    const firstReport = await incidentDelivery;

    assertDeepEqual({
      deliveredOutcome: firstReport.outcome,
      deliveredStatus: firstReport.remoteStatus,
      currentMode: tracker.getCurrent().mode,
      currentOutcome: tracker.getCurrent().outcome,
      currentStatus: tracker.getCurrent().remoteStatus,
    }, {
      deliveredOutcome: "incident",
      deliveredStatus: "sent",
      currentMode: "merge",
      currentOutcome: "processing",
      currentStatus: "not_required",
    });
  });

  await test("review activity is reported only as aggregate counts", () => {
    const tracker = Diagnostics.createTracker({
      now: () => 0,
      uuid: () => "123e4567-e89b-42d3-a456-426614174099",
    });
    tracker.start({ mode: "split", pdfCount: 1 });
    tracker.enterPhase("reviewing", {
      manualAssignmentCount: 2,
      keptUnidentifiedCount: 1,
      trussCode: "F01",
    });
    const report = tracker.getCurrent();
    assertDeepEqual({ phase: report.phase, counts: report.counts }, {
      phase: "reviewing",
      counts: {
        pdfCount: 1,
        manualAssignmentCount: 2,
        keptUnidentifiedCount: 1,
      },
    });
  });

  root.__testResults = results;
  root.__testsComplete = true;
  if (typeof document !== "undefined") {
    const output = document.createElement("pre");
    output.id = "test-results";
    output.textContent = JSON.stringify(results);
    document.documentElement.append(output);
  }
  if (typeof module !== "undefined" && module.exports) {
    console.log(JSON.stringify(results, null, 2));
    if (results.some((result) => !result.passed)) process.exitCode = 1;
  }
}(typeof window !== "undefined" ? window : globalThis));
