# 📊 AI 使用週報 — 安裝說明（3 步驟）

> 一個 Claude Code 技能。在 Claude Code 打一句話，就自動把你這週的 AI 使用狀況
> 整理成報告，推到團隊群組。主管一頁看完全員使用狀況。

---

## 安裝（一次性，約 1 分鐘）

### 1️⃣ 放進技能資料夾
把收到的整個 `ai-usage-report` 資料夾，複製到：

- **Mac**：`~/.claude/skills/`
- **Windows**：`%USERPROFILE%\.claude\skills\`

（`.claude` 是隱藏資料夾。Mac 在 Finder 按 `Cmd+Shift+.` 顯示隱藏檔；找不到就直接在路徑列貼上 `~/.claude/skills/`）

### 2️⃣ 填上你的名字
打開資料夾裡的 `config.json`，把 `userName` 改成**你的名字**：

```json
"userName": "王小明",
```

其他通通不用動（bot、群組都已經設好了）。

### 3️⃣ 完成！
在 Claude Code 對話框輸入：

```
產生我的 AI 使用週報
```

十幾秒後，報告就會自動產生並**推到團隊群組**，附一份可下載的 HTML 完整報告。

---

## 4️⃣ 設定每週自動執行（強烈建議）

不想每週記得手動打字？設定一次,之後**每週一 13:00 自動產生並推送**,完全不用管。

**Mac**:在 `ai-usage-report` 資料夾裡開「終端機」,貼上這行:
```bash
bash setup-schedule.sh
```

**Windows**:在資料夾裡開「PowerShell」,貼上這行:
```powershell
powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
```

設定完,**立刻測試一次**確認沒問題:
- Mac:`launchctl start com.aiusagereport.weekly`
- Windows:`Start-ScheduledTask -TaskName 'AI-Usage-Report-Weekly'`

幾秒後看團隊群組有沒有收到你的週報,有就成功了 ✅

> ⚠️ 自動執行那一刻,你的電腦要**開機**且 **claude 已登入**(睡眠/關機會跳過那一次)。
> 取消自動執行:Mac 跑 `bash setup-schedule.sh --remove`;Windows 跑 `powershell -ExecutionPolicy Bypass -File setup-schedule.ps1 -Remove`。

---

## 常見問題

**Q：要每週做嗎？**
A：對，每週跑一次。之後想做月報就說「產生我這個月的 AI 使用報告」。

**Q：報告抓得到我所有 AI 使用嗎？**
A：只統計你在 **Claude Code** 裡的使用。在 claude.ai 網頁版、ChatGPT 等的使用不算——想讓數字漂亮，就把工作搬進 Claude Code。

**Q：第一次跑有點慢？**
A：第一次會自動下載一個用量工具（ccusage），等一下就好，之後很快。

**Q：報告會洩漏我的對話內容嗎？**
A：不會。報告只有「對話標題 + 統計數字」，不含對話內文。

---

有問題問團隊管理員 👍
