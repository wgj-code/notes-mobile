// 7×24 在线语音笔记系统 - 主控制器

import AudioRecord from 'react-native-live-audio-stream';
import { createStreamingSTT, type StreamingSttEngine, type SttStream } from 'react-native-sherpa-onnx/stt';
import { assetModelPath } from 'react-native-sherpa-onnx';
import * as FileSystem from 'expo-file-system';
import { WakeLock } from '../../wakeLock';
import { RecordingService } from '../../recordingService';

import type { SceneType, VoiceNote, DailyLog, SystemStatus } from '../types';
import { getConfig } from '../config';
import { getLogger } from './logger';
import { getSceneStateMachine } from '../modules/scene-state-machine';
import { getNoteSegmenter } from '../modules/note-segmenter';
import { getDailyLogGenerator } from '../modules/daily-log-generator';
import { getHealthChecker } from '../modules/health-check';
import { getMonitor } from '../modules/monitor';

// ===== 控制器状态 =====
export type ControllerState = 'idle' | 'initializing' | 'recording' | 'stopping' | 'error';

// ===== 控制器事件回调 =====
export interface ControllerCallbacks {
  onStateChange?: (state: ControllerState) => void;
  onTranscript?: (text: string) => void;
  onSceneChange?: (scene: SceneType) => void;
  onNoteGenerated?: (note: VoiceNote) => void;
  onError?: (error: Error) => void;
}

// ===== 主控制器 =====
export class OnlineVoiceNoteController {
  private state: ControllerState = 'idle';
  private sttEngine: StreamingSttEngine | null = null;
  private sttStream: SttStream | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private transcriptBuffer: string = '';
  private callbacks: ControllerCallbacks = {};

  // 模块引用
  private logger = getLogger();
  private stateMachine = getSceneStateMachine();
  private segmenter = getNoteSegmenter();
  private logGenerator = getDailyLogGenerator();
  private healthChecker = getHealthChecker();
  private monitor = getMonitor();

  // 定时器
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  // ===== 初始化 =====
  async initialize(): Promise<void> {
    try {
      this.logger.info('Controller', 'Initializing...');

      // 初始化 STT 引擎
      const modelPath = assetModelPath('models/sherpa-onnx-paraformer-zh-2024-03-09');
      const config = getConfig();

      this.sttEngine = await createStreamingSTT({
        modelPath,
        modelType: config.stt.modelType,
        enableEndpoint: true,
        endpointConfig: config.stt.endpointConfig,
        numThreads: config.stt.numThreads,
        dither: config.stt.dither,
        debug: config.stt.debug,
      });

      this.logger.info('Controller', 'STT engine initialized');

      // 启动健康检查定时器
      this.startHealthCheckTimer();

      this.setState('idle');
      this.logger.info('Controller', 'Initialization completed');
    } catch (error: any) {
      this.logger.error('Controller', 'Initialization failed', {
        error: error.message,
      });
      this.setState('error');
      throw error;
    }
  }

