@echo off
setlocal

for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "VITEST_BIN=%APP_DIR%\dev-environment\node_modules\.bin\vitest.cmd"

if not exist "%VITEST_BIN%" (
echo Missing %VITEST_BIN%
echo Run run_install_all.bat or scripts\setup-dev-environment.bat first.
exit /b 1
)

pushd "%APP_DIR%" >nul
call "%VITEST_BIN%" run --root "%APP_DIR%" --dir "%APP_DIR%\tests" %*
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

exit /b %EXIT_CODE%