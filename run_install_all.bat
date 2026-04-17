@echo off
setlocal

title Nano Banana Ultra Full Installer

call "%~dp0run_install.bat" --no-pause
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
echo.
echo =======================================================
echo Full environment installation failed during product setup.
echo =======================================================
echo.
pause
exit /b %EXIT_CODE%
)

call "%~dp0scripts\setup-dev-environment.bat" --no-pause
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
echo =======================================================
echo Full environment installation failed during local tool setup.
echo =======================================================
echo.
pause
exit /b %EXIT_CODE%
)

echo =======================================================
echo Full environment installation complete!
echo =======================================================
echo.
pause
exit /b 0