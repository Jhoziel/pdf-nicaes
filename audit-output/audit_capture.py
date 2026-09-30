from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent
FIXTURE_ROOT = ROOT.parent / "local-data" / "fixtures" / "audit-capture"
APP_URL = "http://127.0.0.1:8765/"


def complete_review_if_present(page):
    page.wait_for_function("state.status !== 'processing'", timeout=180_000)
    if page.locator("#review-card").is_visible():
        for keep in page.locator('.review-action[value="keep"]').all():
            keep.check()
        page.locator("#confirm-review").click()
        page.wait_for_function("state.status === 'success'", timeout=180_000)


def verify_language_preferences(browser):
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)

    initial = {
        "language": page.locator("html").get_attribute("lang"),
        "title": page.title(),
        "spanish_active": page.locator("#language-es").get_attribute("aria-pressed"),
        "english_active": page.locator("#language-en").get_attribute("aria-pressed"),
    }
    assert initial["language"] == "es"
    assert initial["spanish_active"] == "true"

    page.locator("#language-en").click()
    english = {
        "language": page.locator("html").get_attribute("lang"),
        "title": page.title(),
        "hero": page.locator("#page-title").inner_text(),
        "description": page.locator('meta[name="description"]').get_attribute("content"),
        "workspace_label": page.locator("#workspace").get_attribute("aria-label"),
        "stored": page.evaluate("localStorage.getItem('pdf-nicaes-language')"),
    }
    assert english["language"] == "en"
    assert english["hero"] == "Split and update PDF plans."
    assert english["stored"] == "en"

    page.reload(wait_until="networkidle")
    persisted = page.locator("html").get_attribute("lang")
    assert persisted == "en"

    page.evaluate("localStorage.setItem('pdf-nicaes-language', 'fr')")
    page.reload(wait_until="networkidle")
    fallback = page.locator("html").get_attribute("lang")
    assert fallback == "es"
    context.close()
    return {"initial": initial, "english": english, "persisted": persisted, "fallback": fallback}


def verify_localized_download_names(browser):
    context = browser.new_context(
        viewport={"width": 1100, "height": 800},
        accept_downloads=True,
    )
    page = context.new_page()
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    page.evaluate(
        """async () => {
          const documentHandle = await PDFLib.PDFDocument.create();
          documentHandle.addPage();
          state.mode = 'split';
          state.results = [{
            nameKind: 'unidentified',
            label: UNIDENTIFIED_LABEL,
            pageCount: 1,
            bytes: await documentHandle.save()
          }];
          diagnosticTracker.start({mode: 'split', pdfCount: 1});
          diagnosticTracker.complete('completed', {resultCount: 1});
          renderResults();
        }"""
    )
    spanish_visible_name = page.locator(".result-name").inner_text()
    with page.expect_download(timeout=30_000) as download_info:
        page.locator(".download-button").click()
    spanish_download = download_info.value.suggested_filename

    page.locator("#language-en").click()
    english_visible_name = page.locator(".result-name").inner_text()
    page.locator("#result-search").fill("UNIDENTIFIED")
    english_search_matches = page.locator(".result-item").count()
    page.locator("#filter-review").click()
    english_review_matches = page.locator(".result-item").count()
    page.locator("#result-search").fill("")
    assert english_search_matches == 1
    assert english_review_matches == 1
    with page.expect_download(timeout=30_000) as download_info:
        page.locator(".download-button").click()
    english_download = download_info.value.suggested_filename

    page.evaluate(
        """async () => {
          const documentHandle = await PDFLib.PDFDocument.create();
          documentHandle.addPage();
          documentHandle.addPage();
          state.mode = 'merge';
          state.resultFilter = 'all';
          state.resultQuery = '';
          state.results = [{
            nameKind: 'merged',
            label: null,
            pageCount: 2,
            bytes: await documentHandle.save()
          }];
          renderResults();
        }"""
    )
    with page.expect_download(timeout=30_000) as download_info:
        page.locator(".download-button").click()
    merged_download = download_info.value.suggested_filename

    page.evaluate(
        """() => {
          state.mode = 'split';
          state.resultFilter = 'all';
          state.resultQuery = '';
          state.results = [
            {nameKind: 'code', label: 'F001', pageCount: 1, bytes: new Uint8Array([1])},
            {nameKind: 'unidentified', label: UNIDENTIFIED_LABEL, pageCount: 1, bytes: new Uint8Array([2])}
          ];
          renderResults();
        }"""
    )
    with page.expect_download(timeout=30_000) as download_info:
        page.locator("#download-all").click()
    zip_download = download_info.value.suggested_filename

    assert spanish_visible_name == "SIN-IDENTIFICAR.pdf"
    assert spanish_download == "SIN-IDENTIFICAR.pdf"
    assert english_visible_name == "UNIDENTIFIED.pdf"
    assert english_download == "UNIDENTIFIED.pdf"
    assert merged_download == "all-pdfs.pdf"
    assert zip_download == "pdfs-by-code.zip"
    context.close()
    return {
        "spanish_visible_name": spanish_visible_name,
        "spanish_download": spanish_download,
        "english_visible_name": english_visible_name,
        "english_download": english_download,
        "english_search_matches": english_search_matches,
        "english_review_matches": english_review_matches,
        "merged_download": merged_download,
        "zip_download": zip_download,
    }


