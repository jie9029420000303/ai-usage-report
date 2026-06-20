#!/usr/bin/env node
/*
 * setup-telegram.js — Telegram 推送一次性設定精靈
 *
 * 用法： node setup-telegram.js <botToken>
 *
 * 前置：先用你的 Telegram「對這個 bot 發一句話」（私訊它，或把它加進群組後發一則訊息），
 *       再執行本指令。腳本會自動驗證 token、抓出 chat_id、寫入 config.json、發一則測試訊息。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const botToken = process.argv[2];
if (!botToken) {
  console.error('用法： node setup-telegram.js <botToken>');
  console.error('（botToken 由 Telegram 的 @BotFather 建立 bot 後給你，格式像 123456789:ABC-xxx）');
  process.exit(1);
}

const api = (method) => `https://api.telegram.org/bot${botToken}/${method}`;
const curlGet = (url) => execFileSync('curl', ['-s', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });

// ---------- 1. 驗證 token ----------
let me;
try {
  me = JSON.parse(curlGet(api('getMe')));
} catch (e) {
  console.error('✗ 連線 Telegram 失敗：', e.message);
  process.exit(1);
}
if (!me.ok) {
  console.error('✗ Bot Token 無效：', me.description);
  process.exit(1);
}
console.log(`✓ Bot 驗證成功：@${me.result.username}（${me.result.first_name}）`);

// ---------- 2. 抓 chat_id ----------
let upd;
try {
  upd = JSON.parse(curlGet(api('getUpdates')));
} catch (e) {
  console.error('✗ 取得對話失敗：', e.message);
  process.exit(1);
}
if (!upd.ok || !upd.result.length) {
  console.error('');
  console.error(`⚠️  抓不到對話。請先用你的 Telegram「對 @${me.result.username} 發一句話」`);
  console.error('   （私訊它，或把它加進群組後在群組發一則訊息），然後重跑本指令。');
  process.exit(2);
}
// 取最近一則含 chat 的更新
let chat = null;
for (let i = upd.result.length - 1; i >= 0; i--) {
  const r = upd.result[i];
  const c = (r.message || r.channel_post || r.my_chat_member || {}).chat;
  if (c) { chat = c; break; }
}
if (!chat) {
  console.error('✗ 解析不到 chat_id。請重新對 bot 發一則訊息後再試。');
  process.exit(2);
}
const chatId = String(chat.id);
const chatName = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || chatId;
console.log(`✓ 取得推送目標：${chatName}（chat_id=${chatId}）`);

// ---------- 3. 寫入 config.json ----------
const configPath = path.join(__dirname, '..', 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { /* 尚無 config，建新的 */ }
config.telegram = { botToken, chatId };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`✓ 已寫入設定：${configPath}`);

// ---------- 4. 發測試訊息 ----------
try {
  const out = execFileSync('curl', [
    '-s', '-X', 'POST', api('sendMessage'),
    '-d', `chat_id=${chatId}`,
    '--data-urlencode', 'text=✅ AI 使用週報：Telegram 推送設定完成，這是一則測試訊息。',
  ], { encoding: 'utf8' });
  const j = JSON.parse(out || '{}');
  if (j.ok) console.log('✓ 已發送測試訊息，請到 Telegram 確認收到。設定完成！');
  else console.error('測試訊息未送達：', j.description);
} catch (e) {
  console.error('測試訊息失敗：', e.message);
}
