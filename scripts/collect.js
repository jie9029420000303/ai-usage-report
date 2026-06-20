#!/usr/bin/env node
/*
 * collect.js — AI 使用週報的「資料收集層」（確定性，不做語意判斷）
 *
 * 做兩件事：
 *   1. 跑 ccusage 撈本機 Claude Code 的 token 用量與花費（= token 價值）
 *   2. 掃 ~/.claude/projects 的 session 日誌，抽出每個對話的 metadata
 *
 * 輸出：一份 JSON（stdout），交給上層由 Claude 做情境歸納、再交給 render.js 產 HTML。
 *
 * 用法： node collect.js --days 7 --timezone Asia/Taipei
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ---------- 參數 ----------
const argv = process.argv.slice(2);
function getArg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const DAYS = Math.max(1, parseInt(getArg('--days', '7'), 10) || 7);
const TZ = getArg('--timezone', 'Asia/Taipei');

// ---------- 日期範圍 ----------
const now = new Date();
const since = new Date(now);
since.setDate(since.getDate() - (DAYS - 1)); // 含今天，共 N 個日曆日
since.setHours(0, 0, 0, 0);
const sinceMs = since.getTime();
const nowMs = now.getTime();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ymdCompact = (d) => ymd(d).replace(/-/g, '');

// ---------- 1. ccusage 用量（容錯，撈不到不致命）----------
let usage = null;
let usageError = null;
try {
  const out = execSync(
    `npx -y ccusage@latest claude daily --json --since ${ymdCompact(since)} --timezone ${TZ}`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 * 128, timeout: 120000 }
  );
  usage = JSON.parse(out);
} catch (e) {
  usageError = String((e && e.message) || e).slice(0, 300);
}

// ---------- 2. 掃 session 日誌 ----------
const projectsDir = path.join(os.homedir(), '.claude', 'projects');

function flattenText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'string' ? c : c && typeof c.text === 'string' ? c.text : ''))
      .join('');
  }
  return '';
}
// tool_result 是「工具回傳」不是使用者的提問，不計入呼叫次數
function isToolResult(content) {
  return Array.isArray(content) && content.some((c) => c && c.type === 'tool_result');
}
// 判斷是否像「人類自然語言提問」：排除程式組裝的 JSON/結構化 prompt，
// 避免標題變成亂碼或洩漏本機路徑（如 {"stage":"B","item_dir":"/Users/..."}）
function looksNatural(txt) {
  const t = txt.trim();
  if (t.length < 4) return false;
  if (/^[\[{<]/.test(t)) return false;
  if (/^(stage|approval_id|item_dir)\b|^"[\w-]+"\s*:/.test(t)) return false;
  return true;
}
// 專案目錄名 fallback：cwd 缺失時，從編碼過的目錄名取近似末段
function decodeProjectDir(pd) {
  const seg = pd.split('-').filter(Boolean);
  return seg.length ? seg[seg.length - 1] : pd;
}

const sessions = [];
let projectDirs = [];
try {
  projectDirs = fs.readdirSync(projectsDir);
} catch (e) {
  /* 沒有任何日誌目錄 */
}

for (const pd of projectDirs) {
  const pdPath = path.join(projectsDir, pd);
  let files;
  try {
    if (!fs.statSync(pdPath).isDirectory()) continue;
    files = fs.readdirSync(pdPath).filter((f) => f.endsWith('.jsonl'));
  } catch (e) {
    continue;
  }

  for (const f of files) {
    const fp = path.join(pdPath, f);
    // mtime 預篩：最後修改早於統計起點的 session，不可能有範圍內訊息 → 直接跳過（大幅省時）
    let st;
    try {
      st = fs.statSync(fp);
    } catch (e) {
      continue;
    }
    if (st.mtimeMs < sinceMs) continue;

    let raw;
    try {
      raw = fs.readFileSync(fp, 'utf8');
    } catch (e) {
      continue;
    }

    let aiTitle = null;
    let firstPrompt = null;
    let cwd = null;
    let userMsgCount = 0;
    let inOutTokens = 0;
    let minTs = null;
    let maxTs = null;
    let inRange = false;

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch (e) {
        continue;
      }

      const ts = o.timestamp ? Date.parse(o.timestamp) : NaN;
      if (!isNaN(ts)) {
        if (minTs === null || ts < minTs) minTs = ts;
        if (maxTs === null || ts > maxTs) maxTs = ts;
        if (ts >= sinceMs && ts <= nowMs) inRange = true;
      }

      if (o.type === 'ai-title' && o.aiTitle) aiTitle = o.aiTitle;

      if (o.type === 'user' && o.message) {
        const content = o.message.content;
        if (!isToolResult(content)) {
          const txt = flattenText(content).trim();
          if (txt) {
            userMsgCount++;
            if (!firstPrompt && looksNatural(txt)) firstPrompt = txt.slice(0, 120);
          }
        }
        if (!cwd && o.cwd) cwd = o.cwd;
      }

      if (o.type === 'assistant' && o.message && o.message.usage) {
        const u = o.message.usage;
        // session 級用 input+output 反映實質工作量（cache read 量大且重複，不計入比較基準）
        inOutTokens += (u.input_tokens || 0) + (u.output_tokens || 0);
      }
    }

    // 只收「在統計區間內有真實活動」且「有真實提問」的 session
    if (!inRange || userMsgCount === 0) continue;

    sessions.push({
      sessionId: f.replace('.jsonl', ''),
      title: aiTitle || firstPrompt || '(自動化或未命名任務)',
      firstPrompt: firstPrompt || '',
      project: cwd ? path.basename(cwd) : decodeProjectDir(pd),
      projectPath: cwd || '',
      userMsgCount,
      tokens: inOutTokens,
      startTime: minTs ? new Date(minTs).toISOString() : null,
      endTime: maxTs ? new Date(maxTs).toISOString() : null,
      date: maxTs ? ymd(new Date(maxTs)) : null,
    });
  }
}

sessions.sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));

// ---------- 3. 輸出 ----------
const result = {
  meta: {
    generatedAt: `${ymd(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    periodStart: ymd(since),
    periodEnd: ymd(now),
    days: DAYS,
    timezone: TZ,
    host: (() => { try { return os.hostname(); } catch (e) { return ''; } })(),
    account: (() => { try { return os.userInfo().username; } catch (e) { return ''; } })(),
  },
  usage, // ccusage 原始（daily + totals），或 null
  usageError, // 撈不到時的錯誤摘要
  sessions,
  sessionCount: sessions.length,
  totalUserMessages: sessions.reduce((s, x) => s + x.userMsgCount, 0),
  activeDays: new Set(sessions.map((s) => s.date).filter(Boolean)).size,
};
process.stdout.write(JSON.stringify(result, null, 2));
