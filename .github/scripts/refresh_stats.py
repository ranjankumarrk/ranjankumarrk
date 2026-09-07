#!/usr/bin/env python3
"""Bump the daily cache-bust date on profile README card URLs."""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path


def bump_readme(readme_path: Path) -> bool:
    today = date.today().isoformat()
    text = readme_path.read_text(encoding="utf-8")
    updated = re.sub(r"(\?|&)v=\d{4}-\d{2}-\d{2}", rf"\g<1>v={today}", text)
    if updated == text:
        return False
    readme_path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: refresh_stats.py README.md", file=sys.stderr)
        return 2
    readme = Path(sys.argv[1])
    if bump_readme(readme):
        print(f"updated cache-bust date in {readme} to {date.today().isoformat()}")
    else:
        print(f"cache-bust date in {readme} already current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
