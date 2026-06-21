@echo off
rem INSTALL-WINDOWS.bat — AI 使用週報 一鍵設定（Windows，雙擊執行）
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "SELF=%cd%"
set "SKILL=%USERPROFILE%\.claude\skills\ai-usage-report"
cls
echo ====================================
echo    AI 使用週報 - 一鍵設定 (Windows)
echo ====================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] 還沒安裝 Node.js ^(技能需要它才能跑^)
  echo.
  echo     請先到  https://nodejs.org
  echo     下載 LTS 版、雙擊安裝；裝完再回來雙擊我。
  echo.
  pause
  exit /b 1
)
echo [OK] Node.js 已安裝

where claude >nul 2>nul
if errorlevel 1 (
  echo [!] 還沒安裝 Claude Code
  echo.
  echo     請打開 PowerShell，貼這行按 Enter 安裝：
  echo       irm https://claude.ai/install.ps1 ^| iex
  echo     裝完打一次  claude  完成登入，再回來雙擊我。
  echo.
  pause
  exit /b 1
)
echo [OK] Claude Code 已安裝

if not exist "%SELF%\config.json" (
  echo [!] 找不到 config.json ^(裡面有連線設定^)
  echo.
  echo     請把主管私下給你的壓縮檔解開、把裡面的 config.json
  echo     放進「這個資料夾」^(跟這個 .bat 放一起^)，再雙擊我一次。
  echo.
  pause
  exit /b 1
)
echo [OK] 已找到設定檔 config.json

if not exist "%USERPROFILE%\.claude\skills" mkdir "%USERPROFILE%\.claude\skills"
robocopy "%SELF%" "%SKILL%" /E /XF *.bat *.command /XD .git >nul
echo [OK] 技能已安裝到 .claude\skills

echo.
set /p NAME=請輸入你的名字（會顯示在週報上）:
set "NAME_ENV=%NAME%"
node -e "const fs=require('fs'),p=process.env.USERPROFILE+'/.claude/skills/ai-usage-report/config.json';const c=JSON.parse(fs.readFileSync(p,'utf8'));if(process.env.NAME_ENV)c.userName=process.env.NAME_ENV;fs.writeFileSync(p,JSON.stringify(c,null,2));"
echo [OK] 名字已設定: %NAME%

echo.
powershell -ExecutionPolicy Bypass -File "%SKILL%\setup-schedule.ps1"
echo.
echo === 全部完成！===
echo 打開 Claude Code，輸入「產生我的 AI 使用週報」可以立刻測一次。
echo.
pause
endlocal
