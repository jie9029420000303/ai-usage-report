#!/usr/bin/env node
/*
 * aggregate.js — 主管端：把一個資料夾內的多份 summary-*.json 彙整成 ROI 排行榜 HTML
 *
 * 用法： node aggregate.js <含 summary-*.json 的資料夾> > 排行榜.html
 *
 * 排行榜以 ROI 降序排列，顏色標示積極／普通／偏低，一頁看完誰積極誰混。
 */
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) {
  console.error('用法： node aggregate.js <含 summary-*.json 的資料夾> > 排行榜.html');
  process.exit(1);
}
let files;
try {
  files = fs.readdirSync(dir).filter((f) => /^summary-.*\.json$/.test(f));
} catch (e) {
  console.error('讀不到資料夾：', dir);
  process.exit(1);
}
if (!files.length) {
  console.error('資料夾內沒有 summary-*.json（請先讓同事跑技能、把摘要檔收集到此資料夾）');
  process.exit(1);
}

const rows = [];
for (const f of files) {
  try { rows.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch (e) { /* 跳過壞檔 */ }
}
rows.sort((a, b) => (b.roi || 0) - (a.roi || 0));

// ---------- 工具 ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtInt = (n) => Math.round(n || 0).toLocaleString('en-US');
const fmtUSD = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ROI 分級
function tier(roi) {
  if (roi == null) return { label: '無資料', cls: 'na' };
  if (roi >= 5) return { label: '積極', cls: 'good' };
  if (roi >= 2) return { label: '普通', cls: 'mid' };
  return { label: '偏低', cls: 'low' };
}

const valid = rows.filter((r) => r.roi != null);
const avgRoi = valid.length ? valid.reduce((s, r) => s + r.roi, 0) / valid.length : 0;
const period = rows[0] ? rows[0].period : '';
const lowCount = valid.filter((r) => r.roi < 2).length;

const tableRows = rows.map((r, i) => {
  const t = tier(r.roi);
  const rank = i + 1;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
  const ctx = (r.topContexts || []).slice(0, 2).map((c) => `${c[0]}(${c[1]})`).join('、');
  const src = r.account ? `${esc(r.account)}@${esc(r.host || '')}` : '';
  return `<tr class="t-${t.cls}">
    <td class="rank">${medal}</td>
    <td class="who"><div class="name">${esc(r.userName)}</div><div class="src">${src}</div></td>
    <td class="roi"><span class="roi-val">${r.roi != null ? r.roi.toFixed(1) + '×' : '—'}</span></td>
    <td class="num">${r.tokenValueUSD != null ? fmtUSD(r.tokenValueUSD) : '—'}</td>
    <td class="num">${fmtInt(r.sessions)}</td>
    <td class="num">${fmtInt(r.userMessages)}</td>
    <td class="num">${r.activeDays != null ? r.activeDays + '/' + r.days : '—'}</td>
    <td class="ctx">${esc(ctx)}</td>
    <td><span class="badge ${t.cls}">${t.label}</span></td>
  </tr>`;
}).join('');

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI 使用週報 · 團隊排行榜 · ${esc(period)}</title>
<style>
  :root { --ink:#1e293b; --muted:#64748b; --line:#e2e8f0; --bg:#f1f5f9; --brand:#1e3a5f; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei",sans-serif; line-height:1.55; }
  .wrap { max-width:960px; margin:0 auto; padding:32px 24px 64px; }
  header.r { background:linear-gradient(135deg,#1e3a5f,#2c5282); color:#fff; border-radius:16px; padding:26px 30px; margin-bottom:22px; }
  header.r h1 { margin:0 0 4px; font-size:23px; }
  header.r .meta { font-size:14px; opacity:.85; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
  .kpi { background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; }
  .kpi .l { font-size:13px; color:var(--muted); }
  .kpi .v { font-size:24px; font-weight:700; margin-top:4px; }
  section { background:#fff; border:1px solid var(--line); border-radius:14px; padding:8px 8px 4px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th,td { padding:11px 12px; text-align:left; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:12.5px; background:#f8fafc; }
  td.num,th.num { text-align:right; font-variant-numeric:tabular-nums; }
  tr:last-child td { border-bottom:none; }
  .rank { font-size:17px; font-weight:700; text-align:center; width:46px; color:#475569; }
  .who .name { font-weight:600; }
  .who .src { font-size:11.5px; color:#94a3b8; font-variant-numeric:tabular-nums; }
  .roi-val { font-size:19px; font-weight:800; }
  .t-good .roi-val { color:#16a34a; }
  .t-mid .roi-val { color:#ca8a04; }
  .t-low .roi-val { color:#dc2626; }
  .t-low { background:#fef2f2; }
  .ctx { color:#475569; font-size:12.5px; max-width:230px; }
  .badge { display:inline-block; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }
  .badge.good { background:#dcfce7; color:#15803d; }
  .badge.mid { background:#fef9c3; color:#a16207; }
  .badge.low { background:#fee2e2; color:#b91c1c; }
  .badge.na { background:#f1f5f9; color:#64748b; }
  footer.note { font-size:12px; color:var(--muted); margin-top:18px; line-height:1.7; }
  @media (max-width:680px){ .kpis{grid-template-columns:repeat(2,1fr);} .ctx{display:none;} }
  @media print { body{background:#fff;} }
</style>
</head>
<body>
<div class="wrap">
  <header class="r">
    <h1>AI 使用週報 · 團隊排行榜</h1>
    <div class="meta">統計期間 ${esc(period)} · 共 ${rows.length} 人 · 依投入產出比（ROI）排序</div>
  </header>

  <div class="kpis">
    <div class="kpi"><div class="l">參與人數</div><div class="v">${rows.length}</div></div>
    <div class="kpi"><div class="l">平均 ROI</div><div class="v">${avgRoi.toFixed(1)}×</div></div>
    <div class="kpi"><div class="l">最高 ROI</div><div class="v" style="color:#16a34a">${valid.length ? valid[0].roi.toFixed(1) + '×' : '—'}</div></div>
    <div class="kpi"><div class="l">ROI 偏低（&lt;2×）</div><div class="v" style="color:${lowCount ? '#dc2626' : '#16a34a'}">${lowCount} 人</div></div>
  </div>

  <section>
    <table>
      <thead><tr>
        <th class="rank">#</th><th>成員</th><th>ROI</th><th class="num">Token 價值</th>
        <th class="num">對話</th><th class="num">提問</th><th class="num">活躍</th><th>主要情境</th><th>狀態</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>

  <footer class="note">
    <p>ROI＝該成員本期 Token 價值 ÷ 月租費率（衡量使用強度與投入產出，數字越高代表越積極運用 AI）。Token 價值為 ccusage 依 API 定價估算，非實際帳單。</p>
    <p>分級：積極 ≥ 5× · 普通 2–5× · 偏低 &lt; 2×。資料來源為各成員本機系統日誌，每人一份 summary 檔彙整而成。</p>
  </footer>
</div>
</body>
</html>`;

process.stdout.write(html);
