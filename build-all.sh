#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building ideas dashboard (React)..."
cd "$ROOT/dashboard" && npm install && npm run build

echo "==> Restarting PM2..."
cd "$ROOT"
if pm2 list | grep -q 'online'; then
  pm2 restart pm2.config.js
else
  pm2 start pm2.config.js
fi

echo ""
echo "Done."
echo "  Ideas:  http://localhost:4001"
echo "  Home:   http://localhost:4000"
