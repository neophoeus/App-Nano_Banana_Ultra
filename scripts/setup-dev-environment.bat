@echo off
setlocal
set "PAUSE_AT_END=1"
if /I "%~1"=="--no-pause" set "PAUSE_AT_END=0"

for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "DEV_ENV_DIR=%APP_DIR%\dev-environment"

echo.
echo =======================================================
echo Installing local development tools in:
echo %DEV_ENV_DIR%
echo =======================================================

if not exist "%DEV_ENV_DIR%\package.json" (
echo Missing %DEV_ENV_DIR%\package.json
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 1
)

pushd "%DEV_ENV_DIR%" >nul
call npm install
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

echo.
if not "%EXIT_CODE%"=="0" (
echo =======================================================
echo Local development tool installation failed.
echo =======================================================
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b %EXIT_CODE%
)

echo =======================================================
echo Local development tools are ready.
echo =======================================================
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0