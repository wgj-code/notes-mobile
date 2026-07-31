#!/bin/bash
# 一键发布 APK：版本同步 + 构建 + 上传服务器 + Edge Function 部署
# 用法: bash scripts/release-apk.sh [version] [releaseNote]
# 示例: bash scripts/release-apk.sh 0.1.91 "R1标题+R2标签+R3重试"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NEW_VERSION="${1:?用法: bash scripts/release-apk.sh <version> [releaseNote]}"
RELEASE_NOTE="${2:-}"

echo "=== APK 一键发布 ${NEW_VERSION} ==="

# 1. 版本同步（3处）
bash "$SCRIPT_DIR/sync-version.sh" "$NEW_VERSION"

# 2. 构建
bash "$SCRIPT_DIR/build-debug-apk.sh" --slim

# 2.5 部署 Edge Functions（防止遗漏）
echo "=== 部署 Edge Functions ==="
BACKEND_DIR="$(cd "$PROJECT_DIR/../notes-backend" && pwd)"
if [ -d "$BACKEND_DIR" ]; then
  bash "$BACKEND_DIR/scripts/deploy-backend.sh" || {
    echo "⚠️  Edge Function 部署失败，请手动检查"
  }
else
  echo "⚠️  后端目录不存在: $BACKEND_DIR"
fi

# 3. 上传到服务器
APK_SRC="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
SERVER_IP="8.133.196.220"
APK_DST="notes-v${NEW_VERSION}.apk"

echo "=== 上传 APK 到服务器 ==="
if scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$APK_SRC" "root@${SERVER_IP}:/opt/apk-releases/${APK_DST}"; then
  echo "✅ APK 已上传: http://${SERVER_IP}/apk/${APK_DST}"
else
  echo "❌ APK 上传失败！请手动上传："
  echo "   scp $APK_SRC root@${SERVER_IP}:/opt/apk-releases/${APK_DST}"
  exit 1
fi

# 4. 清理旧版本 APK（只保留最新）
echo "=== 清理旧版本 APK ==="
ssh -o StrictHostKeyChecking=no "root@${SERVER_IP}" "
  cd /opt/apk-releases 2>/dev/null && \
  ls notes-v*.apk 2>/dev/null | grep -v '${APK_DST}' | xargs -r rm -f && \
  echo '✅ 旧版本 APK 已清理' || echo '⚠️ 无需清理'
"

# 5. 更新服务端 version.json
ssh -o StrictHostKeyChecking=no "root@${SERVER_IP}" "cat > /opt/apk-releases/version.json << EOF
{
  \"current\": \"${NEW_VERSION}\",
  \"jsBundle\": \"${NEW_VERSION}\",
  \"apkVersion\": \"${NEW_VERSION}\",
  \"releaseNote\": \"${RELEASE_NOTE}\",
  \"apkUrl\": \"http://${SERVER_IP}/apk/${APK_DST}\"
}
EOF"
echo "✅ 服务端 version.json 已更新"

# 6. 验证
echo ""
echo "=== 验证 ==="
curl -s "http://${SERVER_IP}/api/version" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'服务端版本: {d[\"current\"]} | APK: {d[\"apkUrl\"]}')"
echo ""
echo "✅ 发布完成！用户打开 App → 设置 → 检查更新 即可升级"
