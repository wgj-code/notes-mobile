#!/bin/bash
# Manually link sherpa-onnx native module after expo prebuild
# Run this after `npx expo prebuild --clean`

SHERPA_DIR="../node_modules/react-native-sherpa-onnx/android"
SETTINGS="android/settings.gradle"
BUILD="android/app/build.gradle"

# Add to settings.gradle if not present
if ! grep -q "react-native-sherpa-onnx" "$SETTINGS"; then
  sed -i "/include ':app'/a include ':react-native-sherpa-onnx'\nproject(':react-native-sherpa-onnx').projectDir = new File(rootProject.projectDir, '$SHERPA_DIR')" "$SETTINGS"
  echo "Added sherpa-onnx to settings.gradle"
fi

# Add to app/build.gradle if not present
if ! grep -q "react-native-sherpa-onnx" "$BUILD"; then
  sed -i "/dependencies {/a\\    implementation project(':react-native-sherpa-onnx')" "$BUILD"
  echo "Added sherpa-onnx to app/build.gradle"
fi

echo "Done linking sherpa-onnx"
