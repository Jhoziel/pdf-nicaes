from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(name: str, command: list[str]) -> dict[str, object]:
    print(f"\n=== {name} ===", flush=True)
    completed = subprocess.run(command, cwd=ROOT, check=False)
    return {"name": name, "passed": completed.returncode == 0, "exitCode": completed.returncode}


def main() -> int:
    results = [
        run("browser and domain regressions", [sys.executable, "tests/run_browser_tests.py"]),
        run("result review UI", [sys.executable, "tests/run_review_ui.py"]),
        run("diagnostics UI", [sys.executable, "tests/run_diagnostics_ui.py"]),
        run("visual and large-document audit", [sys.executable, "tests/run_existing_audit.py"]),
        run(
            "Cloudflare and Nginx build contract",
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tests/build-pages.test.ps1"],
        ),
        run("static publication package", [sys.executable, "tests/run_static_package.py"]),
    ]
    node = shutil.which("node")
    if node:
        results.extend([
            run("diagnostics receiver", [node, "tests/diagnostics-function.test.mjs"]),
            run("Worker routing", [node, "tests/worker.test.mjs"]),
        ])
    else:
        results.append({"name": "Node-only receiver and Worker tests", "passed": True, "skipped": True})

    print("\n=== aggregate result ===")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 1 if any(not result["passed"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
