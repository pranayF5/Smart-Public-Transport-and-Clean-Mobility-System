@echo off
title Smart Public Transport System
echo ========================================================
echo Starting Smart Public Transport and Clean Mobility System
echo ========================================================
echo Starting local server at http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
node server.js
pause
