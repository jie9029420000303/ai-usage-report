# AI 使用週報技能（ai-usage-report）

一鍵把你在 **Claude Code** 的真實使用紀錄，整理成一份漂亮、可列印、難以造假的 HTML 週報——
包含 token 價值、投入產出比（ROI）、使用情境分類與各情境呼叫次數、每日趨勢、模型分布。

資料直接讀本機系統日誌與 `ccusage`，**不是人工填報**，因此可作為「積極且正確使用 AI」的客觀證明。

---

## 安裝（一次性）

把整個 `ai-usage-report` 資料夾複製到你的 Claude Code 技能目錄：

```bash
# macOS / Linux
cp -R ai-usage-report ~/.claude/skills/
```

Windows 則複製到 `%USERPROFILE%\.claude\skills\ai-usage-report`。

> 需求：機器上要有 Node.js（Claude Code 環境本來就有）。`ccusage` 會由 `npx` 自動取得，無需另外安裝。

## 首次設定

第一次使用時，技能會問你四個問題並建立 `config.json`：

| 欄位 | 說明 | 範例 |
|------|------|------|
| `userName` | 報告抬頭的姓名 | 王小明 |
| `plan` | 你的訂閱方案 | Claude Max 20x |
| `monthlyFeeUSD` | 月租美元 | Pro=20、Max 5x=100、Max 20x=200 |
| `usdToTwd` | 美元兌台幣匯率 | 32 |

也可以直接複製 `config.example.json` 成 `config.json` 自行填好。

## 使用

在 Claude Code 對話框輸入任一句：

```
產生我的 AI 使用週報
```
```
跑一份 AI 使用報告給我
```

要月報就說「**產生我這個月的 AI 使用報告**」（統計 30 天）。

報告會輸出到你的家目錄 `~/AI使用週報-YYYYMMDD.html`，並自動用瀏覽器打開。
交給主管時，直接把這個 HTML 檔寄出，或在瀏覽器列印成 PDF 即可。

---

## 設定 Telegram 自動推送（選用，推薦）

讓報告產出後**自動推送到主管的 Telegram**——同事端零設定，主管手機即時收到摘要與報告檔。

### 主管做一次（約 5 分鐘）

1. 在 Telegram 搜尋 **@BotFather**，傳 `/newbot`，依指示替 bot 命名（例如 `AI 使用週報`）與設帳號（例如 `my_ai_report_bot`）。
2. BotFather 會給你一段 **bot token**（格式像 `123456789:ABCdef...`），複製起來。
3. 用你的 Telegram **對剛建立的 bot 傳一句話**（任意，例如「hi」）。想收進群組就改成：建群組、把 bot 加進去、在群組發一則訊息。
4. 在終端機執行設定精靈（會自動抓 chat_id、寫入設定、發測試訊息）：
   ```bash
   node ~/.claude/skills/ai-usage-report/scripts/setup-telegram.js <貼上 bot token>
   ```
   看到 Telegram 收到 ✅ 測試訊息就完成了。

### 部署給同事

把已設定好 `telegram` 的整個資料夾複製給同事即可——**bot token 與 chat_id 已內建，同事完全不用碰推送設定**，跑技能就會自動推到主管的 Telegram。

> 安全性：bot token 只能對你指定的對話發訊息、權限受限；它存在本機 `config.json`，請勿放進公開版控。

## 多人部署與團隊排行榜（主管專用）

多位同事可共用同一個 bot，報告全部推到主管的同一個 Telegram 群組；每則開頭都有姓名與來源帳號，方便辨識、難造假。

### 多人收件設定
1. 主管建一個 Telegram 群組（如「AI 使用週報」），把 bot 加進去。
2. 在**群組裡**對 bot 發一句話，再跑 `setup-telegram.js <botToken>`，它會抓到「群組的 chat_id」。
3. 把設定好的技能複製給每位同事，各自只需把 config 的 `userName` 改成本人。

### 彙整成 ROI 排行榜
每位同事跑技能時會自動吐出一份 `summary-<帳號>.json`（落點為 `config.aggregateDir`，未設則在家目錄）。主管把這些檔收集到一個資料夾後，跑：
```bash
node ~/.claude/skills/ai-usage-report/scripts/aggregate.js <收集資料夾> > ~/AI週報排行榜.html
```
即產出一張**團隊排行榜**——依 ROI 排序、顏色標示積極／普通／偏低，一頁看完誰積極誰在混。

> 收集 summary 的兩種方式：(1) 在 `config.aggregateDir` 填一個**共享資料夾**（如同步的 Google Drive 路徑），同事的摘要自動寫進去、主管直接彙整；(2) 同事各自把家目錄的 summary 檔傳給主管，集中後再彙整。

## 重要前提與限制

- **只統計 Claude Code 內的使用。** 在 claude.ai 網頁版、ChatGPT 等其他平台的使用，不會出現在報告裡。要讓報告有數據，你必須實際在 Claude Code 內工作。
- **Token 價值是估算。** 訂閱制吃到飽、平台不揭露逐筆 token 計費；報告金額是 `ccusage` 依公開 API 定價的對等換算，用來衡量使用強度與 ROI，不是實際帳單。
- **不含對話內文。** 報告只呈現對話標題與統計數字，腳本已過濾掉程式組裝的結構化內容，不會洩漏本機路徑或私密內容。

## 檔案結構

```
ai-usage-report/
├── SKILL.md             技能定義與執行流程
├── README.md            本說明
├── config.example.json  設定檔範本
└── scripts/
    ├── collect.js        資料收集（跑 ccusage + 掃日誌）
    ├── render.js         產出 HTML 報告
    ├── summarize.js      輸出精簡摘要 JSON（供彙整）
    ├── send-telegram.js  推送報告到 Telegram
    ├── setup-telegram.js Telegram 一次性設定精靈
    └── aggregate.js      主管端：彙整多人 ROI 排行榜
```
