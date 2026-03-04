#!/usr/bin/env bash
set -euo pipefail

# Disable pipefail for health-check functions (docker compose logs + grep -q
# triggers SIGPIPE which is harmless but causes pipefail to error).
_check_log() {
  set +o pipefail
  docker compose logs --no-log-prefix "$1" 2>/dev/null | grep -q "$2"
  local rc=$?
  set -o pipefail
  return $rc
}

# ─────────────────────────────────────────────────────────────
# start.sh — Build and start the full WrenAI stack
#
# Usage:
#   ./start.sh              # Build all images + start services
#   ./start.sh --no-build   # Start services without rebuilding
#   ./start.sh --build-only # Build images only, don't start
#   ./start.sh --restart    # Restart all services (no rebuild)
# ─────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$ROOT_DIR/docker"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# Parse flags
DO_BUILD=true
DO_START=true

for arg in "$@"; do
  case "$arg" in
    --no-build)   DO_BUILD=false ;;
    --build-only) DO_START=false ;;
    --restart)    DO_BUILD=false ;;
    -h|--help)
      echo "Usage: ./start.sh [--no-build | --build-only | --restart | --help]"
      exit 0
      ;;
    *) err "Unknown flag: $arg"; exit 1 ;;
  esac
done

# ── Pre-flight checks ──────────────────────────────────────

check_prereqs() {
  for cmd in docker; do
    if ! command -v "$cmd" &>/dev/null; then
      err "$cmd is not installed"
      exit 1
    fi
  done

  if ! docker compose version &>/dev/null; then
    err "docker compose (v2) is required"
    exit 1
  fi

  if [[ ! -f "$DOCKER_DIR/.env" ]]; then
    err "docker/.env not found. Copy docker/.env.example to docker/.env and configure it."
    exit 1
  fi
}

# ── Build Docker images ────────────────────────────────────

build_images() {
  info "Building Docker images..."
  echo ""

  # 1. Bootstrap (tiny busybox image)
  info "Building wren-bootstrap:local ..."
  docker build -q -t wren-bootstrap:local "$DOCKER_DIR/bootstrap" >/dev/null
  ok "wren-bootstrap:local"

  # 2. Wren Engine (core-legacy)
  if [[ -f "$ROOT_DIR/wren-engine/wren-core-legacy/docker/Dockerfile" ]]; then
    info "Building wren-engine:local ..."
    docker build -q -t wren-engine:local \
      -f "$ROOT_DIR/wren-engine/wren-core-legacy/docker/Dockerfile" \
      "$ROOT_DIR/wren-engine/wren-core-legacy" >/dev/null
    ok "wren-engine:local"
  else
    warn "wren-engine Dockerfile not found — skipping (using existing image)"
  fi

  # 3. Ibis Server
  if [[ -f "$ROOT_DIR/wren-engine/ibis-server/Dockerfile" ]]; then
    info "Building wren-engine-ibis:local ..."
    docker build -q -t wren-engine-ibis:local \
      "$ROOT_DIR/wren-engine/ibis-server" >/dev/null
    ok "wren-engine-ibis:local"
  else
    warn "ibis-server Dockerfile not found — skipping (using existing image)"
  fi

  # 4. AI Service
  info "Building wren-ai-service:local ..."
  docker build -q -t wren-ai-service:local \
    -f "$ROOT_DIR/wren-ai-service/docker/Dockerfile" \
    "$ROOT_DIR/wren-ai-service" >/dev/null
  ok "wren-ai-service:local"

  # 5. Wren UI
  info "Building wren-ui:local ..."
  docker build -q -t wren-ui:local "$ROOT_DIR/wren-ui" >/dev/null
  ok "wren-ui:local"

  echo ""
  ok "All images built successfully"
}

# ── Start services ─────────────────────────────────────────

start_services() {
  info "Starting all services..."
  cd "$DOCKER_DIR"

  if [[ "$1" == "restart" ]]; then
    docker compose down
  fi

  docker compose up -d

  echo ""
  info "Waiting for services to be healthy..."

  # Wait for Qdrant (check container logs for readiness)
  printf "  Qdrant          ... "
  for i in $(seq 1 30); do
    if _check_log qdrant "Qdrant gRPC listening"; then
      echo -e "${GREEN}ready${NC}"
      break
    fi
    if [[ $i -eq 30 ]]; then echo -e "${YELLOW}timeout (may still be starting)${NC}"; fi
    sleep 2
  done

  # Wait for AI service
  printf "  AI Service      ... "
  for i in $(seq 1 60); do
    if curl -sf http://localhost:5555/health &>/dev/null 2>&1; then
      echo -e "${GREEN}ready${NC}"
      break
    fi
    if [[ $i -eq 60 ]]; then echo -e "${YELLOW}timeout (may still be starting)${NC}"; fi
    sleep 2
  done

  # Wait for Wren UI
  printf "  Wren UI         ... "
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000 &>/dev/null 2>&1; then
      echo -e "${GREEN}ready${NC}"
      break
    fi
    if [[ $i -eq 30 ]]; then echo -e "${YELLOW}timeout (may still be starting)${NC}"; fi
    sleep 2
  done

  echo ""
  ok "All services started"
  echo ""
  echo -e "  ${GREEN}Wren UI:${NC}         http://localhost:3000"
  echo -e "  ${GREEN}AI Service:${NC}      http://localhost:5555"
  echo ""
}

# ── Main ───────────────────────────────────────────────────

check_prereqs

if $DO_BUILD; then
  build_images
fi

if $DO_START; then
  RESTART_MODE="up"
  for arg in "$@"; do
    [[ "$arg" == "--restart" ]] && RESTART_MODE="restart"
  done
  start_services "$RESTART_MODE"
fi

if ! $DO_BUILD && ! $DO_START; then
  warn "Nothing to do (both build and start disabled)"
fi
