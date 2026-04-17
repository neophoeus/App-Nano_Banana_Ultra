@echo off
setlocal

for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "PRETTIER_BIN=%APP_DIR%\dev-environment\node_modules\.bin\prettier.cmd"

if not exist "%PRETTIER_BIN%" (
echo Missing %PRETTIER_BIN%
echo Run run_install_all.bat or scripts\setup-dev-environment.bat first.
exit /b 1
)

pushd "%APP_DIR%" >nul
if "%~1"=="" (
call "%PRETTIER_BIN%" --write .
) else (
call "%PRETTIER_BIN%" --write %*
)
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

exit /b %EXIT_CODE%