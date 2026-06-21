@echo off
rem TEST-WINDOWS.bat — 立刻跑一次 AI 使用週報（手動測試，Windows 雙擊）
chcp 65001 >nul
setlocal
set "SKILL=%USERPROFILE%\.claude\skills\ai-usage-report"
cls
echo ================================
echo    AI 使用週報 - 立刻跑一次
echo ================================
echo.

where claude >nul 2>nul
if errorlevel 1 ( echo [!] 找不到 claude。請先雙擊 INSTALL-WINDOWS.bat 完成安裝。& echo. & pause & exit /b 1 )
if not exist "%SKILL%\config.json" ( echo [!] 技能還沒裝好。請先雙擊 INSTALL-WINDOWS.bat。& echo. & pause & exit /b 1 )
if not exist "%SKILL%\.oauth-token" ( echo [!] 找不到授權 token。請先雙擊 INSTALL-WINDOWS.bat 完成「授權」步驟。& echo. & pause & exit /b 1 )

set /p TOKEN=<"%SKILL%\.oauth-token"
echo 處理中... 約 1-2 分鐘。視窗會靜止是正常的,請勿關閉(跑完會顯示結果)。
echo.
set "CLAUDE_CODE_OAUTH_TOKEN=%TOKEN%"
claude -p "產生我的 AI 使用週報" --permission-mode dontAsk --allowedTools "Skill Read Write Bash"
echo.
echo [完成] 去 Telegram 群組看看有沒有收到你的報告。
echo        (沒收到的話,把上面的訊息截圖傳給管理者)
echo.
pause
endlocal
