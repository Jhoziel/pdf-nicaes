(function exposePclDomain(globalScope) {
  "use strict";

  function canonicalCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function parsePcl(text) {
    const codes = [];
    const duplicates = [];
    const invalidLines = [];
    const seenCodes = new Set();
    const duplicateCodes = new Set();
    let firstContentLineSeen = false;

    String(text || "").split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line) return;

      if (!firstContentLineSeen) {
        firstContentLineSeen = true;
        if (/^\d+\s+\d+$/.test(line)) return;
      }

      const match = line.match(/(?:^|[\\/])([A-Z0-9_-]+)\.tre(?=\s|$)/i)
        || line.match(/^([A-Z0-9_-]+)\.tre(?=\s|$)/i);
      if (!match) {
        invalidLines.push({ lineNumber: index + 1, text: line });
        return;
      }

      const code = canonicalCode(match[1]);
      if (seenCodes.has(code)) {
        if (!duplicateCodes.has(code)) {
          duplicates.push(code);
          duplicateCodes.add(code);
        }
        return;
      }

      seenCodes.add(code);
      codes.push(code);
    });

    return {
      codes,
      duplicates,
      invalidLines,
      isValid: codes.length > 0,
    };
  }

  function planPackage(parsedPcl, sources) {
    const pagesByCode = new Map();

    for (const [sourceIndex, source] of Array.from(sources || []).entries()) {
      const sourceId = source.id ?? `source-${sourceIndex}`;
      const sourceName = String(source.name || sourceId);
      for (const page of source.pages || []) {
        const code = canonicalCode(page.label);
        if (!code || code === "SIN-IDENTIFICAR") continue;
        if (!pagesByCode.has(code)) pagesByCode.set(code, new Map());
        const bySource = pagesByCode.get(code);
        if (!bySource.has(sourceId)) {
          bySource.set(sourceId, { sourceId, sourceName, pageNumbers: [] });
        }
        bySource.get(sourceId).pageNumbers.push(Number(page.pageNumber));
      }
    }

    const available = [];
    const conflicts = [];
    const missing = [];
    for (const code of parsedPcl.codes || []) {
      const matches = [...(pagesByCode.get(code)?.values() || [])];
      if (matches.length === 0) {
        missing.push(code);
      } else if (matches.length > 1) {
        conflicts.push({ code, sources: matches.map((match) => match.sourceName) });
      } else {
        available.push({ code, ...matches[0] });
      }
    }

    let status = "satisfactory";
    if (!parsedPcl.isValid) status = "invalid";
    else if (available.length === 0) status = "no_matches";
    else if (
      missing.length
      || conflicts.length
      || parsedPcl.duplicates?.length
      || parsedPcl.invalidLines?.length
    ) status = "partial";

    return { status, available, conflicts, missing };
  }

  const reportCopy = {
    es: {
      status: { satisfactory: "Satisfactorio", partial: "Parcial", no_matches: "Sin coincidencias", invalid: "PCL inválido" },
      requested: "TRUSS solicitadas",
      available: "TRUSS disponibles",
      missing: "TRUSS faltantes",
      conflicts: "Conflictos TRUSS",
      duplicates: "Entradas duplicadas del PCL",
      invalidLines: "Filas no interpretables",
      none: "Ninguna",
      pages: "páginas",
      line: "Línea",
    },
    en: {
      status: { satisfactory: "Successful", partial: "Partial", no_matches: "No matches", invalid: "Invalid PCL" },
      requested: "Requested TRUSS codes",
      available: "Available TRUSS codes",
      missing: "Missing TRUSS codes",
      conflicts: "TRUSS conflicts",
      duplicates: "Duplicate PCL entries",
      invalidLines: "Unrecognized rows",
      none: "None",
      pages: "pages",
      line: "Line",
    },
  };

  function reportSection(title, rows, noneLabel) {
    return [title, ...(rows.length ? rows : [noneLabel]), ""].join("\n");
  }

  function buildReport({ pclName, parsed, plan, language = "es" }) {
    const copy = reportCopy[language] || reportCopy.es;
    const availableRows = plan.available.map((item) =>
      `${item.code} — ${item.sourceName} — ${copy.pages} ${item.pageNumbers.join(", ")}`,
    );
    const conflictRows = plan.conflicts.map((item) => `${item.code} — ${item.sources.join(", ")}`);
    const invalidRows = parsed.invalidLines.map((item) => `${copy.line} ${item.lineNumber}: ${item.text}`);

    return [
      `PCL: ${pclName}`,
      `${language === "en" ? "Status" : "Estado"}: ${copy.status[plan.status]}`,
      `${copy.requested}: ${parsed.codes.length}`,
      `${copy.available}: ${plan.available.length}`,
      `${copy.missing}: ${plan.missing.length}`,
      `${copy.conflicts}: ${plan.conflicts.length}`,
      "",
      reportSection(copy.available, availableRows, copy.none),
      reportSection(copy.missing, plan.missing, copy.none),
      reportSection(copy.conflicts, conflictRows, copy.none),
      reportSection(copy.duplicates, parsed.duplicates, copy.none),
      reportSection(copy.invalidLines, invalidRows, copy.none),
    ].join("\n").trimEnd();
  }

  function packageStem(fileName) {
    return String(fileName || "")
      .replace(/\.pcl$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .trim()
      .replace(/[. ]+$/g, "") || "PCL";
  }

  function assignPackageNames(fileNames) {
    const usedNames = new Set();
    return Array.from(fileNames || [], (fileName) => {
      const stem = packageStem(fileName);
      let candidate = stem;
      let suffix = 2;
      while (usedNames.has(candidate.toLocaleLowerCase())) {
        candidate = `${stem} (${suffix})`;
        suffix += 1;
      }
      usedNames.add(candidate.toLocaleLowerCase());
      return candidate;
    });
  }

  globalScope.PclDomain = Object.freeze({
    canonicalCode,
    parsePcl,
    planPackage,
    buildReport,
    assignPackageNames,
  });
}(typeof window === "undefined" ? globalThis : window));
