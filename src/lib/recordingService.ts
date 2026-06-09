import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { RecordingServiceModule } = NativeModules;

export const RecordingService = {
  // 请求通知权限（Android 13+）
  requestNotificationPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 13+ 需要 POST_NOTIFICATIONS 权限
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '通知权限',
            message: '录音服务需要通知权限来显示录音状态',
            buttonPositive: '允许',
            buttonNegative: '拒绝',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  },

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
