from __future__ import annotations

import http.server
import json
import os
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> int:
    site_root = Path(os.environ.get("PDF_NICAES_SITE_DIR", ROOT))
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=site_root, **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    results: list[dict[str, object]] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            fixture_page = browser.new_page()
            fixture_page.set_content("<main style='font: 24px Arial'>PLANO SIN ETIQUETA</main>")
            unidentified_pdf = fixture_page.pdf(format="A4")
            fixture_page.set_content("""
              <section style='page-break-after: always; font: 24px Arial'>PLANO SIN ETIQUETA A</section>
              <section style='font: 24px Arial'>PLANO SIN ETIQUETA B</section>
            """)
            two_unidentified_pdf = fixture_page.pdf(format="A4")
            fixture_page.set_content("<strong>TRUSS</strong><div>F01</div><p>Versión anterior</p>")
            merge_old_pdf = fixture_page.pdf(format="A4")
            fixture_page.set_content("<strong>TRUSS</strong><div>F01</div><p>Versión nueva</p>")
            merge_new_pdf = fixture_page.pdf(format="A4")
            fixture_page.close()

            page = browser.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            try:
                page.goto(f"http://127.0.0.1:{server.server_port}/index.html", wait_until="networkidle")
                page.locator("#file-input").set_input_files({
                    "name": "SinEtiqueta.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.evaluate("""() => {
                  window.__prematureHundred = false;
                  new MutationObserver(() => {
                    if (
                      document.querySelector('#progress-percent').textContent === '100%'
                      && document.querySelector('#results-card').hidden
                    ) window.__prematureHundred = true;
                  }).observe(document.querySelector('#progress-percent'), {childList: true, subtree: true});
                }""")
                page.locator("#process-button").click()
                page.wait_for_function("state.status !== 'processing'", timeout=180_000)
                assert page.locator("#review-card").is_visible(), page.locator("#progress-detail").inner_text()
                page.locator("#language-en").click()
                page.locator("#confirm-review").wait_for(state="visible")
                page.wait_for_function("!state.busy && !document.querySelector('#confirm-review').disabled")

                assert page.locator("#progress-percent").inner_text() != "100%", page.locator("#progress-percent").inner_text()
                assert page.locator("#results-card").is_hidden(), "results were exposed before review"
                item = page.locator(".review-item").first
                assert item.locator(".review-preview").get_attribute("data-ready") == "true"
                preview_width = item.locator(".review-preview").evaluate("canvas => canvas.width")
                item.locator(".review-code-input").fill(" f01 ")
                item.locator('.review-action[value="assign"]').check()
                page.locator("#language-es").click()
                assert item.locator(".review-code-input").input_value() == "F01", item.locator(".review-code-input").input_value()
                current_preview_width = item.locator(".review-preview").evaluate("canvas => canvas.width")
                assert current_preview_width == preview_width, (preview_width, current_preview_width)
                workspace_busy = page.locator("#workspace").get_attribute("aria-busy")
                assert workspace_busy == "false", workspace_busy
                page.evaluate("""() => {
                  const originalExpandedPreview = renderExpandedReviewPreview;
                  let release;
                  window.__releaseExpandedPreview = () => release();
                  renderExpandedReviewPreview = async (...args) => {
                    await new Promise(resolve => { release = resolve; });
                    return originalExpandedPreview(...args);
                  };
                }""")
                item.locator(".review-preview-button").click()
                assert page.locator("#confirm-review").is_disabled()
                page.evaluate("window.__releaseExpandedPreview()")
                page.wait_for_function(
                    "document.querySelector('.review-preview').width > 500",
                    timeout=3_000,
                )
                page.locator("#confirm-review").click()

                page.locator("#results-card").wait_for(state="visible", timeout=120_000)
                assert page.locator("#progress-percent").inner_text() == "100%", page.locator("#progress-percent").inner_text()
                assert page.evaluate("window.__prematureHundred") is False
                assert page.locator(".result-name").all_inner_texts() == ["F01-S.pdf"], page.locator(".result-name").all_inner_texts()
                assert errors == [], errors
                results.append({
                    "name": "an unidentified split page must be reviewed before its corrected PDF is downloadable",
                    "passed": True,
                })

                page.locator("#start-over").click()
                page.locator("#file-input").set_input_files([
                    {"name": "Anterior.pdf", "mimeType": "application/pdf", "buffer": merge_old_pdf},
                    {"name": "Nueva.pdf", "mimeType": "application/pdf", "buffer": merge_new_pdf},
                ])
                page.locator('input[name="mode"][value="merge"]').check()
                page.locator("#process-button").click()
                page.wait_for_function("state.status !== 'processing'", timeout=180_000)
                assert page.locator("#review-card").is_visible(), page.locator("#progress-detail").inner_text()
                assert page.locator("#review-list .review-item").count() == 0
                replacement_text = page.locator("#review-replacements").inner_text()
                assert "F01" in replacement_text and "Nueva.pdf" in replacement_text and "Anterior.pdf" in replacement_text, replacement_text
                assert page.locator("#results-card").is_hidden(), "merge result was exposed before replacement review"
                page.locator("#confirm-review").click()
                page.locator("#results-card").wait_for(state="visible", timeout=120_000)
                assert page.locator(".result-name").all_inner_texts() == ["todos-los-pdfs.pdf"]
                assert page.locator("#progress-percent").inner_text() == "100%"
                results.append({
                    "name": "merge replacements are read-only and must be confirmed before download",
                    "passed": True,
                })

                page.locator("#start-over").click()
                page.locator('input[name="mode"][value="pcl"]').check()
                page.locator("#file-input").set_input_files({
                    "name": "SinEtiqueta.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.locator("#pcl-file-input").set_input_files({
                    "name": "Edificio.pcl",
                    "mimeType": "text/plain",
                    "buffer": b"1 1\nF01.tre\n",
                })
                page.locator("#process-button").click()
                page.wait_for_function("state.status !== 'processing'", timeout=180_000)
                assert page.locator("#review-card").is_visible(), page.locator("#progress-detail").inner_text()
                assert page.locator('#review-code-suggestions option[value="F01"]').count() == 1
                pcl_item = page.locator(".review-item").first
                pcl_item.locator(".review-code-input").fill("F01")
                page.locator("#confirm-review").click()
                page.locator("#results-card").wait_for(state="visible", timeout=120_000)
                assert page.locator(".result-name").all_inner_texts() == ["Edificio.zip"]
                assert page.locator(".result-status").inner_text() in {"Satisfactorio", "Successful"}
                assert page.locator("#progress-percent").inner_text() == "100%"
                results.append({
                    "name": "PCL review suggests requested codes and replans the package after assignment",
                    "passed": True,
                })

                page.locator("#start-over").click()
                page.locator("#file-input").set_input_files([
                    {"name": "Anterior.pdf", "mimeType": "application/pdf", "buffer": merge_old_pdf},
                    {"name": "SinEtiqueta.pdf", "mimeType": "application/pdf", "buffer": two_unidentified_pdf},
                ])
                page.locator('input[name="mode"][value="merge"]').check()
                page.locator("#process-button").click()
                page.locator("#review-card").wait_for(state="visible", timeout=120_000)
                merge_assignment = page.locator(".review-item").first
                merge_assignment.locator(".review-code-input").fill("F01")
                page.locator(".review-item").nth(1).locator('.review-action[value="keep"]').check()
                page.locator("#confirm-review").click()
                page.wait_for_function("state.status === 'review' && !state.busy")
                recalculated_text = page.locator("#review-replacements").inner_text()
                assert "F01" in recalculated_text and "SinEtiqueta.pdf" in recalculated_text and "Anterior.pdf" in recalculated_text, recalculated_text
                assert page.locator(".review-item").count() == 0, "resolved unidentified pages were requested again"
                assert page.locator("#results-card").is_hidden(), "a newly created replacement was not reconfirmed"
                page.locator("#confirm-review").click()
                page.locator("#results-card").wait_for(state="visible", timeout=120_000)
                assert page.locator("#progress-percent").inner_text() == "100%"
                assert page.evaluate("state.keptUnidentifiedCount") == 1
                results.append({
                    "name": "a manual merge assignment that creates a replacement requires a second confirmation",
                    "passed": True,
                })

                page.locator("#start-over").click()
                page.locator("#file-input").set_input_files({
                    "name": "SesionA.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.locator("#process-button").click()
                page.wait_for_function("state.status === 'review' && !state.busy", timeout=120_000)
                page.evaluate("""() => {
                  window.__expandedResolvers = [];
                  renderExpandedReviewPreview = () => new Promise(resolve => {
                    window.__expandedResolvers.push(() => {
                      const rendered = document.createElement('canvas');
                      rendered.width = 600;
                      rendered.height = 800;
                      resolve(rendered);
                    });
                  });
                }""")
                page.locator(".review-preview-button").click()
                page.wait_for_function("window.__expandedResolvers.length === 1")
                page.locator("#restart-review").click()
                page.locator("#file-input").set_input_files({
                    "name": "SesionB.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.locator("#process-button").click()
                page.wait_for_function("state.status === 'review' && !state.busy", timeout=120_000)
                page.locator(".review-preview-button").click()
                page.wait_for_function("window.__expandedResolvers.length === 2")
                page.evaluate("window.__expandedResolvers[0]()")
                page.wait_for_timeout(100)
                assert page.evaluate("state.reviewPreviewPending") == 1
                assert page.locator("#confirm-review").is_disabled()
                page.evaluate("window.__expandedResolvers[1]()")
                page.wait_for_function("state.reviewPreviewPending === 0")
                page.locator("#restart-review").click()
                results.append({
                    "name": "a stale preview cannot release the confirmation guard for a newer session",
                    "passed": True,
                })

                page.locator("#file-input").set_input_files({
                    "name": "SinEtiqueta.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.locator("#process-button").click()
                page.wait_for_function("state.status === 'review' && !state.busy", timeout=120_000)
                page.evaluate("""() => {
                  let reject;
                  window.__rejectExpandedPreview = () => reject(new Error('late expanded preview failure'));
                  renderExpandedReviewPreview = () => new Promise((resolve, rejectPromise) => {
                    reject = rejectPromise;
                  });
                }""")
                page.locator(".review-preview-button").click()
                assert page.locator("#confirm-review").is_disabled()
                page.evaluate("confirmCurrentReview()")
                assert page.evaluate("state.status") == "review"
                assert page.locator("#results-card").is_hidden()
                page.evaluate("window.__rejectExpandedPreview()")
                page.wait_for_function("state.status === 'error'", timeout=120_000)
                expanded_failure = page.evaluate("diagnosticTracker.getCurrent()")
                assert expanded_failure["errorCode"] == "REVIEW_PREVIEW_FAILED", expanded_failure
                page.locator("#restart-review").click()
                assert page.evaluate("diagnosticTracker.getCurrent().outcome") == "incident"
                results.append({
                    "name": "confirmation is blocked until a late expanded-preview failure is recorded",
                    "passed": True,
                })

                page.evaluate("""() => {
                  renderReviewPreviews = async () => { throw new Error('preview fault injection'); };
                  return true;
                }""")
                page.locator("#file-input").set_input_files({
                    "name": "SinEtiqueta.pdf",
                    "mimeType": "application/pdf",
                    "buffer": unidentified_pdf,
                })
                page.locator("#process-button").click()
                page.wait_for_function("state.status !== 'processing'", timeout=120_000)
                assert page.evaluate("state.status") == "error", page.evaluate("state.status")
                preview_failure = page.evaluate("diagnosticTracker.getCurrent()")
                assert preview_failure["outcome"] == "incident", preview_failure
                assert preview_failure["errorCode"] == "REVIEW_PREVIEW_FAILED", preview_failure
                assert page.locator("#results-card").is_hidden()
                assert page.locator("#progress-percent").inner_text() != "100%"
                assert page.locator("#confirm-review").is_disabled()
                page.locator("#restart-review").click()
                assert page.evaluate("diagnosticTracker.getCurrent().outcome") == "incident"
                results.append({
                    "name": "a preview failure blocks downloads and records a shared integrity incident",
                    "passed": True,
                })
            except Exception as error:
                results.append({
                    "name": "review UI vertical slice",
                    "passed": False,
                    "error": repr(error) + (f"; page errors: {errors}" if errors else ""),
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
