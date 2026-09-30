from __future__ import annotations

import importlib.util
import http.server
import tempfile
import threading
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIT_SCRIPT = ROOT / "audit-output" / "audit_capture.py"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    spec = importlib.util.spec_from_file_location("pdf_nicaes_audit", AUDIT_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the existing audit suite.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    handler = lambda *args, **kwargs: QuietHandler(*args, directory=ROOT, **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    module.APP_URL = f"http://127.0.0.1:{server.server_port}/"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="pdf-nicaes-audit-") as output:
            module.ROOT = Path(output)
            module.main()
    finally:
        server.shutdown()
        thread.join()


if __name__ == "__main__":
    main()
