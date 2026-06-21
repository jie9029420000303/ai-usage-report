# 📊 AI 使用週報 — 安裝說明

> 一個 Claude Code 技能。安裝後每週自動把你在 Claude Code 的使用狀況整理成報告、
> 推到團隊群組，主管一頁看完全員狀況。

---

## 開始前：先裝兩個東西

1. **Node.js** — 到 <https://nodejs.org> 下載「LTS」版、雙擊安裝。
2. **Claude Code** —
   - **Mac**：開「終端機」貼這行按 Enter：`curl -fsSL https://claude.ai/install.sh | bash`
   - **Windows**：開「PowerShell」貼這行按 Enter：`irm https://claude.ai/install.ps1 | iex`
   - 裝完打一次 `claude`、完成登入。

## 拿兩個檔案

1. **程式**：本 repo 綠色 **Code → Download ZIP**，解壓。
2. **設定檔 `config.json`**：管理者私下給的連結下載、解壓，把裡面的 `config.json`
   放進剛剛解壓的資料夾（跟 `INSTALL-MAC.command` 放一起）。

## 一鍵安裝（雙擊）

- **Mac**：雙擊 `INSTALL-MAC.command`（若被擋 → 右鍵「開啟」）
- **Windows**：雙擊 `INSTALL-WINDOWS.bat`

它會自動：檢查環境 → 裝進技能資料夾 → 問你的名字 → **授權** → 設每週排程 → 跑一次測試。

### 「授權」那一步（重要，會開瀏覽器）

安裝到一半會請你按 Enter 開始授權：

1. 自動跳出瀏覽器 → 登入你的 Claude 帳號、按同意
2. 回到視窗 → **token 會自動抓好，你什麼都不用複製貼上**
3. 看到 `✓ 授權完成（…108 字元）` 就對了

> **為什麼要授權？** 每週「自動」跑報告時沒有人在電腦前，這個一次性授權讓它能用
> 你的帳號在背景認證、無人值守跑。

## 完成

看到 `✓ 測試完成` + 團隊群組收到你的報告 = 成功。之後**每週一 13:00 自動跑**，不用管。

想隨時手動測一次：雙擊 `TEST-MAC.command`（Windows：`TEST-WINDOWS.bat`）。

---

## 常見問題

**Q：授權那步卡住、跳 `forkpty: Device not configured`？**
A：你開太多終端機／Claude 視窗了，系統的虛擬終端用滿了。關掉幾個用不到的再雙擊安裝檔。

**Q：跑的時候畫面不動？**
A：正常。Mac 會顯示 `▍` 進度條、Windows 視窗會靜止 1–2 分鐘，跑完才出結果，**別關視窗**。

**Q：第一次跑有點慢？**
A：第一次會自動下載一個用量工具（ccusage），等一下就好，之後很快。

**Q：報告抓得到我所有 AI 使用嗎？**
A：只統計你在 **Claude Code** 裡的使用。claude.ai 網頁版、ChatGPT 等不算——想讓數字漂亮，就把工作搬進 Claude Code。

**Q：報告會洩漏我的對話內容嗎？**
A：不會。報告只有「對話標題 + 統計數字」，不含對話內文。

---

有問題問團隊管理員 👍
