// 7×24 在线语音笔记系统 - React Hook

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getController,
  type ControllerState,
  type ControllerCallbacks,
} from '../lib/online-voice-note/core/controller';
import type { SceneType, VoiceNote, DailyLog, SystemStatus } from '../lib/online-voice-note/types';

// ===== Hook 返回类型 =====
export interface UseOnlineVoiceNoteReturn {
  // 状态
  state: ControllerState;
  transcript: string;
  currentScene: SceneType;
  notes: VoiceNote[];
  dailyLog: DailyLog | null;
  systemStatus: SystemStatus | null;

  // 操作
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ notes: VoiceNote[]; dailyLog: DailyLog | null }>;
  reset: () => void;

  // 诊断
  getDiagnostic: () => Promise<string>;
  error: string | null;
}

// ===== Hook =====
export function useOnlineVoiceNote(): UseOnlineVoiceNoteReturn {
  const [state, setState] = useState<ControllerState>('idle');
  const [transcript, setTranscript] = useState('');
  const [currentScene, setCurrentScene] = useState<SceneType>('unknown');
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<ReturnType<typeof getController> | null>(null);

  // 初始化控制器
  useEffect(() => {
    const initController = async () => {
      try {
        const controller = getController();
        controllerRef.current = controller;

        // 设置回调
        controller.setCallbacks({
          onStateChange: (newState) => {
            setState(newState);
          },
          onTranscript: (text) => {
            setTranscript(text);
          },
          onSceneChange: (scene) => {
            setCurrentScene(scene);
          },
          onNoteGenerated: (note) => {
            setNotes(prev => [...prev, note]);
          },
          onError: (err) => {
            setError(err.message);
          },
        });

        // 初始化
        await controller.initialize();
      } catch (err: any) {
        setError(err.message);
      }
    };

    initController();

    return () => {
      // 组件卸载时销毁控制器
      // 注意：这里不调用 destroy，因为控制器是单例
      // 在实际应用中，应该在 App 退出时销毁
    };
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const controller = controllerRef.current;
      if (!controller) {
        throw new Error('Controller not initialized');
      }
      await controller.startRecording();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(async () => {
    try {
      setError(null);
      const controller = controllerRef.current;
      if (!controller) {
        throw new Error('Controller not initialized');
      }
      const result = await controller.stopRecording();
      setNotes(prev => [...prev, ...result.notes]);
      setDailyLog(result.dailyLog);
      return result;
    } catch (err: any) {
      setError(err.message);
      return { notes: [], dailyLog: null };
    }
  }, []);

  // 重置
  const reset = useCallback(() => {
    setTranscript('');
    setCurrentScene('unknown');
    setNotes([]);
    setDailyLog(null);
    setError(null);
  }, []);

  // 获取诊断信息
  const getDiagnostic = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) {
      return '';
    }
    return controller.getDiagnostic();
  }, []);

  return {
    state,
    transcript,
    currentScene,
    notes,
    dailyLog,
    systemStatus,
    startRecording,
    stopRecording,
    reset,
    getDiagnostic,
    error,
  };
}
