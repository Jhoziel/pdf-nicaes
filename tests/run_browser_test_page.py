from __future__ import annotations

import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: run_browser_test_page.py tests/<name>.test.html")

    test_path = Path(sys.argv[1]).as_posix().lstrip("/")
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=ROOT, **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(f"http://127.0.0.1:{server.server_port}/{test_path}")
            page.locator("#test-results").wait_for()
            results = json.loads(page.locator("#test-results").inner_text())
            browser.close()
    finally:
        server.shutdown()
        thread.join()

    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 1 if any(not result["passed"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