def capture_desktop(browser, pdf_path: Path, second_pdf_path: Path):
    context = browser.new_context(
        viewport={"width": 1440, "height": 1100},
        accept_downloads=True,
        device_scale_factor=1,
    )
    page = context.new_page()
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    page.screenshot(path=ROOT / "01-inicio-escritorio.png", full_page=True)

    page.locator("#file-input").set_input_files([str(pdf_path), str(second_pdf_path)])
    page.locator("#file-panel").wait_for(state="visible")
    state_before_language_change = page.evaluate(
        "({files: state.files.length, mode: state.mode, results: state.results.length})"
    )
    page.locator("#language-en").click()
    state_after_language_change = page.evaluate(
        "({files: state.files.length, mode: state.mode, results: state.results.length})"
    )
    assert state_after_language_change == state_before_language_change
    assert page.locator("#file-count").inner_text() == "2 PDFs"
    page.locator("#language-es").click()
    page.screenshot(path=ROOT / "02-pdf-cargado.png", full_page=True)

    initial_order = page.locator(".file-name").all_inner_texts()
    page.locator(".file-move-down").first.click()
    reordered = page.locator(".file-name").all_inner_texts()
    page.locator(".file-remove").last.click()
    count_after_remove = page.locator(".file-item").count()
    page.locator("#file-input").set_input_files(str(pdf_path))
    count_after_readd = page.locator(".file-item").count()

    assert page.locator("#process-button").is_visible()
    assert page.locator("#mobile-action-bar").is_hidden()
    page.locator("#process-button").click()
    page.locator("#progress-card").wait_for(state="visible")
    page.wait_for_timeout(250)
    page.screenshot(path=ROOT / "03-procesando.png", full_page=True)
    progress_before_language_change = page.locator("#progress-label").inner_text()
    page.locator("#language-en").click()
    progress_after_language_change = page.locator("#progress-label").inner_text()
    assert page.locator("html").get_attribute("lang") == "en"
    assert progress_after_language_change != progress_before_language_change
    page.locator("#language-es").click()

    complete_review_if_present(page)
    page.locator("#results-card").wait_for(state="visible", timeout=120_000)
    page.locator("#progress-percent").wait_for(state="visible")
    page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
    page.screenshot(path=ROOT / "04-resultados.png", full_page=True)

    result_count_before_language_change = page.evaluate("state.results.length")
    page.locator("#language-en").click()
    english_summary = page.locator(".summary-item").first.inner_text()
    result_count_after_language_change = page.evaluate("state.results.length")
    assert result_count_after_language_change == result_count_before_language_change
    assert "Pages reviewed" in english_summary
    page.locator("#language-es").click()

    initial_rendered_results = page.locator(".result-item").count()
    page.locator("#result-search").fill("F050")
    filtered_result_count = page.locator(".result-item").count()
    page.locator("#result-search").fill("")
    page.locator("#load-more").click()
    loaded_result_count = page.locator(".result-item").count()
    total_result_count = page.evaluate("state.results.length")

    download_names = []
    with page.expect_download(timeout=30_000) as download_info:
        page.locator(".download-button").first.click()
    download = download_info.value
    download_names.append(download.suggested_filename)

    with page.expect_file_chooser(timeout=10_000) as chooser_info:
        page.locator("#add-more-files").click()
    chooser_info.value.set_files(str(pdf_path))
    duplicate_add_kept_count = page.locator(".file-item").count()

    result_names = page.locator(".result-name").all_inner_texts()
    summary = page.locator(".summary-item").all_inner_texts()
    file_count_before_reset = page.locator("#file-count").inner_text()
    page.locator("#start-over").click()
    reset_ok = page.locator(".file-item").count() == 0 and page.locator("#results-card").is_hidden()

    return {
        "title": page.title(),
        "file_count": file_count_before_reset,
        "initial_order": initial_order,
        "reordered": reordered,
        "count_after_remove": count_after_remove,
        "count_after_readd": count_after_readd,
        "result_count": total_result_count,
        "initial_rendered_results": initial_rendered_results,
        "filtered_result_count": filtered_result_count,
        "loaded_result_count": loaded_result_count,
        "result_names": result_names,
        "summary": summary,
        "download_names": download_names,
        "duplicate_add_kept_count": duplicate_add_kept_count,
        "reset_ok": reset_ok,
        "state_preserved_on_language_change": state_after_language_change == state_before_language_change,
        "results_preserved_on_language_change": result_count_after_language_change == result_count_before_language_change,
        "progress_translated_during_processing": progress_after_language_change != progress_before_language_change,
        "console_errors": errors,
    }


