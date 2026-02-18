#!/usr/bin/env python3
"""Build the Python backend executable using PyInstaller."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    spec_path = Path(__file__).parent / "pyinstaller.spec"
    if not spec_path.exists():
        print(f"Spec file not found: {spec_path}")
        return 1

    result = subprocess.run(
        [sys.executable, "-m", "PyInstaller", "--noconfirm", str(spec_path)],
        cwd=Path(__file__).parent,
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
