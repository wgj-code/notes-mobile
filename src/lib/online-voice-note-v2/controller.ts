// 7×24 在线语音笔记系统 v2 - 主控制器

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createSTT, type SttEngine } from 'react-native-sherpa-onnx/stt';
import { assetModelPath } from 'react-native-sherpa-onnx';
import SherpaOnnx from 'react-native-sherpa-onnx/src/NativeSherpaOnnx';

import type { SceneType, VoiceNote, DailyLog, SystemStatus } from './types';
import { SceneTransitionDetector } from './scene-transition-detector';
import { NoteSegmenter } from './note-segmenter';
import { AudioSegmentManager } from './audio-segment-manager';
import { DailyLogGenerator } from './daily-log-generator';

// ===== 配置 =====
const CONFIG = {
  // 分片间隔（秒）
  SEGMENT_INTERVAL: 60, // 1分钟

  // STT 配置
  STT: {
    preferInt8: true,
    debug: false,
    numThreads: 2,
    hotwordsScore: 0,
    dither: 0,
  },
};

// ===== 控制器状态 =====
export type ControllerState = 'idle' | 'initializing' | 'recording' | 'processing' | 'error';

// ===== 控制器事件回调 =====
export interface ControllerCallbacks {
  onStateChange?: (state: ControllerState) => void;
  onTranscript?: (text: string, scene: SceneType) => void;
  onSceneChange?: (scene: SceneType) => void;
  onNoteGenerated?: (note: VoiceNote) => void;
  onProgress?: (progress: { recorded: number; transcribed: number; total: number }) => void;
  onError?: (error: Error) => void;
}

// ===== 主控制器 =====
export class OnlineVoiceNoteControllerV2 {
  private state: ControllerState = 'idle';
  private sttEngine: SttEngine | null = null;
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  // 模块引用
  private sceneDetector = new SceneTransitionDetector();
  private noteSegmenter = new NoteSegmenter();
  private audioSegmentManager = new AudioSegmentManager();
  private dailyLogGenerator = new DailyLogGenerator();

  // 回调
  private callbacks: ControllerCallbacks = {};

  // 定时器
  private segmentTimer: NodeJS.Timeout | null = null;
  private segmentIndex: number = 0;

  // 初始化
  async initialize(): Promise<void> {
    try {
      console.log('[Controller] Initializing...');

      // 初始化音频分片管理器
      await this.audioSegmentManager.initialize();

      // 初始化 STT 引擎
      const modelPath = assetModelPath('models/sherpa-onnx-paraformer-zh-2024-03-09');

      this.sttEngine = await createSTT({
        modelPath,
        preferInt8: CONFIG.STT.preferInt8,
        debug: CONFIG.STT.debug,
        numThreads: CONFIG.STT.numThreads,
        hotwordsScore: CONFIG.STT.hotwordsScore,
        dither: CONFIG.STT.dither,
      });

      console.log('[Controller] STT engine initialized');
      this.setState('idle');
    } catch (error: any) {
      console.error('[Controller] Initialization failed:', error);
      this.setState('error');
      throw error;
    }
  }

