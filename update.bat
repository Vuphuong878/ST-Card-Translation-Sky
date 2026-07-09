@echo off
cd /d "%~dp0"
echo =======================================
echo   Cap nhat ung dung (dong bo cung ve GitHub)
echo =======================================
echo.

REM Dong bo CUNG ve ban tren GitHub. Dung "git pull" thi hay ket vi npm install da sua
REM package-lock.json (file duoc track) -> merge tu choi ghi de. "fetch + reset --hard" luon chay
REM duoc; du lieu KHONG track (the dang dich, cache, progress) van duoc giu nguyen.
echo Tai ban moi nhat tu GitHub...
call git fetch origin main
call git reset --hard origin/main
if %ERRORLEVEL% neq 0 (
    echo.
    echo   [LOI] Khong dong bo duoc voi GitHub. Kiem tra mang / dang nhap git.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Cai/dong bo thu vien cho Hub + 3 tool con...
call npm install --no-audit --no-fund
for %%D in (tao-card preset-tool mod-card) do (
    if exist "%%D\package.json" (
        echo   - %%D ...
        pushd "%%D"
        call npm install --no-audit --no-fund
        popd
    )
)

echo.
echo =======================================
echo   Cap nhat xong! Chay start.bat de mo app.
echo =======================================
pause
