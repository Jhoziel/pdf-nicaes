(function exposeDiagnostics(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.NicaesDiagnostics = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const SCHEMA_VERSION = 1;
  const COUNT_FIELDS = new Set([
    "pdfCount",
    "treCount",
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
  const MAX_REPORT_BYTES = 16 * 1024;
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

  function cleanSafeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(maximum, Math.trunc(value)));
  }

  function cleanCounts(values = {}) {
    const counts = {};
    for (const [name, value] of Object.entries(values)) {
      if (!COUNT_FIELDS.has(name) || !Number.isFinite(value)) continue;
      counts[name] = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(value)));
    }
    return counts;
  }

  function cleanBuildInfo(buildInfo = {}) {
    const rawSha = String(buildInfo.commitSha || "").toLowerCase();
    const commitSha = /^[a-f0-9]{40}$/.test(rawSha) ? rawSha : "local-dev";
    const channel = commitSha !== "local-dev" && ["production", "preview"].includes(buildInfo.channel)
      ? buildInfo.channel
      : "local-dev";
    return {
      commitSha,
      shortSha: commitSha === "local-dev" ? commitSha : commitSha.slice(0, 7),
      channel,
    };
  }

  function cleanBrowserInfo(browserInfo = {}) {
    const family = String(browserInfo.family || "Unknown").replace(/[^A-Za-z ]/g, "").slice(0, 24) || "Unknown";
    const major = /^\d{1,3}$/.test(String(browserInfo.major || "")) ? String(browserInfo.major) : "unknown";
    return { family, major };
  }

  function cleanRuntimeInfo(runtimeInfo) {
    if (!runtimeInfo || typeof runtimeInfo !== "object" || Array.isArray(runtimeInfo)) return null;
    return {
      diagnosticsRevision: Math.max(1, Math.min(999, Math.trunc(runtimeInfo.diagnosticsRevision) || 1)),
      online: runtimeInfo.online === true,
      workerSupported: runtimeInfo.workerSupported === true,
      wasmSupported: runtimeInfo.wasmSupported === true,
      secureContext: runtimeInfo.secureContext === true,
      crossOriginIsolated: runtimeInfo.crossOriginIsolated === true,
    };
  }

  function cleanOcrResourceCheck(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (!OCR_RESOURCE_OUTCOMES.has(value.outcome)) return null;
    const status = cleanSafeInteger(value.httpStatus, 599);
    return {
      outcome: value.outcome,
      httpStatus: status === 0 || status >= 100 ? status : 0,
      durationMs: cleanSafeInteger(value.durationMs, 300000),
    };
  }

  function cleanOcrInit(values = {}, previous = null) {
    const cleaned = previous ? clone(previous) : {
      status: "not_started",
      stage: "not_started",
      elapsedMs: 0,
      timeoutMs: 0,
      progressPercent: 0,
      resources: {},
    };
    if (OCR_INIT_STATUSES.has(values.status)) cleaned.status = values.status;
    if (OCR_INIT_STAGES.has(values.stage)) cleaned.stage = values.stage;
    if (Number.isFinite(values.elapsedMs)) cleaned.elapsedMs = cleanSafeInteger(values.elapsedMs, 300000);
    if (Number.isFinite(values.timeoutMs)) cleaned.timeoutMs = cleanSafeInteger(values.timeoutMs, 300000);
    if (Number.isFinite(values.progressPercent)) {
      cleaned.progressPercent = cleanSafeInteger(values.progressPercent, 100);
    }
    if (values.resources && typeof values.resources === "object" && !Array.isArray(values.resources)) {
      for (const [name, resource] of Object.entries(values.resources)) {
        if (!OCR_RESOURCE_FIELDS.has(name)) continue;
        const resourceCheck = cleanOcrResourceCheck(resource);
        if (resourceCheck) cleaned.resources[name] = resourceCheck;
      }
    }
    return cleaned;
  }

  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : null;
  }

  function detectBrowserInfo() {
    const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const match = userAgent.match(/Edg\/(\d+)/)
      || userAgent.match(/Chrome\/(\d+)/)
      || userAgent.match(/Firefox\/(\d+)/)
      || userAgent.match(/Version\/(\d+).*Safari/);
    const family = userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Chrome/")
        ? "Chromium"
        : userAgent.includes("Firefox/")
          ? "Firefox"
          : userAgent.includes("Safari/")
            ? "Safari"
            : "Unknown";
    return { family, major: match?.[1] || "unknown" };
  }

  async function defaultTransport(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      return await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
        keepalive: true,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function createTracker(options = {}) {
    const now = options.now || (() => Date.now());
    const uuid = options.uuid || (() => globalThis.crypto.randomUUID());
    const build = cleanBuildInfo(options.buildInfo || globalThis.PDF_NICAES_BUILD);
    const browser = cleanBrowserInfo(options.browserInfo || detectBrowserInfo());
    const runtime = cleanRuntimeInfo(options.runtimeInfo);
    const transport = options.transport || defaultTransport;
    const recent = [];
    let current = null;
    let activeDownloadIndex = -1;
    let downloadSequence = 0;
    let basePhaseCount = 1;

    function timestamp(milliseconds) {
      return new Date(milliseconds).toISOString();
    }

    function mergeCounts(values) {
      Object.assign(current.counts, cleanCounts(values));
    }

    function closeCurrentPhase(changedMs) {
      const previous = current.phases.at(-1);
      if (previous && previous.durationMs === null) {
        previous.durationMs = Math.max(0, changedMs - current._phaseStartedMs);
      }
    }

    function appendPhase(phase) {
      current.phases.push(phase);
      if (current.phases.length > 32) {
        const protectedCount = Math.min(basePhaseCount, 31);
        current.phases.splice(protectedCount, current.phases.length - 32);
      }
    }

    function start({ mode, ...counts }) {
      const startedMs = Number(now());
      current = {
        schemaVersion: SCHEMA_VERSION,
        executionId: String(uuid()),
        build,
        browser,
        ...(runtime ? { runtime: clone(runtime) } : {}),
        mode: ["split", "merge", "pcl", "tre-pcl"].includes(mode) ? mode : "split",
        outcome: "processing",
        phase: "preparing",
        startedAt: timestamp(startedMs),
        updatedAt: timestamp(startedMs),
        durationMs: null,
        counts: cleanCounts(counts),
        detectionProfile: {},
        phases: [{ name: "preparing", startedAt: timestamp(startedMs), durationMs: null }],
        downloads: [],
        errorCode: null,
        remoteStatus: "not_required",
        _startedMs: startedMs,
        _phaseStartedMs: startedMs,
      };
      recent.unshift(current);
      recent.splice(3);
      activeDownloadIndex = -1;
      downloadSequence = 0;
      basePhaseCount = 1;
      return clone(current);
    }

    function enterPhase(name, counts = {}) {
      if (!current) throw new Error("No execution is active.");
      if (!PHASES.has(name)) throw new TypeError("Unknown diagnostic phase.");
      if (current.phase === name) {
        mergeCounts(counts);
        return clone(current);
      }
      const changedMs = Number(now());
      closeCurrentPhase(changedMs);
      current.phase = String(name);
      current.updatedAt = timestamp(changedMs);
      current._phaseStartedMs = changedMs;
      appendPhase({ name: current.phase, startedAt: current.updatedAt, durationMs: null });
      mergeCounts(counts);
      return clone(current);
    }

    function recordDetection(strategy, amount = 1) {
      if (!current) throw new Error("No execution is active.");
      if (!DETECTION_FIELDS.has(strategy) || !Number.isFinite(amount)) return clone(current);
      const increment = Math.max(0, Math.trunc(amount));
      current.detectionProfile[strategy] = (current.detectionProfile[strategy] || 0) + increment;
      return clone(current);
    }

    function recordOcrInit(values = {}) {
      if (!current) throw new Error("No execution is active.");
      current.ocrInit = cleanOcrInit(values, current.ocrInit);
      return clone(current);
    }

    function remotePayload(report) {
      const latestDownload = report.downloads.at(-1);
      const incidentDownload = latestDownload?.outcome === "incident"
        && latestDownload.errorCode === report.errorCode
        ? latestDownload
        : null;
      return {
        schemaVersion: report.schemaVersion,
        executionId: report.executionId,
        build: clone(report.build),
        browser: clone(report.browser),
        ...(report.runtime ? { runtime: clone(report.runtime) } : {}),
        mode: report.mode,
        outcome: report.outcome,
        phase: report.phase,
        errorCode: report.errorCode,
        download: incidentDownload
          ? { attempt: incidentDownload.attempt, kind: incidentDownload.kind }
          : null,
        startedAt: report.startedAt,
        updatedAt: report.updatedAt,
        durationMs: report.durationMs,
        counts: clone(report.counts),
        detectionProfile: clone(report.detectionProfile),
        phases: clone(report.phases),
        ...(report.ocrInit ? { ocrInit: clone(report.ocrInit) } : {}),
      };
    }

    function toJson(report = getCurrent()) {
      const serialized = JSON.stringify(report, null, 2);
      if (new TextEncoder().encode(serialized).byteLength > MAX_REPORT_BYTES) {
        throw new RangeError("The diagnostic report exceeds 16 KiB.");
      }
      return serialized;
    }

    function publicReport(report) {
      if (!report) return null;
      const copy = clone(report);
      delete copy._startedMs;
      delete copy._phaseStartedMs;
      return copy;
    }

    async function markIncident(errorCode, counts, send, changedMs) {
      const incidentReport = current;
      closeCurrentPhase(changedMs);
      mergeCounts(counts);
      current.outcome = "incident";
      current.errorCode = /^[A-Z][A-Z0-9_]{0,63}$/.test(String(errorCode))
        ? String(errorCode)
        : "UNKNOWN_INCIDENT";
      current.updatedAt = timestamp(changedMs);
      current.durationMs = Math.max(0, changedMs - current._startedMs);
      current.remoteStatus = send && build.channel === "production" ? "pending" : "not_required";

      if (current.remoteStatus === "pending") {
        const payload = remotePayload(getCurrent());
        let delivered = false;
        for (let attempt = 0; attempt < 2 && !delivered; attempt += 1) {
          try {
            const response = await transport(payload);
            delivered = response?.ok !== false;
          } catch {
            delivered = false;
          }
        }
        incidentReport.remoteStatus = delivered ? "sent" : "not_sent";
      }
      return publicReport(incidentReport);
    }

    async function recordIncident(errorCode, counts = {}, { send = true } = {}) {
      if (!current) throw new Error("No execution is active.");
      return markIncident(errorCode, counts, send, Number(now()));
    }

    function previewIncident(errorCode, counts = {}) {
      if (!current) throw new Error("No execution is active.");
      const changedMs = Number(now());
      const report = getCurrent();
      const lastPhase = report.phases.at(-1);
      if (lastPhase?.durationMs === null) {
        lastPhase.durationMs = Math.max(0, changedMs - Date.parse(lastPhase.startedAt));
      }
      Object.assign(report.counts, cleanCounts(counts));
      report.outcome = "incident";
      report.errorCode = /^[A-Z][A-Z0-9_]{0,63}$/.test(String(errorCode))
        ? String(errorCode)
        : "UNKNOWN_INCIDENT";
      report.updatedAt = timestamp(changedMs);
      report.durationMs = Math.max(0, changedMs - Date.parse(report.startedAt));
      return remotePayload(report);
    }

    function startDownload(kind) {
      if (!current) throw new Error("No execution is active.");
      const phaseByKind = {
        pdf: "building_pdf",
        individual_zip: "building_individual_zip",
        master_zip: "building_master_zip",
      };
      const phase = phaseByKind[kind];
      if (!phase) throw new TypeError("Unknown download kind.");
      const changedMs = Number(now());
      closeCurrentPhase(changedMs);
      current.phase = phase;
      current.updatedAt = timestamp(changedMs);
      current._phaseStartedMs = changedMs;
      appendPhase({ name: phase, startedAt: current.updatedAt, durationMs: null });
      downloadSequence += 1;
      const attempt = downloadSequence;
      current.downloads.push({
        attempt,
        kind,
        phase,
        startedAt: current.updatedAt,
        durationMs: null,
        outcome: "processing",
        errorCode: null,
      });
      if (current.downloads.length > 24) current.downloads.splice(0, current.downloads.length - 24);
      current.counts.downloadAttemptCount = (current.counts.downloadAttemptCount || 0) + 1;
      activeDownloadIndex = current.downloads.length - 1;
      return attempt;
    }

    async function failDownload(errorCode) {
      if (!current || activeDownloadIndex < 0) throw new Error("No download is active.");
      const changedMs = Number(now());
      const download = current.downloads[activeDownloadIndex];
      download.durationMs = Math.max(0, changedMs - Date.parse(download.startedAt));
      download.outcome = "incident";
      download.errorCode = /^[A-Z][A-Z0-9_]{0,63}$/.test(String(errorCode))
        ? String(errorCode)
        : "UNKNOWN_INCIDENT";
      activeDownloadIndex = -1;
      current.counts.downloadIncidentCount = (current.counts.downloadIncidentCount || 0) + 1;
      return markIncident(download.errorCode, {}, true, changedMs);
    }

    function finishDownload(counts = {}) {
      if (!current || activeDownloadIndex < 0) throw new Error("No download is active.");
      const changedMs = Number(now());
      closeCurrentPhase(changedMs);
      const download = current.downloads[activeDownloadIndex];
      download.durationMs = Math.max(0, changedMs - Date.parse(download.startedAt));
      download.outcome = "completed";
      activeDownloadIndex = -1;
      current.counts.downloadCompletedCount = (current.counts.downloadCompletedCount || 0) + 1;
      mergeCounts(counts);
      current.phase = "ready";
      current.updatedAt = timestamp(changedMs);
      current.durationMs = Math.max(0, changedMs - current._startedMs);
      current._phaseStartedMs = changedMs;
      appendPhase({ name: "ready", startedAt: current.updatedAt, durationMs: null });
      return getCurrent();
    }

    function complete(outcome = "completed", counts = {}) {
      enterPhase("ready", counts);
      basePhaseCount = current.phases.length;
      current.outcome = outcome;
      current.durationMs = Math.max(0, current._phaseStartedMs - current._startedMs);
      return clone(current);
    }

    function cancel(counts = {}) {
      if (!current) throw new Error("No execution is active.");
      const changedMs = Number(now());
      closeCurrentPhase(changedMs);
      mergeCounts(counts);
      current.outcome = "cancelled";
      current.updatedAt = timestamp(changedMs);
      current.durationMs = Math.max(0, changedMs - current._startedMs);
      current.remoteStatus = "not_required";
      return getCurrent();
    }

    function getCurrent() {
      return publicReport(current);
    }

    function getRecent() {
      return recent.map(publicReport);
    }

    return {
      start,
      enterPhase,
      complete,
      cancel,
      recordDetection,
      recordOcrInit,
      recordIncident,
      previewIncident,
      startDownload,
      failDownload,
      finishDownload,
      getCurrent,
      getRecent,
      toJson,
    };
  }

  return { SCHEMA_VERSION, MAX_REPORT_BYTES, createTracker };
}));
