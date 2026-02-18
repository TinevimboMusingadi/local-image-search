#!/usr/bin/env python3
"""Launcher for the FastAPI backend. Used by PyInstaller bundle and Electron."""

from __future__ import annotations

import argparse
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Image Search API")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=args.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
