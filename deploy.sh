#!/bin/bash

# ─── Config ───
VPS="serveurweb"
VPS_PATH="/var/www/assist-ambu"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'
BOLD='\033[1m'

ROOT=$(cd "$(dirname "$0")" && pwd)
if [ -f "$ROOT/.deploy.env" ]; then
  source "$ROOT/.deploy.env"
fi

# ─── Fonctions ───
separator() {
  echo -e "${CYAN}──────────────────────────────────────${NC}"
}

set_maintenance() {
  local service=$1
  local state=$2
  local label=$3

  if [ -z "$DEPLOY_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC}  Token absent (.deploy.env) — maintenance $label ignorée"
    return
  fi

  curl -s -X PUT "$DEPLOY_API_URL/admin/services/$service/maintenance" \
    -H "Authorization: Bearer $DEPLOY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"is_maintenance\": $state}" > /dev/null

  if [ "$state" = "true" ]; then
    echo -e "${YELLOW}⚠${NC}  Maintenance activée — $label"
  else
    echo -e "${GREEN}✓${NC}  Maintenance désactivée — $label"
  fi
}

deploy_frontend() {
  local name=$1
  local local_path=$2
  local remote_path=$3
  local original_dir=$(pwd)

  separator
  echo -e "${BOLD}${CYAN}  $name${NC}"
  separator

  cd "$local_path"

  # ── Lire les vars depuis .env.production ──
  local api_url=$(grep NEXT_PUBLIC_API_URL .env.production 2>/dev/null | cut -d= -f2)
  local auth_url=$(grep NEXT_PUBLIC_AUTH_URL .env.production 2>/dev/null | cut -d= -f2)
  local app_url=$(grep NEXT_PUBLIC_APP_URL .env.production 2>/dev/null | cut -d= -f2)
  local admin_url=$(grep NEXT_PUBLIC_ADMIN_URL .env.production 2>/dev/null | cut -d= -f2)

  # ── Build avec les vars de production ──
  echo -e "${YELLOW}→${NC} Build en cours..."
  NEXT_PUBLIC_API_URL="$api_url" \
  NEXT_PUBLIC_AUTH_URL="$auth_url" \
  NEXT_PUBLIC_APP_URL="$app_url" \
  NEXT_PUBLIC_ADMIN_URL="$admin_url" \
  npm run build 2>&1 | tail -1

  if [ ! -d "out" ]; then
    echo -e "${RED}✗ Build échoué${NC}"
    cd "$original_dir"
    return 1
  fi
  echo -e "${GREEN}✓${NC} Build OK"

  # ── Upload ──
  echo -e "${YELLOW}→${NC} Upload vers $remote_path..."
  rsync -avz --delete out/ "$VPS:$remote_path/" --quiet
  echo -e "${GREEN}✓${NC} Upload OK"

  echo -e "${GREEN}✓ $name déployé${NC}"
  echo ""
  cd "$original_dir"
}

deploy_api() {
  separator
  echo -e "${BOLD}${CYAN}  API Laravel${NC}"
  separator

  # ── Tests ──
  echo -e "${YELLOW}→${NC} Tests..."
  cd "$ROOT/Api"
  php artisan test --quiet 2>&1
  TEST_EXIT=$?
  cd "$ROOT"
  if [ $TEST_EXIT -ne 0 ]; then
    echo -e "${RED}✗ Tests échoués — déploiement annulé${NC}"
    return 1
  fi
  echo -e "${GREEN}✓${NC} Tests OK"

  # ── Upload ──
  echo -e "${YELLOW}→${NC} Upload des fichiers..."
  rsync -avz --delete \
    --exclude='.env' \
    --exclude='.env.production' \
    --exclude='vendor/' \
    --exclude='storage/logs/*' \
    --exclude='storage/framework/cache/*' \
    --exclude='storage/framework/sessions/*' \
    --exclude='storage/framework/views/*' \
    --exclude='bootstrap/cache/*' \
    --exclude='node_modules/' \
    Api/ "$VPS:$VPS_PATH/api/" --quiet
  echo -e "${GREEN}✓${NC} Upload OK"

  # ── .env production ──
  if [ -f "Api/.env.production" ]; then
    echo -e "${YELLOW}→${NC} Mise à jour du .env..."
    scp Api/.env.production "$VPS:$VPS_PATH/api/.env"
    echo -e "${GREEN}✓${NC} .env OK"
  else
    echo -e "${RED}✗${NC} Api/.env.production introuvable, .env non mis à jour"
  fi

  # ── Dépendances ──
  echo -e "${YELLOW}→${NC} Installation des dépendances..."
  ssh "$VPS" "cd $VPS_PATH/api && composer install --no-dev --optimize-autoloader --quiet"
  echo -e "${GREEN}✓${NC} Composer OK"

  # ── Migrations & cache ──
  echo -e "${YELLOW}→${NC} Migrations & cache..."
  ssh "$VPS" "cd $VPS_PATH/api && php artisan migrate --force && php artisan config:cache && php artisan route:cache"
  echo -e "${GREEN}✓${NC} Migrations OK"

  # ── Commandes artisan métier ──
  echo -e "${YELLOW}→${NC} Commandes schedulées..."
  ssh "$VPS" "cd $VPS_PATH/api && php artisan interventions:lock && php artisan sac:recalculer-statuts"
  echo -e "${GREEN}✓${NC} Artisan OK"

  # ── Permissions ──
  echo -e "${YELLOW}→${NC} Permissions..."
  ssh "$VPS" "sudo chown -R ubuntu:www-data $VPS_PATH/api/storage $VPS_PATH/api/bootstrap/cache && sudo chmod -R 775 $VPS_PATH/api/storage $VPS_PATH/api/bootstrap/cache"
  echo -e "${GREEN}✓${NC} Permissions OK"

  echo -e "${GREEN}✓ API déployée${NC}"
  echo ""
}

# ─── Menu ───
clear
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                      ║${NC}"
echo -e "${CYAN}║    ${BOLD}AssistAmbu — Déploiement${NC}${CYAN}         ║${NC}"
echo -e "${CYAN}║                                      ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                      ║${NC}"
echo -e "${CYAN}║${NC}  1)  Tout déployer                   ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  2)  API uniquement                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  3)  Auth uniquement                 ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  4)  App uniquement                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  5)  Admin uniquement                ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  0)  Quitter                         ${CYAN}║${NC}"
echo -e "${CYAN}║                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
read -p "  Choix : " choice

echo ""

case $choice in
  1)
    set_maintenance "app" "true" "App"
    set_maintenance "auth" "true" "Auth"
    set_maintenance "admin" "true" "Admin"
    echo ""
    deploy_api
    deploy_frontend "Auth" "$ROOT/Auth" "$VPS_PATH/auth"
    deploy_frontend "App" "$ROOT/App" "$VPS_PATH/app"
    deploy_frontend "Admin" "$ROOT/Admin" "$VPS_PATH/admin"
    echo ""
    set_maintenance "app" "false" "App"
    set_maintenance "auth" "false" "Auth"
    set_maintenance "admin" "false" "Admin"
    separator
    echo -e "${GREEN}${BOLD}  Tout est déployé ✓${NC}"
    separator
    ;;
  2)
    set_maintenance "app" "true" "App"
    set_maintenance "auth" "true" "Auth"
    deploy_api
    set_maintenance "app" "false" "App"
    set_maintenance "auth" "false" "Auth"
    ;;
  3)
    set_maintenance "auth" "true" "Auth"
    deploy_frontend "Auth" "$ROOT/Auth" "$VPS_PATH/auth"
    set_maintenance "auth" "false" "Auth"
    ;;
  4)
    set_maintenance "app" "true" "App"
    deploy_frontend "App" "$ROOT/App" "$VPS_PATH/app"
    set_maintenance "app" "false" "App"
    ;;
  5)
    set_maintenance "admin" "true" "Admin"
    deploy_frontend "Admin" "$ROOT/Admin" "$VPS_PATH/admin"
    set_maintenance "admin" "false" "Admin"
    ;;
  0) echo -e "${CYAN}À bientôt !${NC}" ;;
  *) echo -e "${RED}Choix invalide${NC}" ;;
esac

echo ""
