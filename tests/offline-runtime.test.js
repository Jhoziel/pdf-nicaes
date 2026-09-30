window.__testResults = [];
window.__testsComplete = false;

let ocrWorker = null;
try {
  if (!window.pdfjsLib || !window.PDFLib || !window.Tesseract || !window.JSZip) {
    throw new Error("One or more local browser libraries did not load");
  }

  await document.fonts.load("400 16px 'IBM Plex Sans'");
  if (!document.fonts.check("400 16px 'IBM Plex Sans'")) {
    throw new Error("The local IBM Plex Sans font did not load");
  }

  const pdfDocument = await window.PDFLib.PDFDocument.create();
  pdfDocument.addPage([120, 120]);
  const pdfBytes = await pdfDocument.save();
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "../assets/vendor/pdfjs/3.11.174/pdf.worker.min.js",
    location.href,
  ).href;
  const loadedPdf = await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;
  if (loadedPdf.numPages !== 1) throw new Error("The local PDF.js worker returned the wrong page count");
  await loadedPdf.destroy();

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 280;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "black";
  context.font = "700 80px Arial, sans-serif";
  context.fillText("TRUSS F12", 70, 165);

  const appRoot = new URL("../", location.href);
  ocrWorker = await window.Tesseract.createWorker("eng", 1, {
    workerPath: new URL("assets/vendor/tesseract.js/5.1.0/worker.min.js", appRoot).href,
    corePath: new URL("assets/vendor/tesseract.js-core/5.1.0", appRoot).href,
    langPath: new URL("assets/vendor/tessdata/4.0.0", appRoot).href.replace(/\/$/, ""),
  });
  const recognition = await ocrWorker.recognize(canvas);
  const recognizedText = String(recognition.data?.text || "");
  if (!/TRUSS/i.test(recognizedText) || !/F12/i.test(recognizedText)) {
    throw new Error(`Unexpected OCR text: ${recognizedText}`);
  }

  const externalResources = performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => {
      if (url.startsWith("blob:") || url.startsWith("data:")) return false;
      return new URL(url, location.href).origin !== location.origin;
    });
  if (externalResources.length) {
    throw new Error(`External runtime requests: ${externalResources.join(", ")}`);
  }

  window.__testResults.push({
    name: "all browser dependencies and OCR run from the same origin under the production CSP",
    passed: true,
  });
} catch (error) {
  window.__testResults.push({
    name: "all browser dependencies and OCR run from the same origin under the production CSP",
    passed: false,
    error: String(error),
  });
} finally {
  await ocrWorker?.terminate?.().catch(() => {});
  window.__testsComplete = true;
  document.documentElement.dataset.testsComplete = "true";
  document.querySelector("#test-results").textContent = JSON.stringify(window.__testResults);
}
