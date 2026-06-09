// 7×24 在线语音笔记系统 v2 - React Hook

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  OnlineVoiceNoteControllerV2,
  type ControllerState,
  type ControllerCallbacks,
} from '../lib/online-voice-note-v2/controller';
import type { SceneType, VoiceNote, DailyLog, SystemStatus } from '../lib/online-voice-note-v2/types';

// ===== Hook 返回类型 =====
export interface UseOnlineVoiceNoteV2Return {
  // 状态
  state: ControllerState;
  transcript: string;
  currentScene: SceneType;
  manualScene: SceneType | null;
  notes: VoiceNote[];
  dailyLog: DailyLog | null;
  systemStatus: SystemStatus | null;

  // 操作
  startRecording: (manualScene?: SceneType) => Promise<void>;
  stopRecording: () => Promise<{ notes: VoiceNote[]; dailyLog: DailyLog | null }>;
  setManualScene: (scene: SceneType | null) => void;
  reset: () => void;

  // 诊断
  error: string | null;
}

// ===== Hook =====
export function useOnlineVoiceNoteV2(): UseOnlineVoiceNoteV2Return {
  const [state, setState] = useState<ControllerState>('idle');
  const [transcript, setTranscript] = useState('');
  const [currentScene, setCurrentScene] = useState<SceneType>('unknown');
  const [manualScene, setManualSceneState] = useState<SceneType | null>(null);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<OnlineVoiceNoteControllerV2 | null>(null);

  // 初始化控制器
  useEffect(() => {
    const initController = async () => {
      try {
        const controller = new OnlineVoiceNoteControllerV2();
        controllerRef.current = controller;

        // 设置回调
        controller.setCallbacks({
          onStateChange: (newState) => {
            setState(newState);
          },
          onTranscript: (text, scene) => {
            setTranscript(text);
            setCurrentScene(scene);
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
      controllerRef.current?.destroy();
    };
  }, []);

  // 开始录音
  const startRecording = useCallback(async (scene?: SceneType) => {
    try {
      setError(null);
      setNotes([]);
      setDailyLog(null);
      setTranscript('');

      const controller = controllerRef.current;
      if (!controller) {
        throw new Error('Controller not initialized');
      }

      // 如果传入了场景，更新手动场景状态
      if (scene) {
        setManualSceneState(scene);
      }

      await controller.startRecording(scene);
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
      setNotes(result.notes);
      setDailyLog(result.dailyLog);
      return result;
    } catch (err: any) {
      setError(err.message);
      return { notes: [], dailyLog: null };
    }
  }, []);

  // 设置手动场景
  const setManualScene = useCallback((scene: SceneType | null) => {
    setManualSceneState(scene);
    // 如果正在录音，更新控制器
    const controller = controllerRef.current;
    if (controller && state === 'recording') {
      controller.sceneDetector.setManualScene(scene);
    }
  }, [state]);

  // 重置
  const reset = useCallback(() => {
    setTranscript('');
    setCurrentScene('unknown');
    setManualSceneState(null);
    setNotes([]);
    setDailyLog(null);
    setError(null);
  }, []);

  return {
    state,
    transcript,
    currentScene,
    manualScene,
    notes,
    dailyLog,
    systemStatus,
    startRecording,
    stopRecording,
    setManualScene,
    reset,
    error,
  };
}
