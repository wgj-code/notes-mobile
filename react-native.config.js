module.exports = {
  dependencies: {
    // Exclude from autolinking - manually registered in MainApplication.kt
    // because ReactNativeFs TurboModule has RN 0.76.x constructor incompatibility
    '@dr.pogodin/react-native-fs': {
      platforms: { ios: null, android: null },
    },
  },
};
