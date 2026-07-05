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
if not exist "node_modules" echo [Hub] Cai dat lan dau, doi mot chut...
if not exist "node_modules" call npm install
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
if not exist "%TOOL_DIR%\node_modules" call :install_tool "%TOOL_DIR%" "%~2"
echo [%~2] Khoi dong (cua so thu nho)...
start "%~2 - de yen" /MIN /D "%TOOL_DIR%" cmd /k npm run dev
goto :eof

:install_tool
echo [%~2] Cai dat lan dau, doi mot chut...
pushd "%~1"
call npm install
popd
goto :eof
