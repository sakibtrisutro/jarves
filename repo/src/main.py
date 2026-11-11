"""JARVIS AI System - Main Application Entrypoint.

Initializes persistent storage, mounts REST endpoints, serves the UI,
and provides a one-command application lifecycle.
"""

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from src.api import api_router
from src.config import settings
from src.database import init_db
from src.skills.status import get_system_status

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure schema is initialized at load time
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    init_db()
    status = get_system_status()
    prov = status["ai_provider"]

    print("=" * 60)
    print("JARVIS PERSONAL AI ASSISTANT -- LIVE MVP")
    print("=" * 60)
    print(f"Status:       ONLINE ({status['status']})")
    print(f"Host:         Windows 11 (RAM: {status['host']['ram_free_gb']} GB Free / {status['host']['ram_total_gb']} GB Total)")
    print(f"AI Provider:  {prov['configured_provider'].upper()} [{prov['mode']}]")
    print(f"Model:        {prov['model']}")
    print(f"Web UI:       http://{settings.HOST}:{settings.PORT}")
    print("=" * 60)
    yield
    print("\nJARVIS shutting down gracefully. All state safely persisted in SQLite.")


app = FastAPI(
    title="JARVIS Personal AI Assistant",
    description="Central Personal AI Assistant and Executive General Manager",
    version="1.0-live-mvp",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router)

# Mount Static UI
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", include_in_schema=False)
def serve_home():
    """Serve the primary JARVIS chat and skill interface."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "JARVIS API is online. UI index not found."}


def run():
    """Start the Uvicorn web server."""
    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    run()