def capture_mobile(browser, pdf_path: Path):
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        accept_downloads=True,
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    page.screenshot(path=ROOT / "05-inicio-movil.png", full_page=True)
    page.locator("#language-en").click()
    english_initial_overflow = page.evaluate(
        "document.documentElement.scrollWidth > document.documentElement.clientWidth"
    )
    assert not english_initial_overflow
    assert page.locator("#actions-title").inner_text() == "What result do you need?"

    page.locator("#file-input").set_input_files(str(pdf_path))
    page.locator("#mobile-process-button").click()
    complete_review_if_present(page)
    page.locator("#results-card").wait_for(state="visible", timeout=120_000)
    page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
    page.screenshot(path=ROOT / "06-resultados-movil.png", full_page=True)
    return {
        "rendered_result_count": page.locator(".result-item").count(),
        "result_count": page.evaluate("state.results.length"),
        "horizontal_overflow": page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth"),
        "english_initial_overflow": english_initial_overflow,
        "language": page.locator("html").get_attribute("lang"),
        "console_errors": errors,
    }


def capture_invalid_file(browser, invalid_pdf_path: Path):
    context = browser.new_context(viewport={"width": 1440, "height": 1100})
    page = context.new_page()
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    page.locator("#file-input").set_input_files(str(invalid_pdf_path))
    page.locator("#process-button").click()
    page.wait_for_function(
        "document.querySelector('#progress-label').textContent === 'No se pudo procesar'",
        timeout=30_000,
    )
    page.wait_for_timeout(350)
    page.screenshot(path=ROOT / "07-error-pdf-invalido.png", full_page=True)
    spanish_detail = page.locator("#progress-detail").inner_text()
    page.locator("#language-en").click()
    english_detail = page.locator("#progress-detail").inner_text()
    english_issue = page.locator(".file-issue").inner_text()
    assert english_detail.startswith("The file is not a valid PDF")
    assert "Replace file" in english_issue
    return {
        "progress_label": page.locator("#progress-label").inner_text(),
        "spanish_detail": spanish_detail,
        "english_detail": english_detail,
        "english_issue": english_issue,
        "toast_visible": page.locator("#toast").is_visible(),
    }


