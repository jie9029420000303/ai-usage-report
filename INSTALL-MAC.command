#!/bin/bash
# INSTALL-MAC.command — AI 使用週報 一鍵設定（macOS，雙擊執行）
# 自動：偵測前提 → 安裝技能到 ~/.claude/skills → 問名字寫入 → 設定每週排程
cd "$(dirname "$0")" || exit 1
SELF="$(pwd)"
SKILL="$HOME/.claude/skills/ai-usage-report"
clear
echo "════════════════════════════════════"
echo "   AI 使用週報 — 一鍵設定 (Mac)"
echo "════════════════════════════════════"
echo ""

# 前提 1：Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "⚠️  還沒安裝 Node.js（技能需要它才能跑）"
  echo ""
  echo "    請先到  👉  https://nodejs.org"
  echo "    下載「LTS」版、雙擊安裝；裝完再回來雙擊我。"
  echo ""
  read -p "按 Enter 關閉"; exit 1
fi
echo "✓ Node.js 已安裝"

# 前提 2：Claude Code CLI
if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  還沒安裝 Claude Code"
  echo ""
  echo "    請打開「終端機」，貼這行按 Enter 安裝："
  echo "      curl -fsSL https://claude.ai/install.sh | bash"
  echo "    裝完打一次  claude  完成登入，再回來雙擊我。"
  echo ""
  read -p "按 Enter 關閉"; exit 1
fi
echo "✓ Claude Code 已安裝"

# 前提 3：主管私下給的 config.json（裡面有連線 token）
if [ ! -f "$SELF/config.json" ]; then
  echo "⚠️  找不到 config.json（裡面有連線設定）"
  echo ""
  echo "    請把主管私下給你的壓縮檔解開、把裡面的 config.json"
  echo "    放進「這個資料夾」（跟 INSTALL-MAC.command 放一起），再雙擊我一次。"
  echo ""
  read -p "按 Enter 關閉"; exit 1
fi
echo "✓ 已找到設定檔 config.json"

# 安裝技能到 skills 目錄（排除設定檔自己）
mkdir -p "$HOME/.claude/skills"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='*.command' --exclude='*.bat' --exclude='.git' "$SELF/" "$SKILL/"
else
  mkdir -p "$SKILL"; cp -R "$SELF/." "$SKILL/"; rm -f "$SKILL"/*.command "$SKILL"/*.bat
fi
echo "✓ 技能已安裝到 ~/.claude/skills/"
echo ""

# 問名字、寫進 config（用環境變數傳遞，避免特殊字元出錯）
read -p "請輸入你的名字（會顯示在週報上）: " NAME
NAME_ENV="$NAME" node -e "const fs=require('fs'),p=process.env.HOME+'/.claude/skills/ai-usage-report/config.json';const c=JSON.parse(fs.readFileSync(p,'utf8'));if(process.env.NAME_ENV)c.userName=process.env.NAME_ENV;fs.writeFileSync(p,JSON.stringify(c,null,2));" && echo "✓ 名字已設定：$NAME"
echo ""

# 授權（setup-token）：產生長期 token，讓「每週自動跑／測試」能用你的帳號認證
if [ -s "$SKILL/.oauth-token" ]; then
  echo "✓ 已有授權 token（略過授權）"
else
  echo "━━ 授權（讓每週自動跑能用你的帳號）━━"
  echo "待會會開瀏覽器登入；完成後終端機會印出一段 token。"
  read -p "按 Enter 開始授權…" _
  echo "（完成授權後會自動抓取 token，不必手動複製貼上）"
  read -p "按 Enter 開始授權…" _
  claude setup-token 2>&1 | tee /tmp/airep_setuptoken.txt
  # token 會被 setup-token 每 80 字硬斷行成多段；用段落模式抓整段、去掉所有空白接回完整 token
  TOKEN="$(awk 'BEGIN{RS=""} /sk-ant-oat/{gsub(/[[:space:]]/,""); print; exit}' /tmp/airep_setuptoken.txt)"
  rm -f /tmp/airep_setuptoken.txt
  if [ -n "$TOKEN" ] && [ "${#TOKEN}" -ge 100 ]; then
    printf '%s' "$TOKEN" > "$SKILL/.oauth-token"
    echo "✓ 授權完成（已自動取得 token，${#TOKEN} 字元）"
  else
    echo ""
    echo "自動抓取失敗。請把上面那段 token「整段」貼上 → 按 Enter → 再按一次 Enter 結束："
    TOKEN=""
    while IFS= read -r line; do [ -z "$line" ] && break; TOKEN="$TOKEN$line"; done
    TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"
    printf '%s' "$TOKEN" > "$SKILL/.oauth-token"
    if [ "${#TOKEN}" -ge 100 ]; then echo "✓ 授權完成（${#TOKEN} 字元）"; else echo "⚠️  token 長度異常（${#TOKEN} 字，應 100+），可能沒貼完整，可重跑本安裝檔"; fi
  fi
fi
echo ""

# 設定每週排程
if bash "$SKILL/setup-schedule.sh" >/dev/null 2>&1; then
  echo "✓ 已設定每週一 13:00 自動執行並推送"
else
  echo "⚠️  排程沒設成功，但技能已裝好（可稍後手動跑 setup-schedule.sh）"
fi
echo ""
echo "正在跑第一份報告做測試… 約 1–2 分鐘，請勿關閉視窗"
printf "   "
TOKEN="$(tr -d '[:space:]' < "$SKILL/.oauth-token" 2>/dev/null)"
CLAUDE_CODE_OAUTH_TOKEN="$TOKEN" claude -p "產生我的 AI 使用週報" --permission-mode dontAsk --allowedTools "Skill Read Write Bash" >/tmp/airep_install_test.log 2>&1 &
TPID=$!
while kill -0 "$TPID" 2>/dev/null; do printf "▍"; sleep 2; done
wait "$TPID"; TRC=$?
echo ""
if [ "$TRC" -eq 0 ]; then echo "✓ 測試完成！去 Telegram 群組看有沒有收到你的報告"; else echo "⚠️  自動測試沒成功（可截圖問管理者）："; tail -6 /tmp/airep_install_test.log; fi
echo ""
echo "🎉 全部完成！"
echo ""
echo "   • 之後每週一下午會自動跑並推送"
echo "   • 想隨時手動測一次：雙擊 TEST-MAC.command"
echo ""
read -p "按 Enter 關閉這個視窗"
