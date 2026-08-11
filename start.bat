@echo off
echo ======================================================
echo ⚡ Starting SkyExchange Real-Time Engine (Auto-Clearing Port 3000)...
echo ======================================================
cd /d "%~dp0"
node server.js
pause
