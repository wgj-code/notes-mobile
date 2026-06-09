// 7×24 在线语音笔记系统 - 配置管理

import type { SceneType } from './types';

// ===== 默认配置 =====
export const DEFAULT_CONFIG = {
  // 录音配置
  recording: {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION
    bufferSize: 4096,
  },

  // STT 配置
  stt: {
    modelType: 'paraformer' as const,
    numThreads: 2,
    dither: 0,
    debug: false,
    endpointConfig: {
      rule1: { mustContainNonSilence: true, minTrailingSilence: 2.4, minUtteranceLength: 20 },
      rule2: { mustContainNonSilence: true, minTrailingSilence: 1.4, minUtteranceLength: 20 },
      rule3: { mustContainNonSilence: false, minTrailingSilence: 0, minUtteranceLength: 20 },
    },
  },

  // 场景转换检测配置
  sceneTransition: {
    minSceneDuration: 30,           // 最小场景时长（秒）
    silenceThreshold: 3,            // 静音阈值（秒）
    transitionWords: [
      '好了', '下一个', '对了', '行', 'OK', '好的',
      '接下来', '下面', '首先', '然后', '最后',
      '话说', '对了', '等等', '还有',
    ],
    scoreReversalThreshold: 0.5,    // 得分反转阈值
    minTransitionConfidence: 0.6,   // 最小转换置信度
  },

  // 信息量评估配置
  informationFilter: {
    minTextLength: 10,              // 最小文本长度
    minInformationScore: 0.3,       // 最小信息量评分
    minDuration: 5,                 // 最小时长（秒）
    maxDuplicateRatio: 0.7,         // 最大重复率
    invalidPatterns: [
      /^(嗯|啊|哦|哈|额|嘿嘿|哈哈)+$/,
      /^(测试|试音|123|abc|一二三四五)+$/i,
      /^[。，、！？\s]+$/,
    ],
  },

  // 场景关键词配置
  sceneKeywords: {
    meeting: [
      '各位', '大家', '会议', '讨论', '汇报', '总结', '计划', '项目',
      '负责人', '分工', 'deadline', '排期', '里程碑', '进度',
      '经理', '总监', '主管', '组长', '同事', '领导',
      '报告', '方案', '客户', '周会', '例会', '站会', '复盘', '评审',
      '需求', '排期', '上线', '发布', '版本',
    ],
    chat: [
      '哈哈', '笑死', '真的吗', '假的', '无聊', '没意思',
      '吃饭', '喝咖啡', '午休', '下班', '周末', '放假',
      '好看', '好玩', '有趣', '搞笑', '段子',
      '哎', '嗯', '哦', '啊', '呀', '呢', '吧',
      '师傅', '谢谢', '不客气', '慢走', '好的',
      '怎么样', '还好', '还行', '不错', '挺好',
      '老公', '老婆', '孩子', '作业', '做饭',
      '喂', '你好', '您好', '请问',
    ],
    monologue: [
      '我在想', '我在思考', '让我想想', '或许', '可能',
      '应该', '也许', '感觉', '觉得', '认为',
      '计划', '打算', '准备', '想要', '需要',
      '问题', '解决方案', '思路', '想法',
      '明天', '今天', '晚上', '上午', '下午',
      '先', '然后', '接下来', '最后',
      '唉', '事情', '真多', '先要', '先把',
    ],
  },

  // 笔记生成配置
  noteGeneration: {
    minNoteDuration: 30,            // 最小笔记时长（秒）
    minNoteTextLength: 50,          // 最小笔记文本长度
    autoSaveInterval: 60,           // 自动保存间隔（秒）
  },

  // 日志汇总配置
  logGeneration: {
    generateInterval: 'daily' as const,
    includeTimeline: true,
    includeKeywords: true,
    maxKeywordsPerScene: 5,
    summaryMaxLength: 200,
  },

  // 维测配置
  diagnostics: {
    // 日志配置
    logging: {
      consoleEnabled: __DEV__,
      fileEnabled: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    },
    // 健康检查配置
    healthCheck: {
      interval: 5 * 60 * 1000,     // 5 分钟
      memoryThreshold: 0.8,         // 80%
      storageThreshold: 1024,       // 1GB
      batteryThreshold: 0.2,        // 20%
    },
    // 告警配置
    alerts: {
      enabled: true,
      cooldown: 60 * 1000,          // 1 分钟冷却
    },
  },
};

// ===== 配置类型 =====
export type OnlineVoiceNoteConfig = typeof DEFAULT_CONFIG;

// ===== 配置管理器 =====
let _config: OnlineVoiceNoteConfig = { ...DEFAULT_CONFIG };

export function getConfig(): OnlineVoiceNoteConfig {
  return _config;
}

export function updateConfig(partial: Partial<OnlineVoiceNoteConfig>): void {
  _config = {
    ..._config,
    ...partial,
  };
}

export function resetConfig(): void {
  _config = { ...DEFAULT_CONFIG };
}

// ===== 辅助函数 =====
export function getSceneKeywords(scene: SceneType): string[] {
  return _config.sceneKeywords[scene] || [];
}

export function isTransitionWord(text: string): boolean {
  const words = _config.sceneTransition.transitionWords;
  return words.some(word => text.includes(word));
}

export function isInvalidContent(text: string): boolean {
  const patterns = _config.informationFilter.invalidPatterns;
  return patterns.some(pattern => pattern.test(text));
}
