# setup-schedule.ps1 — 一鍵設定每週自動執行「AI 使用週報」（Windows 工作排程器）
#
# 用法（在 PowerShell）：
#   設定： powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
#   取消： powershell -ExecutionPolicy Bypass -File setup-schedule.ps1 -Remove
#
# 效果：每週一 13:00，電腦會在背景自動跑技能、產報告、推送到 Telegram 群組。
#       不需開著 Claude Code，但執行當下電腦要「開機 + claude 已登入」。

param([switch]$Remove)

$ErrorActionPreference = "Stop"
$taskName = "AI-Usage-Report-Weekly"

# ---- 取消模式 ----
if ($Remove) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "OK 已取消「AI 使用週報」每週自動執行排程。"
  exit 0
}

# ---- 偵測 claude ----
$claudePath = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudePath) { $claudePath = "$env:LOCALAPPDATA\Programs\Claude\claude.exe" }
if (-not (Test-Path $claudePath)) {
  Write-Host "X 找不到 claude。請先確認 Claude Code 已安裝、且能在終端機直接打 claude。"
  exit 1
}

# ---- 註冊每週一 13:00 的工作 ----
$arg = '-p "產生我的 AI 使用週報" --permission-mode dontAsk --allowedTools "Skill Read Write Bash"'
$action   = New-ScheduledTaskAction -Execute $claudePath -Argument $arg
$trigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "13:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "OK 已設定：每週一 13:00 自動產生並推送 AI 使用週報"
Write-Host ""
Write-Host "立刻測試一次（建議現在就跑）： Start-ScheduledTask -TaskName '$taskName'"
Write-Host "  跑完去看 Telegram 群組有沒有收到。"
Write-Host ""
Write-Host "要取消排程： powershell -ExecutionPolicy Bypass -File setup-schedule.ps1 -Remove"
