---
name: ai-usage-report
description: 產生個人 AI（Claude Code）使用週報，輸出為一份自包含、可列印的 HTML 報告。自動讀取本機 Claude Code 日誌與 ccusage 用量，統計 token 價值、投入產出比（ROI）、使用情境分類與各情境呼叫次數、每日用量趨勢、模型分布，用於向主管證明本人積極且正確使用 AI。Use this skill when 使用者說「產生 AI 使用週報」「跑我的 AI 使用報告」「AI 週報」「匯出 AI 使用報告」「我要交 AI 使用報告給主管」「做一份 AI 使用證明」「generate my AI usage report」，或要求製作可交付的 Claude Code 使用統計報告。可指定統計週期（預設最近 7 天，說「月報」則 30 天）。Do NOT use for 查當前單一對話的即時花費（那是 /usage 或 /cost），也不適用於非 Claude Code 平台（如 claude.ai 網頁版）的用量。
---

# AI 使用週報技能

把本機 Claude Code 的真實使用紀錄，整理成一份漂亮、難以造假的 HTML 週報。
資料來源是系統日誌與 `ccusage`，不是人工填報，因此可作為「積極且正確使用 AI」的客觀證明。

技能目錄：`~/.claude/skills/ai-usage-report`（下稱 SKILL_DIR）。
分工原則：**確定性的數據收集與繪圖交給腳本，情境的語意歸納交給你（Claude）。**

---

## 執行流程（依序完成，中途不要停下詢問，除非缺 config）

### Step 0 — 確認設定檔
檢查 `~/.claude/skills/ai-usage-report/config.json` 是否存在。
- **存在** → 直接用。
- **不存在** → 讀 `config.example.json` 當範本，向使用者詢問四項並建立 `config.json`：
  - `userName`：報告對象姓名（會印在報告抬頭）
  - `plan`：訂閱方案名稱（如 `Claude Max 20x`）
  - `monthlyFeeUSD`：月租美元（Pro=20、Max 5x=100、Max 20x=200）
  - `usdToTwd`：美元兌台幣匯率（預設 32）

  若使用者想啟用 **Telegram 自動推送**（報告產出後自動傳到主管的 TG），引導他依 README「設定 Telegram 推送」建立 bot，再執行 `node ~/.claude/skills/ai-usage-report/scripts/setup-telegram.js <botToken>`（會自動抓 chat_id 並寫入 config）。未設定也不影響報告產出。

### Step 1 — 收集數據（腳本，確定性）
```bash
node ~/.claude/skills/ai-usage-report/scripts/collect.js --days 7 > /tmp/ai-usage-raw.json
```
- 預設統計最近 7 個日曆日。使用者要「月報」就用 `--days 30`。
- 這支腳本會跑 `ccusage`（撈 token 與花費）並掃描 `~/.claude/projects` 日誌，輸出含 `sessions` 陣列的 JSON。
- 若 `usage` 為 null（ccusage 撈不到），照常往下走，報告會標註用量數據缺漏。

### Step 2 — 情境分類（你親自做語意歸納，這是本技能的靈魂）
讀取 `/tmp/ai-usage-raw.json`，取出 `sessions` 陣列。每個 session 有 `title`（AI 生成的對話標題，最重要）、`project`、`firstPrompt`。

**你的任務：把每一個 session 歸到一個「使用情境」類別。** 原則：
- 以 `title` 為主要依據，輔以 `project` 與 `firstPrompt`。
- 用**業務動作**命名情境，例如：文件撰寫、資料查詢與研究、程式開發與除錯、商務與合約、簡報與視覺製作、社群內容經營、翻譯、數據分析、自動化流程執行、一般諮詢…（依當期實際內容自由歸納，不必照抄這份清單）。
- 相似工作歸同一類，**控制在 6–12 類**，不要過度切碎。
- `title` 為「(自動化或未命名任務)」者，依 `project` 推斷，或歸入「自動化流程執行」。

用 Write 工具把結果寫到 `/tmp/ai-usage-labels.json`，格式為 sessionId 對情境名的扁平對照：
```json
{ "<sessionId>": "情境名稱", "<sessionId>": "情境名稱" }
```
（session 很多時，可依 project 先分群再逐群歸類，加快處理；但最終每個 sessionId 都要有一個標籤。）

### Step 3 — 產出報告、推送、開啟（腳本，確定性）
在同一個 shell 區塊執行（共用報告路徑變數 `REPORT`）：
```bash
REPORT="$HOME/AI使用週報-$(date +%Y%m%d).html"
# 產出 HTML
node ~/.claude/skills/ai-usage-report/scripts/render.js \
  /tmp/ai-usage-raw.json /tmp/ai-usage-labels.json \
  ~/.claude/skills/ai-usage-report/config.json > "$REPORT"
# 產出精簡摘要 JSON（供主管端彙整排行榜；落點為 config.aggregateDir 或家目錄）
node ~/.claude/skills/ai-usage-report/scripts/summarize.js \
  /tmp/ai-usage-raw.json /tmp/ai-usage-labels.json \
  ~/.claude/skills/ai-usage-report/config.json
# 推送到 Telegram（config 未設 telegram 會自動略過，不影響報告）
node ~/.claude/skills/ai-usage-report/scripts/send-telegram.js \
  /tmp/ai-usage-raw.json "$REPORT" \
  ~/.claude/skills/ai-usage-report/config.json /tmp/ai-usage-labels.json
# 開啟報告（macOS；Windows 改用： start "" "$REPORT"）
open "$REPORT"
```

### Step 4 — 回報
告知使用者：報告已產生（存放路徑）、Telegram 是否已推送，並用一兩句話摘要本期重點（Token 價值、ROI、最主要的使用情境）。

---

## 報告包含的內容
- **整體概況卡**：月租費率、本期 Token 價值（API 定價估算）、投入產出比 ROI、活躍天數、對話數、總提問次數。
- **使用情境分布**：圓餅圖 + 表格（各情境的對話數、提問次數、占比、token）。
- **每日用量趨勢**：每日花費長條圖。
- **模型使用分布**：各模型花費占比。
- **各情境代表性對話**：每類列幾個真實對話標題，佐證內容真實。
- **資料來源聲明**：說明數據直讀系統日誌、難造假，以及 token 價值為估算、僅涵蓋 Claude Code。

## 注意事項
- **Token 價值是估算**：使用者為訂閱制吃到飽，平台不揭露逐筆 token 計費；報告中的金額是 `ccusage` 依公開 API 定價的對等換算，用來衡量使用強度與 ROI，不是實際帳單。
- **只涵蓋 Claude Code**：在 claude.ai 網頁版等其他平台的使用不會出現在報告中。要讓報告有數據，使用者必須實際在 Claude Code 內工作。
- **隱私**：報告只含對話標題與統計數字，不含對話內文；腳本已過濾掉程式組裝的結構化 prompt，避免洩漏本機路徑。
