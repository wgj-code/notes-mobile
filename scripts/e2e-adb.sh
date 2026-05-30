#!/bin/bash
# B-003 E2E 验证脚本（adb 命令模拟）
# 用法: bash scripts/e2e-adb.sh
set -euo pipefail

ADB="/home/wgj/android-sdk/platform-tools/adb"
PKG="com.wgjcode.notes"
PASS=0
FAIL=0
RESULTS=()

log() { echo "[$(date +%H:%M:%S)] $1"; }
pass() { PASS=$((PASS+1)); RESULTS+=("✅ $1"); log "✅ PASS: $1"; }
fail() { FAIL=$((FAIL+1)); RESULTS+=("❌ $1: $2"); log "❌ FAIL: $1 — $2"; }

# 通过 resource-id 获取元素坐标
get_bounds_by_id() {
  local rid="$1"
  $ADB shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  $ADB pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  grep -oP "resource-id=\"${rid}\"[^>]*bounds=\"\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]\"" /tmp/ui.xml | head -1 | grep -oP 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | sed 's/bounds="//;s/"//'
}

# 通过 content-desc 获取元素坐标
get_bounds_by_desc() {
  local desc="$1"
  $ADB shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  $ADB pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  grep -oP "content-desc=\"[^\"]*${desc}[^\"]*\"[^>]*bounds=\"\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]\"" /tmp/ui.xml | head -1 | grep -oP 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | sed 's/bounds="//;s/"//'
}

# 计算元素中心点坐标
tap_element() {
  local bounds="$1"
  local x1=$(echo "$bounds" | grep -oP '\[([0-9]+),' | head -1 | tr -dc '0-9')
  local y1=$(echo "$bounds" | grep -oP ',([0-9]+)\]' | head -1 | tr -dc '0-9')
  local x2=$(echo "$bounds" | grep -oP '\[([0-9]+),' | tail -1 | tr -dc '0-9')
  local y2=$(echo "$bounds" | grep -oP ',([0-9]+)\]' | tail -1 | tr -dc '0-9')
  local cx=$(( (x1 + x2) / 2 ))
  local cy=$(( (y1 + y2) / 2 ))
  $ADB shell input tap $cx $cy
  sleep 1
}

# ── 验证点 1: 基础启动 ──────────────────────────────────────
log ""
log "=== 验证点 1: 基础启动 ==="

log "启动 App..."
$ADB shell am start -n "$PKG"/.MainActivity 2>/dev/null
sleep 3

ALIVE=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$ALIVE" -gt 0 ]; then
  pass "App 启动无 crash"
else
  fail "App 启动" "进程不存在"
fi

# ── 验证点 2: CRUD 流程 ──────────────────────────────────────
log ""
log "=== 验证点 2: CRUD 流程 ==="

# 等待 App 加载
sleep 2

# 点击 FAB 新建笔记
FAB_BOUNDS=$(get_bounds_by_id "fab-create")
if [ -n "$FAB_BOUNDS" ]; then
  log "找到 FAB: $FAB_BOUNDS"
  tap_element "$FAB_BOUNDS"
  sleep 2
  pass "点击 FAB 新建笔记"

  # 选择空白笔记模板
  BLANK_BOUNDS=$(get_bounds_by_desc "空白笔记")
  if [ -n "$BLANK_BOUNDS" ]; then
    tap_element "$BLANK_BOUNDS"
    sleep 2
    pass "选择空白笔记模板"
  else
    fail "空白笔记模板" "未找到"
  fi
else
  fail "FAB 按钮" "未找到 fab-create"
fi

# 查找 note-title-input
TITLE_BOUNDS=$(get_bounds_by_id "note-title-input")
if [ -n "$TITLE_BOUNDS" ]; then
  tap_element "$TITLE_BOUNDS"
  sleep 1
  $ADB shell input text "E2E_Test_Note"
  sleep 1
  pass "输入标题"
else
  fail "标题输入框" "未找到 note-title-input"
fi

# 查找 note-content-editor 并输入内容
CONTENT_BOUNDS=$(get_bounds_by_id "note-content-editor")
if [ -n "$CONTENT_BOUNDS" ]; then
  tap_element "$CONTENT_BOUNDS"
  sleep 1
  $ADB shell input text "E2E test content"
  sleep 1
  pass "输入内容"
else
  fail "内容编辑器" "未找到 note-content-editor"
fi

# 点击保存
SAVE_BOUNDS=$(get_bounds_by_id "btn-save")
if [ -n "$SAVE_BOUNDS" ]; then
  tap_element "$SAVE_BOUNDS"
  sleep 2
  pass "点击保存"
else
  fail "保存按钮" "未找到 btn-save"
fi

# 验证笔记出现在列表中（通过 content-desc 匹配）
sleep 2
NOTE_BOUNDS=$(get_bounds_by_desc "E2E_Test_Note")
if [ -n "$NOTE_BOUNDS" ]; then
  pass "笔记出现在列表中"
else
  fail "笔记列表" "未找到 E2E_Test_Note"
fi

# ── 验证点 3: 飞行模式稳定性 ────────────────────────────────
log ""
log "=== 验证点 3: 飞行模式稳定性 ==="

$ADB shell cmd connectivity airplane-mode enable 2>/dev/null
sleep 2
ALIVE_AIRPLANE=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$ALIVE_AIRPLANE" -gt 0 ]; then
  pass "飞行模式下 App 未 crash"
else
  fail "飞行模式稳定性" "App 进程消失"
fi

$ADB shell cmd connectivity airplane-mode disable 2>/dev/null
sleep 2
ALIVE_RECOVER=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$ALIVE_RECOVER" -gt 0 ]; then
  pass "网络恢复后 App 未 crash"
else
  fail "网络恢复" "App 进程消失"
fi

# ── 最终报告 ──────────────────────────────────────────────────
log ""
log "========================================"
log "  E2E 验证结果: $PASS 通过 / $FAIL 失败"
log "========================================"
for r in "${RESULTS[@]}"; do
  log "  $r"
done
log "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
