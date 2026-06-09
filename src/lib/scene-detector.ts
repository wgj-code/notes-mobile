// F-001: Scene Detector
// 基于关键词规则识别会议/闲聊/自言自语场景

export type SceneType = 'meeting' | 'chat' | 'monologue' | 'unknown';

interface SceneKeywords {
  meeting: string[];
  chat: string[];
  monologue: string[];
}

// 场景关键词库
const SCENE_KEYWORDS: SceneKeywords = {
  meeting: [
    // 会议常用词
    '各位', '大家', '会议', '讨论', '汇报', '总结', '计划', '项目',
    '负责人', '分工', 'deadline', '排期', '里程碑', '进度',
    // 会议角色
    '经理', '总监', '主管', '组长', '同事', '领导',
    // 会议动作
    '请说', '接下来', '下面', '首先', '其次', '最后',
    '同意', '反对', '建议', '意见', '决议',
    // 工作沟通
    '报告', '方案', '客户', '催', '抓紧', '交', '完成',
    '周会', '例会', '站会', '复盘', '评审',
    '需求', '排期', '上线', '发布', '版本',
  ],
  chat: [
    // 闲聊常用词
    '哈哈', '笑死', '真的吗', '假的', '无聊', '没意思',
    '吃饭', '喝咖啡', '午休', '下班', '周末', '放假',
    '好看', '好玩', '有趣', '搞笑', '段子',
    // 口语化表达
    '哎', '嗯', '哦', '啊', '呀', '呢', '吧',
    '卧槽', '牛逼', '厉害', '绝了', '离谱',
    // 日常对话
    '师傅', '谢谢', '不客气', '慢走', '好的',
    '怎么样', '还好', '还行', '不错', '挺好',
    '老公', '老婆', '孩子', '作业', '做饭',
    '喂', '你好', '您好', '请问',
    // 打电话
    '张总', '李总', '王总', '小李', '小王', '小张',
  ],
  monologue: [
    // 思考性词汇
    '我在想', '我在思考', '让我想想', '或许', '可能',
    '应该', '也许', '感觉', '觉得', '认为',
    '计划', '打算', '准备', '想要', '需要',
    '问题', '解决方案', '思路', '想法',
    // 自言自语标记
    '对了', '等等', '还有', '话说',
    // 规划类
    '明天', '今天', '晚上', '上午', '下午',
    '先', '然后', '接下来', '最后',
    '唉', '事情', '真多', '先要', '先把',
  ],
};

// 关键词权重配置
const KEYWORD_WEIGHTS = {
  primary: 3,    // 高权重关键词
  secondary: 2,  // 中权重关键词
  tertiary: 1,   // 低权重关键词
};

// 计算场景得分
function calculateSceneScore(text: string, keywords: string[]): number {
  let score = 0;
  const lowerText = text.toLowerCase();

  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      // 根据关键词位置和频率调整权重
      const count = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      const positionBonus = lowerText.indexOf(keyword) < text.length * 0.3 ? 1.5 : 1;
      score += count * positionBonus;
    }
  }

  // 文本长度奖励（越长越可能是会议）
  const lengthBonus = Math.min(text.length / 100, 3);
  score += lengthBonus;

  return score;
}

// 检测多人对话模式
function detectMultiSpeaker(text: string): boolean {
  // 常见的多人对话标记
  const speakerMarkers = [
    /[：:]\s*[一-龥]{2,4}/,  // 中文名字+冒号
    /^[一-龥]{2,4}[：:]/m,   // 行首中文名字+冒号
    /发言人\d/,
    /说话人\d/,
    /A[：:]/,
    /B[：:]/,
    /甲[：:]/,
    /乙[：:]/,
  ];

  return speakerMarkers.some((marker) => marker.test(text));
}

// 检测对话结构（问句+答句模式）
function detectDialoguePattern(text: string): boolean {
  // 问句标记
  const questionMarkers = /[？?]/;
  // 答句标记
  const answerMarkers = /好的|行|可以|没问题|知道了|哦|嗯|对/;
  // 交替出现
  const hasQuestion = questionMarkers.test(text);
  const hasAnswer = answerMarkers.test(text);
  return hasQuestion && hasAnswer;
}

// 主场景识别函数
export function identifyScene(text: string): SceneType {
  if (!text || text.trim().length < 5) {
    return 'unknown';
  }

  const meetingScore = calculateSceneScore(text, SCENE_KEYWORDS.meeting);
  const chatScore = calculateSceneScore(text, SCENE_KEYWORDS.chat);
  const monologueScore = calculateSceneScore(text, SCENE_KEYWORDS.monologue);

  // 多人对话模式加分
  const isMultiSpeaker = detectMultiSpeaker(text);
  const adjustedMeetingScore = isMultiSpeaker ? meetingScore * 1.5 : meetingScore;

  // 单人独白检测（如果文本中没有对话标记）
  const hasDialogueMarkers = /[？?！!]/.test(text) && text.length > 50;
  const adjustedMonologueScore = !hasDialogueMarkers ? monologueScore * 1.3 : monologueScore;

  // 找出最高分场景
  const scores = [
    { type: 'meeting' as SceneType, score: adjustedMeetingScore },
    { type: 'chat' as SceneType, score: chatScore },
    { type: 'monologue' as SceneType, score: adjustedMonologueScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  // 对话结构检测加分（问句+答句模式）
  const hasDialogue = detectDialoguePattern(text);
  if (hasDialogue && scores[0].type === 'chat') {
    scores[0].score += 2;
  }

  // 如果最高分太低，返回unknown
  if (scores[0].score < 1) {
    return 'unknown';
  }

  // 如果最高分和次高分差距不大，返回unknown（置信度不够）
  if (scores[0].score - scores[1].score < 0.8) {
    return 'unknown';
  }

  return scores[0].type;
}

// 获取场景中文名称
export function getSceneName(scene: SceneType): string {
  const names: Record<SceneType, string> = {
    meeting: '会议',
    chat: '闲聊',
    monologue: '自言自语',
    unknown: '未知',
  };
  return names[scene];
}

// 获取场景图标
export function getSceneIcon(scene: SceneType): string {
  const icons: Record<SceneType, string> = {
    meeting: '👥',
    chat: '💬',
    monologue: '🤔',
    unknown: '📝',
  };
  return icons[scene];
}
