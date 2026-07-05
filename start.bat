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

if exist "%CARD_DIR%\node_modules" goto card_run
echo [Tao Card] Cai dat lan dau (tao-card), doi mot chut...
pushd "%CARD_DIR%"
call npm install
popd

:card_run
echo [Tao Card] Khoi dong server :5174 (cua so thu nho)...
start "Card 5174 - de yen" /MIN /D "%CARD_DIR%" cmd /k npm run dev
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
