#!/bin/bash
# B-011 独立 logcat 采集脚本
# 用法: bash scripts/capture-logs.sh [秒数]
# 默认采集 30 秒日志，可指定持续时间
set -euo pipefail

ADB="${ANDROID_HOME:-/home/wgj/android-sdk}/platform-tools/adb"
PKG="com.wgjcode.notes"
DURATION=${1:-30}
OUTPUT_DIR="test-results/logcat_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

log() { echo "[$(date +%H:%M:%S)] $1"; }

# 检查设备
if ! $ADB devices | grep -qw "device$"; then
  echo "❌ 未检测到 ADB 设备"
  exit 1
fi

log "开始采集日志（${DURATION}秒）..."
log "输出目录: $OUTPUT_DIR"

# 清空旧日志
$ADB logcat -c 2>/dev/null

# 启动 App
log "启动 App..."
$ADB shell am start -n "$PKG"/.MainActivity 2>/dev/null
sleep 2

# 等待指定时间
log "等待 ${DURATION} 秒采集日志..."
sleep "$DURATION"

# 采集完整日志
$ADB logcat -d > "$OUTPUT_DIR/logcat_full.txt" 2>/dev/null
FULL_LINES=$(wc -l < "$OUTPUT_DIR/logcat_full.txt")
log "完整日志: $FULL_LINES 行"

# 采集 App 相关日志（过滤包名和关键 tag）
$ADB logcat -d | grep -i "$PKG\|react\|expo\|sherpa\|netinfo\|offline\|sync" > "$OUTPUT_DIR/logcat_app.txt" 2>/dev/null
APP_LINES=$(wc -l < "$OUTPUT_DIR/logcat_app.txt")
log "App 日志: $APP_LINES 行"

# 采集错误日志
$ADB logcat -d -s "AndroidRuntime:E" "ReactNativeJS:E" "System.err:W" > "$OUTPUT_DIR/logcat_errors.txt" 2>/dev/null
ERR_LINES=$(wc -l < "$OUTPUT_DIR/logcat_errors.txt")
log "错误日志: $ERR_LINES 行"

# 截图
$ADB shell screencap -p /sdcard/logcat_screenshot.png 2>/dev/null
$ADB pull /sdcard/logcat_screenshot.png "$OUTPUT_DIR/screenshot.png" 2>/dev/null
$ADB shell rm /sdcard/logcat_screenshot.png 2>/dev/null
log "截图: $OUTPUT_DIR/screenshot.png"

# 报告
log ""
log "========================================"
log "  日志采集完成"
log "  完整日志: $FULL_LINES 行"
log "  App 日志: $APP_LINES 行"
log "  错误日志: $ERR_LINES 行"
log "  截图: $OUTPUT_DIR/screenshot.png"
log "  目录: $OUTPUT_DIR"
log "========================================"
