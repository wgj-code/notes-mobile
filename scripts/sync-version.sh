#!/bin/bash
# 版本号全局同步脚本
# 用法: bash scripts/sync-version.sh 0.1.88
# 同时修改: app.json version + build.gradle versionName + 服务端 version.json

set -e

NEW_VERSION="${1:?用法: bash scripts/sync-version.sh <version>}"
SERVER_IP="8.133.196.220"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 同步版本号到 ${NEW_VERSION} ==="

# 1. app.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION}\"/" "$PROJECT_DIR/app.json"
echo "✅ app.json → ${NEW_VERSION}"

# 2. build.gradle
sed -i "s/versionName \"[^\"]*\"/versionName \"${NEW_VERSION}\"/" "$PROJECT_DIR/android/app/build.gradle"
echo "✅ build.gradle → ${NEW_VERSION}"

# 3. 服务端 version.json
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "cat > /opt/apk-releases/version.json << EOF
{
  \"current\": \"${NEW_VERSION}\",
  \"jsBundle\": \"${NEW_VERSION}\",
  \"apkVersion\": \"${NEW_VERSION}\",
  \"releaseNote\": \"\",
  \"apkUrl\": \"http://${SERVER_IP}/apk/notes-v${NEW_VERSION}.apk\"
}
EOF"
echo "✅ 服务端 version.json → ${NEW_VERSION}"

# 4. 验证
echo ""
echo "=== 验证 ==="
grep '"version"' "$PROJECT_DIR/app.json"
grep 'versionName' "$PROJECT_DIR/android/app/build.gradle" | head -1
curl -s "http://${SERVER_IP}/api/version" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'服务端: {d[\"current\"]}')"
echo ""
echo "✅ 三版本号已同步到 ${NEW_VERSION}"
