(function exposeResultReviewDomain(globalScope) {
  "use strict";

  const UNIDENTIFIED_LABEL = "SIN-IDENTIFICAR";

  function canonicalCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function cloneSources(sources) {
    return Array.from(sources || [], (source) => ({
      ...source,
      pages: Array.from(source.pages || [], (page) => ({ ...page })),
    }));
  }

  function createSession({ mode, sources = [], replacements = [], resolvedPages = [] } = {}) {
    const unidentified = [];
    const resolvedKeys = new Set(Array.from(resolvedPages, (page) => (
      decisionKey(page.sourceId, page.pageNumber)
    )));
    for (const source of sources) {
      for (const page of source.pages || []) {
        if (canonicalCode(page.label) !== UNIDENTIFIED_LABEL) continue;
        if (resolvedKeys.has(decisionKey(source.id, page.pageNumber))) continue;
        unidentified.push({
          sourceId: source.id,
          sourceName: String(source.name || source.id || ""),
          pageNumber: Number(page.pageNumber),
        });
      }
    }

    const replacementItems = Array.from(replacements, (replacement) => ({
      code: canonicalCode(replacement.code),
      winner: String(replacement.winner || ""),
      discarded: Array.from(replacement.discarded || [], String),
    }));

    return {
      mode: String(mode || ""),
      required: unidentified.length > 0 || replacementItems.length > 0,
      sources: cloneSources(sources),
      unidentified,
      replacements: replacementItems,
    };
  }

  function decisionKey(sourceId, pageNumber) {
    return `${String(sourceId)}:${Number(pageNumber)}`;
  }

  function reviewError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function confirm(session, decisions = []) {
    let manualAssignmentCount = 0;
    let keptUnidentifiedCount = 0;
    const unidentifiedKeys = new Set(Array.from(session.unidentified || [], (item) => (
      decisionKey(item.sourceId, item.pageNumber)
    )));
    const decisionByPage = new Map();
    for (const decision of decisions) {
      const key = decisionKey(decision.sourceId, decision.pageNumber);
      if (!unidentifiedKeys.has(key)) {
        throw reviewError("The review decision is outside this session.", "REVIEW_DECISION_UNKNOWN");
      }
      if (decisionByPage.has(key)) {
        throw reviewError("A page received more than one review decision.", "REVIEW_DECISION_DUPLICATE");
      }
      decisionByPage.set(key, decision);
    }
    for (const item of session.unidentified || []) {
      const decision = decisionByPage.get(decisionKey(item.sourceId, item.pageNumber));
      if (!decision) throw reviewError("Every unidentified page requires a decision.", "REVIEW_INCOMPLETE");
      if (decision.action !== "assign" && decision.action !== "keep") {
        throw reviewError("The review decision is invalid.", "REVIEW_DECISION_INVALID");
      }
      if (decision.action === "assign") {
        const code = canonicalCode(decision.code);
        if (!code || code === UNIDENTIFIED_LABEL || !/^[A-Z0-9_-]+$/.test(code)) {
          throw reviewError("The manually assigned TRUSS code is invalid.", "REVIEW_CODE_INVALID");
        }
      }
    }
    const sources = cloneSources(session.sources).map((source) => ({
      ...source,
      pages: source.pages.map((page) => {
        const key = decisionKey(source.id, page.pageNumber);
        if (!unidentifiedKeys.has(key)) return page;
        const decision = decisionByPage.get(key);
        if (decision?.action === "assign") {
          manualAssignmentCount += 1;
          return { ...page, label: canonicalCode(decision.code), manuallyAssigned: true };
        }
        keptUnidentifiedCount += 1;
        return { ...page, label: UNIDENTIFIED_LABEL, manuallyKeptUnidentified: true };
      }),
    }));

    return { sources, manualAssignmentCount, keptUnidentifiedCount };
  }

  globalScope.PdfNicaesReview = Object.freeze({
    createSession,
    confirm,
  });
}(typeof window === "undefined" ? globalThis : window));
