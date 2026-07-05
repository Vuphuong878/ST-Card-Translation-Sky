@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
echo ==========================================================
echo    SKY CARD STUDIO  -  Launcher (Dich + Tao Card)
echo ==========================================================
echo.

REM -- Card-creator tool (sibling folder ..\tao-card) --------------------------
set "CARD_DIR=%~dp0..\tao-card"
if exist "%CARD_DIR%\package.json" (
  echo [Tao Card] Tim thay tool tao card: %CARD_DIR%
  echo [Tao Card] Mo cua so rieng, chay tren http://localhost:5174 ...
  start "Tao Card (5174)" /D "%CARD_DIR%" cmd /k "if not exist node_modules (echo Cai dat lan dau... & npm install) & npm run dev"
) else (
  echo [Tao Card] KHONG tim thay ..\tao-card  --  chi chay tool Dich.
  echo            De co tab "Tao Card", mo CMD tai thu muc cha roi chay:
  echo              git clone https://github.com/ceh51453-alt/tao-card
  echo            ^(clone canh ben thu muc nay, dat ten "tao-card"^).
)
echo.

REM -- Translate hub (this folder) - mo trinh duyet tai http://localhost:5173 --
if not exist "node_modules" (
  echo [Hub] Cai dat dependencies lan dau...
  call npm install
)
echo [Hub] Khoi dong Hub tren http://localhost:5173 ...
echo.
call npm run dev

echo.
echo (Hub da dung.) Nhan phim bat ky de dong.
pause >nul
endlocal
