#!/usr/bin/env node
/*
 * send-telegram.js — 把週報推送到 Telegram（摘要訊息 + HTML 報告附件）
 *
 * 用法： node send-telegram.js <raw.json> <report.html> <config.json> [labels.json]
 *
 * 讀 config.telegram.{botToken, chatId}；未設定則靜默略過（非致命）。
 * 全程使用 curl，不依賴任何 npm 套件。
 */
const fs = require('fs');
const { execFileSync } = require('child_process');

const [rawPath, reportPath, configPath, labelsPath] = process.argv.slice(2);
const readJSON = (p, d) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; }
};

const data = readJSON(rawPath, null);
const config = readJSON(configPath, {});
const labels = readJSON(labelsPath, {});
const tg = config.telegram || {};

if (!tg.botToken || !tg.chatId) {
  console.error('⚠️  未設定 Telegram（config.telegram.botToken / chatId 為空），略過推送。');
  console.error('   首次設定： node ~/.claude/skills/ai-usage-report/scripts/setup-telegram.js <botToken>');
  process.exit(0); // 非致命：沒設定就是不推，不該讓整個報告流程失敗
}
if (!data) { console.error('send-telegram: 讀不到 raw.json'); process.exit(1); }

// ---------- 組摘要 ----------
const m = data.meta || {};
const totals = data.usage && data.usage.totals ? data.usage.totals : null;
const tokenValue = totals ? totals.totalCost : null;
const fee = Number(config.monthlyFeeUSD) || 0;
const roi = fee > 0 && tokenValue != null ? tokenValue / fee : null;
const twd = Number(config.usdToTwd) || 32;

const cnt = {};
for (const sid in labels) cnt[labels[sid]] = (cnt[labels[sid]] || 0) + 1;
const top = Object.entries(cnt)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([k, v]) => `${k}(${v})`)
  .join('、');

const summary = [
  `📊 ${config.userName || '(未命名)'} 的 AI 使用週報`,
  `🗓 ${m.periodStart} ~ ${m.periodEnd}（${m.days} 天）`,
  tokenValue != null
    ? `💰 Token 價值 $${tokenValue.toFixed(2)}（≈ NT$${Math.round(tokenValue * twd).toLocaleString('en-US')}）`
    : '💰 Token 價值：未取得',
  roi != null ? `📈 投入產出比 ROI ${roi.toFixed(1)}×（月租 $${fee}）` : null,
  `🔥 活躍 ${data.activeDays}/${m.days} 天 · ${data.sessionCount} 對話 · ${data.totalUserMessages} 提問`,
  top ? `🏷 主要情境：${top}` : null,
  m.account ? `🖥 來源：${m.account}@${m.host}` : null,
].filter(Boolean).join('\n');

const api = (method) => `https://api.telegram.org/bot${tg.botToken}/${method}`;
const curl = (args) => execFileSync('curl', ['-s', ...args], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });

// ---------- 1. 推摘要訊息 ----------
try {
  const out = curl([
    '-X', 'POST', api('sendMessage'),
    '-d', `chat_id=${tg.chatId}`,
    '--data-urlencode', `text=${summary}`,
    '-d', 'disable_web_page_preview=true',
  ]);
  const j = JSON.parse(out || '{}');
  if (!j.ok) throw new Error(j.description || out);
  console.log('✓ 摘要已推送至 Telegram');
} catch (e) {
  console.error('✗ 摘要推送失敗：', String(e.message).slice(0, 200));
  process.exit(1);
}

// ---------- 2. 推 HTML 報告附件 ----------
if (reportPath && fs.existsSync(reportPath)) {
  try {
    const out = curl([
      '-X', 'POST', api('sendDocument'),
      '-F', `chat_id=${tg.chatId}`,
      '-F', `document=@${reportPath};type=text/html`,
      '--form-string', `caption=📎 ${config.userName || ''} 完整報告 ${m.periodStart}~${m.periodEnd}`,
    ]);
    const j = JSON.parse(out || '{}');
    if (!j.ok) throw new Error(j.description || out);
    console.log('✓ HTML 報告已推送至 Telegram');
  } catch (e) {
    console.error('✗ 報告附件推送失敗（摘要已送達）：', String(e.message).slice(0, 200));
  }
} else {
  console.error('（找不到報告檔，僅推送摘要）');
}
