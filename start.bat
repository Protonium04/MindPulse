@echo off
echo.
echo   MindPulse - Mental Wellness Companion
echo   ======================================
echo.

REM Check .env
if not exist backend\.env (
    echo [!] backend\.env not found. Creating from template...
    copy backend\.env.example backend\.env
    echo [!] Please edit backend\.env and add your API keys, then re-run this script.
    pause
    exit /b 1
)

echo [1/3] Installing Python dependencies...
cd backend
python -m venv .venv 2>nul
call .venv\Scripts\activate.bat
pip install -q --upgrade pip
pip install -q -r requirements.txt
cd ..

echo.
echo [2/3] Installing Node dependencies...
cd frontend
npm install --silent
cd ..

echo.
echo [3/3] Starting servers...
echo   Backend  ^> http://localhost:8000
echo   Frontend ^> http://localhost:5173
echo   API docs ^> http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop.
echo.

REM Start backend in new window
start "MindPulse Backend" cmd /k "cd backend && .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a moment then start frontend
timeout /t 3 /nobreak >nul
start "MindPulse Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers starting in separate windows.
pause
