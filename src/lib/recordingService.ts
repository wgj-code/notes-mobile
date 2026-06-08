import { NativeModules, Platform } from 'react-native';

const { RecordingServiceModule } = NativeModules;

export const RecordingService = {
  start: () => {
    if (Platform.OS === 'android' && RecordingServiceModule) {
      RecordingServiceModule.startService();
    }
  },
  stop: () => {
    if (Platform.OS === 'android' && RecordingServiceModule) {
      RecordingServiceModule.stopService();
    }
  },
};
