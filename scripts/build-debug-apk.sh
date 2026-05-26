#!/bin/bash
# One-click debug APK build with JS bundle included.
# Usage: bash scripts/build-debug-apk.sh
# Output: android/app/build/outputs/apk/debug/app-debug.apk
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

export ANDROID_HOME=${ANDROID_HOME:-/home/wgj/android-sdk}

echo "=== [1/4] Applying postinstall patches ==="
node scripts/postinstall-patches.js

echo "=== [2/4] Bundling JS into Android assets ==="
mkdir -p android/app/src/main/assets

# Copy TTS model to Android assets (sherpa-onnx assetModelPath reads from here)
MODEL_SRC="$PROJECT_DIR/assets/models/kokoro-int8-multi-lang-v1_1"
MODEL_DST="$PROJECT_DIR/android/app/src/main/assets/models/kokoro-int8-multi-lang-v1_1"
if [ -d "$MODEL_SRC" ] && [ ! -d "$MODEL_DST" ]; then
  mkdir -p "$PROJECT_DIR/android/app/src/main/assets/models"
  cp -r "$MODEL_SRC" "$MODEL_DST"
  echo "  Copied TTS model ($(du -sh "$MODEL_DST" | cut -f1))"
fi

# Load .env variables for the bundle
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "  Loaded .env ($(grep -c EXPO_PUBLIC .env) EXPO_PUBLIC_* vars)"
fi

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo/AppEntry.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --reset-cache

echo "=== [3/4] Building debug APK ==="
cd android
./gradlew assembleDebug

echo "=== [4/4] Done ==="
APK="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  SIZE=$(du -h "$APK" | cut -f1)
  echo "APK: $APK ($SIZE)"
  echo "Windows: \\\\wsl.localhost\\Ubuntu1\\home\\wgj\\6a-demo-notes\\repos\\notes-mobile\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk"
else
  echo "ERROR: APK not found!"
  exit 1
fi
