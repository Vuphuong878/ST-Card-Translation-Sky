@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
echo ==========================================================
echo    SILLYTAVERN MULTI TOOLS  -  Launcher
echo ==========================================================
echo.

REM -- Card-creator tool (vendored subfolder .\tao-card) -----------------------
set "CARD_DIR=%~dp0tao-card"
if exist "%CARD_DIR%\package.json" (
  echo [Tao Card] Khoi dong server tren http://localhost:5174 (cua so thu nho).
  REM /MIN: server chay thu nho o taskbar cho do roi. No la SERVER cua tab "Tao Card"
  REM       (khong phai bao loi) - can chay de tab Tao Card hien noi dung. Dung dong no.
  start "Card server :5174 (de yen)" /MIN /D "%CARD_DIR%" cmd /k "if not exist node_modules (echo Cai dat lan dau... & npm install) & npm run dev"
) else (
  echo [Tao Card] Khong thay .\tao-card  --  chi chay tool Dich.
)
echo.

REM -- Hub / tool Dich (thu muc nay) - tu mo trinh duyet o http://localhost:5173
if not exist "node_modules" (
  echo [Hub] Cai dat dependencies lan dau...
  call npm install
)
echo [Hub] Khoi dong tren http://localhost:5173 ...
echo.
call npm run dev

echo.
echo (Da dung.) Nhan phim bat ky de dong.
pause >nul
endlocal
