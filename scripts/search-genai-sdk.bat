@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0search-genai-sdk.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

exit /b %EXIT_CODE%