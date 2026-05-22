#!/bin/bash
# Manually link sherpa-onnx + react-native-fs native modules after expo prebuild
# Run this after `npx expo prebuild --clean`

SETTINGS="android/settings.gradle"
BUILD="android/app/build.gradle"

# Link react-native-sherpa-onnx
SHERPA_DIR="../node_modules/react-native-sherpa-onnx/android"
if ! grep -q "react-native-sherpa-onnx" "$SETTINGS"; then
  sed -i "/include ':app'/a include ':react-native-sherpa-onnx'\nproject(':react-native-sherpa-onnx').projectDir = new File(rootProject.projectDir, '$SHERPA_DIR')" "$SETTINGS"
  echo "Added sherpa-onnx to settings.gradle"
fi
if ! grep -q "react-native-sherpa-onnx" "$BUILD"; then
  sed -i "/dependencies {/a\\    implementation project(':react-native-sherpa-onnx')" "$BUILD"
  echo "Added sherpa-onnx to app/build.gradle"
fi

# Note: @dr.pogodin/react-native-fs is autolinked by Expo - do NOT manually link it
# Manual linking causes task dependency conflicts with Expo's codegen

# Patch @dr.pogodin/react-native-fs for RN 0.76.x compatibility
# The ReactModuleInfo constructor changed from 6 to 7 args in RN 0.76
RNFS_KT="../node_modules/@dr.pogodin/react-native-fs/android/src/main/java/com/drpogodin/reactnativefs/ReactNativeFsPackage.kt"
if [ -f "$RNFS_KT" ]; then
  # Replace old 6-arg constructor call with new 7-arg version
  sed -i 's/ReactNativeFsModule.NAME,ReactNativeFsModule.NAME,canOverrideExistingModule = false,  needsEagerInit = false,  isCxxModule = false,  isTurboModule = true/ReactNativeFsModule.NAME, ReactNativeFsModule.NAME, false, false, false, false, true/' "$RNFS_KT"
  echo "Patched react-native-fs for RN 0.76.x compatibility"
fi

echo "Done linking native modules"
