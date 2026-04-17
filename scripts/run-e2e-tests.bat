@echo off
setlocal

for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "PLAYWRIGHT_BIN=%APP_DIR%\dev-environment\node_modules\.bin\playwright.cmd"
set "PLAYWRIGHT_CONFIG=%APP_DIR%\playwright.config.ts"

if not exist "%PLAYWRIGHT_BIN%" (
echo Missing %PLAYWRIGHT_BIN%
echo Run run_install_all.bat or scripts\setup-dev-environment.bat first.
exit /b 1
)

if not exist "%PLAYWRIGHT_CONFIG%" (
echo Missing %PLAYWRIGHT_CONFIG%
echo Playwright config is intentionally local-only in this repo model.
exit /b 1
)

pushd "%APP_DIR%" >nul
call "%PLAYWRIGHT_BIN%" test --config "%PLAYWRIGHT_CONFIG%" %*
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

exit /b %EXIT_CODE%