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
  echo ""
  read -p "按 Enter 關閉"; exit 1
fi
if [ ! -f "$SKILL/config.json" ]; then
  echo "⚠️  技能還沒安裝好。請先雙擊 INSTALL-MAC.command 完成安裝。"
  echo ""
  read -p "按 Enter 關閉"; exit 1
fi

echo "開始產生報告並推送…（約 1–2 分鐘，請稍候，不要關視窗）"
echo ""
claude -p "產生我的 AI 使用週報" --permission-mode dontAsk --allowedTools "Skill Read Write Bash"
echo ""
echo "✅ 跑完了！去 Telegram 群組看看有沒有收到你的報告。"
echo "   (沒收到的話,把上面的訊息截圖傳給管理者)"
echo ""
read -p "按 Enter 關閉這個視窗"
