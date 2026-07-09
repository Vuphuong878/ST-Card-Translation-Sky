@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo    SILLYTAVERN MULTI TOOLS  -  Launcher
echo ==========================================================
echo.

REM -- Launch each vendored sub-tool in its own minimized window --
call :launch_tool "tao-card"    "Tao Card 5174"
call :launch_tool "preset-tool" "Tao Preset 5175"
call :launch_tool "mod-card"    "Mod Card 5176"

REM -- Hub / tool Dich (this folder) - opens browser at http://localhost:5173 --
echo.
REM LUON dong bo thu vien: sau khi cap nhat (git pull/reset) co the co dependency MOI (vd acorn).
REM Chi cai khi thieu node_modules se gay loi "Failed to resolve import ..." sau update.
echo [Hub] Dong bo thu vien (npm install)...
call npm install --no-audit --no-fund
echo [Hub] Khoi dong tren http://localhost:5173 ...
echo.
call npm run dev

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
