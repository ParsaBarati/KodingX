#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"

NON_INTERACTIVE=0
COPY_CONFIG=0
CONFIG_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --non-interactive)
      NON_INTERACTIVE=1
      shift
      ;;
    --copy-config)
      COPY_CONFIG=1
      shift
      ;;
    --config)
      CONFIG_PATH="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

cd "$REPO_ROOT"

node lexbot/src/index.js init

if [[ -n "$CONFIG_PATH" ]]; then
  if [[ ! -f "$CONFIG_PATH" ]]; then
    echo "Config file not found: $CONFIG_PATH"
    exit 1
  fi
  cp "$CONFIG_PATH" ".kodingx/lexbot/config.json"
fi

if [[ "$NON_INTERACTIVE" -eq 1 || "$COPY_CONFIG" -eq 1 ]]; then
  if [[ ! -f ".kodingx/lexbot/config.json" ]]; then
    cp "lexbot/config.example.json" ".kodingx/lexbot/config.json"
  fi
fi

if [[ -f ".kodingx/lexbot/config.json" ]]; then
  node lexbot/scripts/validate_config.js ".kodingx/lexbot/config.json" || true
fi

echo ""
echo "Lexbot initialized."
if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
  echo "Non-interactive mode: default config copied to .kodingx/lexbot/config.json"
fi

echo "Next steps:"
echo "1) Edit .kodingx/lexbot/config.json"
echo "   - telegram.token"
echo "   - telegram.adminChatIds"
echo "   - selector.apiKey (optional)"
echo "2) Run: node lexbot/src/index.js"
echo "3) For PM2: pm2 start lexbot/ecosystem.config.cjs"