def capture_keyboard(browser, pdf_path: Path):
    context = browser.new_context(viewport={"width": 1440, "height": 1100})
    page = context.new_page()
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    for _ in range(8):
        if page.evaluate("document.activeElement.id") == "pick-files":
            break
        page.keyboard.press("Tab")
    dropzone_focus = page.evaluate(
        """({
          activeId: document.activeElement.id,
          outline: getComputedStyle(document.activeElement).outline,
          outlineWidth: getComputedStyle(document.activeElement).outlineWidth
        })"""
    )
    page.screenshot(path=ROOT / "08-foco-teclado-carga.png", full_page=True)

    page.locator("#file-input").set_input_files(str(pdf_path))
    page.locator("#file-panel").wait_for(state="visible")
    page.locator("body").click(position={"x": 5, "y": 5})
    focused = ""
    for _ in range(16):
        page.keyboard.press("Tab")
        focused = page.evaluate("document.activeElement.id")
        if focused == "process-button":
            break
    action_focus = page.evaluate(
        """({
          activeId: document.activeElement.id,
          outline: getComputedStyle(document.activeElement).outline,
          outlineWidth: getComputedStyle(document.activeElement).outlineWidth
        })"""
    )
    page.screenshot(path=ROOT / "09-foco-teclado-accion.png", full_page=True)
    return {"dropzone": dropzone_focus, "action": action_focus}


def verify_merge(browser, pdf_path: Path, second_pdf_path: Path):
    context = browser.new_context(viewport={"width": 1440, "height": 1100}, accept_downloads=True)
    page = context.new_page()
    page.goto(APP_URL, wait_until="networkidle", timeout=120_000)
    page.locator("#file-input").set_input_files([str(pdf_path), str(second_pdf_path)])
    page.locator('input[name="mode"][value="merge"]').check()
    page.locator("#process-button").click()
    complete_review_if_present(page)
    page.locator("#results-card").wait_for(state="visible", timeout=120_000)
    page.wait_for_function("document.querySelector('#progress-percent').textContent === '100%'", timeout=120_000)
    result_name = page.locator(".result-name").inner_text()
    result_meta = page.locator(".result-meta").inner_text()
    with page.expect_download(timeout=30_000) as download_info:
        page.locator(".download-button").click()
    return {
        "result_count": page.locator(".result-item").count(),
        "result_name": result_name,
        "result_meta": result_meta,
        "download_name": download_info.value.suggested_filename,
        "zip_hidden": page.locator("#download-all").is_hidden(),
        "operation_summary": page.locator("#operation-summary").inner_text(),
    }


def main():
    FIXTURE_ROOT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--ignore-certificate-errors"],
        )

        pdf_page = browser.new_page(viewport={"width": 794, "height": 1123})
        pages = []
        for index in range(1, 76):
            code = f"F{index:03d}"
            pages.append(
                f'<section style="page-break-after: always; height: 1000px; padding: 60px; '
                f'font: 28px Arial"><strong>TRUSS</strong><div>{code}</div>'
                f'<p style="margin-top: 80px; font-size: 18px">Plano de prueba · hoja {index}</p></section>'
            )
        pdf_page.set_content("".join(pages), wait_until="load")
        pdf_path = FIXTURE_ROOT / "fixture-truss-75-codigos.pdf"
        pdf_page.pdf(path=pdf_path, format="A4", print_background=True)
        pdf_page.close()
        second_pdf_path = FIXTURE_ROOT / "fixture-truss-segundo.pdf"
        second_pdf_path.write_bytes(pdf_path.read_bytes())

        invalid_pdf_path = FIXTURE_ROOT / "fixture-invalido.pdf"
        invalid_pdf_path.write_text("Este archivo no es un PDF válido.", encoding="utf-8")

        language = verify_language_preferences(browser)
        localized_downloads = verify_localized_download_names(browser)
        desktop = capture_desktop(browser, pdf_path, second_pdf_path)
        mobile = capture_mobile(browser, pdf_path)
        invalid = capture_invalid_file(browser, invalid_pdf_path)
        keyboard = capture_keyboard(browser, pdf_path)
        merge = verify_merge(browser, pdf_path, second_pdf_path)
        browser.close()

    print({
        "language": language,
        "localized_downloads": localized_downloads,
        "desktop": desktop,
        "mobile": mobile,
        "invalid": invalid,
        "keyboard": keyboard,
        "merge": merge,
    })


if __name__ == "__main__":
    main()
