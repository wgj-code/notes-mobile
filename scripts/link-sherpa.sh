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
# The ReactModuleInfo constructor changed from Kotlin named params to positional args in RN 0.76
python3 -c "
import os
path = os.path.join(os.getcwd(), 'node_modules/@dr.pogodin/react-native-fs/android/src/main/java/com/drpogodin/reactnativefs/ReactNativeFsPackage.kt')
if os.path.exists(path):
    with open(path, 'r') as f:
        content = f.read()
    old = '''moduleInfos[ReactNativeFsModule.NAME] = ReactModuleInfo(
        ReactNativeFsModule.NAME,
        ReactNativeFsModule.NAME,
        canOverrideExistingModule = false,  // canOverrideExistingModule
        needsEagerInit = false,  // needsEagerInit
        isCxxModule = false,  // isCxxModule
        isTurboModule = true // isTurboModule
      )'''
    new = '''moduleInfos[ReactNativeFsModule.NAME] = ReactModuleInfo(
        ReactNativeFsModule.NAME,
        ReactNativeFsModule.NAME,
        false,
        false,
        false,
        false,
        true
      )'''
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('Patched react-native-fs for RN 0.76.x')
else:
    print('File not found, skipping patch')
"

# Register react-native-fs in MainApplication.kt (Article: Baidu#2888578)
MAIN_APP="android/app/src/main/java/com/wgjcode/notes/MainApplication.kt"
if [ -f "$MAIN_APP" ] && ! grep -q "RNFSPackage" "$MAIN_APP"; then
  # Add import
  sed -i '/import expo.modules.ReactNativeHostWrapper/a import com.rnfs.RNFSPackage' "$MAIN_APP"
  # Add package registration
  sed -i '/val packages = PackageList(this).packages/a\            packages.add(RNFSPackage())' "$MAIN_APP"
  echo "Registered RNFSPackage in MainApplication.kt"
fi

echo "Done linking native modules"
