// 7×24 在线语音笔记系统 - 类型定义

// ===== 场景类型 =====
export type SceneType = 'meeting' | 'chat' | 'monologue' | 'unknown';

// ===== 场景片段 =====
export interface SceneSegment {
  id: string;
  sceneType: SceneType;
  startTime: number;
  endTime: number;
  text: string;
  textLength: number;
  informationScore: number;
}

// ===== 笔记类型 =====
export interface VoiceNote {
  id: string;
  type: 'scene' | 'daily_log';
  sceneType?: SceneType;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  title: string;
  informationScore: number;
  keywords: string[];
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
  timeline: TimelineEvent[];
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
  keywords: string[];
}

export interface TimelineEvent {
  time: string;
  event: string;
  sceneType: SceneType;
  noteId: string;
}

// ===== 信息量评估结果 =====
export interface InformationScore {
  totalScore: number;
  dimensions: {
    lexicalDiversity: number;
    semanticDensity: number;
    topicCoherence: number;
    speechRate: number;
  };
  shouldDiscard: boolean;
  discardReason?: string;
}

// ===== 场景转换检测结果 =====
export interface SceneTransition {
  isTransition: boolean;
  newScene: SceneType;
  confidence: number;
  reason: string;
}

// ===== 系统状态 =====
export interface SystemStatus {
  uptime: number;
  lastStartTime: number;
  recording: {
    isActive: boolean;
    duration: number;
    audioLevel: number;
    sampleRate: number;
    bufferSize: number;
  };
  stt: {
    isReady: boolean;
    modelLoaded: boolean;
    processingLatency: number;
    totalProcessed: number;
    errorCount: number;
  };
  scene: {
    currentScene: SceneType;
    sceneDuration: number;
    totalScenes: number;
    transitionCount: number;
  };
  notes: {
    todayCount: number;
    totalDuration: number;
    discardedCount: number;
    averageInfoScore: number;
  };
  resources: {
    memoryUsage: number;
    storageUsage: number;
    storageAvailable: number;
    batteryLevel: number;
    isCharging: boolean;
  };
  errors: {
    total: number;
    byModule: Record<string, number>;
    lastError?: {
      timestamp: number;
      module: string;
      message: string;
    };
  };
}

// ===== 健康检查 =====
export interface HealthCheck {
  checks: {
    recording: {
      microphoneAvailable: boolean;
      audioLevelNormal: boolean;
      bufferNormal: boolean;
    };
    stt: {
      modelLoaded: boolean;
      engineReady: boolean;
      latencyNormal: boolean;
    };
    scene: {
      keywordsLoaded: boolean;
      stateMachineNormal: boolean;
    };
    notes: {
      databaseConnected: boolean;
      storageSufficient: boolean;
    };
    resources: {
      memoryNormal: boolean;
      storageSufficient: boolean;
      batterySufficient: boolean;
    };
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkedAt: number;
}

// ===== 诊断信息 =====
export interface DiagnosticExport {
  appVersion: string;
  buildNumber: string;
  platform: string;
  osVersion: string;
  deviceModel: string;
  uptime: number;
  lastStartTime: number;
  performance: {
    memoryUsage: number;
    storageUsage: number;
  };
  errorLogs: any[];
  statusHistory: SystemStatus[];
  recentEvents: any[];
}

// ===== 系统日志 =====
export interface SystemLog {
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  module: string;
  event: string;
  sessionId: string;
  sequenceNo: number;
  data: Record<string, any>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  memoryUsage?: number;
}

// ===== 告警 =====
export interface Alert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  context: Record<string, any>;
  channels: {
    console: boolean;
    notification: boolean;
    log: boolean;
  };
}
