// 7×24 在线语音笔记系统 - 导出

// 核心模块
export { OnlineVoiceNoteController, getController, resetController } from './core/controller';
export type { ControllerState, ControllerCallbacks } from './core/controller';

export { getLogger, resetLogger } from './core/logger';
export type { LogLevel } from './core/logger';

// 功能模块
export { getSceneStateMachine } from './modules/scene-state-machine';
export { getNoteSegmenter } from './modules/note-segmenter';
export { getDailyLogGenerator } from './modules/daily-log-generator';
export { getInformationScorer } from './modules/information-scorer';
export { getHealthChecker } from './modules/health-check';
export { getMonitor } from './modules/monitor';

// 配置
export { getConfig, updateConfig, resetConfig } from './config';
export type { OnlineVoiceNoteConfig } from './config';

// 类型
export type {
  SceneType,
  SceneSegment,
  VoiceNote,
  DailyLog,
  SceneLogEntry,
  TimelineEvent,
  InformationScore,
  SceneTransition,
  SystemStatus,
  HealthCheck,
  DiagnosticExport,
  SystemLog,
  Alert,
} from './types';
