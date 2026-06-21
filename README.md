# AI 使用週報（ai-usage-report）

一個 **Claude Code 技能**：把你在 Claude Code 的真實使用量，自動整理成週報、推送到團隊 Telegram 群組，讓團隊的 AI 使用狀況可量化、可比較。

資料直接讀本機系統日誌與 `ccusage`，**不是人工填報**——用量、花費、情境都來自實際紀錄。

## 功能

- 📊 **使用週報**：Token 價值、每日趨勢、使用情境分類與各情境次數、模型分布，產出自包含 HTML（可列印）。
- 🏷 **AI 情境分類**：由 Claude 讀對話標題自動歸納「這週用 AI 做了哪些事」。
- 📱 **Telegram 推送**：報告摘要＋HTML 附件自動推到指定對話／群組。
- 🏆 **團隊排行榜**：多人彙整成 Token 價值排行榜，相對團隊平均分級。
- ⏰ **每週自動**：排程每週定時、無人值守跑並推送。
- 🖱 **一鍵安裝**：雙擊安裝檔、輸入名字即完成。

> 核心指標是 **Token 價值**（ccusage 按實際用量 × API 公開定價估算）——與訂閱方案無關、跨成員可公平比較。

## 安裝

需求：**Node.js**（技能腳本與 ccusage 需要）、**Claude Code**（Pro/Max 訂閱）。

1. 下載本 repo（綠色 **Code → Download ZIP**）並解壓。
2. 取得管理者提供的 `config.json`（含 Telegram 連線設定），放進資料夾。
3. 雙擊一鍵安裝檔：
   - macOS：`INSTALL-MAC.command`
   - Windows：`INSTALL-WINDOWS.bat`

   它會檢查環境 → 把技能裝進 `~/.claude/skills/` → 問你的名字 → **授權**（開瀏覽器登入、自動抓取長效 token）→ 設定每週排程 → 跑一次測試。

> **「授權」那一步**：每週排程是「無人值守」在背景跑，需要一次性 `claude setup-token` 授權才能用你的帳號認證。安裝檔會自動處理——你只要在瀏覽器登入同意，token 會自動抓好（不必手動複製貼上）。若該步出現 `forkpty: Device not configured`，是開太多終端／Claude 視窗、系統 pty 用滿了，關掉幾個再重跑。

> 手動安裝：把資料夾放到 `~/.claude/skills/ai-usage-report/`、複製 `config.example.json` 為 `config.json` 填好、在 Claude Code 說「產生我的 AI 使用週報」。

## 使用

在 Claude Code 說：「**產生我的 AI 使用週報**」（月報說「這個月」＝30 天）。報告會產出 HTML，並（若已設定）推到 Telegram。

## 設定（config.json）

| 欄位 | 說明 |
|------|------|
| `userName` | 報告抬頭的姓名 |
| `usdToTwd` | 美元兌台幣匯率（顯示用，預設 32） |
| `telegram.botToken` / `chatId` | Telegram 推送目標（用 `scripts/setup-telegram.js <botToken>` 自動設定） |
| `aggregateDir` | （選用）多人摘要的共享收集資料夾 |

## 團隊排行榜（主管端）

每人跑技能會輸出 `summary-<帳號>.json`；主管收集後跑：

```bash
node scripts/aggregate.js <收集資料夾> > 排行榜.html
```

產出依 **Token 價值**降序的團隊排行榜，相對團隊平均分級（積極 ≥ 平均／普通 ≥ 半均／偏低 < 半均）。

## 每週自動排程

```bash
bash setup-schedule.sh                                        # macOS（launchd）
powershell -ExecutionPolicy Bypass -File setup-schedule.ps1   # Windows（工作排程器）
```

預設每週一 13:00 用 headless `claude -p` 無人值守跑技能並推送。執行當下需電腦開機、`claude` 已登入。

## 前提與限制

- **只統計 Claude Code 內的使用**：claude.ai 網頁版等其他平台不計入。
- **Token 價值是估算**：ccusage 依公開 API 定價對等換算，非實際帳單。
- **不含對話內文**：只呈現對話標題與統計；腳本已過濾程式組裝內容，不洩漏本機路徑。
- **`config.json` 含 token，請勿放進公開版控**（已由 `.gitignore` 擋住）。

## 檔案結構

```
ai-usage-report/
├── SKILL.md                技能定義與執行流程
├── INSTALL.md              安裝說明（給使用者）
├── config.example.json     設定檔範本
├── INSTALL-MAC.command     一鍵安裝（macOS，雙擊）
├── INSTALL-WINDOWS.bat     一鍵安裝（Windows，雙擊）
├── setup-schedule.sh       每週排程設定（macOS）
├── setup-schedule.ps1      每週排程設定（Windows）
├── deploy.sh               （開發用）同步 repo 到技能目錄
└── scripts/
    ├── collect.js          資料收集（ccusage + 掃日誌）
    ├── render.js           產出 HTML 報告
    ├── summarize.js        輸出精簡摘要（供彙整）
    ├── aggregate.js        主管端：Token 價值排行榜
    ├── send-telegram.js    推送到 Telegram
    └── setup-telegram.js   Telegram 設定精靈
```
