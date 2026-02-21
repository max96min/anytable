#!/bin/bash
set -e

# =============================================================================
# AnyTable Deployment Script for Mac Mini (192.168.0.238)
#
# Usage:
#   1. SSH into the Mac Mini: ssh hongjong@192.168.0.238
#   2. Clone the repo:        git clone https://github.com/max96min/anytable.git
#   3. Run this script:       cd anytable && bash scripts/deploy.sh
#
# Prerequisites:
#   - Node.js >= 18 (brew install node)
#   - PostgreSQL running on localhost:5432
#   - Database "anytable" already created
# =============================================================================

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$APP_DIR/.env"
SERVER_ENV_FILE="$APP_DIR/server/.env"
PROD_TEMPLATE="$APP_DIR/.env.production"

echo "============================================"
echo "  AnyTable Production Deployment"
echo "============================================"
echo ""
echo "App directory: $APP_DIR"
cd "$APP_DIR"

# ---- Step 1: Check prerequisites ----
echo ""
echo "[1/7] Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Install with: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "  Node.js: $NODE_VERSION"

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm is not found."
  exit 1
fi
echo "  npm: $(npm -v)"

# ---- Step 2: Setup environment variables ----
echo ""
echo "[2/7] Setting up environment variables..."

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$PROD_TEMPLATE" ]; then
    cp "$PROD_TEMPLATE" "$ENV_FILE"
    echo "  Created .env from .env.production template"
    echo "  *** IMPORTANT: Edit .env and replace CHANGE_ME values with real secrets! ***"
    echo "  Run: nano $ENV_FILE"
    echo ""
    read -p "  Press Enter after editing .env (or Ctrl+C to abort)..."
  else
    echo "ERROR: No .env or .env.production found. Create .env manually."
    exit 1
  fi
else
  echo "  .env already exists, skipping."
fi

# Copy .env to server/ directory (Prisma needs it there)
cp "$ENV_FILE" "$SERVER_ENV_FILE"
echo "  Synced .env -> server/.env"

# ---- Step 3: Install dependencies ----
echo ""
echo "[3/7] Installing dependencies..."
npm install

# ---- Step 4: Build all packages ----
echo ""
echo "[4/7] Building (shared -> server -> client)..."
npm run build

# ---- Step 5: Database migration ----
echo ""
echo "[5/7] Running database migrations..."
npm run db:migrate

# ---- Step 6: Seed database ----
echo ""
echo "[6/7] Seeding database..."
npm run db:seed || echo "  Seed may have already been applied (non-fatal)."

# ---- Step 7: Start with pm2 ----
echo ""
echo "[7/7] Starting server with pm2..."

if ! command -v pm2 &>/dev/null; then
  echo "  Installing pm2 globally..."
  npm install -g pm2
fi

# Stop existing instance if running
pm2 delete anytable 2>/dev/null || true

# Start using ecosystem config
if [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
  pm2 start "$APP_DIR/ecosystem.config.cjs"
else
  cd "$APP_DIR/server"
  pm2 start dist/index.js --name anytable
  cd "$APP_DIR"
fi

pm2 save

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "  App:    http://192.168.0.238:3001"
echo "  Admin:  http://192.168.0.238:3001/admin/login"
echo "  System: http://192.168.0.238:3001/system/login"
echo "  Health: http://192.168.0.238:3001/health"
echo ""
echo "  pm2 commands:"
echo "    pm2 status          — check process status"
echo "    pm2 logs anytable   — view logs"
echo "    pm2 restart anytable — restart server"
echo ""
echo "  To auto-start on reboot, run:"
echo "    pm2 startup"
echo "    pm2 save"
echo ""
