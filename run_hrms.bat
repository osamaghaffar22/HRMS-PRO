@echo off
title HRMS Pro - Enterprise Launcher
color 0B
cls

echo =======================================================================
echo          HRMS PRO - ENTERPRISE SYSTEMS LAUNCHER
echo =======================================================================
echo.
echo  This script will start the complete HRMS suite:
echo   1. Python FastAPI Backend (Port 8000)
echo   2. Next.js Production Frontend (Port 3000)
echo.
echo  Access link for other PCs in your office network:
echo  http://[SERVER-IP-ADDRESS]:3000
echo  =======================================================================
echo.

:: Step 1: Start Backend Server
echo [1/2] Preparing Python Backend...
set PY_CMD=python
if exist "backend\venv\Scripts\activate.bat" (
    echo Found virtual environment: venv
    set ACTIVATE_ENV="backend\venv\Scripts\activate.bat"
) else if exist "backend\.venv\Scripts\activate.bat" (
    echo Found virtual environment: .venv
    set ACTIVATE_ENV="backend\.venv\Scripts\activate.bat"
) else (
    echo Virtual environment not found. Using system Python interpreter.
    set ACTIVATE_ENV=
)

echo Starting Backend Server in a new window...
if not "%ACTIVATE_ENV%"=="" (
    start "HRMS Backend" cmd /k "call %ACTIVATE_ENV% && cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    start "HRMS Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)
echo [SUCCESS] Backend startup command sent.
echo.

:: Step 2: Start Frontend Server
echo [2/2] Starting Next.js Frontend... (Live Reload Mode)...

echo Starting Frontend Server in a new window...
start "HRMS Frontend" cmd /k "cd frontend && npm run dev -- -H 0.0.0.0 -p 3000"
echo [SUCCESS] Frontend startup command sent.
echo.

echo =======================================================================
echo          HRMS PRO RUNNING SUCCESSFULLY!
echo =======================================================================
echo.
echo  * Backend is running on port 8000 (0.0.0.0:8000)
echo  * Frontend is running on port 3000 (0.0.0.0:3000)
echo.
echo  To find your server's IP address, open another CMD and run: ipconfig
echo  Provide that IP address to other office PCs to access the system.
echo.
echo  Keep this window open to monitor launch state or press any key to close.
pause
