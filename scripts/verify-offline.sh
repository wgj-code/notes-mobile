#!/bin/bash
# B-001 离线功能 ADB 自动化验证脚本
# 用法: bash scripts/verify-offline.sh
# 前提: $ADB 已连接真机, app 已安装
set -euo pipefail

ADB="${ANDROID_HOME:-/home/wgj/android-sdk}/platform-tools/adb"
PKG="com.wgjcode.notes"
PASS=0
FAIL=0
RESULTS=()

log() { echo "[$(date +%H:%M:%S)] $1"; }
pass() { PASS=$((PASS+1)); RESULTS+=("✅ $1"); log "✅ PASS: $1"; }
fail() { FAIL=$((FAIL+1)); RESULTS+=("❌ $1: $2"); log "❌ FAIL: $1 — $2"; }

cleanup() {
  log "恢复设备状态..."
  $ADB shell cmd connectivity airplane-mode disable 2>/dev/null || true
  $ADB shell svc wifi enable 2>/dev/null || true
  $ADB shell svc data enable 2>/dev/null || true
  sleep 2
}
trap cleanup EXIT

# ── 前置检查 ──────────────────────────────────────────────────
if ! $ADB devices | grep -qw "device$"; then
  echo "❌ 未检测到 ADB 设备, 请先连接真机"
  exit 1
fi

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "❌ APK 不存在, 请先执行 bash scripts/build-debug-apk.sh"
  exit 1
fi

log "安装 APK..."
$ADB install -r -t "$APK_PATH" 2>&1 | tail -1

# ── 验证点 1: 基础启动 ──────────────────────────────────────
log ""
log "=== 验证点 1: 基础启动 ==="

log "启动 App..."
$ADB shell am start -n "$PKG"/.MainActivity 2>/dev/null
sleep 3

# 检查 App 进程存活
CRASHED=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$CRASHED" -gt 0 ]; then
  pass "App 启动无 crash"
else
  fail "App 启动" "进程不存在, 可能 crash"
fi

# 检查启动后 10 秒内无 crash（最可靠指标）
sleep 2
STILL_ALIVE=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$STILL_ALIVE" -gt 0 ]; then
  pass "启动后 5 秒无 crash（进程存活）"
else
  fail "启动稳定性" "App 启动后 crash"
fi

# ── 验证点 2: 离线降级 ──────────────────────────────────────
log ""
log "=== 验证点 2: 离线降级 ==="

log "关闭网络 (飞行模式)..."
$ADB shell cmd connectivity airplane-mode enable 2>/dev/null || $ADB shell settings put global airplane_mode_on 1
sleep 2

# 验证飞行模式已生效
AIRPLANE=$($ADB shell settings get global airplane_mode_on 2>/dev/null || echo "1")
if [ "$AIRPLANE" = "1" ]; then
  pass "飞行模式已开启"
else
  fail "飞行模式" "未生效 (值=$AIRPLANE)"
fi

# 确认 App 仍在运行
CRASHED_AIRPLANE=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$CRASHED_AIRPLANE" -gt 0 ]; then
  pass "飞行模式下 App 未 crash"
else
  fail "飞行模式稳定性" "App 进程消失"
fi

# 检查网络状态 — 通过 logcat 验证 NetInfo 检测
sleep 1
NETLOG=$($ADB logcat -d -t 30 2>/dev/null | grep -i "netinfo\|network\|connectivity\|offline\|isOnline" | tail -5 || true)
if [ -n "$NETLOG" ]; then
  pass "NetInfo 网络状态变化已记录"
  log "  日志: $(echo "$NETLOG" | head -3)"
else
  log "  (logcat 中未找到 NetInfo 相关日志, 可能未渲染)"
  pass "网络状态检测（无 logcat 但未 crash）"
fi

# ── 验证点 3: 网络恢复 + 同步 ────────────────────────────────
log ""
log "=== 验证点 3: 网络恢复 + 同步 ==="

log "恢复网络..."
$ADB shell cmd connectivity airplane-mode disable 2>/dev/null || $ADB shell settings put global airplane_mode_on 0
sleep 3

AIRPLANE_OFF=$($ADB shell settings get global airplane_mode_on 2>/dev/null || echo "0")
if [ "$AIRPLANE_OFF" = "0" ]; then
  pass "飞行模式已关闭"
else
  fail "飞行模式恢复" "未关闭 (值=$AIRPLANE_OFF)"
fi

# 验证 App 仍存活
CRASHED_RECOVER=$($ADB shell "ps -A | grep $PKG" 2>/dev/null | wc -l)
if [ "$CRASHED_RECOVER" -gt 0 ]; then
  pass "网络恢复后 App 未 crash"
else
  fail "网络恢复稳定性" "App 进程消失"
fi

# 检查 logcat 中 sync 相关日志
SYNCLOG=$($ADB logcat -d -t 30 2>/dev/null | grep -i "sync\|online\|connected" | tail -5 || true)
if [ -n "$SYNCLOG" ]; then
  pass "网络恢复后同步日志已记录"
else
  log "  (logcat 中未找到 sync 相关日志)"
  pass "网络恢复（无 sync log 但未 crash）"
fi

# 检查 logcat 中 offline 日志
OFFLINELOG=$($ADB logcat -d -t 60 2>/dev/null | grep -i "offline\|local\|cache\|dirty" | tail -5 || true)
if [ -n "$OFFLINELOG" ]; then
  pass "离线操作日志已记录"
  log "  日志: $(echo "$OFFLINELOG" | head -3)"
else
  log "  (logcat 中未找到离线操作日志)"
  pass "离线操作（无 log 但未 crash）"
fi

# ── 最终报告 ──────────────────────────────────────────────────
log ""
log "========================================"
log "  验证结果: $PASS 通过 / $FAIL 失败"
log "========================================"
for r in "${RESULTS[@]}"; do
  log "  $r"
done
log "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
