#!/bin/bash
# TEST-MAC.command — 立刻跑一次 AI 使用週報（手動測試，macOS 雙擊）
# 馬上產生一份報告並推到 Telegram 群組，用來驗證安裝是否成功。
cd "$(dirname "$0")" || exit 1
SKILL="$HOME/.claude/skills/ai-usage-report"
clear
echo "════════════════════════════════"
echo "   AI 使用週報 — 立刻跑一次"
echo "════════════════════════════════"
echo ""

if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  找不到 claude。請先雙擊 INSTALL-MAC.command 完成安裝。"
  echo ""; read -p "按 Enter 關閉"; exit 1
fi
if [ ! -f "$SKILL/config.json" ]; then
  echo "⚠️  技能還沒安裝好。請先雙擊 INSTALL-MAC.command 完成安裝。"
  echo ""; read -p "按 Enter 關閉"; exit 1
fi
TOKEN="$(tr -d '[:space:]' < "$SKILL/.oauth-token" 2>/dev/null)"
if [ -z "$TOKEN" ]; then
  echo "⚠️  找不到授權 token。請先雙擊 INSTALL-MAC.command 完成「授權」那一步。"
  echo ""; read -p "按 Enter 關閉"; exit 1
fi

echo "處理中… 約 1–2 分鐘，請勿關閉視窗（跑完會自動顯示結果）"
printf "   "
# 背景跑技能、前景顯示進度條，讓畫面不會死寂
CLAUDE_CODE_OAUTH_TOKEN="$TOKEN" claude -p "產生我的 AI 使用週報" \
  --permission-mode dontAsk --allowedTools "Skill Read Write Bash" \
  >/tmp/airep_test.log 2>&1 &
PID=$!
while kill -0 "$PID" 2>/dev/null; do printf "▍"; sleep 2; done
wait "$PID"; RC=$?
echo ""; echo ""
if [ "$RC" -eq 0 ]; then
  echo "✅ 跑完了！去 Telegram 群組看看有沒有收到你的報告。"
else
  echo "⚠️  出錯了，把下面訊息截圖傳給管理者："
  echo "────"
  tail -10 /tmp/airep_test.log
fi
echo ""
read -p "按 Enter 關閉這個視窗"
