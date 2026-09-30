(function exposeOcrLoader(globalScope) {
  "use strict";

  async function createWithTimeout(createWorker, timeoutMs, createTimeoutError) {
    const workerPromise = Promise.resolve().then(createWorker);
    let timeoutId;
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = globalScope.setTimeout(() => {
        reject(createTimeoutError());
      }, timeoutMs);
    });

    try {
      return await Promise.race([workerPromise, timeoutPromise]);
    } catch (error) {
      workerPromise
        .then((worker) => worker?.terminate?.())
        .catch(() => {});
      throw error;
    } finally {
      globalScope.clearTimeout(timeoutId);
    }
  }

  function elapsedMilliseconds(startedAt, now) {
    return Math.max(0, Math.min(300000, Math.round(Number(now()) - startedAt) || 0));
  }

  async function probeResource(path, options = {}) {
    const fetchImpl = options.fetch || globalScope.fetch?.bind(globalScope);
    const now = options.now || (() => globalScope.performance?.now?.() ?? Date.now());
    const timeoutMs = Math.max(1, Math.min(30000, Math.trunc(options.timeoutMs) || 5000));
    const startedAt = Number(now());
    if (typeof fetchImpl !== "function") {
      return { outcome: "unsupported", httpStatus: 0, durationMs: elapsedMilliseconds(startedAt, now) };
    }

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timedOut = false;
    let timeoutId;
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = globalScope.setTimeout(() => {
        timedOut = true;
        controller?.abort();
        reject(new Error("OCR resource probe timed out"));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([
        Promise.resolve().then(() => fetchImpl(path, {
          method: "HEAD",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller?.signal,
        })),
        timeoutPromise,
      ]);
      const status = Number.isSafeInteger(response?.status) ? response.status : 0;
      return {
        outcome: response?.ok ? "ok" : "http_error",
        httpStatus: status >= 100 && status <= 599 ? status : 0,
        durationMs: elapsedMilliseconds(startedAt, now),
      };
    } catch {
      return {
        outcome: timedOut ? "timeout" : "network_error",
        httpStatus: 0,
        durationMs: elapsedMilliseconds(startedAt, now),
      };
    } finally {
      globalScope.clearTimeout(timeoutId);
    }
  }

  async function probeResources(resourcePaths, options = {}) {
    const entries = Object.entries(resourcePaths || {});
    const checks = await Promise.all(entries.map(async ([name, path]) => [
      name,
      await probeResource(path, options),
    ]));
    return Object.fromEntries(checks);
  }

  function stageFromStatus(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("tesseract core")) return "core";
    if (normalized.includes("language traineddata")) return "language";
    if (normalized.includes("initializing tesseract") || normalized.includes("initializing api")) return "api";
    return "unknown";
  }

  globalScope.PdfNicaesOcr = Object.freeze({
    createWithTimeout,
    probeResources,
    stageFromStatus,
  });
}(typeof window === "undefined" ? globalThis : window));
