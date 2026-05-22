const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable package.json exports for subpath imports
config.resolver.unstable_enablePackageExports = true;

// Alias @dr.pogodin/react-native-fs to react-native-fs (RN 0.76.x compat)
config.resolver.extraNodeModules = {
  '@dr.pogodin/react-native-fns': path.resolve(__dirname, 'node_modules/react-native-fs'),
  '@dr.pogodin/react-native-fs': path.resolve(__dirname, 'node_modules/react-native-fs'),
};

module.exports = config;
