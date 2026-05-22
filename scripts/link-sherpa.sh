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

# Link @dr.pogodin/react-native-fs (required by sherpa-onnx)
RNFS_DIR="../node_modules/@dr.pogodin/react-native-fs/android"
if ! grep -q "react-native-fs" "$SETTINGS"; then
  sed -i "/include ':app'/a include ':react-native-fs'\nproject(':react-native-fs').projectDir = new File(rootProject.projectDir, '$RNFS_DIR')" "$SETTINGS"
  echo "Added react-native-fs to settings.gradle"
fi
if ! grep -q "react-native-fs" "$BUILD"; then
  sed -i "/dependencies {/a\\    implementation project(':react-native-fs')" "$BUILD"
  echo "Added react-native-fs to app/build.gradle"
fi

echo "Done linking native modules"
