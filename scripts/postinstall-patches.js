/**
 * Postinstall patches for third-party native module compatibility with RN 0.76.9.
 *
 * 1. @dr.pogodin/react-native-fs: force isTurboModule=true (JS side uses TurboModuleRegistry)
 * 2. @dr.pogodin/react-native-fs: fix promise.reject(null,...) for RN 0.76 null-safety
 * 3. expo-modules-core: guard components.release in afterEvaluate to avoid Gradle config error
 */
const fs = require('fs');
const path = require('path');

function patchFile(label, filePath, patchFn) {
  if (!fs.existsSync(filePath)) {
    console.log(`[${label}] File not found, skipping: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const patched = patchFn(original);
  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
    console.log(`[${label}] Patched successfully`);
  } else {
    console.log(`[${label}] Already patched or no changes needed`);
  }
}

// Patch 1: Force isTurboModule = true in ReactNativeFsPackage.kt
patchFile(
  'react-native-fs',
  path.resolve(__dirname, '../node_modules/@dr.pogodin/react-native-fs/android/src/main/java/com/drpogodin/reactnativefs/ReactNativeFsPackage.kt'),
  (c) => c.replace(
    /val isTurboModule: Boolean = BuildConfig\.IS_NEW_ARCHITECTURE_ENABLED/g,
    'val isTurboModule: Boolean = true'
  )
);

// Patch 2: Fix promise.reject(null, ...) null-safety in ReactNativeFsModule.kt
patchFile(
  'react-native-fs',
  path.resolve(__dirname, '../node_modules/@dr.pogodin/react-native-fs/android/src/main/java/com/drpogodin/reactnativefs/ReactNativeFsModule.kt'),
  (c) => c.replace(/promise\.reject\(null,/g, 'promise.reject("Error",')
);

// Patch 3: Guard components.release in ExpoModulesCorePlugin.gradle
const expoCoreGradle = path.resolve(__dirname, '../node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle');
patchFile(
  'expo-modules-core',
  expoCoreGradle,
  (c) => {
    if (c.includes('findByName')) return c; // already patched
    return c.replace(
      '  project.afterEvaluate {\n    publishing {',
      '  project.afterEvaluate {\n    if (components.findByName("release") != null) {\n    publishing {'
    ).replace(
      /    }\n  }\n\}/m,
      '    }\n    }\n  }\n}'
    );
  }
);

// Patch 4: Fix sherpa-onnx TTS initializeTts null-safety (compiled JS drops NaN fallback)
patchFile(
  'sherpa-onnx',
  path.resolve(__dirname, '../node_modules/react-native-sherpa-onnx/lib/module/tts/index.js'),
  (c) => c.replace(
    'flat.noiseScale, flat.noiseScaleW, flat.lengthScale, ruleFsts, ruleFars, maxNumSentences, silenceScale, provider);',
    'flat.noiseScale ?? Number.NaN, flat.noiseScaleW ?? Number.NaN, flat.lengthScale ?? Number.NaN, ruleFsts ?? null, ruleFars ?? null, maxNumSentences ?? Number.NaN, silenceScale ?? Number.NaN, provider ?? null);'
  )
);

// Patch 4b: Same NaN fix for streaming TTS
patchFile(
  'sherpa-onnx-streaming',
  path.resolve(__dirname, '../node_modules/react-native-sherpa-onnx/lib/module/tts/streaming.js'),
  (c) => c.replace(
    'flat.noiseScale, flat.noiseScaleW, flat.lengthScale, ruleFsts, ruleFars, maxNumSentences, silenceScale, provider);',
    'flat.noiseScale ?? Number.NaN, flat.noiseScaleW ?? Number.NaN, flat.lengthScale ?? Number.NaN, ruleFsts ?? null, ruleFars ?? null, maxNumSentences ?? Number.NaN, silenceScale ?? Number.NaN, provider ?? null);'
  )
);

// Patch 5: Limit sherpa-onnx abiFilters to arm64-v8a only (saves ~200MB APK size)
patchFile(
  'sherpa-onnx-gradle',
  path.resolve(__dirname, '../node_modules/react-native-sherpa-onnx/android/build.gradle'),
  (c) => c.replace(
    'abiFilters "arm64-v8a", "armeabi-v7a", "x86", "x86_64"',
    'abiFilters "arm64-v8a"'
  )
);

console.log('All postinstall patches completed.');
