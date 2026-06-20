#!/usr/bin/env bash
# deploy.sh — 把這個 repo 同步到 Claude Code 技能目錄（執行副本）
#
# 為什麼需要：這個 repo（在工作目錄）是「開發主體」，你在這裡改程式、git commit/push。
#            但 Claude Code 技能與排程實際執行的，是 ~/.claude/skills/ai-usage-report
#            的副本（技能必須是該目錄底下的真實資料夾，無法用 symlink 指過來）。
#            所以改完程式碼後跑這個，把最新版同步到技能目錄，技能/排程才會用到。
#
# 用法： bash deploy.sh

set -e
SKILL="$HOME/.claude/skills/ai-usage-report"
SRC="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$SKILL"
# 同步程式碼與設定到技能目錄；排除 git 內部與打包產物
rsync -a --exclude='.git' --exclude='*.zip' --exclude='deploy.sh' "$SRC/" "$SKILL/"

echo "✓ 已同步到技能目錄：$SKILL"
echo "  技能與每週排程現在都會用到最新版。"
