import { NativeModules, Platform } from 'react-native';

const { WakeLockModule } = NativeModules;

export const WakeLock = {
  acquire() {
    if (Platform.OS === 'android' && WakeLockModule) {
      WakeLockModule.acquire();
    }
  },
  release() {
    if (Platform.OS === 'android' && WakeLockModule) {
      WakeLockModule.release();
    }
  },
};
