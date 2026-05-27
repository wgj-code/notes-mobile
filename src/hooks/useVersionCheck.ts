import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as FileSystem from 'expo-file-system';
import { Linking, Platform } from 'react-native';

const VERSION_API = 'http://8.133.196.220/api/version';

interface VersionInfo {
  current: string;
  jsBundle: string;
  apkVersion: string;
  releaseNote: string;
  apkUrl: string;
}

interface CheckResult {
  hasOTAUpdate: boolean;
  hasAPKUpdate: boolean;
  latestVersion: string;
  releaseNote: string;
}

export function useVersionCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const localVersion = Constants.expoConfig?.version || '0.0.0';

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    try {
      const resp = await fetch(VERSION_API);
      const version: VersionInfo = await resp.json();

      const hasOTAUpdate = version.jsBundle > localVersion;
      const hasAPKUpdate = version.apkVersion > localVersion;

      setResult({
        hasOTAUpdate,
        hasAPKUpdate,
        latestVersion: version.current,
        releaseNote: version.releaseNote,
      });

      return { hasOTAUpdate, hasAPKUpdate, version };
    } catch {
      setResult(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, [localVersion]);

  const applyOTAUpdate = useCallback(async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[OTA] Error:', err?.message || err);
      return false;
    }
  }, []);

  const downloadAPK = useCallback(async (apkUrl: string) => {
    try {
      Alert.alert('下载中', '正在下载新版本，请稍候...');
      await Linking.openURL(apkUrl);
    } catch (err: any) {
      Alert.alert('下载失败', err?.message || '无法下载，请在浏览器中打开链接');
    }
  }, []);

  return { checking, result, localVersion, checkForUpdate, applyOTAUpdate, downloadAPK };
}
