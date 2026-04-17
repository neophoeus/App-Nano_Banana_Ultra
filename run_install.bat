@echo off
setlocal
set "PAUSE_AT_END=1"
if /I "%~1"=="--no-pause" set "PAUSE_AT_END=0"

title Nano Banana Ultra Product Installer
echo.
echo =======================================================
echo Executing npm install for product runtime/build dependencies...
echo Vitest, Playwright, and Prettier now live in dev-environment\.
echo =======================================================

pushd "%~dp0" >nul
call npm install
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

echo.
if not "%EXIT_CODE%"=="0" (
echo =======================================================
echo Product dependency installation failed.
echo =======================================================
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b %EXIT_CODE%
)

echo =======================================================
echo Product dependency installation complete!
echo Use run_install_all.bat or scripts\setup-dev-environment.bat for local tools.
echo =======================================================
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0