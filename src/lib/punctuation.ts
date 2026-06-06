// STT 后处理模块
// 去重 + 标点（基于规则引擎）

/**
 * 去除 STT 识别中的连续重复字
 * 处理 streaming 模型常见的重复输出，如 "本本轮轮" → "本轮"、"鑫鑫鑫鑫" → "鑫"
 * 匹配 2+ 连续相同汉字，缩减为 1 个
 * 保留常见 AABB 自然重叠词
 * @param text STT 识别的原始文本
 * @returns 去重后的文本
 */
export function deduplicateSttText(text: string): string {
  if (!text || text.trim().length === 0) return text;

  // 先保护 AABB 自然重叠词（高高兴兴、开开心心等）
  // 临时替换为占位符，去重后还原
  const AABB_WORDS = [
    '高高兴兴', '开开心心', '快快乐乐', '漂漂亮亮', '干干净净',
    '整整齐齐', '明明白白', '清清楚楚', '认认真真', '仔仔细细',
    '平平安安', '健健康康', '热热闹闹', '欢欢喜喜', '和和美美',
    '甜甜蜜蜜', '幸幸福福', '踏踏实实', '稳稳当当', '妥妥当当',
    '大大方方', '客客气气', '亲亲切切', '热热乎乎', '暖暖和和',
    '严严实实', '密密麻麻', '方方面面', '陆陆续续',
    '断断续续', '形形色色', '林林总总', '日日夜夜',
    '朝朝暮暮', '生生世世', '世世代代', '子子孙孙', '风风雨雨',
  ];

  const placeholders: Array<[string, string]> = [];
  let result = text;

  AABB_WORDS.forEach((word, i) => {
    if (result.includes(word)) {
      const ph = `\x00AABB${i}\x00`;
      placeholders.push([ph, word]);
      result = result.replace(new RegExp(word, 'g'), ph);
    }
  });

  // 去重：2+ 连续相同汉字 → 1 个
  result = result.replace(/([一-龥])\1+/g, '$1');

  // 还原 AABB 词
  placeholders.forEach(([ph, word]) => {
    result = result.replace(new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), word);
  });

  return result;
}

/**
 * 为 STT 识别文本添加标点符号
 * @param text STT 识别的原始文本（无标点）
 * @param segments 可选：STT 分段信息（含时间戳），用于检测语音停顿
 * @returns 添加标点后的文本
 */
export function addPunctuation(
  text: string,
  segments?: Array<{ text: string; timestamp: number }>
): string {
  if (!text || text.trim().length === 0) return text;

  // 如果没有分段信息，使用简单规则
  if (!segments || segments.length === 0) {
    return addPunctuationByRules(text);
  }

  // 有分段信息时，结合停顿分析
  return addPunctuationWithSegments(text, segments);
}

/**
 * 基于规则的标点添加（无分段信息）
 */
function addPunctuationByRules(text: string): string {
  let result = text;

  // 1. 列举项后添加逗号（如：第一、第二、第三）- 优先处理
  result = result.replace(/(第[一二三四五六七八九十百千万]+)(?=[一-龥])/g, '$1，');

  // 2. 句末语气词后添加句号
  const sentenceEnders = ['的', '了', '呢', '吧', '啊', '哦', '嗯', '哈', '呀'];
  for (const ender of sentenceEnders) {
    // 匹配：语气词 + 后面是中文字符或字符串结尾
    const regex = new RegExp(`(${ender})(?=[一-龥]|$)`, 'g');
    result = result.replace(regex, `$1。`);
  }

  // 3. 疑问词后添加问号（在句号之前处理）
  // 注意：吗、什么、怎么等疑问词本身不加问号，而是在句子末尾加
  const questionEnders = ['吗', '呢'];
  for (const word of questionEnders) {
    const regex = new RegExp(`(${word})(?=[\\u4e00-\\u9fa5]|$)`, 'g');
    result = result.replace(regex, `$1？`);
  }

  // 4. 清理重复标点
  result = result.replace(/。，/g, '。');
  result = result.replace(/。。/g, '。');
  result = result.replace(/，，/g, '，');
  result = result.replace(/？？/g, '？');
  result = result.replace(/！！/g, '！');

  return result;
}

/**
 * 结合分段信息的标点添加（有时间戳）
 */
function addPunctuationWithSegments(
  text: string,
  segments: Array<{ text: string; timestamp: number }>
): string {
  // 检测语音停顿（间隔 > 300ms）
  const PAUSE_THRESHOLD = 300; // 毫秒

  let result = text;

  // 找出停顿位置
  const pausePositions: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].timestamp - segments[i - 1].timestamp;
    if (gap > PAUSE_THRESHOLD) {
      // 计算停顿在原文中的大致位置
      const prevText = segments.slice(0, i).map(s => s.text).join('');
      pausePositions.push(prevText.length);
    }
  }

  // 在停顿位置插入逗号
  if (pausePositions.length > 0) {
    const chars = result.split('');
    // 从后往前插入，避免索引偏移
    for (let i = pausePositions.length - 1; i >= 0; i--) {
      const pos = Math.min(pausePositions[i], chars.length);
      // 检查前后是否已有标点
      const prevChar = pos > 0 ? chars[pos - 1] : '';
      const nextChar = pos < chars.length ? chars[pos] : '';
      const punctuation = /[。，？！、；：]$/.test(prevChar) || /^[。，？！、；：]/.test(nextChar);
      if (!punctuation) {
        chars.splice(pos, 0, '，');
      }
    }
    result = chars.join('');
  }

  // 应用基础规则
  result = addPunctuationByRules(result);

  return result;
}
