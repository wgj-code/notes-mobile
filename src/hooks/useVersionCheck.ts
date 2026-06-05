import { useState, useCallback, useEffect } from 'react';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as FileSystem from 'expo-file-system';
import { Linking, Platform, Alert } from 'react-native';

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

  // 自动检查 OTA 更新
  useEffect(() => {
    const autoCheckOTA = async () => {
      try {
        console.log('[OTA] Checking for updates...');
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('[OTA] Update available, fetching...');
          await Updates.fetchUpdateAsync();
          console.log('[OTA] Update fetched, reloading...');
          await Updates.reloadAsync();
        } else {
          console.log('[OTA] No update available');
        }
      } catch (err: any) {
        console.error('[OTA] Auto-check failed:', err?.message || err);
      }
    };

    // App 启动时自动检查
    autoCheckOTA();
  }, []);

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
      await Linking.openURL(apkUrl);
    } catch (err) {
      Alert.alert('下载失败', '无法打开下载链接，请在浏览器中手动打开：\n' + apkUrl);
    }
  }, []);

  return { checking, result, localVersion, checkForUpdate, applyOTAUpdate, downloadAPK };
}
