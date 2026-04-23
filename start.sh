#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  __  __ _           _ ____        _          "
echo " |  \/  (_)_ __   __| |  _ \ _   _| |___  ___ "
echo " | |\/| | | '_ \ / _\` | |_) | | | | / __|/ _ \\"
echo " | |  | | | | | | (_| |  __/| |_| | \__ \  __/"
echo " |_|  |_|_|_| |_|\__,_|_|    \__,_|_|___/\___|"
echo -e "${NC}"
echo -e "${GREEN}Mental Wellness Companion — Setup & Start${NC}"
echo "--------------------------------------------"

# ── Step 1: .env ──────────────────────────────────────────
if [ ! -f backend/.env ]; then
  echo -e "${YELLOW}⚠  backend/.env not found. Creating from template...${NC}"
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}   → Please edit backend/.env and add your API keys, then re-run this script.${NC}"
  exit 1
fi

# ── Step 2: Python deps ───────────────────────────────────
echo -e "\n${CYAN}[1/4] Installing Python dependencies...${NC}"
cd backend
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
cd ..

# ── Step 3: Node deps ─────────────────────────────────────
echo -e "\n${CYAN}[2/4] Installing Node dependencies...${NC}"
cd frontend
npm install --silent
cd ..

# ── Step 4: MongoDB check ─────────────────────────────────
echo -e "\n${CYAN}[3/4] Checking MongoDB...${NC}"
if command -v mongod &>/dev/null; then
  if ! pgrep -x mongod &>/dev/null; then
    echo "  Starting local MongoDB..."
    mkdir -p /tmp/mindpulse-mongo
    mongod --dbpath /tmp/mindpulse-mongo --fork --logpath /tmp/mindpulse-mongo/mongo.log
  else
    echo "  MongoDB already running ✅"
  fi
else
  echo -e "  ${YELLOW}MongoDB not found locally. Make sure it's running (or use Docker).${NC}"
fi

# ── Step 5: Start servers ─────────────────────────────────
echo -e "\n${CYAN}[4/4] Starting servers...${NC}"
echo -e "  Backend  → ${GREEN}http://localhost:8000${NC}"
echo -e "  Frontend → ${GREEN}http://localhost:5173${NC}"
echo -e "  API docs → ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers.${NC}"
echo ""

# Run both in background, kill both on exit
trap 'kill $(jobs -p) 2>/dev/null; echo ""; echo "Servers stopped."; exit 0' INT TERM

# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

wait $BACKEND_PID $FRONTEND_PID
