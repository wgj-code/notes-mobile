// 7×24 在线语音笔记系统 v2 - 日志汇总生成器

import type { DailyLog, SceneLogEntry, VoiceNote, SceneType } from './types';
import { getSceneName } from './scene-detector';

// ===== 日志汇总生成器 =====
export class DailyLogGenerator {
  // 生成日志汇总
  generate(notes: VoiceNote[], date?: string): DailyLog {
    const targetDate = date || this.getDateString(new Date());

    // 过滤当天的笔记
    const todayNotes = notes.filter(note => {
      const noteDate = this.getDateString(new Date(note.createdAt));
      return noteDate === targetDate && note.type === 'scene';
    });

    // 生成场景日志条目
    const scenes = this.generateSceneEntries(todayNotes);

    // 提取标签
    const tags = this.extractTags(todayNotes);

    // 生成摘要
    const summary = this.generateSummary(todayNotes, scenes);

    const log: DailyLog = {
      id: `log_${targetDate}_${Date.now()}`,
      date: targetDate,
      summary,
      sceneCount: scenes.length,
      totalDuration: todayNotes.reduce((sum, note) => sum + note.duration, 0),
      scenes,
      tags,
      createdAt: Date.now(),
    };

    console.log('[DailyLogGenerator] Generated daily log:', {
      logId: log.id,
      date: log.date,
      sceneCount: log.sceneCount,
      noteCount: todayNotes.length,
    });

    return log;
  }

  // 生成场景日志条目
  private generateSceneEntries(notes: VoiceNote[]): SceneLogEntry[] {
    return notes
      .sort((a, b) => a.startTime - b.startTime)
      .map(note => ({
        sceneType: note.sceneType || 'unknown',
        startTime: new Date(note.startTime).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        endTime: new Date(note.endTime).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration: note.duration,
        noteId: note.id,
        summary: this.generateSceneSummary(note),
      }));
  }

  // 生成场景摘要
  private generateSceneSummary(note: VoiceNote): string {
    // 取前两句话作为摘要
    const sentences = note.text.split(/[。！？]/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join('。');

    if (summary.length > 100) {
      return summary.substring(0, 100) + '...';
    }

    return summary || note.text.substring(0, 100);
  }

  // 提取标签
  private extractTags(notes: VoiceNote[]): string[] {
    const tagSet = new Set<string>();

    // 场景类型标签
    for (const note of notes) {
      if (note.sceneType) {
        tagSet.add(getSceneName(note.sceneType));
      }
    }

    // 高频关键词标签
    const allKeywords = notes.flatMap(note => note.keywords);
    const keywordCount: Record<string, number> = {};
    for (const keyword of allKeywords) {
      keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
    }

    const topKeywords = Object.entries(keywordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    for (const keyword of topKeywords) {
      tagSet.add(keyword);
    }

    return Array.from(tagSet);
  }

  // 生成摘要
  private generateSummary(notes: VoiceNote[], scenes: SceneLogEntry[]): string {
    if (notes.length === 0) {
      return '今日无语音笔记记录。';
    }

    // 统计各场景数量
    const sceneStats: Record<SceneType, number> = {
      meeting: 0,
      chat: 0,
      monologue: 0,
      unknown: 0,
    };

    for (const note of notes) {
      const scene = note.sceneType || 'unknown';
      sceneStats[scene]++;
    }

    // 统计总时长
    const totalMinutes = Math.round(
      notes.reduce((sum, note) => sum + note.duration, 0) / 60
    );

    // 构建摘要
    const parts: string[] = [];

    if (sceneStats.meeting > 0) {
      parts.push(`${sceneStats.meeting}次会议`);
    }
    if (sceneStats.chat > 0) {
      parts.push(`${sceneStats.chat}次闲聊`);
    }
    if (sceneStats.monologue > 0) {
      parts.push(`${sceneStats.monologue}次自言自语`);
    }

    const sceneSummary = parts.length > 0 ? parts.join('、') : '若干语音片段';
    const timeSummary = totalMinutes > 0 ? `共${totalMinutes}分钟` : '';

    // 提取关键内容
    const keyContents = scenes
      .filter(s => s.duration > 60) // 只取超过1分钟的场景
      .slice(0, 3)
      .map(s => s.summary.substring(0, 30))
      .filter(s => s.length > 0);

    let summary = `今日${sceneSummary}，${timeSummary}。`;
    if (keyContents.length > 0) {
      summary += `主要内容：${keyContents.join('；')}。`;
    }

    return summary;
  }

  // 获取日期字符串
  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
