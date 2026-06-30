@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "SELF=%cd%"
set "SKILL=%USERPROFILE%\.claude\skills\ai-usage-report"
cls
echo ====================================
echo    AI Weekly Report - Setup (Windows)
echo ====================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js not found.
  echo     Please install from https://nodejs.org then run this again.
  pause
  exit /b 1
)
echo [OK] Node.js found

where claude >nul 2>nul
if errorlevel 1 (
  echo [!] Claude Code not found.
  echo     Open PowerShell and run:  irm https://claude.ai/install.ps1 ^| iex
  echo     Then run  claude  once to log in, then run this again.
  pause
  exit /b 1
)
echo [OK] Claude Code found

if not exist "%SELF%\config.json" (
  echo [!] config.json not found in this folder.
  echo     Put config.json here then run this again.
  pause
  exit /b 1
)
echo [OK] config.json found

if not exist "%USERPROFILE%\.claude\skills" mkdir "%USERPROFILE%\.claude\skills"
robocopy "%SELF%" "%SKILL%" /E /XF *.bat *.command /XD .git >nul
echo [OK] Skill copied to .claude\skills

echo.
set /p NAME=Enter your name (shown on report):
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%SKILL%\config.json';$c=Get-Content $p -Raw -Encoding UTF8|ConvertFrom-Json;$c.userName='%NAME%';$c|ConvertTo-Json -Depth 10|Set-Content -Encoding UTF8 $p"
echo [OK] Name saved: %NAME%

echo.
if exist "%SKILL%\.oauth-token" (
  echo [OK] OAuth token already exists
) else (
  echo == Authorization ==
  echo A browser will open. Log in and approve. Token will be saved automatically.
  pause
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$o=(claude setup-token 2>&1|Out-String);Write-Host $o;$t=([regex]'sk-ant-oat[0-9]+-[A-Za-z0-9_-]+').Match($o).Value;if($t){Set-Content -NoNewline -Path '%SKILL%\.oauth-token' -Value $t;Write-Host('[OK] Token saved, length: '+$t.Length)}else{Write-Host '[!] Auto-capture failed, contact admin'}"
)

echo.
if exist "%SKILL%\setup-schedule.ps1" (
  powershell -ExecutionPolicy Bypass -File "%SKILL%\setup-schedule.ps1"
)

echo.
echo Running first report as test... (1-2 min, do not close window)
set /p TESTTOKEN=<"%SKILL%\.oauth-token"
set "CLAUDE_CODE_OAUTH_TOKEN=%TESTTOKEN%"
claude -p "Generate my AI usage weekly report" --permission-mode dontAsk --allowedTools "Skill Read Write Bash"
if errorlevel 1 (
  echo [!] Test did not complete. Try double-clicking TEST-WINDOWS.bat later.
) else (
  echo [OK] Done! Check your Telegram group for the report.
)
echo.
echo === Setup complete! ===
echo   - Report runs automatically every Monday afternoon
echo   - To run manually: double-click TEST-WINDOWS.bat
echo.
pause
endlocal
