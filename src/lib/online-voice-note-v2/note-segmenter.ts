// 7×24 在线语音笔记系统 v2 - 笔记分割器

import type { SceneType, VoiceNote } from './types';
import { getSceneName } from './scene-detector';

// ===== 笔记分割器 =====
export class NoteSegmenter {
  private notes: VoiceNote[] = [];
  private currentNote: VoiceNote | null = null;

  // 重置
  reset(): void {
    this.notes = [];
    this.currentNote = null;
  }

  // 开始新笔记
  startNewNote(scene: SceneType, startTime: number): void {
    this.currentNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'scene',
      sceneType: scene,
      startTime,
      endTime: startTime,
      duration: 0,
      text: '',
      title: '',
      keywords: [],
      segmentCount: 0,
      createdAt: Date.now(),
    };
  }

  // 追加文本到当前笔记
  appendToCurrentNote(text: string, timestamp: number): void {
    if (!this.currentNote) return;

    if (this.currentNote.text) {
      this.currentNote.text += '\n' + text;
    } else {
      this.currentNote.text = text;
    }

    this.currentNote.endTime = timestamp;
    this.currentNote.duration = (this.currentNote.endTime - this.currentNote.startTime) / 1000;
    this.currentNote.segmentCount++;
  }

  // 保存当前笔记
  saveCurrentNote(): VoiceNote | null {
    if (!this.currentNote) return null;

    // 生成标题
    this.currentNote.title = this.generateTitle(this.currentNote);

    // 提取关键词
    this.currentNote.keywords = this.extractKeywords(this.currentNote.text);

    // 保存笔记
    this.notes.push(this.currentNote);
    const savedNote = this.currentNote;
    this.currentNote = null;

    return savedNote;
  }

  // 生成标题
  private generateTitle(note: VoiceNote): string {
    const sceneName = getSceneName(note.sceneType || 'unknown');
    const time = new Date(note.startTime).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 提取前几个字作为标题的一部分
    const preview = note.text.substring(0, 20).replace(/\s/g, '');
    const title = preview.length > 10
      ? `${sceneName}（${time}）${preview}...`
      : `${sceneName}（${time}）${preview}`;

    return title;
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    // 简单的关键词提取
    const words = text.split(/[。，、！？；：\s]/).filter(w => w.length >= 2);

    // 词频统计
    const wordCount: Record<string, number> = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }

    // 按词频排序，取前 5 个
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // 获取所有笔记
  getNotes(): VoiceNote[] {
    return [...this.notes];
  }

  // 获取当前笔记
  getCurrentNote(): VoiceNote | null {
    return this.currentNote;
  }

  // 获取笔记数量
  getNoteCount(): number {
    return this.notes.length;
  }
}
