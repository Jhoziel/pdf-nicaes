"""Verify the delivery ZIP in isolation; needs Windows PowerShell and Playwright."""
from __future__ import annotations

import hashlib
import http.server
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB_FILES = {
    "index.html", "styles.css", "app.js", "diagnostics.js", "build-info.js",
    "pcl-domain.js", "tre-pcl-domain.js", "review-domain.js", "zip-writer.js", "archive-import.js", "ocr-loader.js",
    "assets/nicaes-logo-white.png", "assets/vendor/manifest.sha256", "assets/vendor/THIRD_PARTY_NOTICES.md",
}


def prepare(project: Path, *, success: bool = True) -> subprocess.CompletedProcess:
    # A static package must ignore even valid production Cloudflare metadata.
    env = dict(os.environ, WORKERS_CI="1", WORKERS_CI_BRANCH="main", WORKERS_CI_COMMIT_SHA="a" * 40)
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
         str(project / "deploy/preparar-sitio.ps1")],
        cwd=project.parent, env=env, capture_output=True, text=True, errors="replace", timeout=120,
    )
    assert (result.returncode == 0) == success, result.stdout + result.stderr
    return result


def check_failure_cases(work: Path, expected: set[str]) -> None:
    project = work / "proyecto con espacios"
    project.mkdir()
    for name in expected | {"deploy/preparar-sitio.ps1"}:
        target = project / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    for extra in ("assets/privado.pdf", "assets/vendor/no-publicar.txt", "secreto.txt", "prueba.exe"):
        (project / extra).write_text("must not be published", encoding="utf-8")
    prepare(project)
    old_zip = project / "dist/pdf-nicaes-web.zip"
    (project / "dist/no-tocar.txt").write_text("keep", encoding="utf-8")
    (project / "dist/sitio/sobrante.txt").write_text("stale", encoding="utf-8")
    prepare(project)
    assert not (project / "dist/sitio/sobrante.txt").exists()
    assert (project / "dist/no-tocar.txt").read_text() == "keep"
    with zipfile.ZipFile(old_zip) as archive:
        assert set(archive.namelist()) == expected
    old_hash = hashlib.sha256(old_zip.read_bytes()).hexdigest()

    manifest = project / "assets/vendor/manifest.sha256"
    original_manifest = manifest.read_bytes()
    core = project / "assets/vendor/tesseract.js/5.1.0/worker.min.js"
    original_core = core.read_bytes()
    cases = [
        (project / "index.html", None),
        (core, None),
        (core, b"corrupted dependency"),
        (manifest, b"invalid manifest\n"),
        (manifest, ("a" * 64 + "  assets/vendor/../../secreto.txt\n").encode()),
    ]
    for path, replacement in cases:
        original = path.read_bytes()
        if replacement is None:
            path.unlink()
        else:
            path.write_bytes(replacement)
        try:
            failure = prepare(project, success=False)
            assert "NO SE PUDO PREPARAR EL SITIO" in failure.stdout
            assert hashlib.sha256(old_zip.read_bytes()).hexdigest() == old_hash
            assert not list((project / "dist").glob("preparacion-*"))
        finally:
            path.write_bytes(original)
    assert manifest.read_bytes() == original_manifest
    assert core.read_bytes() == original_core


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        pass


