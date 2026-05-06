@echo off
cd /d "%~dp0"
echo =======================================
echo   Updating Application...
echo =======================================
echo.

echo Pulling latest changes from GitHub...
call git pull

echo.
echo Installing new dependencies...
call npm install

echo.
echo =======================================
echo   Update complete!
echo   You can now run start.bat to launch the app.
echo =======================================
pause
