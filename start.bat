@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo    SILLYTAVERN MULTI TOOLS  -  Launcher
echo ==========================================================
echo.

REM -- Card-creator tool (vendored subfolder .\tao-card) --
set "CARD_DIR=%~dp0tao-card"
if not exist "%CARD_DIR%\package.json" goto no_card
echo [Tao Card] Khoi dong server :5174 (cua so thu nho)...
start "Card server 5174 - de yen" /MIN /D "%CARD_DIR%" cmd /k "if not exist node_modules npm install & npm run dev"
goto hub

:no_card
echo [Tao Card] Khong thay .\tao-card -- chi chay tool Dich.

:hub
echo.
if not exist "node_modules" echo [Hub] Cai dat lan dau, doi mot chut...
if not exist "node_modules" call npm install
echo [Hub] Khoi dong tren http://localhost:5173 ...
echo.
call npm run dev

echo.
echo (Da dung.) Nhan phim bat ky de dong.
pause >nul
