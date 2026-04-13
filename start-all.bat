@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   easy-nodejs-bff Complete Development Environment    ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo This script will start:
echo   1. Mock API Server (port 3100) - Simulates UK/CN/IN APIs
echo   2. BFF Service (port 3000) - Your BFF application
echo   3. Dashboard UI will be available at http://localhost:3000/dashboard
echo.
echo Press any key to continue...
pause >nul

echo.
echo [1/3] Starting Mock API Server...
start "Mock-API" cmd /k "node mock-api/server.js"

echo Waiting for Mock API to initialize...
timeout /t 3 >nul

echo [2/3] Starting BFF Service...
start "BFF-Service" cmd /k "npm run dev"

timeout /t 4 >nul

echo [3/3] Opening Dashboard in browser...
start http://localhost:3000/dashboard

timeout /t 1 >nul

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║              ✅ All Services Started!                 ║
echo ╠══════════════════════════════════════════════════════╣
echo ║                                                      ║
echo ║  📊 Dashboard:  http://localhost:3000/dashboard       ║
echo ║     - Real-time metrics visualization                ║
echo ║     - Charts and graphs                              ║
echo ║     - Auto-refresh (5s/10s/30s)                      ║
echo ║                                                      ║
echo ║  🔌 Mock API:   http://localhost:3100                  ║
echo ║     - UK Top5:   http://localhost:3100/uk/top5         ║
echo ║     - CN Top5:   http://localhost:3100/cn/top5         ║
echo ║     - IN Top5:   http://localhost:3100/in/top5         ║
echo ║                                                      ║
echo ║  ⚡ BFF APIs:                                         ║
echo ║     - Health:    http://localhost:3000/health          ║
echo ║     - GlobalTop5:http://localhost:3000/api/global-top5║
echo ║     - CrossList: http://localhost:3000/api/...         ║
echo ║     - Metrics:   http://localhost:3000/metrics         ║
echo ║                                                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo 💡 Tips:
echo    • Call the BFF APIs a few times to generate metric data
echo    • Then refresh the dashboard to see the charts populate
echo    • Use the "Auto Refresh" button for real-time updates
echo.
