#!/usr/bin/env bash
# Скрипт запуска MCP-сервера @theyahia/aprovodka для 1С
# Конфигурация: Комплексная автоматизация 2.5 с расширениями
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Загрузка .env
set -a
source .env 2>/dev/null || true
set +a

# Параметры 1С (из .env)
: "${ONEC_BASE_URL:?ONEC_BASE_URL не задан в .env}"
: "${ONEC_LOGIN:?ONEC_LOGIN не задан в .env}"
: "${ONEC_PASSWORD:?ONEC_PASSWORD не задан в .env}"

# Порт MCP HTTP-сервера
: "${MCP_PORT:=3000}"

# Write-safety: off (запись разрешена), preview (dry-run), approval (с подтверждением)
: "${ONEC_WRITE_MODE:=preview}"

APROVODKA_BIN="${SCRIPT_DIR}/node_modules/.bin/aprovodka"

if [ ! -x "${APROVODKA_BIN}" ]; then
  echo "Ошибка: ${APROVODKA_BIN} не найден. Выполните: pnpm install" >&2
  exit 1
fi

echo "🚀 Запуск MCP-сервера aprovodka на порту ${MCP_PORT}"
echo "   1С: ${ONEC_BASE_URL}"
echo "   Пользователь: ${ONEC_LOGIN}"
echo "   Write mode: ${ONEC_WRITE_MODE}"
echo ""

exec env \
  HTTP_PORT="${MCP_PORT}" \
  ONEC_BASE_URL="${ONEC_BASE_URL}" \
  ONEC_LOGIN="${ONEC_LOGIN}" \
  ONEC_PASSWORD="${ONEC_PASSWORD}" \
  ONEC_WRITE_MODE="${ONEC_WRITE_MODE}" \
  "${APROVODKA_BIN}" --http
