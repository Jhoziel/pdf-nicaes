(function exposeTrePclDomain(globalScope) {
  "use strict";

  function canonicalName(value) {
    return String(value || "").replace(/\.tre$/i, "").trim().toUpperCase();
  }

  function planPackages(requests, files, packageNames) {
    const filesByName = new Map();
    for (const file of files || []) {
      const code = canonicalName(file.name);
      if (!filesByName.has(code)) filesByName.set(code, []);
      filesByName.get(code).push(file);
    }

    return Array.from(requests || [], (request, index) => {
      const available = [];
      const missing = [];
      const conflicts = [];
      for (const code of request.parsed.codes) {
        const matches = filesByName.get(code) || [];
        if (matches.length === 1) available.push({ code, file: matches[0] });
        else if (matches.length === 0) missing.push(code);
        else conflicts.push({ code, files: matches.map((file) => file.name) });
      }
      let status = "satisfactory";
      if (!request.parsed.isValid) status = "invalid";
      else if (!available.length) status = "no_matches";
      else if (missing.length || conflicts.length || request.parsed.duplicates.length || request.parsed.invalidLines.length) status = "partial";
      return {
        nameKind: "tre-pcl-folder",
        packageName: packageNames[index],
        pclName: request.file.name,
        parsed: request.parsed,
        available,
        missing,
        conflicts,
        status,
      };
    });
  }

  function buildReport(result, language = "es") {
    const english = language === "en";
    const status = {
      satisfactory: english ? "Successful" : "Satisfactorio",
      partial: english ? "Partial" : "Parcial",
      no_matches: english ? "No matches" : "Sin coincidencias",
      invalid: english ? "Invalid PCL" : "PCL inválido",
    }[result.status];
    const lines = [
      `PCL: ${result.pclName}`,
      `${english ? "Status" : "Estado"}: ${status}`,
      `${english ? "Requested TRE files" : "Archivos TRE solicitados"}: ${result.parsed.codes.length}`,
      `${english ? "Included" : "Incluidos"}: ${result.available.length}`,
      `${english ? "Missing" : "Faltantes"}: ${result.missing.length}`,
      `${english ? "Name conflicts" : "Conflictos de nombre"}: ${result.conflicts.length}`,
      "",
      english ? "Included TRE files" : "Archivos TRE incluidos",
      ...(result.available.length ? result.available.map(({ file }) => file.name) : [english ? "None" : "Ninguno"]),
      "",
      english ? "Missing TRE files" : "Archivos TRE faltantes",
      ...(result.missing.length ? result.missing.map((code) => `${code}.tre`) : [english ? "None" : "Ninguno"]),
      "",
      english ? "Name conflicts" : "Conflictos de nombre",
      ...(result.conflicts.length
        ? result.conflicts.map(({ code, files }) => `${code}.tre — ${files.join(", ")}`)
        : [english ? "None" : "Ninguno"]),
      "",
      english ? "Duplicate PCL entries" : "Entradas duplicadas del PCL",
      ...(result.parsed.duplicates.length ? result.parsed.duplicates : [english ? "None" : "Ninguna"]),
      "",
      english ? "Unrecognized rows" : "Filas no interpretables",
      ...(result.parsed.invalidLines.length
        ? result.parsed.invalidLines.map((item) => `${english ? "Line" : "Línea"} ${item.lineNumber}: ${item.text}`)
        : [english ? "None" : "Ninguna"]),
    ];
    return lines.join("\n");
  }

  globalScope.TrePclDomain = Object.freeze({ canonicalName, planPackages, buildReport });
}(typeof window === "undefined" ? globalThis : window));
