// F-001: useVoiceRecorder hook
// 实现录音+STT离线转写+场景识别

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { createStreamingSTT, type StreamingSttEngine, type SttStream } from 'react-native-sherpa-onnx/stt';
import { assetModelPath } from 'react-native-sherpa-onnx';
import SherpaOnnx from 'react-native-sherpa-onnx/src/NativeSherpaOnnx';
import { identifyScene, type SceneType } from '../lib/scene-detector';
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
  const sttRef = useRef<StreamingSttEngine | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0); // ref 跟踪真实时长，避免闭包陷阱

  // 初始化STT引擎（streaming 模式——与 streaming-zipformer 模型匹配）
  useEffect(() => {
    (async () => {
      try {
        logger.info('VoiceRecorder', 'Initializing streaming STT engine');
        const modelPath = assetModelPath('models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20');
        logger.info('VoiceRecorder', 'STT model path', { modelPath: JSON.stringify(modelPath) });

        sttRef.current = await createStreamingSTT({
          modelPath,
          modelType: 'transducer',
        });
        setSttReady(true);
        logger.info('VoiceRecorder', 'Streaming STT engine ready');
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
          // 解码 WAV 为 PCM float samples
          const { samples, sampleRate } = await SherpaOnnx.decodeAudioFileToFloatSamples(wavPath, 16000);
          logger.info('VoiceRecorder', 'WAV decoded', { sampleRate, totalSamples: samples.length, durationSec: (samples.length / sampleRate).toFixed(1) });

          // F7-P0: 音频预处理 — 增益归一化
          let maxAbs = 0;
          for (let i = 0; i < samples.length; i++) {
            const abs = Math.abs(samples[i]);
            if (abs > maxAbs) maxAbs = abs;
          }
          if (maxAbs > 0 && maxAbs !== 1) {
            const scale = 1.0 / maxAbs;
            for (let i = 0; i < samples.length; i++) {
              samples[i] *= scale;
            }
            logger.info('VoiceRecorder', 'Audio normalized', { maxAbs: maxAbs.toFixed(4), scale: scale.toFixed(4) });
          }

          // F7-P0: 静音裁剪（阈值 0.01，去除首尾静音段）
          const SILENCE_THRESHOLD = 0.01;
          let trimStart = 0;
          let trimEnd = samples.length - 1;
          while (trimStart < samples.length && Math.abs(samples[trimStart]) < SILENCE_THRESHOLD) trimStart++;
          while (trimEnd > trimStart && Math.abs(samples[trimEnd]) < SILENCE_THRESHOLD) trimEnd--;
          // 用 trimmed 替代原始 samples（Float32Array 固定长度，必须新建）
          const audioSamples = (trimStart > 0 || trimEnd < samples.length - 1)
            ? samples.slice(trimStart, trimEnd + 1)
            : samples;
          if (trimStart > 0 || trimEnd < samples.length - 1) {
            logger.info('VoiceRecorder', 'Silence trimmed', { removedStart: trimStart, removedEnd: samples.length - 1 - trimEnd, remaining: audioSamples.length });
          }

          // F7-P1: STT 流式转写（chunk size 4800 = 300ms @ 16kHz）
          const CHUNK = 4800;
          const MAX_RETRIES = 1;

          let fullText = '';
          for (let retry = 0; retry <= MAX_RETRIES; retry++) {
            try {
              const stream: SttStream = await sttRef.current.createStream();

              for (let i = 0; i < audioSamples.length; i += CHUNK) {
                const chunk = audioSamples.slice(i, i + CHUNK);
                await stream.acceptWaveform(chunk, sampleRate);
                while (await stream.isReady()) {
                  await stream.decode();
                }
                const partial = await stream.getResult();
                if (partial.text) {
                  fullText = partial.text;
                }
              }

              // 输入结束，刷新剩余
              await stream.inputFinished();
              while (await stream.isReady()) {
                await stream.decode();
              }
              const finalResult = await stream.getResult();
              if (finalResult.text) fullText = finalResult.text;
              await stream.release();

              if (fullText) break; // 成功则跳出重试循环

              // F7-P2: 空结果重试
              if (retry < MAX_RETRIES) {
                logger.warn('VoiceRecorder', 'STT returned empty, retrying', { attempt: retry + 1 });
              }
            } catch (streamErr: any) {
              logger.error('VoiceRecorder', 'STT stream error', { error: streamErr?.message, attempt: retry + 1 });
              try { await stream.release(); } catch (_) {}
              if (retry >= MAX_RETRIES) throw streamErr;
            }
          }

          logger.info('VoiceRecorder', 'STT result', { textLength: fullText.length, textPreview: fullText.substring(0, 200) });

          if (fullText) {
            const segment: TranscriptSegment = {
              text: fullText,
              timestamp: Date.now(),
              isFinal: true,
            };
            setTranscript([segment]);
            setCurrentText(fullText);

            const detectedScene = identifyScene(fullText);
            setSceneType(detectedScene);

            setStatus('idle');
            setDuration(0);

            return {
              uri,
              transcript: fullText,
              sceneType: detectedScene,
            };
          }
        } catch (sttErr: any) {
          logger.error('VoiceRecorder', 'STT transcribe error', { error: sttErr?.message || String(sttErr) });
        }
      }

      // 清理临时 WAV 文件
      try { await FileSystem.deleteAsync(wavPath, { idempotent: true }); } catch {}

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
