// 7×24 在线语音笔记系统 - 信息量评估模块

import type { InformationScore } from '../types';
import { getConfig, isInvalidContent } from '../config';

// ===== 信息量评估器 =====
export class InformationScorer {
  // 评估文本信息量
  score(text: string, duration: number): InformationScore {
    const config = getConfig().informationFilter;

    // 基础检查
    if (!text || text.trim().length === 0) {
      return this.createScore(0, '空文本');
    }

    if (text.trim().length < config.minTextLength) {
      return this.createScore(0, `文本长度不足 (${text.trim().length} < ${config.minTextLength})`);
    }

    if (duration < config.minDuration) {
      return this.createScore(0, `时长不足 (${duration}s < ${config.minDuration}s)`);
    }

    if (isInvalidContent(text)) {
      return this.createScore(0, '无效内容（纯语气词/测试内容）');
    }

    // 计算各维度分数
    const lexicalDiversity = this.calculateLexicalDiversity(text);
    const semanticDensity = this.calculateSemanticDensity(text);
    const topicCoherence = this.calculateTopicCoherence(text);
    const speechRate = this.calculateSpeechRate(text, duration);

    // 加权平均
    const totalScore =
      lexicalDiversity * 0.3 +
      semanticDensity * 0.3 +
      topicCoherence * 0.2 +
      speechRate * 0.2;

    // 检查是否应丢弃
    const shouldDiscard = totalScore < config.minInformationScore;
    const discardReason = shouldDiscard
      ? `信息量不足 (score: ${totalScore.toFixed(2)} < ${config.minInformationScore})`
      : undefined;

    return {
      totalScore,
      dimensions: {
        lexicalDiversity,
        semanticDensity,
        topicCoherence,
        speechRate,
      },
      shouldDiscard,
      discardReason,
    };
  }

  // 词汇多样性：uniqueWords / totalWords
  private calculateLexicalDiversity(text: string): number {
    const words = this.segmentChinese(text);
    if (words.length === 0) return 0;

    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  // 语义密度：有效词数 / 总词数
  private calculateSemanticDensity(text: string): number {
    const words = this.segmentChinese(text);
    if (words.length === 0) return 0;

    // 语气词/填充词列表
    const fillerWords = new Set([
      '嗯', '啊', '哦', '哈', '额', '嘿', '哎', '呀', '呢', '吧',
      '这个', '那个', '就是', '然后', '所以', '但是', '不过',
    ]);

    const effectiveWords = words.filter(word => !fillerWords.has(word));
    return effectiveWords.length / words.length;
  }

  // 主题连贯性：相邻句子相似度
  private calculateTopicCoherence(text: string): number {
    const sentences = text.split(/[。！？；\n]/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 1; // 单句默认连贯

    let coherenceSum = 0;
    let pairCount = 0;

    for (let i = 0; i < sentences.length - 1; i++) {
      const words1 = new Set(this.segmentChinese(sentences[i]));
      const words2 = new Set(this.segmentChinese(sentences[i + 1]));

      // 计算 Jaccard 相似度
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      if (union.size > 0) {
        coherenceSum += intersection.size / union.size;
      }
      pairCount++;
    }

    return pairCount > 0 ? coherenceSum / pairCount : 0;
  }

  // 语速合理性：字数 / 时长
  private calculateSpeechRate(text: string, duration: number): number {
    if (duration === 0) return 0;

    const charCount = text.replace(/\s/g, '').length;
    const charsPerSecond = charCount / duration;

    // 正常语速：2-5 字/秒
    const minRate = 2;
    const maxRate = 5;

    if (charsPerSecond < minRate) {
      return charsPerSecond / minRate; // 太慢
    } else if (charsPerSecond > maxRate) {
      return maxRate / charsPerSecond; // 太快
    } else {
      return 1; // 正常
    }
  }

  // 简单的中文分词（基于字符）
  private segmentChinese(text: string): string[] {
    // 移除标点符号
    const cleaned = text.replace(/[。，、！？；：""''（）\[\]【】\s]/g, '');
    // 按字符分割（简化版，实际应使用分词库）
    return cleaned.split('').filter(c => c.length > 0);
  }

  private createScore(score: number, reason: string): InformationScore {
    return {
      totalScore: score,
      dimensions: {
        lexicalDiversity: 0,
        semanticDensity: 0,
        topicCoherence: 0,
        speechRate: 0,
      },
      shouldDiscard: true,
      discardReason: reason,
    };
  }
}

// ===== 单例 =====
let scorerInstance: InformationScorer | null = null;

export function getInformationScorer(): InformationScorer {
  if (!scorerInstance) {
    scorerInstance = new InformationScorer();
  }
  return scorerInstance;
}
