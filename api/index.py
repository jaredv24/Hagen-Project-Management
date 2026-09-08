import os
import sys

# Vercel's Python runtime doesn't put this file's own directory on
# sys.path the way a local `uvicorn app.main:app` run from api/ does, so the
# sibling `app` package can't be found without this.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app  # noqa: E402,F401  (Vercel's Python runtime looks for `app`)
