// 7×24 在线语音笔记系统 v2 - 音频分片管理器

import * as FileSystem from 'expo-file-system';

// ===== 音频分片管理器 =====
export class AudioSegmentManager {
  private cacheDir: string;
  private maxRetainedFiles: number = 3;

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}audio_segments/`;
  }

  // 初始化
  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
  }

  // 保存音频分片
  async saveSegment(
    sourceUri: string,
    segmentIndex: number
  ): Promise<string> {
    const segmentPath = `${this.cacheDir}segment_${String(segmentIndex).padStart(3, '0')}.m4a`;

    // 复制文件
    await FileSystem.copyAsync({
      from: sourceUri,
      to: segmentPath,
    });

    console.log(`[AudioSegmentManager] Saved segment ${segmentIndex} to ${segmentPath}`);

    // 清理旧分片
    await this.cleanupOldSegments();

    return segmentPath;
  }

  // 转换为 WAV（用于 STT）
  async convertToWav(m4aPath: string): Promise<string> {
    const wavPath = m4aPath.replace('.m4a', '.wav');

    try {
      // 使用 SherpaOnnx 转换
      const SherpaOnnx = require('react-native-sherpa-onnx/src/NativeSherpaOnnx').default;
      await SherpaOnnx.convertAudioToWav16k(m4aPath, wavPath);
      console.log(`[AudioSegmentManager] Converted to WAV: ${wavPath}`);
      return wavPath;
    } catch (error) {
      console.error('[AudioSegmentManager] WAV conversion failed:', error);
      throw error;
    }
  }

  // 清理旧分片
  async cleanupOldSegments(): Promise<void> {
    try {
      const files = await this.getSegmentFiles();
      if (files.length > this.maxRetainedFiles) {
        const toDelete = files.slice(0, files.length - this.maxRetainedFiles);
        for (const file of toDelete) {
          await FileSystem.deleteAsync(file, { idempotent: true });
          console.log(`[AudioSegmentManager] Deleted old segment: ${file}`);
        }
      }
    } catch (error) {
      console.error('[AudioSegmentManager] Cleanup failed:', error);
    }
  }

  // 获取所有分片文件
  async getSegmentFiles(): Promise<string[]> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) return [];

      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      return files
        .filter(f => f.startsWith('segment_') && f.endsWith('.m4a'))
        .sort()
        .map(f => `${this.cacheDir}${f}`);
    } catch (error) {
      return [];
    }
  }

  // 删除指定文件
  async deleteFile(filePath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error) {
      // 忽略删除错误
    }
  }

  // 清理所有文件
  async cleanupAll(): Promise<void> {
    try {
      const files = await this.getSegmentFiles();
      for (const file of files) {
        await FileSystem.deleteAsync(file, { idempotent: true });
      }

      // 也清理 WAV 文件
      const wavFiles = files.map(f => f.replace('.m4a', '.wav'));
      for (const file of wavFiles) {
        await FileSystem.deleteAsync(file, { idempotent: true });
      }
    } catch (error) {
      console.error('[AudioSegmentManager] Cleanup all failed:', error);
    }
  }

  // 获取缓存目录
  getCacheDir(): string {
    return this.cacheDir;
  }
}
