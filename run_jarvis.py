"""JARVIS AI System — Launcher Script.

Usage:
    python run_jarvis.py
"""

import os
import sys
from pathlib import Path

# Configure UTF-8 for Windows console
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
root_dir = Path(__file__).parent.resolve()
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from src.main import run

if __name__ == "__main__":
    run()
