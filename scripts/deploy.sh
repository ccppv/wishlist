#!/bin/bash
# Deploy Wishlist to production
# Usage: DEPLOY_HOST=89.104.94.205 DEPLOY_USER=root ./scripts/deploy.sh [--backend|--frontend|--all]
#   --backend   только backend
#   --frontend  только frontend
#   --all       всё (по умолчанию)
# Optional: DEPLOY_PASS=xxx for sshpass

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="all"
case "${1:-}" in
  --backend)  MODE="backend" ;;
  --frontend) MODE="frontend" ;;
  --all|"")   MODE="all" ;;
  *) echo "Usage: $0 [--backend|--frontend|--all]"; exit 1 ;;
esac

HOST="${DEPLOY_HOST:-89.104.94.205}"
USER="${DEPLOY_USER:-root}"
PATH_ON_SERVER="${DEPLOY_PATH:-/opt/wishlist}"
SSH_OPTS="-o StrictHostKeyChecking=no"

ssh_cmd() {
  if [ -n "${DEPLOY_PASS}" ]; then
    sshpass -p "$DEPLOY_PASS" ssh $SSH_OPTS "$USER@$HOST" "$@"
  else
    ssh $SSH_OPTS "$USER@$HOST" "$@"
  fi
}

RSYNC_SSH() {
  [ -n "${DEPLOY_PASS}" ] && echo "sshpass -p $DEPLOY_PASS ssh $SSH_OPTS" || echo "ssh $SSH_OPTS"
}

echo "Deploy mode: $MODE"
echo "Syncing files to $USER@$HOST:$PATH_ON_SERVER/"

EXCLUDES="--exclude=node_modules --exclude=.next --exclude=__pycache__ --exclude=.git --exclude='*.pyc' --exclude=.env --exclude='._*'"
RSH="$(RSYNC_SSH)"

if [ "$MODE" = "backend" ] || [ "$MODE" = "all" ]; then
  rsync -avz -e "$RSH" $EXCLUDES backend/ "$USER@$HOST:$PATH_ON_SERVER/backend/"
fi
if [ "$MODE" = "frontend" ] || [ "$MODE" = "all" ]; then
  rsync -avz -e "$RSH" --exclude=node_modules --exclude=.next --exclude='._*' frontend/ "$USER@$HOST:$PATH_ON_SERVER/frontend/"
fi
if [ "$MODE" = "all" ]; then
  rsync -avz -e "$RSH" --exclude='._*' nginx/ "$USER@$HOST:$PATH_ON_SERVER/nginx/"
  if [ -n "${DEPLOY_PASS}" ]; then
    sshpass -p "$DEPLOY_PASS" scp $SSH_OPTS docker-compose.prod.yml "$USER@$HOST:$PATH_ON_SERVER/"
  else
    scp $SSH_OPTS docker-compose.prod.yml "$USER@$HOST:$PATH_ON_SERVER/"
  fi
fi

echo "Cleaning macOS metadata..."
ssh_cmd "find $PATH_ON_SERVER -name '._*' -delete 2>/dev/null || true"

if [ "$MODE" = "backend" ] || [ "$MODE" = "all" ]; then
  echo "Building backend..."
  ssh_cmd "cd $PATH_ON_SERVER && docker compose -f docker-compose.prod.yml build --no-cache backend"
  echo "Restarting backend..."
  ssh_cmd "cd $PATH_ON_SERVER && docker compose -f docker-compose.prod.yml up -d backend && docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head"
fi

if [ "$MODE" = "frontend" ] || [ "$MODE" = "all" ]; then
  echo "Building frontend..."
  ssh_cmd "cd $PATH_ON_SERVER && docker compose -f docker-compose.prod.yml build --no-cache frontend"
  echo "Restarting frontend..."
  ssh_cmd "cd $PATH_ON_SERVER && docker compose -f docker-compose.prod.yml up -d frontend"
fi

echo "Deploy done."
