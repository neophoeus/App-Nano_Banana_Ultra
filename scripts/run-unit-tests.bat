@echo off
setlocal

for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "VITEST_BIN=%APP_DIR%\dev-environment\node_modules\.bin\vitest.cmd"
set "VITEST_CONFIG=%APP_DIR%\vitest.config.ts"

if not exist "%VITEST_BIN%" (
echo Missing %VITEST_BIN%
echo Run run_install_all.bat or scripts\setup-dev-environment.bat first.
exit /b 1
)

if not exist "%VITEST_CONFIG%" (
echo Missing %VITEST_CONFIG%
exit /b 1
)

pushd "%APP_DIR%" >nul
call "%VITEST_BIN%" run --config "%VITEST_CONFIG%" --root "%APP_DIR%" --dir "%APP_DIR%\tests" %*
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

exit /b %EXIT_CODE%