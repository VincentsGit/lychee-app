#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${ROOT_DIR}/backend/instance/app.db"
UPLOADS_DIR="${ROOT_DIR}/backend/uploads"
TMP_UPLOADS_DIR="${ROOT_DIR}/backend/tmp-uploads"

usage() {
  echo "Usage: $0 USER_ID [--yes]" >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

USER_ID="$1"
CONFIRM="${2:-}"

if [[ ! "${USER_ID}" =~ ^[0-9]+$ ]]; then
  echo "USER_ID must be a number." >&2
  exit 1
fi

if [[ "${CONFIRM}" != "" && "${CONFIRM}" != "--yes" ]]; then
  usage
  exit 1
fi

if [[ ! -f "${DB_PATH}" ]]; then
  echo "Database not found: ${DB_PATH}" >&2
  exit 1
fi

read -r USERNAME AVATAR_URL < <(
  sqlite3 "${DB_PATH}" \
    "SELECT username, COALESCE(avatar_url, '') FROM users WHERE id = ${USER_ID};" |
    awk -F'|' '{print $1, $2}'
)

if [[ -z "${USERNAME:-}" ]]; then
  echo "No user found with id ${USER_ID}." >&2
  exit 1
fi

if [[ "${USERNAME}" == "runitrench" ]]; then
  echo "Refusing to delete owner account: runitrench." >&2
  exit 1
fi

echo "User to delete: ${USER_ID} (${USERNAME})"
COMMENTS_COUNT="$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM comments WHERE user_id = ${USER_ID};")"
COOKIES_COUNT="$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM cookies WHERE user_id = ${USER_ID};")"
echo "Comments to delete: ${COMMENTS_COUNT}"
echo "Sessions to delete: ${COOKIES_COUNT}"

if [[ "${CONFIRM}" != "--yes" ]]; then
  read -r -p "Type DELETE to continue: " ANSWER
  if [[ "${ANSWER}" != "DELETE" ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

BACKUP_PATH="${DB_PATH}.backup-before-delete-user-${USER_ID}-$(date +%Y%m%d-%H%M%S)"
cp "${DB_PATH}" "${BACKUP_PATH}"

sqlite3 "${DB_PATH}" <<SQL
BEGIN;
DELETE FROM comments WHERE user_id = ${USER_ID};
DELETE FROM cookies WHERE user_id = ${USER_ID};
DELETE FROM users WHERE id = ${USER_ID};
COMMIT;
SQL

delete_avatar() {
  local avatar_url="$1"
  local filename=""
  local path=""

  case "${avatar_url}" in
    /uploads/*)
      filename="$(basename "${avatar_url}")"
      path="${UPLOADS_DIR}/${filename}"
      ;;
    /tmp-uploads/*)
      filename="$(basename "${avatar_url}")"
      path="${TMP_UPLOADS_DIR}/${filename}"
      ;;
    *)
      return 0
      ;;
  esac

  if [[ -n "${filename}" && -f "${path}" ]]; then
    rm -- "${path}"
    echo "Deleted avatar: ${path}"
  fi
}

delete_avatar "${AVATAR_URL}"

echo "Deleted user ${USER_ID} (${USERNAME})."
echo "Backup created: ${BACKUP_PATH}"
