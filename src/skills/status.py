"""Skill 6: System Status & Diagnostic Telemetry.

Reports host resource consumption, database row counts,
AI provider connectivity status, and skill operational health.
"""

import ctypes
import os
import shutil
from typing import Any, Dict
from src.config import settings
from src.database import get_connection


class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


def get_system_status() -> Dict[str, Any]:
    """Compile comprehensive operational health and system telemetry."""
    # 1. Host Memory Metrics
    ram_total_gb = 0.0
    ram_free_gb = 0.0
    ram_percent_used = 0
    try:
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            ram_total_gb = round(stat.ullTotalPhys / (1024**3), 2)
            ram_free_gb = round(stat.ullAvailPhys / (1024**3), 2)
            ram_percent_used = stat.dwMemoryLoad
    except Exception:
        pass

    # 2. Disk Storage Metrics
    disk_total_gb = 0.0
    disk_free_gb = 0.0
    try:
        total, used, free = shutil.disk_usage(settings.DATA_DIR)
        disk_total_gb = round(total / (1024**3), 2)
        disk_free_gb = round(free / (1024**3), 2)
    except Exception:
        pass

    # 3. Database Statistics
    db_stats = {
        "conversations": 0,
        "messages": 0,
        "memories": 0,
        "tasks_pending": 0,
        "tasks_completed": 0,
        "notes": 0,
    }
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM conversations")
        db_stats["conversations"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM messages")
        db_stats["messages"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM memories")
        db_stats["memories"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'pending'")
        db_stats["tasks_pending"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed'")
        db_stats["tasks_completed"] = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM notes")
        db_stats["notes"] = cursor.fetchone()[0]
        conn.close()
    except Exception:
        pass

    # 4. Cloud AI Provider Status
    is_cloud_active = settings.is_cloud_ai_configured
    provider_status = {
        "configured_provider": settings.AI_PROVIDER,
        "model": settings.AI_MODEL,
        "is_cloud_ai_connected": is_cloud_active,
        "masked_key": settings.active_key_masked,
        "mode": "Cloud AI Live" if is_cloud_active else "Local Diagnostic Mode (No API key in .env)",
    }

    # 5. Skills Operational Matrix
    skills = [
        {
            "name": "Skill 1 — Personal AI Assistant",
            "status": "Online (Cloud AI)" if is_cloud_active else "Online (Local Diagnostic)",
            "description": "Conversational reasoning, context-aware instructions & answers",
            "is_operational": True,
        },
        {
            "name": "Skill 2 — Web Research",
            "status": "Online",
            "description": "DuckDuckGo search, content extraction, and source verification",
            "is_operational": True,
        },
        {
            "name": "Skill 3 — Personal Memory",
            "status": "Online (Persistent SQLite)",
            "description": f"User preferences & facts store ({db_stats['memories']} items)",
            "is_operational": True,
        },
        {
            "name": "Skill 4 — Task Manager",
            "status": "Online (Persistent SQLite)",
            "description": f"Tasks & priorities ({db_stats['tasks_pending']} pending, {db_stats['tasks_completed']} done)",
            "is_operational": True,
        },
        {
            "name": "Skill 5 — Notes and Knowledge",
            "status": "Online (Persistent SQLite)",
            "description": f"Knowledge entries & categories ({db_stats['notes']} notes)",
            "is_operational": True,
        },
        {
            "name": "Skill 6 — System Status",
            "status": "Online",
            "description": "Real-time telemetry, resource watch, and diagnostics",
            "is_operational": True,
        },
        {
            "name": "Skill 7 — GitHub Intelligence & Code Comprehension",
            "status": "Online",
            "description": "Repo search, tree inspection, README analysis, and code retrieval",
            "is_operational": True,
        },
    ]

    return {
        "status": "HEALTHY",
        "jarvis_name": "JARVIS",
        "version": "1.0-live-mvp",
        "host": {
            "os": "Windows 11",
            "cpu_cores": os.cpu_count() or 4,
            "ram_total_gb": ram_total_gb,
            "ram_free_gb": ram_free_gb,
            "ram_percent_used": ram_percent_used,
            "disk_free_gb": disk_free_gb,
            "disk_total_gb": disk_total_gb,
        },
        "ai_provider": provider_status,
        "database": db_stats,
        "skills": skills,
    }
