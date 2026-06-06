// F-001: useVoiceRecorder hook
// 实现录音+STT离线转写+场景识别
// v0.1.95: 切换到 Offline Paraformer 模型，提升中文识别准确率

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createSTT, type SttEngine } from 'react-native-sherpa-onnx/stt';
import { assetModelPath } from 'react-native-sherpa-onnx';
import SherpaOnnx from 'react-native-sherpa-onnx/src/NativeSherpaOnnx';
import { identifyScene, type SceneType } from '../lib/scene-detector';
import { addPunctuation, deduplicateSttText } from '../lib/punctuation';
import { logger } from '../lib/logger';

export type RecordingStatus = 'idle' | 'initializing' | 'recording' | 'paused' | 'stopping' | 'transcribing' | 'error';

interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface UseVoiceRecorderReturn {
  status: RecordingStatus;
  duration: number;
  transcript: TranscriptSegment[];
  currentText: string;
  sceneType: SceneType;
  sttReady: boolean;
  sttError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; transcript: string; sceneType: SceneType } | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  reset: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [sceneType, setSceneType] = useState<SceneType>('unknown');
  const [sttReady, setSttReady] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const sttRef = useRef<SttEngine | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0); // ref 跟踪真实时长，避免闭包陷阱

  // 初始化STT引擎（offline Paraformer 模型——中文识别准确率更高）
  useEffect(() => {
    (async () => {
      try {
        logger.info('VoiceRecorder', 'Initializing offline Paraformer STT engine');
        const modelPath = assetModelPath('models/sherpa-onnx-paraformer-zh-2024-03-09');
        logger.info('VoiceRecorder', 'STT model path', { modelPath: JSON.stringify(modelPath) });

        // 让 SDK 自动检测模型类型（比手动指定更可靠）
        // Boolean? / Double? 参数必须显式传值，否则 Native 层 null 会崩溃
        sttRef.current = await createSTT({
          modelPath,
          preferInt8: true,
          debug: false,
          numThreads: 2,
          hotwordsScore: 0,
          dither: 0,
        });
        setSttReady(true);
        logger.info('VoiceRecorder', 'Offline Paraformer STT engine ready');
        await logger.flush();
      } catch (err: any) {
        logger.error('VoiceRecorder', 'STT init failed', { error: err?.message || String(err), stack: err?.stack });
        setSttError(err?.message || String(err));
        await logger.flush();
      }
    })();

    return () => {
      sttRef.current?.destroy();
    };
  }, []);

  // 计时器
  const startTimer = useCallback(() => {
    durationRef.current = 0;
    durationTimerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setStatus('initializing');

      // 请求权限
      const permission = await Audio.requestPermissionsAsync();
      logger.info('VoiceRecorder', 'Audio permission', { granted: permission.granted, canAskAgain: permission.canAskAgain });
      if (!permission.granted) {
        throw new Error('Audio permission not granted');
      }

      // 配置音频模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 创建录音
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100 // 100ms update interval
      );

      const uri = recording.getURI();
      logger.info('VoiceRecorder', 'Recording created', { uri });
      recordingRef.current = recording;
      setStatus('recording');
      startTimer();
    } catch (err: any) {
      console.error('Start recording error:', err);
      logger.error('VoiceRecorder', 'Start recording failed', { error: err?.message || String(err) });
      setStatus('error');
      throw err;
    }
  }, [startTimer]);

  // 暂停录音
  const pauseRecording = useCallback(async () => {
    if (recordingRef.current && status === 'recording') {
      await recordingRef.current.pauseAsync();
      setStatus('paused');
      stopTimer();
    }
  }, [status, stopTimer]);

  // 恢复录音
  const resumeRecording = useCallback(async () => {
    if (recordingRef.current && status === 'paused') {
      await recordingRef.current.startAsync();
      setStatus('recording');
      startTimer();
    }
  }, [status, startTimer]);

  // 停止录音并转写
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return null;

    try {
      setStatus('stopping');
      stopTimer();

      // 录音时长太短则跳过转写
      const elapsed = durationRef.current;
      logger.info('VoiceRecorder', 'Stopping recording', { duration: elapsed });

      if (elapsed < 1) {
        logger.warn('VoiceRecorder', 'Recording too short, skipping transcription');
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        setStatus('idle');
        setDuration(0);
        durationRef.current = 0;
        return { uri: '', transcript: '', sceneType: 'unknown' as SceneType };
      }

      // 停止录音
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      logger.info('VoiceRecorder', 'Recording stopped', { uri });
      recordingRef.current = null;

      // 检查录音文件是否存在且非空
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        logger.info('VoiceRecorder', 'Recording file info', { exists: fileInfo.exists, size: fileInfo.exists ? (fileInfo as any).size : 0 });
        if (!fileInfo.exists || (fileInfo as any).size === 0) {
          logger.error('VoiceRecorder', 'Recording file is empty or missing', { uri });
          setStatus('idle');
          setDuration(0);
          return { uri, transcript: '', sceneType: 'unknown' as SceneType };
        }
      } catch (fsErr: any) {
        logger.warn('VoiceRecorder', 'Could not check file info', { error: fsErr?.message });
      }

      // 离线转写
      if (sttRef.current && uri) {
        // sherpa-onnx 需要纯路径，去掉 file:// 前缀
        const filePath = uri.replace(/^file:\/\//, '');
        setStatus('transcribing');
        logger.info('VoiceRecorder', 'Starting STT transcription', { uri, filePath });

        // M4A → WAV 16kHz 转换
        const wavPath = filePath.replace(/\.m4a$/, '.wav');
        try {
          logger.info('VoiceRecorder', 'Converting M4A to WAV', { from: filePath, to: wavPath });
          await SherpaOnnx.convertAudioToWav16k(filePath, wavPath);
          logger.info('VoiceRecorder', 'M4A to WAV conversion done', { wavPath });
        } catch (convertErr: any) {
          logger.error('VoiceRecorder', 'Audio conversion failed', { error: convertErr?.message || String(convertErr) });
          setStatus('idle');
          setDuration(0);
          durationRef.current = 0;
          return { uri, transcript: '', sceneType: 'unknown' as SceneType };
        }

        try {
          // v0.1.95: 使用 Offline Paraformer 直接转写 WAV 文件
          // Paraformer 模型内部处理音频解码，无需手动分 chunk
          logger.info('VoiceRecorder', 'Starting Paraformer STT transcription', { wavPath });
          const result = await sttRef.current.transcribeFile(wavPath);
          const fullText = result.text || '';

          logger.info('VoiceRecorder', 'STT result', { textLength: fullText.length, textPreview: fullText.substring(0, 200) });

          if (fullText) {
            // 去重后处理（去除 STT 连续重复字）
            const dedupedText = deduplicateSttText(fullText);
            // 标点后处理
            const textWithPunctuation = addPunctuation(dedupedText);
            logger.info('VoiceRecorder', 'Punctuation added', { original: fullText.length, processed: textWithPunctuation.length });

            const segment: TranscriptSegment = {
              text: textWithPunctuation,
              timestamp: Date.now(),
              isFinal: true,
            };
            setTranscript([segment]);
            setCurrentText(textWithPunctuation);

            const detectedScene = identifyScene(textWithPunctuation);
            setSceneType(detectedScene);

            setStatus('idle');
            setDuration(0);

            return {
              uri,
              transcript: textWithPunctuation,
              sceneType: detectedScene,
            };
          }
        } catch (sttErr: any) {
          logger.error('VoiceRecorder', 'STT transcribe error', { error: sttErr?.message || String(sttErr) });
        } finally {
          // 清理临时 WAV 文件
          try { await FileSystem.deleteAsync(wavPath, { idempotent: true }); } catch {}
        }
      }

      // 如果STT失败，返回空转写
      setStatus('idle');
      setDuration(0);
      return {
        uri: uri || '',
        transcript: '',
        sceneType: 'unknown',
      };
    } catch (err: any) {
      console.error('Stop recording error:', err);
      setStatus('error');
      return null;
    }
  }, [stopTimer]);

  // 重置
  const reset = useCallback(() => {
    setStatus('idle');
    setDuration(0);
    durationRef.current = 0;
    setTranscript([]);
    setCurrentText('');
    setSceneType('unknown');
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      stopTimer();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [stopTimer]);

  return {
    status,
    duration,
    transcript,
    currentText,
    sceneType,
    sttReady,
    sttError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
}