  // 开始录音
  async startRecording(manualScene?: SceneType): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start recording in state: ${this.state}`);
    }

    try {
      this.setState('initializing');

      // 请求权限
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Audio permission not granted');
      }

      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // 创建录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100 // 100ms update interval
      );

      this.recording = recording;
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.segmentIndex = 0;

      // 重置检测器
      this.sceneDetector.reset();
      this.noteSegmenter.reset();

      // 设置用户手动指定的场景
      if (manualScene) {
        this.sceneDetector.setManualScene(manualScene);
        console.log('[Controller] Manual scene override:', manualScene);
      }

      // 启动分片定时器
      this.startSegmentTimer();

      this.setState('recording');
      console.log('[Controller] Recording started', {
        manualScene: manualScene || 'auto',
      });
    } catch (error: any) {
      console.error('[Controller] Failed to start recording:', error);
      this.setState('error');
      throw error;
    }
  }

  // 停止录音
  async stopRecording(): Promise<{
    notes: VoiceNote[];
    dailyLog: DailyLog | null;
  }> {
    if (this.state !== 'recording') {
      throw new Error(`Cannot stop recording in state: ${this.state}`);
    }

    try {
      this.setState('processing');

      // 停止分片定时器
      this.stopSegmentTimer();

      // 保存最后一个分片
      await this.saveCurrentSegment();

      // 停止录音
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      this.isRecording = false;

      // 保存最后一个笔记
      const lastNote = this.noteSegmenter.saveCurrentNote();
      if (lastNote) {
        this.callbacks.onNoteGenerated?.(lastNote);
      }

      // 生成日志汇总
      const notes = this.noteSegmenter.getNotes();
      const dailyLog = notes.length > 0
        ? this.dailyLogGenerator.generate(notes)
        : null;

      // 清理临时文件
      await this.audioSegmentManager.cleanupAll();

      this.setState('idle');
      console.log('[Controller] Recording stopped', {
        notesCount: notes.length,
        hasDailyLog: dailyLog !== null,
      });

      return { notes, dailyLog };
    } catch (error: any) {
      console.error('[Controller] Failed to stop recording:', error);
      this.setState('error');
      return { notes: [], dailyLog: null };
    }
  }

  // 启动分片定时器
  private startSegmentTimer(): void {
    this.segmentTimer = setInterval(async () => {
      await this.saveCurrentSegment();
    }, CONFIG.SEGMENT_INTERVAL * 1000);
  }

  // 停止分片定时器
  private stopSegmentTimer(): void {
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
  }

  // 保存当前分片
  private async saveCurrentSegment(): Promise<void> {
    if (!this.recording || !this.sttEngine) return;

    try {
      // 停止当前录音，获取 URI
      const uri = this.recording.getURI();
      if (!uri) return;

      // 保存分片
      const segmentPath = await this.audioSegmentManager.saveSegment(uri, this.segmentIndex);
      this.segmentIndex++;

      // 转换为 WAV
      const wavPath = await this.audioSegmentManager.convertToWav(segmentPath);

      // STT 转写
      const result = await this.sttEngine.transcribeFile(wavPath);
      const text = result.text || '';

      if (text) {
        // 处理片段
        const processResult = this.sceneDetector.processSegment(text, Date.now());

        // 更新 UI
        this.callbacks.onTranscript?.(text, processResult.scene);

        // 检查是否需要保存笔记
        if (processResult.shouldSaveNote && processResult.noteText) {
          const note = this.noteSegmenter.saveCurrentNote();
          if (note) {
            this.callbacks.onNoteGenerated?.(note);
          }
        }

        // 检查是否需要开始新笔记
        if (processResult.shouldStartNewNote) {
          this.noteSegmenter.startNewNote(processResult.scene, Date.now());
        }

        // 追加文本到当前笔记
        this.noteSegmenter.appendToCurrentNote(text, Date.now());

        // 场景变化通知
        const state = this.sceneDetector.getState();
        this.callbacks.onSceneChange?.(state.currentScene);
      }

      // 清理临时文件
      await this.audioSegmentManager.deleteFile(segmentPath);
      await this.audioSegmentManager.deleteFile(wavPath);

      console.log('[Controller] Segment processed:', {
        segmentIndex: this.segmentIndex - 1,
        textLength: text.length,
        scene: this.sceneDetector.getState().currentScene,
      });
    } catch (error: any) {
      console.error('[Controller] Failed to process segment:', error);
    }
  }

  // 设置回调
  setCallbacks(callbacks: ControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  // 设置状态
  private setState(newState: ControllerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      console.log(`[Controller] State changed: ${oldState} → ${newState}`);
      this.callbacks.onStateChange?.(newState);
    }
  }

  // 获取状态
  getState(): ControllerState {
    return this.state;
  }

  // 获取系统状态
  getSystemStatus(): SystemStatus {
    const detectorState = this.sceneDetector.getState();
    return {
      isRecording: this.isRecording,
      currentScene: detectorState.currentScene,
      recordingDuration: this.isRecording ? (Date.now() - this.recordingStartTime) / 1000 : 0,
      segmentCount: detectorState.segmentCount,
      noteCount: this.noteSegmenter.getNoteCount(),
      lastTransitionTime: 0,
      inCooldown: detectorState.inCooldown,
    };
  }

  // 销毁
  async destroy(): Promise<void> {
    console.log('[Controller] Destroying...');

    // 停止录音
    if (this.isRecording) {
      await this.stopRecording();
    }

    // 释放 STT 引擎
    if (this.sttEngine) {
      await this.sttEngine.destroy();
      this.sttEngine = null;
    }

    // 清理文件
    await this.audioSegmentManager.cleanupAll();

    console.log('[Controller] Destroyed');
  }
}
