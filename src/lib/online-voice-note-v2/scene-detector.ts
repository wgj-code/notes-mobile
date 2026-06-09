// 7×24 在线语音笔记系统 v2 - 场景识别器

import type { SceneType } from './types';

// ===== 场景关键词配置 =====
const SCENE_KEYWORDS: Record<SceneType, string[]> = {
  meeting: [
    '各位', '大家', '会议', '讨论', '汇报', '总结', '计划', '项目',
    '负责人', '分工', 'deadline', '排期', '里程碑', '进度',
    '经理', '总监', '主管', '组长', '同事', '领导',
    '报告', '方案', '客户', '周会', '例会', '站会', '复盘', '评审',
    '需求', '排期', '上线', '发布', '版本', '迭代', 'sprint',
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
  unknown: [],
};

// ===== 场景识别函数 =====
export function identifyScene(text: string): SceneType {
  if (!text || text.trim().length < 5) {
    return 'unknown';
  }

  const scores: Record<SceneType, number> = {
    meeting: 0,
    chat: 0,
    monologue: 0,
    unknown: 0,
  };

  // 计算各场景得分
  for (const scene of ['meeting', 'chat', 'monologue'] as SceneType[]) {
    const keywords = SCENE_KEYWORDS[scene];
    let score = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }

    // 文本长度奖励
    score += Math.min(text.length / 100, 3);

    scores[scene] = score;
  }

  // 找出最高分
  const sorted = Object.entries(scores)
    .filter(([scene]) => scene !== 'unknown')
    .sort(([, a], [, b]) => b - a);

  const [topScene, topScore] = sorted[0];
  const [, secondScore] = sorted[1] || ['unknown', 0];

  // 如果最高分太低或差距不够，返回 unknown
  if (topScore < 1 || topScore - secondScore < 0.8) {
    return 'unknown';
  }

  return topScene as SceneType;
}

// ===== 关键词提取 =====
export function extractKeywords(text: string): string[] {
  // 移除标点符号
  const cleaned = text.replace(/[。，、！？；：""''（）\[\]【】\s]/g, '');

  // 简单分词（按字符）
  const words = cleaned.split('').filter(c => c.length > 0);

  // 词频统计
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // 按词频排序，取前 10 个
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// ===== 场景中文名 =====
export function getSceneName(scene: SceneType): string {
  const names: Record<SceneType, string> = {
    meeting: '会议',
    chat: '闲聊',
    monologue: '自言自语',
    unknown: '其他',
  };
  return names[scene] || '其他';
}
