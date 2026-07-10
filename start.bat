@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo    SILLYTAVERN MULTI TOOLS  -  Launcher
echo ==========================================================
echo.

REM -- Don port 5173-5178 truoc khi chay --
REM 5 tool con chay bang `cmd /k` trong cua so rieng nen dong cua so launcher KHONG giet
REM chung. Lan chay sau vite bao "Port 5173 is already in use" va chet han (strictPort).
REM Script chi giet tien trinh node dang giu dung 6 port nay; gap tien trinh khac thi dung lai.
echo [Launcher] Don port 5173-5178...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\free-ports.ps1" 5173 5174 5175 5176 5177 5178
if errorlevel 1 (
    echo.
    echo [Launcher] Khong giai phong duoc port. Xem thong bao ben tren roi chay lai.
    pause >nul
    exit /b 1
)
echo.

REM -- Launch each vendored sub-tool in its own minimized window --
call :launch_tool "tao-card"    "Tao Card 5174"
call :launch_tool "preset-tool" "Tao Preset 5175"
call :launch_tool "mod-card"    "Mod Card 5176"
call :launch_tool "crawler"     "Crawler 5177"
call :launch_tool "template-translator" "Translator 5178"

REM -- Hub / tool Dich (this folder) - opens browser at http://localhost:5173 --
echo.
REM LUON dong bo thu vien: sau khi cap nhat (git pull/reset) co the co dependency MOI (vd acorn).
REM Chi cai khi thieu node_modules se gay loi "Failed to resolve import ..." sau update.
echo [Hub] Dong bo thu vien (npm install)...
call npm install --no-audit --no-fund
echo [Hub] Khoi dong tren http://localhost:5173 ...
echo.
call npm run dev

REM -- Hub da dung: dong luon 3 tool con de lan sau khong ket port --
echo.
echo [Launcher] Dong cac tool con...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\free-ports.ps1" 5174 5175 5176 5177 5178

echo.
echo (Da dung.) Nhan phim bat ky de dong.
pause >nul
goto :eof

REM ── Subroutine: launch_tool  %1=folder  %2=window-title ──
:launch_tool
set "TOOL_DIR=%~dp0%~1"
if not exist "%TOOL_DIR%\package.json" goto :eof
REM Dong bo thu vien tool con moi lan chay (bat dependency moi sau update) roi moi chay dev.
echo [%~2] Dong bo thu vien + khoi dong (cua so thu nho)...
start "%~2 - de yen" /MIN /D "%TOOL_DIR%" cmd /k npm install --no-audit --no-fund ^&^& npm run dev
goto :eof
