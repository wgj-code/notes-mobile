module.exports = {
  // Do NOT exclude @dr.pogodin/react-native-fs from autolinking
  // Its native code must be compiled for the ReactNativeFs TurboModule
  // The constructor patch in link-sherpa.sh fixes the RN 0.76.x incompatibility
};
