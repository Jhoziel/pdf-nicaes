from __future__ import annotations

import http.server
import json
import threading
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
    results: list[dict[str, object]] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            posts: list[dict[str, object]] = []
            diagnostic_status = {"value": 202}
            page_errors: list[str] = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.route(
                "**/build-info.js",
                lambda route: route.fulfill(
                    status=200,
                    content_type="text/javascript",
                    body=(
                        'window.PDF_NICAES_BUILD = Object.freeze({'
                        '"commitSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",'
                        '"channel":"production"});'
                    ),
                ),
            )

            def receive_diagnostic(route) -> None:
                posts.append(route.request.post_data_json)
                route.fulfill(status=diagnostic_status["value"], body="")

            page.route("**/api/diagnostics", receive_diagnostic)
            page.route("https://**/*", lambda route: route.abort())

            try:
                page.goto(f"http://127.0.0.1:{server.server_port}/index.html")
                version_badge = page.locator(".topbar #app-version")
                assert version_badge.inner_text() == "Versión aaaaaaa", version_badge.inner_text()
                assert version_badge.is_visible(), "version badge hidden on desktop"
                page.set_viewport_size({"width": 390, "height": 844})
                assert version_badge.is_visible(), "version badge hidden on mobile"
                page.set_viewport_size({"width": 1280, "height": 720})
                privacy_copy = page.locator('[data-i18n="privacyBody"]').text_content()
                assert "metadatos técnicos sanitizados" in privacy_copy, privacy_copy

                page.evaluate("window.PDFLib = undefined")
                page.locator("#file-input").set_input_files({
                    "name": "ECHELON-secret.pdf",
                    "mimeType": "application/pdf",
                    "buffer": b"%PDF-1.4\n%%EOF",
                })
                page.locator("#process-button").click()

                page.locator("#diagnostics-card").wait_for(state="visible")
                page.wait_for_function("() => window.__diagnosticPostsComplete === true || document.querySelector('#diagnostic-send-status')?.dataset.state === 'sent'")
                short_id = page.locator("#execution-short-id").inner_text()
                assert short_id.startswith("Ejecución · ") and len(short_id.removeprefix("Ejecución · ")) == 8, short_id
                assert page.locator("#download-diagnostic").is_visible(), "download button hidden"
                assert len(posts) == 1, posts
                serialized = json.dumps(posts[0])
                assert "ECHELON" not in serialized and "secret.pdf" not in serialized, serialized
                assert posts[0]["errorCode"] == "PDF_TOOLS_UNAVAILABLE", posts[0]
                assert posts[0]["build"]["commitSha"] == "a" * 40, posts[0]
                assert page_errors == [], page_errors
                results.append({
                    "name": "a processing failure exposes an ID and sends one sanitized production diagnostic",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "a processing failure exposes an ID and sends one sanitized production diagnostic",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                posts.clear()
                page_errors.clear()
                page.reload()
                page.evaluate("""() => {
                  state.mode = "split";
                  state.status = "success";
                  state.diagnosticPagesTotal = 1;
                  state.diagnosticPagesInspected = 1;
                  state.summary = { totalPages: 1, identifiedPages: 1, unidentifiedPages: 0, resultCount: 1 };
                  state.results = [{ nameKind: "code", label: "PRIVATE-CODE", pageCount: 1, bytes: new Uint8Array([1]) }];
                  diagnosticTracker.start({ mode: "split", pdfCount: 1 });
                  diagnosticTracker.complete("completed", { pagesTotal: 1, pagesInspected: 1, identifiedPages: 1, resultCount: 1 });
                  renderDiagnostics();
                }""")
                assert posts == [], posts
                page.locator("#report-incorrect").click()
                assert page.locator("#diagnostic-dialog").is_visible()
                preview = page.locator("#diagnostic-preview").inner_text()
                assert "USER_REPORTED_INCORRECT" in preview, preview
                assert "PRIVATE-CODE" not in preview, preview
                assert page.locator("#diagnostic-dialog textarea, #diagnostic-dialog input").count() == 0
                page.locator("#send-incident-report").click()
                page.wait_for_function("() => document.querySelector('#diagnostic-send-status')?.dataset.state === 'sent'")
                assert len(posts) == 1, posts
                assert posts[0]["errorCode"] == "USER_REPORTED_INCORRECT", posts[0]
                assert "PRIVATE-CODE" not in json.dumps(posts[0]), posts[0]
                assert page_errors == [], page_errors
                results.append({
                    "name": "a completed result sends nothing until the user reviews and confirms the sanitized report",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "a completed result sends nothing until the user reviews and confirms the sanitized report",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                posts.clear()
                page_errors.clear()
                page.reload()
                execution_id = page.evaluate("""() => {
                  state.mode = "split";
                  state.status = "success";
                  state.diagnosticPagesTotal = 2;
                  state.diagnosticPagesInspected = 2;
                  state.summary = { totalPages: 2, identifiedPages: 2, unidentifiedPages: 0, resultCount: 2 };
                  state.results = [
                    { nameKind: "code", label: "PRIVATE-A", pageCount: 1, bytes: new Uint8Array([1]) },
                    { nameKind: "code", label: "PRIVATE-B", pageCount: 1, bytes: new Uint8Array([2]) },
                  ];
                  diagnosticTracker.start({ mode: "split", pdfCount: 1 });
                  diagnosticTracker.complete("completed", { pagesTotal: 2, pagesInspected: 2, identifiedPages: 2, resultCount: 2 });
                  window.JSZip = undefined;
                  renderResults();
                  renderDiagnostics();
                  return diagnosticTracker.getCurrent().executionId;
                }""")
                assert posts == [], posts
                page.locator("#download-all").click()
                page.wait_for_function("() => document.querySelector('#diagnostic-send-status')?.dataset.state === 'sent'")
                assert len(posts) == 1, posts
                assert posts[0]["executionId"] == execution_id, posts[0]
                assert posts[0]["errorCode"] == "ZIP_TOOL_UNAVAILABLE", posts[0]
                assert posts[0]["download"] == {"attempt": 1, "kind": "master_zip"}, posts[0]
                assert "PRIVATE-A" not in json.dumps(posts[0]), posts[0]
                assert page_errors == [], page_errors
                results.append({
                    "name": "a ZIP failure after 100 percent stays correlated and sanitized",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "a ZIP failure after 100 percent stays correlated and sanitized",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                posts.clear()
                page_errors.clear()
                page.reload()
                execution_id = page.evaluate("""() => {
                  state.mode = "split";
                  state.status = "success";
                  state.diagnosticPagesTotal = 1;
                  state.diagnosticPagesInspected = 1;
                  state.summary = { totalPages: 1, identifiedPages: 1, unidentifiedPages: 0, resultCount: 1 };
                  window.PDFLib = { PDFDocument: { load: async () => { throw new Error("corrupt artifact"); } } };
                  state.results = [{ nameKind: "code", label: "PRIVATE-C", pageCount: 1, bytes: new Uint8Array([1]) }];
                  diagnosticTracker.start({ mode: "split", pdfCount: 1 });
                  diagnosticTracker.complete("completed", { pagesTotal: 1, pagesInspected: 1, identifiedPages: 1, resultCount: 1 });
                  renderResults();
                  renderDiagnostics();
                  return diagnosticTracker.getCurrent().executionId;
                }""")
                page.locator("#results-list .download-button").click()
                page.wait_for_function("() => document.querySelector('#diagnostic-send-status')?.dataset.state === 'sent'", timeout=5_000)
                assert len(posts) == 1, posts
                assert posts[0]["executionId"] == execution_id, posts[0]
                assert posts[0]["errorCode"] == "PDF_ARTIFACT_INTEGRITY_FAILED", posts[0]
                assert posts[0]["download"] == {"attempt": 1, "kind": "pdf"}, posts[0]
                assert "PRIVATE-C" not in json.dumps(posts[0]), posts[0]
                assert page_errors == [], page_errors
                results.append({
                    "name": "an invalid PDF artifact after 100 percent becomes a correlated incident",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "an invalid PDF artifact after 100 percent becomes a correlated incident",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                posts.clear()
                page_errors.clear()
                page.reload()
                execution_id = page.evaluate("""async () => {
                  state.mode = "pcl";
                  state.status = "success";
                  const result = {
                    nameKind: "pcl-package",
                    packageName: "PRIVATE-PACKAGE",
                    reportText: "private report",
                    plan: { status: "satisfactory", available: [], missing: [], conflicts: [] },
                  };
                  diagnosticTracker.start({ mode: "pcl", pdfCount: 1, pclCount: 1 });
                  diagnosticTracker.complete("completed", { resultCount: 1 });
                  estimatePackageBytes = () => LARGE_PACKAGE_DIRECT_THRESHOLD + 1;
                  window.showSaveFilePicker = async () => ({});
                  window.ZipWriter = {
                    ...window.ZipWriter,
                    createFileSink: async () => { throw new Error("file sink failed"); },
                  };
                  const executionId = diagnosticTracker.getCurrent().executionId;
                  await downloadPclPackage(result);
                  return executionId;
                }""")
                assert len(posts) == 1, posts
                assert posts[0]["executionId"] == execution_id, posts[0]
                assert posts[0]["errorCode"] == "ZIP_INDIVIDUAL_FAILED", posts[0]
                assert posts[0]["download"] == {"attempt": 1, "kind": "individual_zip"}, posts[0]
                assert "PRIVATE-PACKAGE" not in json.dumps(posts[0]), posts[0]
                assert page_errors == [], page_errors
                results.append({
                    "name": "a direct-save sink failure is recorded after picker approval",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "a direct-save sink failure is recorded after picker approval",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            try:
                posts.clear()
                page_errors.clear()
                diagnostic_status["value"] = 500
                page.reload()
                page.locator("#file-input").set_input_files({
                    "name": "PRIVATE.pdf",
                    "mimeType": "application/pdf",
                    "buffer": b"%PDF-1.4\n%%EOF",
                })
                page.locator("#process-button").click()
                page.wait_for_function("() => document.querySelector('#diagnostic-send-status')?.dataset.state === 'not-sent'")
                assert len(posts) == 2, posts
                assert page.locator("#download-diagnostic").evaluate("element => element.classList.contains('is-recommended')")
                assert page_errors == [], page_errors
                results.append({
                    "name": "failed transport highlights the local diagnostic after two attempts",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "failed transport highlights the local diagnostic after two attempts",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {page_errors}" if page_errors else ""),
                })
            finally:
                browser.close()
    finally:
        server.shutdown()
        thread.join()

    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 1 if any(not result["passed"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
