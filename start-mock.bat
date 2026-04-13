@echo off
echo ============================================
echo   Starting Mock API Server (UK/CN/IN)
echo ============================================
echo.
echo Mock API will run on: http://localhost:3100
echo BFF Service should run on: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node mock-api/server.js

pause
