(function exposeArchiveImport(globalScope) {
  "use strict";

  const MAX_ARCHIVE_FILES = 2000;
  const MAX_EXTRACTED_BYTES = 256 * 1024 * 1024;

  function archiveError(message, code = "ZIP_IMPORT_FAILED") {
    const error = new Error(message);
    error.diagnosticCode = code;
    return error;
  }

  function entryFileName(entryName, usedNames) {
    const normalized = String(entryName || "").replace(/\\/g, "/");
    const baseName = normalized.split("/").filter(Boolean).pop() || "";
    if (!baseName || baseName === "." || baseName === "..") return "";

    const match = baseName.match(/^(.*?)(\.[^.]*)?$/);
    const stem = match?.[1] || baseName;
    const extension = match?.[2] || "";
    let candidate = baseName;
    let suffix = 2;
    while (usedNames.has(candidate.toLocaleLowerCase())) {
      candidate = `${stem} (${suffix})${extension}`;
      suffix += 1;
    }
    usedNames.add(candidate.toLocaleLowerCase());
    return candidate;
  }

  async function extractZipFile(file, ZipConstructor = globalScope.JSZip) {
    if (!ZipConstructor?.loadAsync) {
      throw archiveError("The ZIP reader is unavailable.", "ZIP_TOOL_UNAVAILABLE");
    }

    let archive;
    try {
      archive = await ZipConstructor.loadAsync(file);
    } catch (error) {
      const wrapped = archiveError("The ZIP file could not be opened.");
      wrapped.cause = error;
      throw wrapped;
    }

    const pdfFiles = [];
    const pclFiles = [];
    const usedNames = new Set();
    let recognizedEntries = 0;
    let ignoredEntries = 0;
    let extractedBytes = 0;

    for (const entry of Object.values(archive.files || {})) {
      if (entry.dir) continue;
      const entryName = String(entry.name || "");
      const lowerName = entryName.toLocaleLowerCase();
      const isPdf = lowerName.endsWith(".pdf");
      const isPcl = lowerName.endsWith(".pcl");
      if (!isPdf && !isPcl) {
        ignoredEntries += 1;
        continue;
      }

      recognizedEntries += 1;
      if (recognizedEntries > MAX_ARCHIVE_FILES) {
        throw archiveError("The ZIP contains too many PDF/PCL files.", "ZIP_IMPORT_TOO_LARGE");
      }

      let bytes;
      try {
        bytes = await entry.async("uint8array");
      } catch (error) {
        const wrapped = archiveError("A ZIP entry could not be read.");
        wrapped.cause = error;
        throw wrapped;
      }
      extractedBytes += bytes.byteLength;
      if (extractedBytes > MAX_EXTRACTED_BYTES) {
        throw archiveError("The uncompressed ZIP contents are too large.", "ZIP_IMPORT_TOO_LARGE");
      }

      const name = entryFileName(entryName, usedNames);
      if (!name) {
        ignoredEntries += 1;
        continue;
      }
      const type = isPdf ? "application/pdf" : "application/octet-stream";
      const extracted = new File([bytes], name, {
        type,
        lastModified: file.lastModified || Date.now(),
      });
      if (isPdf) pdfFiles.push(extracted);
      else pclFiles.push(extracted);
    }

    if (pdfFiles.length === 0 && pclFiles.length === 0) {
      throw archiveError("The ZIP does not contain PDF or PCL files.");
    }

    return {
      archiveName: file.name,
      pdfFiles,
      pclFiles,
      ignoredEntries,
    };
  }

  globalScope.PdfNicaesArchive = Object.freeze({
    extractZipFile,
    MAX_ARCHIVE_FILES,
    MAX_EXTRACTED_BYTES,
  });
}(typeof window === "undefined" ? globalThis : window));
