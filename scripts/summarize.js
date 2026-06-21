#!/usr/bin/env node
/*
 * summarize.js — 輸出一份精簡的 summary JSON，供主管端 aggregate.js 彙整成排行榜
 *
 * 用法： node summarize.js <raw.json> <labels.json> <config.json> [outDir]
 *
 * 落點優先序： outDir 參數 > config.aggregateDir（共享資料夾）> 家目錄
 * 檔名固定為 summary-<帳號>.json（每次覆蓋，主管掃資料夾就拿到每人最新一份）
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const [rawP, labP, cfgP, outDir] = process.argv.slice(2);
const rj = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };

const data = rj(rawP, null);
const labels = rj(labP, {});
const config = rj(cfgP, {});
if (!data) { console.error('summarize: 讀不到 raw.json'); process.exit(1); }

const m = data.meta || {};
const totals = data.usage && data.usage.totals ? data.usage.totals : null;
const tokenValueUSD = totals ? totals.totalCost : null;
const cnt = {};
for (const s in labels) cnt[labels[s]] = (cnt[labels[s]] || 0) + 1;
const topContexts = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);

const summary = {
  userName: config.userName || '(未命名)',
  account: m.account || '',
  host: m.host || '',
  period: `${m.periodStart}~${m.periodEnd}`,
  days: m.days,
  tokenValueUSD,
  usdToTwd: Number(config.usdToTwd) || 32,
  activeDays: data.activeDays,
  sessions: data.sessionCount,
  userMessages: data.totalUserMessages,
  topContexts,
  generatedAt: m.generatedAt,
};

const dir = outDir || config.aggregateDir || os.homedir();
const safe = String(summary.account || summary.userName || 'user').replace(/[^\w.-]/g, '_');
const out = path.join(dir, `summary-${safe}.json`);
try {
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log('✓ 摘要數據已輸出：' + out);
} catch (e) {
  console.error('summary 輸出失敗：', e.message);
  process.exit(1);
}
