#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${ROOT_DIR}/backend/instance/app.db"

if [[ ! -f "${DB_PATH}" ]]; then
  echo "Database not found: ${DB_PATH}" >&2
  exit 1
fi

sqlite3 -header -column "${DB_PATH}" \
  "SELECT id, username, display_name, created_at FROM users ORDER BY id;"
