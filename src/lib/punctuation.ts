// STT 标点后处理模块
// 基于规则引擎：语音停顿 + 语义分析

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

  // 1. 句末语气词后添加句号
  const sentenceEnders = ['的', '了', '呢', '吧', '啊', '哦', '嗯', '哈', '呀'];
  for (const ender of sentenceEnders) {
    // 匹配：语气词 + 后面是中文字符或字符串结尾
    const regex = new RegExp(`(${ender})(?=[\\u4e00-\\u9fa5]|$)`, 'g');
    result = result.replace(regex, `$1。`);
  }

  // 2. 疑问词后添加问号
  const questionWords = ['吗', '呢', '什么', '怎么', '为什么', '哪里', '谁', '几'];
  for (const word of questionWords) {
    const regex = new RegExp(`(${word})(?=[\\u4e00-\\u9fa5]|$)`, 'g');
    result = result.replace(regex, `$1？`);
  }

  // 3. 列举项后添加逗号（如：第一、第二、第三）
  result = result.replace(/(第[一二三四五六七八九十百千万]+)(?=[\\u4e00-\\u9fa5])/g, '$1，');

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
