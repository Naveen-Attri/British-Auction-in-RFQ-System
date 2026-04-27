@echo off
title British Auction RFQ System

echo.
echo  =============================================
echo   British Auction RFQ System - Startup
echo  =============================================
echo.

:: Kill any existing node processes on ports 3000 and 5000
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 " 2^>nul') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do taskkill /F /PID %%a 2>nul
timeout /t 1 /nobreak >nul

:: Start Backend in a new window
echo [2/3] Starting Backend (port 5000)...
start "RFQ Backend - port 5000" cmd /k "cd /d "%~dp0backend" && node node_modules\nodemon\bin\nodemon.js src/server.js"

:: Wait for backend to start
timeout /t 5 /nobreak >nul

:: Start Frontend in a new window
echo [3/3] Starting Frontend (port 3000)...
start "RFQ Frontend - port 3000" cmd /k "cd /d "%~dp0frontend" && node node_modules\vite\bin\vite.js --port 3000"

timeout /t 4 /nobreak >nul

echo.
echo  =============================================
echo   Both servers are starting up!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000
echo   Health:    http://localhost:5000/api/health
echo  =============================================
echo.
echo  If a Windows Firewall dialog appears, click "Allow Access"
echo.

:: Open browser
start http://localhost:3000

pause
