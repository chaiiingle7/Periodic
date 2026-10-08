@echo off
setlocal enabledelayedexpansion
title Periodic - Production Build
cd /d "%~dp0"

echo ============================================
echo   Periodic - Production build launcher
echo ============================================
echo.
echo This builds the frontend once (npm run build) and then serves
echo the built files locally, alongside the backend API.
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python was not found on your PATH. See start.bat for setup help.
    pause
    exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on your PATH. See start.bat for setup help.
    pause
    exit /b 1
)

if not exist "backend\venv\Scripts\activate.bat" (
    echo [Setup] Setting up the backend for the first time...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install --upgrade pip >nul
    pip install -r backend\requirements.txt
    call backend\venv\Scripts\deactivate.bat
)

if not exist "frontend\node_modules" (
    echo [Setup] Installing frontend dependencies for the first time...
    pushd frontend
    call npm install
    popd
)

echo [Build] Building the production frontend bundle...
pushd frontend
call npm run build
popd

echo.
echo [Start] Launching the backend on http://127.0.0.1:5000 ...
start "Periodic - Backend (Python)" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python app.py"

echo [Start] Serving the production build on http://localhost:4173 ...
start "Periodic - Production preview" cmd /k "cd /d "%~dp0frontend" && npm run preview"

timeout /t 6 /nobreak >nul
start "" "http://localhost:4173"

echo.
echo Periodic (production build) is running. Close the two new
echo windows to stop it. This window is safe to close.
pause
