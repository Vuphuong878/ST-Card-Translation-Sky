@echo off
cd /d "%~dp0"
echo =======================================
echo   Starting Application...
echo =======================================
echo.
call npm run dev
pause
