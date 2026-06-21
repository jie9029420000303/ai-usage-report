#!/usr/bin/env node
/*
 * render.js — AI 使用週報的「呈現層」（確定性：聚合統計 + 產出 HTML）
 *
 * 輸入：
 *   raw.json     collect.js 的輸出（meta / usage / sessions）
 *   labels.json  情境標籤對照 { sessionId: "情境名" }（由 Claude 自由歸納後寫入）
 *   config.json  { userName, usdToTwd, telegram }
 *
 * 輸出：一份自包含 HTML（內嵌 CSS 與 SVG 圖表，離線可開、可列印）
 *
 * 用法： node render.js raw.json labels.json config.json > report.html
 */
const fs = require('fs');

const [rawPath, labelsPath, configPath] = process.argv.slice(2);
const readJSON = (p, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return fallback;
  }
};

const data = readJSON(rawPath, null);
if (!data) {
  console.error('render.js: 讀不到 raw.json');
  process.exit(1);
}
const labels = readJSON(labelsPath, {});
const config = Object.assign(
  { userName: '（未設定）', usdToTwd: 32 },
  readJSON(configPath, {})
);

// ---------- 工具 ----------
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtInt = (n) => Math.round(n || 0).toLocaleString('en-US');
const fmtTok = (n) => {
  n = n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};
const fmtUSD = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PALETTE = ['#2563eb', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#0d9488', '#9333ea', '#dc2626', '#64748b', '#475569'];

// ---------- 聚合：情境分布 ----------
const sessions = data.sessions || [];
sessions.forEach((s) => {
  s.context = labels[s.sessionId] || '未分類';
});
const ctxMap = new Map();
for (const s of sessions) {
  if (!ctxMap.has(s.context)) ctxMap.set(s.context, { name: s.context, sessionCount: 0, userMessages: 0, tokens: 0, examples: [] });
  const c = ctxMap.get(s.context);
  c.sessionCount++;
  c.userMessages += s.userMsgCount;
  c.tokens += s.tokens;
  if (c.examples.length < 4) c.examples.push(s.title);
}
const contexts = [...ctxMap.values()].sort((a, b) => b.userMessages - a.userMessages);
contexts.forEach((c, i) => (c.color = PALETTE[i % PALETTE.length]));
const totalMsgs = contexts.reduce((s, c) => s + c.userMessages, 0) || 1;

// ---------- 聚合：用量 / 花費 ----------
const usage = data.usage || null;
const tokenValueUSD = usage && usage.totals ? usage.totals.totalCost : null;
const totalTokens = usage && usage.totals ? usage.totals.totalTokens : sessions.reduce((s, x) => s + x.tokens, 0);
const daily = usage && Array.isArray(usage.daily) ? usage.daily : [];
// 已移除月租/ROI：改以 token 價值（每人實際用量、跨方案可比）為核心指標

// 模型分布（跨日聚合 cost）
const modelMap = new Map();
for (const d of daily) {
  for (const m of d.modelBreakdowns || []) {
    modelMap.set(m.modelName, (modelMap.get(m.modelName) || 0) + (m.cost || 0));
  }
}
const models = [...modelMap.entries()].map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost);
const modelCostTotal = models.reduce((s, m) => s + m.cost, 0) || 1;

