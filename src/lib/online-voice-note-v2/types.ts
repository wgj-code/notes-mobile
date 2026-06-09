// 7×24 在线语音笔记系统 v2 - 类型定义

// ===== 场景类型 =====
export type SceneType = 'meeting' | 'chat' | 'monologue' | 'unknown';

// ===== 场景转换检测结果 =====
export interface TransitionDecision {
  shouldTransition: boolean;
  confidence: number;
  reasons: string[];
  dimensionScores: {
    timeScore: number;
    contentScore: number;
    reversalScore: number;
  };
}

// ===== 场景片段 =====
export interface SceneSegment {
  id: string;
  sceneType: SceneType;
  startTime: number;
  endTime: number;
  text: string;
  textLength: number;
}

// ===== 笔记 =====
export interface VoiceNote {
  id: string;
  type: 'scene' | 'daily_log';
  sceneType?: SceneType;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  title: string;
  keywords: string[];
  segmentCount: number;
  createdAt: number;
}

// ===== 日志汇总 =====
export interface DailyLog {
  id: string;
  date: string;
  summary: string;
  sceneCount: number;
  totalDuration: number;
  scenes: SceneLogEntry[];
  tags: string[];
  createdAt: number;
}

export interface SceneLogEntry {
  sceneType: SceneType;
  startTime: string;
  endTime: string;
  duration: number;
  noteId: string;
  summary: string;
}

// ===== 系统状态 =====
export interface SystemStatus {
  isRecording: boolean;
  currentScene: SceneType;
  recordingDuration: number;
  segmentCount: number;
  noteCount: number;
  lastTransitionTime: number;
  inCooldown: boolean;
}

// ===== 处理结果 =====
export interface SegmentProcessResult {
  shouldSaveNote: boolean;
  shouldStartNewNote: boolean;
  scene: SceneType;
  noteText?: string;
  isConfirmed: boolean;
}
