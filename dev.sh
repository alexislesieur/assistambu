#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "Arrêt des services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

mkdir -p "$ROOT/.logs"

# Docker (MySQL)
echo "▶ Docker (MySQL)..."
docker compose -f "$ROOT/docker-compose.yml" up -d

# API Laravel — port 8000
echo "▶ API         → http://localhost:8000"
cd "$ROOT/Api"
php artisan serve --port=8000 > "$ROOT/.logs/api.log" 2>&1 &
PIDS+=($!)

# Auth — port 3001
echo "▶ Auth        → http://localhost:3001"
cd "$ROOT/Auth"
npm run dev -- -p 3001 > "$ROOT/.logs/auth.log" 2>&1 &
PIDS+=($!)

# App — port 3000
echo "▶ App         → http://localhost:3000"
cd "$ROOT/App"
npm run dev -- -p 3000 > "$ROOT/.logs/app.log" 2>&1 &
PIDS+=($!)

echo ""
echo "Tous les services démarrés. Ctrl+C pour tout arrêter."
echo "Logs : .logs/{api,auth,app}.log"
echo ""
echo "  API    http://localhost:8000"
echo "  Auth   http://localhost:3001"
echo "  App    http://localhost:3000"

wait
