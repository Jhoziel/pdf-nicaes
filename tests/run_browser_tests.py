from __future__ import annotations

import base64
import http.server
import io
import json
import os
import threading
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> int:
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=ROOT, **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            results = []

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/diagnostics.test.html")
            page.wait_for_function("window.__testsComplete === true")
            results.extend(page.evaluate("window.__testResults"))
            try:
                contract_result = page.evaluate("""async () => {
                  const { diagnosticContract, onRequest } = await import("../functions/api/diagnostics.js");
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
                    phase: "ocr",
                    errorCode: "OCR_INIT_FAILED",
                    download: null,
                    startedAt: "2026-08-25T12:00:00.000Z",
                    updatedAt: "2026-08-25T12:00:02.000Z",
                    durationMs: 2000,
                    counts: { pdfCount: 1, pclCount: 3, pagesTotal: 566 },
                    detectionProfile: {},
                    phases: [
                      { name: "preparing", startedAt: "2026-08-25T12:00:00.000Z", durationMs: 1000 },
                      { name: "ocr", startedAt: "2026-08-25T12:00:01.000Z", durationMs: 1000 },
                    ],
                  };
                  const enriched = {
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
                  let receiverStatus;
                  try {
                    const bodyRequest = new Request(`${location.origin}/api/diagnostics`, {
                      method: "POST",
                      body: JSON.stringify(enriched),
                    });
                    const response = await onRequest({
                      request: {
                        method: "POST",
                        url: `${location.origin}/api/diagnostics`,
                        headers: new Headers({
                          "content-type": "application/json",
                          origin: location.origin,
                        }),
                        body: bodyRequest.body,
                      },
                    });
                    receiverStatus = response.status;
                  } finally {
                    console.error = originalError;
                  }
                  const loggedEvent = JSON.parse(logged[0] || "null");
                  return {
                    legacyAccepted: diagnosticContract.validDiagnostic(payload),
                    enrichedAccepted: diagnosticContract.validDiagnostic(enriched),
                    rawDetailsRejected: !diagnosticContract.validDiagnostic({
                      ...enriched,
                      ocrInit: { ...enriched.ocrInit, rawMessage: "PRIVATE" },
                    }),
                    receiverStatus,
                    structuredLog: loggedEvent?.event === "pdf_nicaes_incident"
                      && loggedEvent?.diagnostic?.ocrInit?.stage === "language",
                  };
                }""")
                assert contract_result == {
                    "legacyAccepted": True,
                    "enrichedAccepted": True,
                    "rawDetailsRejected": True,
                    "receiverStatus": 202,
                    "structuredLog": True,
                }, contract_result
                results.append({
                    "name": "the endpoint accepts structured OCR telemetry while preserving the schema 1 contract",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the endpoint accepts structured OCR telemetry while preserving the schema 1 contract",
                    "passed": False,
                    "error": repr(error),
                })
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/pcl-domain.test.html")
            page.wait_for_function("Array.isArray(window.__testResults)")
            results.extend(page.evaluate("window.__testResults"))
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/zip-writer.test.html")
            page.wait_for_function("window.__testsComplete === true")
            zip_results = page.evaluate("window.__testResults")
            artifact = page.evaluate("window.__zipArtifact || null")
            if zip_results and zip_results[0]["passed"] and artifact:
                try:
                    with zipfile.ZipFile(io.BytesIO(base64.b64decode(artifact))) as archive:
                        assert archive.namelist() == ["F01.pdf", "reporte.txt"]
                        assert archive.read("F01.pdf") == b"fake pdf"
                        assert archive.read("reporte.txt") == "todo bien".encode("utf-8")
                except Exception as error:
                    zip_results[0] = {
                        "name": zip_results[0]["name"],
                        "passed": False,
                        "error": repr(error),
                    }
            results.extend(zip_results)
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/archive-import.test.html")
            page.wait_for_function("Array.isArray(window.__testResults) && document.querySelector('#test-results')")
            results.extend(page.evaluate("window.__testResults"))
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/review-domain.test.html")
            page.wait_for_function("Array.isArray(window.__testResults) && document.querySelector('#test-results')")
            results.extend(page.evaluate("window.__testResults"))
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/ocr-loader.test.html")
            page.wait_for_function("Array.isArray(window.__testResults) && document.querySelector('#test-results')")
            results.extend(page.evaluate("window.__testResults"))
            page.close()

            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/tests/offline-runtime.test.html")
            page.locator("html[data-tests-complete='true']").wait_for(timeout=180_000)
            results.extend(page.evaluate("window.__testResults"))
            page.close()

            archive_page = browser.new_page()
            archive_page.route("https://**/*", lambda route: route.abort())
            archive_page.goto(f"http://127.0.0.1:{server.server_port}/index.html")
            try:
                archive_page.wait_for_function("Boolean(window.PdfNicaesArchive)")
                imported = archive_page.evaluate("""async () => {
                  window.JSZip = {
                    async loadAsync() {
                      return { files: {
                        "source/Planos.pdf": {
                          name: "source/Planos.pdf",
                          dir: false,
                          async: async () => new Uint8Array([1, 2, 3]),
                        },
                        "pcl/RF_TYPE_1_CI.PCL": {
                          name: "pcl/RF_TYPE_1_CI.PCL",
                          dir: false,
                          async: async () => new Uint8Array([4, 5]),
                        },
                      }};
                    },
                  };
                  state.mode = "pcl";
                  state.files = [];
                  state.pclFiles = [];
                  state.results = [];
                  await addFiles([new File([new Uint8Array([0])], "pack 2.zip", {
                    type: "application/zip",
                  })]);
                  return {
                    pdfs: state.files.map((file) => file.name),
                    pcls: state.pclFiles.map((file) => file.name),
                    fileRows: document.querySelectorAll("#file-list .file-item").length,
                    pclRows: document.querySelectorAll("#pcl-file-list .pcl-file-item").length,
                  };
                }""")
                assert imported == {
                    "pdfs": ["Planos.pdf"],
                    "pcls": ["RF_TYPE_1_CI.PCL"],
                    "fileRows": 1,
                    "pclRows": 1,
                }
                results.append({
                    "name": "the main file queue expands a ZIP into PDF and PCL inputs",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the main file queue expands a ZIP into PDF and PCL inputs",
                    "passed": False,
                    "error": repr(error),
                })
            archive_page.close()

            page = browser.new_page()
            page.route("https://**/*", lambda route: route.abort())
            page_errors: list[str] = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.goto(f"http://127.0.0.1:{server.server_port}/index.html")
            try:
                page.locator('input[name="mode"][value="pcl"]').check()
                assert page.locator("#pcl-upload-section").is_visible()
                assert page.locator("#process-button").is_disabled()
                page.locator("#file-input").set_input_files({
                    "name": "planos.pdf",
                    "mimeType": "application/pdf",
                    "buffer": b"%PDF-1.4\n%%EOF",
                })
                assert page.locator("#process-button").is_disabled()
                page.locator("#pcl-file-input").set_input_files({
                    "name": "EdificioNorte.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": b"1 2\r\nC:\\F01.tre 1 1",
                })
                assert page.locator("#process-button").is_enabled()
                assert page.locator("#process-button").inner_text() == "Generar 1 paquete"
                assert page.locator("#pcl-file-list .pcl-file-item").count() == 1

                same_metadata_counts = page.evaluate("""async () => {
                  const pdfA = new File([new Uint8Array([1, 2, 3])], "same.pdf", {
                    type: "application/pdf",
                    lastModified: 123,
                  });
                  const pdfB = new File([new Uint8Array([1, 2, 4])], "same.pdf", {
                    type: "application/pdf",
                    lastModified: 123,
                  });
                  const pdfCopy = new File([new Uint8Array([1, 2, 3])], "same.pdf", {
                    type: "application/pdf",
                    lastModified: 123,
                  });
                  const pclA = new File(["A"], "same.PCL", { lastModified: 123 });
                  const pclB = new File(["B"], "same.PCL", { lastModified: 123 });
                  state.files = [];
                  state.pclFiles = [];
                  await addFiles([pdfA, pdfB, pdfCopy]);
                  addPclFiles([pclA, pclB]);
                  return { pdfs: state.files.length, pcls: state.pclFiles.length };
                }""")
                assert same_metadata_counts == {"pdfs": 3, "pcls": 2}

                lock_state = page.evaluate("""() => {
                  state.creatingPackageName = "EdificioNorte";
                  updateControls();
                  const disabled = {
                    startOver: elements.startOver.disabled,
                    resultsAddMore: elements.resultsAddMore.disabled,
                    modeInputs: [...elements.modeInputs].every((input) => input.disabled),
                  };
                  state.creatingPackageName = null;
                  updateControls();
                  return disabled;
                }""")
                assert lock_state == {"startOver": True, "resultsAddMore": True, "modeInputs": True}

                estimates = page.evaluate("""() => {
                  state.pclSources = new Map([["source-a", {
                    file: new File([new Uint8Array(100)], "source.pdf", { type: "application/pdf" }),
                  }]]);
                  const result = {
                    reportText: "ok",
                    plan: { available: [
                      { sourceId: "source-a", pageNumbers: [1] },
                      { sourceId: "source-a", pageNumbers: [2] },
                    ] },
                  };
                  const packageBytes = estimatePackageBytes(result);
                  return { packageBytes, masterBytes: estimateMasterBytes([result]) };
                }""")
                assert estimates["packageBytes"] > 1_000_000
                assert estimates["masterBytes"] > estimates["packageBytes"] * 2
                assert page_errors == []
                results.append({
                    "name": "the PCL mode preserves inputs and locks every source mutator",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL mode preserves inputs and locks every source mutator",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                detected_header_code = page.evaluate("""() => findLabelFromItems([
                  { str: "Truss", transform: [1, 0, 0, 7, 106.4, 771.60], width: 17.1, height: 7 },
                  { str: "Truss Type", transform: [1, 0, 0, 7, 194.5, 771.62], width: 34.2, height: 7 },
                  { str: "FC14", transform: [1, 0, 0, 8, 106.4, 756.5], width: 19.6, height: 8 },
                  { str: "Floor", transform: [1, 0, 0, 8, 194.5, 756.2], width: 18.3, height: 8 },
                ], 792)""")
                assert detected_header_code == "FC14", detected_header_code
                results.append({
                    "name": "the TRUSS column wins over the adjacent TRUSS TYPE header",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the TRUSS column wins over the adjacent TRUSS TYPE header",
                    "passed": False,
                    "error": repr(error),
                })
            page.close()

            fixture_page = browser.new_page()
            fixture_page.set_content("""
              <section style="page-break-after: always"><strong>TRUSS</strong><div>F01</div><p>Page 1</p></section>
              <section style="page-break-after: always"><strong>TRUSS</strong><div>F01</div><p>Page 2</p></section>
              <section><strong>TRUSS</strong><div>F02</div><p>Old source</p></section>
            """)
            source_a = fixture_page.pdf(format="A4")
            fixture_page.set_content("<strong>TRUSS</strong><div>F02</div><p>Conflicting source</p>")
            source_b = fixture_page.pdf(format="A4")
            fixture_page.set_content("""
              <style>
                @page { size: Letter; margin: 0; }
                body { margin: 0; position: relative; width: 8.5in; height: 11in; font-family: Arial, sans-serif; }
                .warning-heading { position: absolute; left: 0.35in; bottom: 0.58in; }
                .warning-copy { position: absolute; left: 0.35in; bottom: 0.38in; }
                .header { position: absolute; left: 0.35in; right: 0.35in; top: 0.3in; display: grid; grid-template-columns: 1fr 1fr 1fr; }
                .header > span { border: 1px solid black; padding: 4px; }
              </style>
              <div class="warning-heading">Truss</div>
              <div class="warning-copy">IS ALWAYS REQUIRED FOR STABILITY AND TO PREVENT COLLAPSE WITH POSSIBLE PERSONAL INJURY AND PROPERTY DAMAGE. FOR GENERAL GUIDANCE REGARDING THE 16023 SWINGLEY RIDGE RD.</div>
              <div class="header">
                <span>Job</span><span>Truss</span><span>Truss Type</span>
                <span>ALLSOULS-FLRS</span><span>F01</span><span>Floor</span>
              </div>
            """)
            footer_warning_source = fixture_page.pdf(format="Letter")
            fixture_page.set_content("""
              <style>
                @page { size: Letter; margin: 0; }
                body { margin: 0; font-family: Arial, sans-serif; }
                .header { margin: 0.3in; display: grid; grid-template-columns: 1fr 1fr 1fr; }
                .header > span { border: 1px solid black; padding: 4px; }
              </style>
              <div class="header">
                <span>Job</span><span>Truss</span><span>Truss Type</span>
                <span>ALLSOULS-FLRS</span><span>PREFIX-F01</span><span>Floor</span>
              </div>
            """)
            prefixed_code_source = fixture_page.pdf(format="Letter")
            fixture_page.set_content("""
              <style>
                @page { size: Letter; margin: 0; }
                body { margin: 0; position: relative; width: 8.5in; height: 11in; font-family: Arial, sans-serif; }
                .truss-heading { position: absolute; left: 0.35in; top: 0.3in; }
                .distant-code { position: absolute; right: 0.35in; top: 2in; }
              </style>
              <div class="truss-heading">Truss</div>
              <div class="distant-code">PREFIX-F01</div>
            """)
            fallback_prefixed_code_source = fixture_page.pdf(format="Letter")
            fixture_page.set_content("""
              <style>
                @page { size: Letter; margin: 0; }
                body { margin: 0; position: relative; width: 8.5in; height: 11in; font-family: Arial, sans-serif; }
                .warning-heading { position: absolute; left: 0.35in; bottom: 0.58in; }
                .warning-copy { position: absolute; left: 0.35in; bottom: 0.38in; }
              </style>
              <div class="warning-heading">Truss</div>
              <div class="warning-copy">IS ALWAYS REQUIRED FOR STABILITY AND TO PREVENT COLLAPSE WITH POSSIBLE PERSONAL INJURY AND PROPERTY DAMAGE. FOR GENERAL GUIDANCE REGARDING THE 16023 SWINGLEY RIDGE RD.</div>
            """)
            warning_only_source = fixture_page.pdf(format="Letter")
            fixture_page.set_viewport_size({"width": 816, "height": 1056})
            fixture_page.set_content("""
              <style>
                html, body { margin: 0; width: 816px; height: 1056px; background: white; }
                .scan { margin: 64px 72px; font: 700 72px Arial, sans-serif; color: black; }
              </style>
              <div class="scan">TRUSS F12</div>
            """)
            scanned_png = fixture_page.screenshot(full_page=True)
            scanned_data_url = "data:image/png;base64," + base64.b64encode(scanned_png).decode("ascii")
            fixture_page.set_content(f"""
              <style>
                @page {{ size: Letter; margin: 0; }}
                html, body {{ margin: 0; width: 8.5in; height: 11in; }}
                img {{ display: block; width: 8.5in; height: 11in; }}
              </style>
              <img src="{scanned_data_url}" alt="" />
            """)
            scanned_source = fixture_page.pdf(format="Letter", print_background=True)
            fixture_page.close()

            offline_context = browser.new_context()
            offline_page = offline_context.new_page()
            offline_errors: list[str] = []
            external_requests: list[str] = []
            offline_page.on("pageerror", lambda error: offline_errors.append(str(error)))

            def keep_requests_local(route):
                url = route.request.url
                local_prefix = f"http://127.0.0.1:{server.server_port}/"
                if url.startswith(local_prefix) or url.startswith(("blob:", "data:")):
                    route.continue_()
                else:
                    external_requests.append(url)
                    route.abort()

            offline_page.route("**/*", keep_requests_local)
            try:
                offline_page.goto(
                    f"http://127.0.0.1:{server.server_port}/index.html",
                    wait_until="networkidle",
                    timeout=120_000,
                )
                offline_page.wait_for_function(
                    "Boolean(window.pdfjsLib && window.PDFLib && window.Tesseract && window.JSZip)",
                    timeout=120_000,
                )
                font_ready = offline_page.evaluate("""async () => {
                  await document.fonts.load("400 16px 'IBM Plex Sans'");
                  return document.fonts.check("400 16px 'IBM Plex Sans'");
                }""")
                assert font_ready
                offline_page.locator("#file-input").set_input_files({
                    "name": "scan.pdf",
                    "mimeType": "application/pdf",
                    "buffer": scanned_source,
                })
                offline_page.locator("#process-button").click()
                offline_page.wait_for_function(
                    "state.status === 'success' || state.status === 'error'",
                    timeout=180_000,
                )
                offline_outcome = offline_page.evaluate("""() => ({
                  status: state.status,
                  labels: state.results.map(result => result.label),
                  ocrPages: state.diagnosticOcrPages,
                  errorCode: diagnosticTracker?.getCurrent()?.errorCode || null,
                  runtimeRevision: diagnosticTracker?.getCurrent()?.runtime?.diagnosticsRevision,
                  ocrStatus: diagnosticTracker?.getCurrent()?.ocrInit?.status,
                  ocrStage: diagnosticTracker?.getCurrent()?.ocrInit?.stage,
                  resourceOutcomes: Object.fromEntries(Object.entries(
                    diagnosticTracker?.getCurrent()?.ocrInit?.resources || {},
                  ).map(([name, check]) => [name, `${check.outcome}:${check.httpStatus}`])),
                })""")
                assert offline_outcome == {
                    "status": "success",
                    "labels": ["F12"],
                    "ocrPages": 1,
                    "errorCode": None,
                    "runtimeRevision": 2,
                    "ocrStatus": "ready",
                    "ocrStage": "ready",
                    "resourceOutcomes": {
                        "worker": "ok:200",
                        "language": "ok:200",
                        "coreStandard": "ok:200",
                        "coreLstm": "ok:200",
                        "coreSimd": "ok:200",
                        "coreSimdLstm": "ok:200",
                    },
                }, offline_outcome
                assert external_requests == [], external_requests
                assert offline_errors == [], offline_errors
                results.append({
                    "name": "OCR processes an image-only PDF without third-party requests",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "OCR processes an image-only PDF without third-party requests",
                    "passed": False,
                    "error": repr(error) + (
                        f"; external requests: {external_requests}; page errors: {offline_errors}"
                    ),
                })
            offline_context.close()

            failure_context = browser.new_context()
            failure_page = failure_context.new_page()
            try:
                failure_page.goto(
                    f"http://127.0.0.1:{server.server_port}/index.html",
                    wait_until="networkidle",
                    timeout=120_000,
                )
                failure_page.evaluate("""() => {
                  Tesseract.createWorker = async () => { throw new Error("forced OCR initialization failure"); };
                }""")
                failure_page.locator("#file-input").set_input_files({
                    "name": "scan.pdf",
                    "mimeType": "application/pdf",
                    "buffer": scanned_source,
                })
                failure_page.locator("#process-button").click()
                failure_page.wait_for_function("state.status === 'error'", timeout=120_000)
                diagnostic = failure_page.evaluate("""() => {
                  const report = diagnosticTracker.getCurrent();
                  return {
                    errorCode: report.errorCode,
                    runtimeRevision: report.runtime?.diagnosticsRevision,
                    status: report.ocrInit?.status,
                    stage: report.ocrInit?.stage,
                    resourceOutcomes: Object.fromEntries(Object.entries(report.ocrInit?.resources || {})
                      .map(([name, check]) => [name, `${check.outcome}:${check.httpStatus}`])),
                  };
                }""")
                assert diagnostic == {
                    "errorCode": "OCR_INIT_FAILED",
                    "runtimeRevision": 2,
                    "status": "failed",
                    "stage": "worker",
                    "resourceOutcomes": {
                        "worker": "ok:200",
                        "language": "ok:200",
                        "coreStandard": "ok:200",
                        "coreLstm": "ok:200",
                        "coreSimd": "ok:200",
                        "coreSimdLstm": "ok:200",
                    },
                }, diagnostic
                results.append({
                    "name": "an OCR initialization rejection has a stable diagnostic code",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "an OCR initialization rejection has a stable diagnostic code",
                    "passed": False,
                    "error": repr(error),
                })
            failure_context.close()

            unavailable_context = browser.new_context()
            unavailable_page = unavailable_context.new_page()
            try:
                unavailable_page.goto(
                    f"http://127.0.0.1:{server.server_port}/index.html",
                    wait_until="networkidle",
                    timeout=120_000,
                )
                unavailable_page.evaluate("window.Tesseract = undefined")
                unavailable_page.locator("#file-input").set_input_files({
                    "name": "scan.pdf",
                    "mimeType": "application/pdf",
                    "buffer": scanned_source,
                })
                unavailable_page.locator("#process-button").click()
                unavailable_page.wait_for_function("state.status === 'error'", timeout=120_000)
                diagnostic = unavailable_page.evaluate("""() => {
                  const report = diagnosticTracker.getCurrent();
                  return {
                    errorCode: report.errorCode,
                    runtimeRevision: report.runtime?.diagnosticsRevision,
                    status: report.ocrInit?.status,
                    stage: report.ocrInit?.stage,
                    resources: report.ocrInit?.resources,
                  };
                }""")
                assert diagnostic == {
                    "errorCode": "OCR_UNAVAILABLE",
                    "runtimeRevision": 2,
                    "status": "unavailable",
                    "stage": "not_started",
                    "resources": {},
                }, diagnostic
                results.append({
                    "name": "a missing OCR API has a stable diagnostic code",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "a missing OCR API has a stable diagnostic code",
                    "passed": False,
                    "error": repr(error),
                })
            unavailable_context.close()

            timeout_context = browser.new_context()
            timeout_page = timeout_context.new_page()
            try:
                timeout_page.goto(
                    f"http://127.0.0.1:{server.server_port}/index.html",
                    wait_until="networkidle",
                    timeout=120_000,
                )
                timeout_page.evaluate("""() => {
                  window.PdfNicaesOcr = {
                    ...window.PdfNicaesOcr,
                    createWithTimeout: async () => {
                      const error = new Error("forced timeout");
                      error.diagnosticCode = "OCR_INIT_TIMEOUT";
                      throw error;
                    },
                  };
                }""")
                timeout_page.locator("#file-input").set_input_files({
                    "name": "scan.pdf",
                    "mimeType": "application/pdf",
                    "buffer": scanned_source,
                })
                timeout_page.locator("#process-button").click()
                timeout_page.wait_for_function("state.status === 'error'", timeout=120_000)
                diagnostic = timeout_page.evaluate("""() => {
                  const report = diagnosticTracker.getCurrent();
                  return {
                    errorCode: report.errorCode,
                    status: report.ocrInit?.status,
                    stage: report.ocrInit?.stage,
                    timeoutMs: report.ocrInit?.timeoutMs,
                  };
                }""")
                assert diagnostic == {
                    "errorCode": "OCR_INIT_TIMEOUT",
                    "status": "timeout",
                    "stage": "worker",
                    "timeoutMs": 60000,
                }, diagnostic
                results.append({
                    "name": "an OCR initialization timeout records its last stable stage",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "an OCR initialization timeout records its last stable stage",
                    "passed": False,
                    "error": repr(error),
                })
            timeout_context.close()

            example_context = browser.new_context()
            example_page = example_context.new_page()
            example_errors: list[str] = []
            example_page.on("pageerror", lambda error: example_errors.append(str(error)))
            try:
                example_page.goto(
                    f"http://127.0.0.1:{server.server_port}/index.html",
                    wait_until="networkidle",
                    timeout=120_000,
                )
                example_page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)

                example_page.locator("#load-example").click()
                example_page.wait_for_function("state.files.length === 1")
                assert example_page.locator("#process-button").inner_text() == "Separar 1 PDF"
                example_page.locator("#process-button").click()
                example_page.wait_for_function("state.status === 'success'", timeout=120_000)
                split_labels = example_page.evaluate("state.results.map(result => result.label)")
                assert split_labels == ["F01", "F02"], split_labels

                example_page.locator("#start-over").click()
                example_page.wait_for_function("state.status === 'idle'")
                example_page.locator('input[name="mode"][value="merge"]').check()
                example_page.locator("#load-example").click()
                example_page.wait_for_function("state.files.length === 2")
                assert example_page.locator("#process-button").inner_text() == "Combinar 2 PDFs"
                example_page.locator("#process-button").click()
                example_page.locator("#review-card").wait_for(state="visible", timeout=120_000)
                example_page.locator("#confirm-review").click()
                example_page.wait_for_function("state.status === 'success'", timeout=120_000)
                merge_summary = example_page.evaluate("""() => ({
                  pageCount: state.results[0].pageCount,
                  replaced: state.operationSummary.replacedCodeCount,
                  discarded: state.operationSummary.discardedPageCount,
                })""")
                assert merge_summary == {"pageCount": 3, "replaced": 1, "discarded": 1}, merge_summary

                example_page.locator("#start-over").click()
                example_page.wait_for_function("state.status === 'idle'")
                example_page.locator('input[name="mode"][value="pcl"]').check()
                example_page.locator("#load-example").click()
                example_page.wait_for_function("state.files.length === 1 && state.pclFiles.length === 1")
                assert example_page.locator("#process-button").inner_text() == "Generar 1 paquete"
                example_page.locator("#process-button").click()
                example_page.wait_for_function("state.status === 'success'", timeout=120_000)
                pcl_summary = example_page.evaluate("""() => ({
                  status: state.results[0].plan.status,
                  available: state.results[0].plan.available.length,
                  missing: state.results[0].plan.missing.length,
                  conflicts: state.results[0].plan.conflicts.length,
                })""")
                assert pcl_summary == {
                    "status": "satisfactory",
                    "available": 2,
                    "missing": 0,
                    "conflicts": 0,
                }, pcl_summary
                assert example_errors == [], example_errors
                results.append({
                    "name": "the built-in example completes split, merge, and PCL flows",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the built-in example completes split, merge, and PCL flows",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {example_errors}" if example_errors else ""),
                })
            example_context.close()

            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            page_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            try:
                page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle", timeout=120_000)
                page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)
                page.locator('input[name="mode"][value="pcl"]').check()
                page.locator("#file-input").set_input_files([
                    {"name": "Planos-A.pdf", "mimeType": "application/pdf", "buffer": source_a},
                    {"name": "Planos-A-copia.pdf", "mimeType": "application/pdf", "buffer": source_a},
                    {"name": "Planos-B.pdf", "mimeType": "application/pdf", "buffer": source_b},
                ])
                page.locator("#pcl-file-input").set_input_files({
                    "name": "EdificioNorte.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": (
                        b"4 2\r\n"
                        b"C:\\F01.tre 1 1\r\n"
                        b"C:\\F02.tre 1 1\r\n"
                        b"C:\\F03.tre 1 1\r\n"
                        b"C:\\F01.tre 9 9\r\n"
                        b"broken row"
                    ),
                })
                page.locator("#process-button").click()
                page.locator("#results-card").wait_for(state="visible", timeout=120_000)
                page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
                assert page.locator(".result-status").inner_text() == "Parcial"
                assert page.locator(".result-meta").inner_text() == "1 disponibles · 1 faltantes · 1 conflictos"
                page.locator(".pcl-report-details summary").click()
                assert "F02" in page.locator(".pcl-report-details").inner_text()
                assert "F03" in page.locator(".pcl-report-details").inner_text()
                assert "broken row" in page.locator(".pcl-report-details").inner_text()
                assert "1 PDF idéntico fue omitido" in page.locator("#operation-summary").inner_text()
                if screenshot_path := os.environ.get("PDF_NICAES_SCREENSHOT"):
                    page.screenshot(path=screenshot_path, full_page=True)

                with page.expect_download(timeout=120_000) as package_download_info:
                    page.locator(".result-item .download-button").click()
                package_download = package_download_info.value
                assert package_download.suggested_filename == "EdificioNorte.zip"
                with zipfile.ZipFile(package_download.path()) as archive:
                    assert archive.namelist() == ["F01.pdf", "reporte.txt"]
                    truss_pdf = base64.b64encode(archive.read("F01.pdf")).decode("ascii")
                    page_count = page.evaluate("""async (encoded) => {
                      const binary = atob(encoded);
                      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
                      const document = await pdfjsLib.getDocument({data: bytes}).promise;
                      const count = document.numPages;
                      await document.destroy();
                      return count;
                    }""", truss_pdf)
                    assert page_count == 2
                    report = archive.read("reporte.txt").decode("utf-8-sig")
                    assert "Estado: Parcial" in report
                    assert "F02 — Planos-A.pdf, Planos-B.pdf" in report
                    assert "F03" in report
                    assert "Entradas duplicadas del PCL\nF01" in report
                    assert "broken row" in report

                with page.expect_download(timeout=120_000) as master_download_info:
                    page.locator("#download-all").click()
                master_download = master_download_info.value
                assert master_download.suggested_filename == "paquetes-pcl.zip"
                with zipfile.ZipFile(master_download.path()) as archive:
                    assert archive.namelist() == ["EdificioNorte.zip", "reporte-general.txt"]
                    general_report = archive.read("reporte-general.txt").decode("utf-8-sig")
                    assert "PDFs idénticos omitidos: 1" in general_report
                    assert "Planos-A-copia.pdf — copia de Planos-A.pdf" in general_report
                    with zipfile.ZipFile(io.BytesIO(archive.read("EdificioNorte.zip"))) as child:
                        assert child.namelist() == ["F01.pdf", "reporte.txt"]
                assert page_errors == []
                results.append({
                    "name": "the PCL flow excludes conflicts and produces individual and master ZIPs",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL flow excludes conflicts and produces individual and master ZIPs",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            context.close()

            footer_warning_context = browser.new_context()
            footer_warning_page = footer_warning_context.new_page()
            footer_warning_errors: list[str] = []
            footer_warning_page.on("pageerror", lambda error: footer_warning_errors.append(str(error)))
            try:
                footer_warning_page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle", timeout=120_000)
                footer_warning_page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)
                footer_warning_page.locator('input[name="mode"][value="pcl"]').check()
                footer_warning_page.locator("#file-input").set_input_files({
                    "name": "F01.pdf",
                    "mimeType": "application/pdf",
                    "buffer": footer_warning_source,
                })
                footer_warning_page.locator("#pcl-file-input").set_input_files({
                    "name": "FL_1000_SI.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": b"1 2\r\nC:\\F01.tre 1 1",
                })
                footer_warning_page.locator("#process-button").click()
                footer_warning_page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
                footer_warning_diagnostic = footer_warning_page.evaluate("""() => ({
                  detected: Array.from(state.pclSources.values()).flatMap(source =>
                    source.pages.map(page => page.label),
                  ),
                })""")
                assert footer_warning_page.locator(".result-status").inner_text() == "Satisfactorio", footer_warning_diagnostic
                footer_warning_meta = footer_warning_page.locator(".result-meta").inner_text()
                assert all(part in footer_warning_meta for part in ("1 disponibles", "0 faltantes", "0 conflictos")), footer_warning_meta
                assert footer_warning_errors == []
                results.append({
                    "name": "the PCL flow reads the TRUSS header instead of footer warning copy",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL flow reads the TRUSS header instead of footer warning copy",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {footer_warning_errors}" if footer_warning_errors else ""),
                })
            footer_warning_context.close()

            exact_context = browser.new_context()
            exact_page = exact_context.new_page()
            exact_errors: list[str] = []
            exact_page.on("pageerror", lambda error: exact_errors.append(str(error)))
            try:
                exact_page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle", timeout=120_000)
                exact_page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)
                exact_page.locator('input[name="mode"][value="pcl"]').check()
                exact_page.locator("#file-input").set_input_files({
                    "name": "PREFIX-F01.pdf",
                    "mimeType": "application/pdf",
                    "buffer": prefixed_code_source,
                })
                exact_page.locator("#pcl-file-input").set_input_files({
                    "name": "ExactMatch.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": b"1 2\r\nC:\\F01.tre 1 1",
                })
                exact_page.locator("#process-button").click()
                exact_page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
                exact_diagnostic = exact_page.evaluate("""() => ({
                  detected: Array.from(state.pclSources.values()).flatMap(source =>
                    source.pages.map(page => page.label),
                  ),
                })""")
                assert exact_page.locator(".result-status").inner_text() == "Sin coincidencias", exact_diagnostic
                assert exact_errors == []
                results.append({
                    "name": "the PCL flow does not partially match a longer TRUSS code",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL flow does not partially match a longer TRUSS code",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {exact_errors}" if exact_errors else ""),
                })
            exact_context.close()

            fallback_context = browser.new_context()
            fallback_page = fallback_context.new_page()
            fallback_errors: list[str] = []
            fallback_page.on("pageerror", lambda error: fallback_errors.append(str(error)))
            try:
                fallback_page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle", timeout=120_000)
                fallback_page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)
                fallback_page.locator('input[name="mode"][value="pcl"]').check()
                fallback_page.locator("#file-input").set_input_files({
                    "name": "PREFIX-F01-fallback.pdf",
                    "mimeType": "application/pdf",
                    "buffer": fallback_prefixed_code_source,
                })
                fallback_page.locator("#pcl-file-input").set_input_files({
                    "name": "ExactFallback.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": b"1 2\r\nC:\\F01.tre 1 1",
                })
                fallback_page.locator("#process-button").click()
                fallback_page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
                fallback_diagnostic = fallback_page.evaluate("""() => ({
                  detected: Array.from(state.pclSources.values()).flatMap(source =>
                    source.pages.map(page => page.label),
                  ),
                })""")
                assert fallback_page.locator(".result-status").inner_text() == "Sin coincidencias", fallback_diagnostic
                assert fallback_errors == []
                results.append({
                    "name": "the PCL fallback does not partially match a longer TRUSS code",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL fallback does not partially match a longer TRUSS code",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {fallback_errors}" if fallback_errors else ""),
                })
            fallback_context.close()

            unidentified_context = browser.new_context()
            unidentified_page = unidentified_context.new_page()
            unidentified_errors: list[str] = []
            unidentified_page.on("pageerror", lambda error: unidentified_errors.append(str(error)))
            try:
                unidentified_page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle", timeout=120_000)
                unidentified_page.wait_for_function("Boolean(window.pdfjsLib && window.PDFLib)", timeout=120_000)
                unidentified_page.locator('input[name="mode"][value="pcl"]').check()
                unidentified_page.locator("#file-input").set_input_files({
                    "name": "Warning-only.pdf",
                    "mimeType": "application/pdf",
                    "buffer": warning_only_source,
                })
                unidentified_page.locator("#pcl-file-input").set_input_files({
                    "name": "NoCode.PCL",
                    "mimeType": "application/octet-stream",
                    "buffer": b"1 2\r\nC:\\F01.tre 1 1",
                })
                unidentified_page.locator("#process-button").click()
                unidentified_page.locator("#review-card").wait_for(state="visible", timeout=120_000)
                unidentified_page.locator('.review-action[value="keep"]').check()
                unidentified_page.locator("#confirm-review").click()
                unidentified_page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
                unidentified_diagnostic = unidentified_page.evaluate("""() => ({
                  detected: Array.from(state.pclSources.values()).flatMap(source =>
                    source.pages.map(page => page.label),
                  ),
                })""")
                assert unidentified_page.locator(".result-status").inner_text() == "Sin coincidencias", unidentified_diagnostic
                unidentified_summary = unidentified_page.locator("#operation-summary").inner_text()
                assert "1 página quedó" in unidentified_summary and "sin identificar" in unidentified_summary, {
                    "summary": unidentified_summary,
                    **unidentified_diagnostic,
                }
                assert unidentified_errors == []
                results.append({
                    "name": "the PCL flow reports warning-only pages as unidentified",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "the PCL flow reports warning-only pages as unidentified",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {unidentified_errors}" if unidentified_errors else ""),
                })
            unidentified_context.close()
            browser.close()
    finally:
        server.shutdown()
        thread.join()

    print(json.dumps(results, indent=2, ensure_ascii=False))
    failures = [result for result in results if not result["passed"]]
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
