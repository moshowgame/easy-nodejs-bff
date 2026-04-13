@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     easy-nodejs-bff Local Development Environment    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo This script will start:
echo   1. Mock API Server (port 3100) - Simulates UK/CN/IN APIs
echo   2. BFF Service (port 3000) - Your BFF application
echo.
echo Press any key to continue...
pause >nul

echo.
echo [1/2] Starting Mock API Server...
start "Mock-API" cmd /k "node mock-api/server.js"

echo Waiting for Mock API to initialize...
timeout /t 3 >nul

echo [2/2] Starting BFF Service...
start "BFF-Service" cmd /k "npm run dev"

timeout /t 3 >nul

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║              Services Started!                       ║
echo ╠══════════════════════════════════════════════════════╣
echo ║                                                      ║
echo ║  Mock API:     http://localhost:3100                  ║
echo ║    - UK Top5:   http://localhost:3100/uk/top5         ║
echo ║    - CN Top5:   http://localhost:3100/cn/top5         ║
echo ║    - IN Top5:   http://localhost:3100/in/top5         ║
echo ║                                                      ║
echo ║  BFF Service:  http://localhost:3000                  ║
echo ║    - Health:    http://localhost:3000/health          ║
echo ║    - GlobalTop5:http://localhost:3000/api/global-top5║
echo ║    - CrossList: http://localhost:3000/api/...         ║
echo ║    - Metrics:   http://localhost:3000/metrics         ║
echo ║                                                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Test commands:
echo   curl http://localhost:3000/api/global-top5
echo   curl "http://localhost:3000/api/cross-region-list?page=1&pageSize=5"
echo.
echo See QUICKSTART.md for more details!
echo.
