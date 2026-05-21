const { withAppBuildGradle, withSettingsGradle } = require('@expo/config-plugins');

module.exports = function withSherpaOnnx(config) {
  // Add to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (!gradle.includes("project(':react-native-sherpa-onnx')")) {
      config.modResults.contents = gradle.replace(
        /dependencies\s*\{/,
        "dependencies {\n    implementation project(':react-native-sherpa-onnx')"
      );
    }
    return config;
  });

  // Add to settings.gradle
  config = withSettingsGradle(config, (config) => {
    const settings = config.modResults.contents;
    if (!settings.includes("react-native-sherpa-onnx")) {
      config.modResults.contents = settings.replace(
        /include ':app'/,
        "include ':app'\ninclude ':react-native-sherpa-onnx'\nproject(':react-native-sherpa-onnx').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-sherpa-onnx/android')"
      );
    }
    return config;
  });

  return config;
};
