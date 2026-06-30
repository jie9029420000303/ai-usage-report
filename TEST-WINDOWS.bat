@echo off
rem TEST-WINDOWS.bat - Run AI Weekly Report manually (Windows)
chcp 65001 >nul
setlocal
set "SKILL=%USERPROFILE%\.claude\skills\ai-usage-report"
cls
echo ================================
echo    AI Weekly Report - Run Now
echo ================================
echo.

where claude >nul 2>nul
if errorlevel 1 ( echo [!] claude not found. Please double-click INSTALL-WINDOWS.bat first. & echo. & pause & exit /b 1 )
if not exist "%SKILL%\config.json" ( echo [!] Skill not installed. Please double-click INSTALL-WINDOWS.bat first. & echo. & pause & exit /b 1 )
if not exist "%SKILL%\.oauth-token" ( echo [!] OAuth token not found. Please double-click INSTALL-WINDOWS.bat to complete authorization. & echo. & pause & exit /b 1 )

set /p TOKEN=<"%SKILL%\.oauth-token"
echo Running... approx 1-2 min. Window may freeze - do not close.
echo.
set "CLAUDE_CODE_OAUTH_TOKEN=%TOKEN%"
claude -p "Generate my AI usage weekly report" --permission-mode dontAsk --allowedTools "Skill Read Write Bash"
echo.
echo [Done] Check your Telegram group for the report.
echo        If not received, screenshot the output above and send to admin.
echo.
pause
endlocal