// ---------- SVG：圓餅圖 ----------
function polar(cx, cy, r, ang) {
  const a = ((ang - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function pieSVG(items, valKey) {
  const cx = 110, cy = 110, r = 100;
  const total = items.reduce((s, it) => s + it[valKey], 0) || 1;
  if (items.length === 1) {
    return `<svg viewBox="0 0 220 220" width="220" height="220"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${items[0].color}"/></svg>`;
  }
  let ang = 0;
  const paths = items
    .map((it) => {
      const frac = it[valKey] / total;
      const start = ang, end = ang + frac * 360;
      ang = end;
      const s = polar(cx, cy, r, end), e = polar(cx, cy, r, start);
      const large = end - start > 180 ? 1 : 0;
      return `<path d="M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z" fill="${it.color}"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 220 220" width="220" height="220">${paths}<circle cx="${cx}" cy="${cy}" r="52" fill="#fff"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="#1e293b">${items.length}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="#64748b">類情境</text></svg>`;
}

// ---------- SVG：每日花費長條圖 ----------
function barSVG(days) {
  if (!days.length) return '<p class="muted">（無每日用量數據）</p>';
  const W = 720, H = 220, pad = { l: 48, r: 16, t: 16, b: 40 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(...days.map((d) => d.totalCost || 0), 1);
  const bw = iw / days.length;
  const bars = days
    .map((d, i) => {
      const h = ((d.totalCost || 0) / max) * ih;
      const x = pad.l + i * bw + bw * 0.15;
      const y = pad.t + ih - h;
      const w = bw * 0.7;
      const label = (d.date || '').slice(5);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="3" fill="#2563eb"/>
        <text x="${(x + w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="#475569">${fmtUSD(d.totalCost || 0).replace('.00', '')}</text>
        <text x="${(x + w / 2).toFixed(1)}" y="${(pad.t + ih + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#94a3b8">${label}</text>`;
    })
    .join('');
  const axis = `<line x1="${pad.l}" y1="${pad.t + ih}" x2="${W - pad.r}" y2="${pad.t + ih}" stroke="#e2e8f0"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">${axis}${bars}</svg>`;
}

// ---------- 組裝 HTML ----------
const m = data.meta || {};
const twd = (usd) => '約 NT$' + fmtInt((usd || 0) * (Number(config.usdToTwd) || 32));

const summaryCards = [
  { label: '本期 Token 價值', value: tokenValueUSD != null ? fmtUSD(tokenValueUSD) : 'N/A', sub: tokenValueUSD != null ? 'API 定價估算 · ' + twd(tokenValueUSD) : 'ccusage 未取得' },
  { label: '總 Token 量', value: fmtTok(totalTokens), sub: '輸入＋輸出＋快取' },
  { label: '日均 Token 價值', value: tokenValueUSD != null && data.activeDays ? fmtUSD(tokenValueUSD / data.activeDays) : 'N/A', sub: '本期價值 ÷ 活躍天數' },
  { label: '活躍天數', value: data.activeDays + ' / ' + m.days, sub: '本期有實際使用的天數' },
  { label: '對話數', value: fmtInt(data.sessionCount), sub: '展開 ' + contexts.length + ' 類情境' },
  { label: '總提問次數', value: fmtInt(data.totalUserMessages), sub: '實際送出的指令／提問' },
];

const cardsHTML = summaryCards
  .map(
    (c) => `<div class="card"><div class="card-label">${esc(c.label)}</div><div class="card-value">${esc(c.value)}</div><div class="card-sub">${esc(c.sub)}</div></div>`
  )
  .join('');

const legendHTML = contexts
  .map((c) => {
    const pct = ((c.userMessages / totalMsgs) * 100).toFixed(1);
    return `<tr>
      <td><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</td>
      <td class="num">${fmtInt(c.sessionCount)}</td>
      <td class="num">${fmtInt(c.userMessages)}</td>
      <td class="num">${pct}%</td>
      <td class="num">${fmtTok(c.tokens)}</td>
    </tr>`;
  })
  .join('');

const examplesHTML = contexts
  .map(
    (c) => `<div class="ctx-block">
      <div class="ctx-head"><span class="dot" style="background:${c.color}"></span><strong>${esc(c.name)}</strong><span class="muted">（${c.sessionCount} 個對話）</span></div>
      <ul>${c.examples.map((e) => { const t = String(e); return `<li>${esc(t.slice(0, 56))}${t.length > 56 ? '…' : ''}</li>`; }).join('')}</ul>
    </div>`
  )
  .join('');

const modelsHTML = models.length
  ? models
      .map((mo) => {
        const pct = ((mo.cost / modelCostTotal) * 100).toFixed(1);
        return `<div class="mrow"><div class="mname">${esc(mo.name)}</div><div class="mbar"><div class="mbar-fill" style="width:${pct}%"></div></div><div class="mval">${fmtUSD(mo.cost)} · ${pct}%</div></div>`;
      })
      .join('')
  : '<p class="muted">（無模型分布數據）</p>';

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI 使用週報 · ${esc(config.userName)} · ${esc(m.periodStart)}~${esc(m.periodEnd)}</title>
<style>
  :root { --ink:#1e293b; --muted:#64748b; --line:#e2e8f0; --bg:#f1f5f9; --brand:#1e3a5f; --accent:#2563eb; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei",sans-serif; line-height:1.6; }
  .wrap { max-width:880px; margin:0 auto; padding:32px 24px 64px; }
  header.report { background:linear-gradient(135deg,#1e3a5f,#2c5282); color:#fff; border-radius:16px; padding:28px 32px; margin-bottom:24px; }
  header.report h1 { margin:0 0 4px; font-size:24px; letter-spacing:.5px; }
  header.report .meta { font-size:14px; opacity:.85; }
  header.report .who { margin-top:14px; font-size:15px; }
  header.report .who b { font-size:18px; }
  section { background:#fff; border:1px solid var(--line); border-radius:14px; padding:24px; margin-bottom:20px; }
  section h2 { margin:0 0 18px; font-size:17px; color:var(--brand); display:flex; align-items:center; gap:8px; }
  section h2::before { content:""; width:4px; height:18px; background:var(--accent); border-radius:2px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .card { background:#f8fafc; border:1px solid var(--line); border-radius:12px; padding:16px; }
  .card-label { font-size:13px; color:var(--muted); margin-bottom:6px; }
  .card-value { font-size:26px; font-weight:700; color:var(--ink); }
  .card-sub { font-size:12px; color:var(--muted); margin-top:4px; }
  .pie-row { display:flex; gap:28px; align-items:center; flex-wrap:wrap; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th,td { padding:9px 10px; text-align:left; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:12.5px; }
  td.num,th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  .muted { color:var(--muted); font-size:13px; }
  .ctx-block { margin-bottom:14px; }
  .ctx-head { font-size:14px; margin-bottom:4px; }
  .ctx-block ul { margin:4px 0 0; padding-left:30px; color:#475569; font-size:13px; }
  .ctx-block li { margin:2px 0; }
  .mrow { display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:13px; }
  .mname { width:160px; color:#334155; font-variant-numeric:tabular-nums; }
  .mbar { flex:1; background:#eef2f7; border-radius:6px; height:14px; overflow:hidden; }
  .mbar-fill { height:100%; background:linear-gradient(90deg,#2563eb,#0891b2); }
  .mval { width:150px; text-align:right; color:var(--muted); }
  footer.note { font-size:12px; color:var(--muted); line-height:1.7; }
  footer.note b { color:#475569; }
  @media (max-width:680px){ .grid{grid-template-columns:repeat(2,1fr);} .mname{width:120px;} .mval{width:110px;} }
  @media print { body{background:#fff;} section,header.report{break-inside:avoid;} .wrap{padding:0;} }
</style>
</head>
<body>
<div class="wrap">
  <header class="report">
    <h1>AI 使用週報</h1>
    <div class="meta">統計期間 ${esc(m.periodStart)} ～ ${esc(m.periodEnd)}（${esc(String(m.days))} 天） · 產生於 ${esc((m.generatedAt || '').slice(0, 16).replace('T', ' '))}</div>
    <div class="who">使用者：<b>${esc(config.userName)}</b></div>
  </header>

  <section>
    <h2>整體使用概況</h2>
    <div class="grid">${cardsHTML}</div>
  </section>

  <section>
    <h2>使用情境分布</h2>
    <div class="pie-row">
      <div>${pieSVG(contexts, 'userMessages')}</div>
      <div style="flex:1; min-width:320px;">
        <table>
          <thead><tr><th>情境類別</th><th class="num">對話數</th><th class="num">提問次數</th><th class="num">占比</th><th class="num">Token</th></tr></thead>
          <tbody>${legendHTML}</tbody>
        </table>
        <p class="muted" style="margin-top:8px">占比依「提問次數」計算。情境由 AI 依當期實際對話內容歸納。</p>
      </div>
    </div>
  </section>

  <section>
    <h2>每日用量趨勢（Token 價值）</h2>
    ${barSVG(daily)}
  </section>

  <section>
    <h2>模型使用分布（按花費）</h2>
    ${modelsHTML}
  </section>

  <section>
    <h2>各情境代表性對話</h2>
    ${examplesHTML}
  </section>

  <footer class="note">
    <p><b>資料來源：</b>本報告數據直接讀取本機 Claude Code 系統日誌（<code>~/.claude/projects</code>）與 <code>ccusage</code> 用量工具，非人工填報，難以造假。</p>
    <p><b>關於 Token 價值：</b>使用者為訂閱制（吃到飽），平台不揭露逐筆 token 計費；此處「Token 價值」為 <code>ccusage</code> 依公開 API 定價對等換算的估算值，用以衡量使用強度與投入產出比，非實際帳單金額。台幣為參考換算（1 USD = ${esc(String(config.usdToTwd))} TWD）。</p>
    <p><b>涵蓋範圍：</b>僅統計於 Claude Code 環境內的使用；其他平台（如 claude.ai 網頁版）的使用不在此報告中。</p>
  </footer>
</div>
</body>
</html>`;

process.stdout.write(html);
