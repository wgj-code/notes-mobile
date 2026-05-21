// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure subpath imports like 'react-native-sherpa-onnx/tts' are resolved
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
