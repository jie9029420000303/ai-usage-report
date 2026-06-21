#!/usr/bin/env bash
# setup-schedule.sh — 一鍵設定每週自動執行「AI 使用週報」（macOS / launchd）
#
# 用法：  bash setup-schedule.sh           設定每週一 13:00 自動跑
#        bash setup-schedule.sh --remove  取消排程
#
# 效果：每週一 13:00，電腦會在背景自動跑技能、產報告、推送到 Telegram 群組。
#       不需開著 Claude Code 視窗，但執行當下電腦要「開機 + claude 已登入」。

set -e

LABEL="com.aiusagereport.weekly"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/ai-usage-report.log"

# ---- 取消模式 ----
if [ "$1" = "--remove" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✓ 已取消「AI 使用週報」每週自動執行排程。"
  exit 0
fi

# ---- 偵測 claude 與 node 路徑 ----
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "✗ 找不到 claude 指令。請先確認 Claude Code 已安裝、且能在終端機直接打 claude。"
  exit 1
fi
NODE_DIR="$(dirname "$(command -v node 2>/dev/null || echo /usr/local/bin/node)")"

# ---- 讀取長期 OAuth token（headless 認證用，無人值守必須）----
TOKEN="$(tr -d '[:space:]' < "$HOME/.claude/skills/ai-usage-report/.oauth-token" 2>/dev/null)"
if [ -z "$TOKEN" ]; then
  echo "✗ 找不到授權 token（.oauth-token）。請先完成安裝的「授權」步驟（claude setup-token）。"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

# ---- 產生 launchd 設定（每週一 13:00）----
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$CLAUDE_BIN</string>
    <string>-p</string>
    <string>產生我的 AI 使用週報</string>
    <string>--permission-mode</string>
    <string>dontAsk</string>
    <string>--allowedTools</string>
    <string>Skill Read Write Bash</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key><integer>1</integer>
    <key>Hour</key><integer>13</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    <key>CLAUDE_CODE_OAUTH_TOKEN</key><string>$TOKEN</string>
  </dict>
  <key>WorkingDirectory</key><string>$HOME</string>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

# ---- 載入排程（先卸舊的避免重複）----
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "✓ 已設定：每週一 13:00 自動產生並推送 AI 使用週報"
echo "  排程檔：$PLIST"
echo "  日誌：  $LOG"
echo ""
echo "▶ 立刻測試一次（建議現在就跑，確認沒問題）："
echo "    launchctl start $LABEL"
echo "  跑完去看 Telegram 群組有沒有收到，或看日誌： cat \"$LOG\""
echo ""
echo "✗ 要取消排程： bash setup-schedule.sh --remove"
