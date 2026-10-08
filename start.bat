@echo off
setlocal enabledelayedexpansion
title Periodic - Timetable Generator
cd /d "%~dp0"

echo ============================================
echo   Periodic - Timetable Generator launcher
echo ============================================
echo.

REM --- Check for Python ---
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python was not found on your PATH.
    echo Please install Python 3.9 or newer from https://www.python.org/downloads/
    echo IMPORTANT: check "Add Python to PATH" during installation, then re-run this file.
    echo.
    pause
    exit /b 1
)

REM --- Check for Node.js / npm ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on your PATH.
    echo Please install the LTS version from https://nodejs.org/ then re-run this file.
    echo.
    pause
    exit /b 1
)

REM --- Backend: create venv and install dependencies on first run only ---
if not exist "backend\venv\Scripts\activate.bat" (
    echo [Setup] First run detected - creating a Python virtual environment for the backend...
    python -m venv backend\venv
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment. Is Python installed correctly?
        pause
        exit /b 1
    )
    echo [Setup] Installing backend dependencies ^(Flask^)...
    call backend\venv\Scripts\activate.bat
    pip install --upgrade pip >nul
    pip install -r backend\requirements.txt
    call backend\venv\Scripts\deactivate.bat
) else (
    echo [OK] Backend virtual environment already set up.
)

REM --- Frontend: npm install on first run only ---
if not exist "frontend\node_modules" (
    echo [Setup] First run detected - installing frontend dependencies ^(npm install^)...
    echo         This can take a minute or two.
    pushd frontend
    call npm install
    popd
) else (
    echo [OK] Frontend dependencies already installed.
)

echo.
echo [Start] Launching the backend on http://127.0.0.1:5000 ...
start "Periodic - Backend (Python)" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python app.py"

echo [Start] Launching the frontend on http://localhost:5173 ...
start "Periodic - Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Waiting for both servers to finish starting...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo ============================================
echo Periodic is now running in two separate windows:
echo   1) Backend  (Python / Flask)  - http://127.0.0.1:5000
echo   2) Frontend (Vite dev server) - http://localhost:5173
echo.
echo Your browser should have opened automatically. If not,
echo go to http://localhost:5173 manually.
echo.
echo To stop the app, close those two windows.
echo This window is safe to close.
echo ============================================
pause