def check_browser(site: Path, expected: set[str]) -> None:
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), lambda *args, **kwargs: QuietHandler(*args, directory=site, **kwargs),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    external: list[str] = []
    posts: list[str] = []
    errors: list[str] = []
    bad_responses: list[str] = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(service_workers="block")

            def route_request(route):
                url = route.request.url
                if urlsplit(url).scheme in {"http", "https"} and not url.startswith(origin + "/"):
                    external.append(url)
                    route.abort()
                else:
                    route.continue_()

            context.route("**/*", route_request)
            context.on("request", lambda request: posts.append(request.url) if request.method == "POST" else None)
            context.on("response", lambda response: bad_responses.append(response.url) if response.status >= 400 else None)
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(origin + "/", wait_until="networkidle")
            assert page.locator("#process-button").is_visible()
            assert page.locator("#file-input").count() == 1
            page.screenshot(path=str(ROOT / "dist/verificacion-paquete.png"), full_page=True)
            assert page.evaluate("window.PDF_NICAES_BUILD.channel") == "local-dev"
            for name in expected:
                response = context.request.head(origin + "/" + name)
                assert response.status == 200, (name, response.status)

            for mode in ("split", "merge", "pcl"):
                if mode != "split":
                    page.locator("#start-over").click()
                page.locator(f'input[name="mode"][value="{mode}"]').check()
                page.locator("#load-example").click()
                page.locator("#process-button").click()
                page.wait_for_function("['success', 'review', 'error'].includes(state.status)", timeout=120_000)
                if mode == "merge":
                    assert page.locator("#review-card").is_visible()
                    assert page.locator("#results-card").is_hidden()
                    page.locator("#confirm-review").click()
                page.wait_for_function("state.status === 'success'", timeout=120_000)
                with page.expect_download(timeout=120_000) as downloaded:
                    page.locator(".result-item .download-button").first.click()
                data = Path(downloaded.value.path()).read_bytes()
                if mode == "pcl":
                    with zipfile.ZipFile(io.BytesIO(data)) as archive:
                        assert any(name.endswith(".pdf") for name in archive.namelist())
                        assert any(name.endswith(".txt") for name in archive.namelist())
                        assert archive.testzip() is None
                else:
                    assert data.startswith(b"%PDF-")

            # Exercise a real image-only PDF through the application's OCR path.
            page.locator("#start-over").click()
            page.locator('input[name="mode"][value="split"]').check()
            awaitable = """async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1200; canvas.height = 1600;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1200, 1600);
                ctx.fillStyle = 'black'; ctx.font = 'bold 64px Arial';
                ctx.fillText('TRUSS', 100, 130); ctx.fillText('F12', 100, 215);
                const doc = await PDFLib.PDFDocument.create();
                const png = await doc.embedPng(canvas.toDataURL('image/png'));
                doc.addPage([600, 800]).drawImage(png, {x: 0, y: 0, width: 600, height: 800});
                await addFiles([new File([await doc.save()], 'Escaneado.pdf', {type: 'application/pdf'})]);
            }"""
            page.evaluate(awaitable)
            page.locator("#process-button").click()
            page.wait_for_function("['success', 'review', 'error'].includes(state.status)", timeout=180_000)
            assert page.evaluate("state.status") == "success", page.locator("#progress-detail").inner_text()
            assert page.evaluate("state.results.map(result => result.label)") == ["F12"]
            with page.expect_download(timeout=120_000) as downloaded:
                page.locator(".download-button").first.click()
            assert Path(downloaded.value.path()).read_bytes().startswith(b"%PDF-")

            page.locator("#start-over").click()
            page.locator("#file-input").set_input_files({
                "name": "invalido.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\ninvalid",
            })
            page.locator("#process-button").click()
            page.wait_for_function("state.status === 'error'", timeout=120_000)
            assert page.evaluate("diagnosticTracker.getCurrent().remoteStatus") == "not_required"
            with page.expect_download() as downloaded:
                page.locator("#download-diagnostic").click()
            report = json.loads(Path(downloaded.value.path()).read_text(encoding="utf-8"))
            assert report["outcome"] == "incident"
            assert "invalido.pdf" not in json.dumps(report)
            assert not posts, posts
            assert not external, external
            assert not bad_responses, bad_responses
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


def main() -> int:
    results = []
    try:
        prepare(ROOT)
        manifest = dict(
            (line.split("  ", 1)[1], line.split("  ", 1)[0])
            for line in (ROOT / "assets/vendor/manifest.sha256").read_text().splitlines()
        )
        expected = WEB_FILES | set(manifest)
        with tempfile.TemporaryDirectory(prefix="verificar-paquete-", dir=ROOT / "dist") as temp:
            work = Path(temp)
            site = work / "extraido"
            with zipfile.ZipFile(ROOT / "dist/pdf-nicaes-web.zip") as archive:
                assert set(archive.namelist()) == expected
                assert len(archive.namelist()) == len(expected)
                assert archive.testzip() is None
                for name, digest in manifest.items():
                    assert hashlib.sha256(archive.read(name)).hexdigest() == digest, name
                archive.extractall(site)
            for name in expected:
                assert (site / name).read_bytes() == (ROOT / "dist/sitio" / name).read_bytes()
            results.append({"name": "ZIP root, explicit contents, dependency hashes and extracted folder", "passed": True})
            check_failure_cases(work, expected)
            results.append({"name": "spaces in paths, repeat builds, exclusions, missing/corrupt files and safe failures", "passed": True})
            check_browser(site, expected)
            results.append({"name": "isolated ZIP: split, merge review, PCL downloads, real OCR and local-only incident", "passed": True})
            env = dict(os.environ, PDF_NICAES_SITE_DIR=str(site))
            review = subprocess.run([sys.executable, str(ROOT / "tests/run_review_ui.py")], cwd=ROOT, env=env, timeout=600)
            assert review.returncode == 0, "Review regression failed against the extracted ZIP"
            results.append({"name": "full review regression against the extracted ZIP", "passed": True})
    except Exception as error:
        results.append({"name": "static package verification", "passed": False, "error": repr(error)})
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 1 if any(not result["passed"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