  // ===== 录音控制 =====
  async startRecording(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start recording in state: ${this.state}`);
    }

    try {
      this.setState('initializing');

      // 创建 STT 流
      if (this.sttEngine) {
        this.sttStream = await this.sttEngine.createStream();
        this.logger.info('Controller', 'STT stream created');
      }

      // 初始化实时音频流
      const wavPath = `${FileSystem.cacheDirectory}recording_${Date.now()}.wav`;
      const config = getConfig();

      AudioRecord.init({
        sampleRate: config.recording.sampleRate,
        channels: config.recording.channels,
        bitsPerSample: config.recording.bitsPerSample,
        audioSource: config.recording.audioSource,
        wavFile: wavPath,
        bufferSize: config.recording.bufferSize,
      });

      // 监听实时音频数据
      AudioRecord.on('data', async (data: string) => {
        if (!this.isRecording || !this.sttStream) return;

        try {
          // base64 → Float32 PCM
          const buffer = Buffer.from(data, 'base64');
          const samples = new Float32Array(buffer.length / 2);
          for (let i = 0; i < buffer.length; i += 2) {
            samples[i / 2] = buffer.readInt16LE(i) / 32768.0;
          }

          // 喂给流式 STT
          const { result, isEndpoint } = await this.sttStream.processAudioChunk(
            Array.from(samples),
            config.recording.sampleRate
          );

          // 处理转写结果
          if (result.text) {
            this.transcriptBuffer += result.text;
            this.callbacks.onTranscript?.(this.transcriptBuffer);

            // 场景识别
            const transition = this.stateMachine.processText(
              result.text,
              Date.now()
            );

            if (transition.isTransition) {
              this.callbacks.onSceneChange?.(transition.newScene);
            }
          }

          // 检测到语句结束
          if (isEndpoint && this.sttStream) {
            await this.sttStream.reset();
          }
        } catch (err: any) {
          this.logger.error('Controller', 'STT processing error', {
            error: err.message,
          });
          this.monitor.recordError('stt', err.message);
        }
      });

      // 开始录音
      AudioRecord.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.transcriptBuffer = '';

      // 启动前台服务 + WakeLock
      RecordingService.start();
      WakeLock.acquire();

      // 启动自动保存定时器
      this.startAutoSaveTimer();

      this.setState('recording');
      this.logger.info('Controller', 'Recording started', { wavPath });
    } catch (error: any) {
      this.logger.error('Controller', 'Failed to start recording', {
        error: error.message,
      });
      this.monitor.recordError('recording', error.message);
      this.setState('error');
      throw error;
    }
  }

  async stopRecording(): Promise<{
    notes: VoiceNote[];
    dailyLog: DailyLog | null;
  }> {
    if (this.state !== 'recording') {
      throw new Error(`Cannot stop recording in state: ${this.state}`);
    }

    try {
      this.setState('stopping');

      // 停止录音
      this.isRecording = false;
      const uri = await AudioRecord.stop();

      // 释放 STT 流
      if (this.sttStream) {
        await this.sttStream.release();
        this.sttStream = null;
      }

      // 停止服务
      WakeLock.release();
      RecordingService.stop();

      // 停止定时器
      this.stopAutoSaveTimer();

      // 强制结束当前场景
      const finalSegment = this.stateMachine.forceEnd(Date.now());
      if (finalSegment) {
        this.segmenter.processSegment(finalSegment);
      }

      // 生成所有待处理的笔记
      const notes = this.segmenter.forceGenerate();

      // 生成日志汇总
      const allNotes = this.segmenter.getNotes();
      const dailyLog = allNotes.length > 0
        ? this.logGenerator.generate(allNotes)
        : null;

      // 记录状态
      this.monitor.recordStatus({
        recording: {
          isActive: false,
          duration: (Date.now() - this.recordingStartTime) / 1000,
          audioLevel: 0,
          sampleRate: getConfig().recording.sampleRate,
          bufferSize: getConfig().recording.bufferSize,
        },
      });

      this.setState('idle');
      this.logger.info('Controller', 'Recording stopped', {
        notesGenerated: notes.length,
        dailyLogGenerated: dailyLog !== null,
      });

      return { notes, dailyLog };
    } catch (error: any) {
      this.logger.error('Controller', 'Failed to stop recording', {
        error: error.message,
      });
      this.monitor.recordError('recording', error.message);
      this.setState('error');
      return { notes: [], dailyLog: null };
    }
  }

  // ===== 自动保存 =====
  private startAutoSaveTimer(): void {
    const config = getConfig().noteGeneration;
    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, config.autoSaveInterval * 1000);
  }

  private stopAutoSaveTimer(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private autoSave(): void {
    // 处理已完成的场景片段
    const segments = this.stateMachine.getSegments();
    for (const segment of segments) {
      const note = this.segmenter.processSegment(segment);
      if (note) {
        this.callbacks.onNoteGenerated?.(note);
      }
    }

    // 清空已处理的片段
    this.stateMachine.clearSegments();
  }

  // ===== 健康检查 =====
  private startHealthCheckTimer(): void {
    const config = getConfig().diagnostics.healthCheck;
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, config.interval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      await this.healthChecker.check({
        sttReady: this.sttEngine !== null,
        sttErrorCount: this.monitor.getErrorStats().byModule['stt'] || 0,
        memoryUsage: 0, // 需要实际获取
        storageAvailable: 0, // 需要实际获取
        batteryLevel: 1, // 需要实际获取
        isCharging: false, // 需要实际获取
        isRecording: this.isRecording,
      });

      // 记录状态
      this.monitor.recordStatus({
        stt: {
          isReady: this.sttEngine !== null,
          modelLoaded: this.sttEngine !== null,
          processingLatency: 0,
          totalProcessed: 0,
          errorCount: this.monitor.getErrorStats().byModule['stt'] || 0,
        },
        scene: {
          currentScene: this.stateMachine.getState().currentScene,
          sceneDuration: 0,
          totalScenes: this.stateMachine.getSegments().length,
          transitionCount: 0,
        },
      });
    } catch (error: any) {
      this.logger.error('Controller', 'Health check failed', {
        error: error.message,
      });
    }
  }

  // ===== 回调设置 =====
  setCallbacks(callbacks: ControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  // ===== 状态管理 =====
  private setState(newState: ControllerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.logger.info('Controller', 'State changed', {
        from: oldState,
        to: newState,
      });
      this.callbacks.onStateChange?.(newState);
    }
  }

  getState(): ControllerState {
    return this.state;
  }

  // ===== 数据获取 =====
  getTranscript(): string {
    return this.transcriptBuffer;
  }

  getCurrentScene(): SceneType {
    return this.stateMachine.getState().currentScene;
  }

  getNotes(): VoiceNote[] {
    return this.segmenter.getNotes();
  }

  getSystemStatus(): SystemStatus | null {
    return this.monitor.getCurrentStatus();
  }

  async getDiagnostic(): Promise<string> {
    return this.monitor.exportDiagnosticString();
  }

  // ===== 销毁 =====
  async destroy(): Promise<void> {
    this.logger.info('Controller', 'Destroying...');

    // 停止录音
    if (this.isRecording) {
      await this.stopRecording();
    }

    // 释放 STT 引擎
    if (this.sttEngine) {
      await this.sttEngine.destroy();
      this.sttEngine = null;
    }

    // 停止定时器
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.logger.info('Controller', 'Destroyed');
  }
}

// ===== 单例 =====
let controllerInstance: OnlineVoiceNoteController | null = null;

export function getController(): OnlineVoiceNoteController {
  if (!controllerInstance) {
    controllerInstance = new OnlineVoiceNoteController();
  }
  return controllerInstance;
}

export function resetController(): void {
  if (controllerInstance) {
    controllerInstance.destroy();
    controllerInstance = null;
  }
}
