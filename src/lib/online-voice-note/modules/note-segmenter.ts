// 7×24 在线语音笔记系统 - 笔记分割器

import type { SceneSegment, VoiceNote, SceneType } from '../types';
import { getConfig } from '../config';
import { getLogger } from '../core/logger';
import { getInformationScorer } from './information-scorer';

// ===== 笔记分割器 =====
export class NoteSegmenter {
  private pendingSegments: SceneSegment[] = [];
  private generatedNotes: VoiceNote[] = [];
  private logger = getLogger();
  private scorer = getInformationScorer();

  // 处理新的场景片段
  processSegment(segment: SceneSegment): VoiceNote | null {
    const config = getConfig().noteGeneration;

    // 评估信息量
    const duration = (segment.endTime - segment.startTime) / 1000;
    const infoScore = this.scorer.score(segment.text, duration);

    // 更新片段的信息量评分
    segment.informationScore = infoScore.totalScore;

    // 检查是否应丢弃
    if (infoScore.shouldDiscard) {
      this.logger.info('NoteSegmenter', 'Segment discarded', {
        segmentId: segment.id,
        scene: segment.sceneType,
        reason: infoScore.discardReason,
        duration,
        textLength: segment.textLength,
      });
      return null;
    }

    // 检查是否满足笔记生成条件
    if (!this.shouldGenerateNote(segment, duration)) {
      this.logger.debug('NoteSegmenter', 'Segment buffered', {
        segmentId: segment.id,
        scene: segment.sceneType,
        duration,
        textLength: segment.textLength,
        pendingCount: this.pendingSegments.length + 1,
      });
      this.pendingSegments.push(segment);
      return null;
    }

    // 生成笔记
    const note = this.generateNote(segment, duration);
    this.generatedNotes.push(note);

    this.logger.info('NoteSegmenter', 'Note generated', {
      noteId: note.id,
      scene: note.sceneType,
      duration: note.duration,
      textLength: note.text.length,
      title: note.title,
    });

    return note;
  }

  // 检查是否应生成笔记
  private shouldGenerateNote(segment: SceneSegment, duration: number): boolean {
    const config = getConfig().noteGeneration;

    // 条件1：时长足够
    if (duration < config.minNoteDuration) {
      return false;
    }

    // 条件2：文本长度足够
    if (segment.textLength < config.minNoteTextLength) {
      return false;
    }

    return true;
  }

  // 生成笔记
  private generateNote(segment: SceneSegment, duration: number): VoiceNote {
    const title = this.generateTitle(segment);
    const keywords = this.extractKeywords(segment.text);

    return {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'scene',
      sceneType: segment.sceneType,
      startTime: segment.startTime,
      endTime: segment.endTime,
      duration,
      text: segment.text,
      title,
      informationScore: segment.informationScore,
      keywords,
      createdAt: Date.now(),
    };
  }

  // 生成标题
  private generateTitle(segment: SceneSegment): string {
    const sceneNames: Record<SceneType, string> = {
      meeting: '会议记录',
      chat: '闲聊记录',
      monologue: '自言自语',
      unknown: '语音笔记',
    };

    const sceneName = sceneNames[segment.sceneType] || '语音笔记';
    const time = new Date(segment.startTime).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 提取前几个字作为标题的一部分
    const preview = segment.text.substring(0, 20).replace(/\s/g, '');
    const title = preview.length > 10 ? `${sceneName}（${time}）${preview}...` : `${sceneName}（${time}）${preview}`;

    return title;
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    // 简单的关键词提取（实际应使用 TF-IDF 或其他算法）
    const words = text.split(/[。，、！？；：\s]/).filter(w => w.length >= 2);

    // 词频统计
    const wordCount: Record<string, number> = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }

    // 按词频排序，取前 5 个
    const sorted = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    return sorted;
  }

  // 强制生成笔记（用于结束时）
  forceGenerate(): VoiceNote[] {
    const notes: VoiceNote[] = [];

    // 处理所有待处理的片段
    for (const segment of this.pendingSegments) {
      const duration = (segment.endTime - segment.startTime) / 1000;
      const note = this.generateNote(segment, duration);
      notes.push(note);
      this.generatedNotes.push(note);
    }

    this.pendingSegments = [];
    return notes;
  }

  // 获取所有生成的笔记
  getNotes(): VoiceNote[] {
    return [...this.generatedNotes];
  }

  // 清空笔记
  clearNotes(): void {
    this.generatedNotes = [];
    this.pendingSegments = [];
  }

  // 重置
  reset(): void {
    this.pendingSegments = [];
    this.generatedNotes = [];
  }
}

// ===== 单例 =====
let segmenterInstance: NoteSegmenter | null = null;

export function getNoteSegmenter(): NoteSegmenter {
  if (!segmenterInstance) {
    segmenterInstance = new NoteSegmenter();
  }
  return segmenterInstance;
}
