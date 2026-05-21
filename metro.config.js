const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json exports for subpath imports like 'react-native-sherpa-onnx/tts'
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
