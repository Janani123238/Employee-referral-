#!/usr/bin/env bash
# Copies the frontend into backend/static so FastAPI can serve it as one
# deployable service. Run this any time you edit frontend/index.html.
set -e
cp frontend/index.html backend/static/index.html
echo "Synced frontend/index.html -> backend/static/index.html"
