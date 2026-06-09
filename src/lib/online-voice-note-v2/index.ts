// 7×24 在线语音笔记系统 v2 - 导出

// 核心模块
export { OnlineVoiceNoteControllerV2 } from './controller';
export type { ControllerState, ControllerCallbacks } from './controller';

// 场景识别
export { identifyScene, extractKeywords, getSceneName } from './scene-detector';

// 场景转换检测
export { SceneTransitionDetector } from './scene-transition-detector';

// 笔记分割
export { NoteSegmenter } from './note-segmenter';

// 音频分片管理
export { AudioSegmentManager } from './audio-segment-manager';

// 日志汇总生成
export { DailyLogGenerator } from './daily-log-generator';

// 类型
export type {
  SceneType,
  TransitionDecision,
  SceneSegment,
  VoiceNote,
  DailyLog,
  SceneLogEntry,
  SystemStatus,
  SegmentProcessResult,
} from './types';
