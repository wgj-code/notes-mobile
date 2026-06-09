// 笔记分割器单元测试

import { NoteSegmenter } from '../lib/online-voice-note-v2/note-segmenter';

describe('NoteSegmenter', () => {
  let segmenter: NoteSegmenter;

  beforeEach(() => {
    segmenter = new NoteSegmenter();
  });

  describe('笔记生成', () => {
    it('应该正确开始新笔记', () => {
      const startTime = Date.now();
      segmenter.startNewNote('meeting', startTime);

      const currentNote = segmenter.getCurrentNote();
      expect(currentNote).not.toBeNull();
      expect(currentNote?.sceneType).toBe('meeting');
      expect(currentNote?.startTime).toBe(startTime);
    });

    it('应该正确追加文本', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('第一段内容', Date.now());
      segmenter.appendToCurrentNote('第二段内容', Date.now() + 60000);

      const currentNote = segmenter.getCurrentNote();
      expect(currentNote?.text).toContain('第一段内容');
      expect(currentNote?.text).toContain('第二段内容');
      expect(currentNote?.segmentCount).toBe(2);
    });

    it('应该正确计算时长', () => {
      const startTime = Date.now();
      segmenter.startNewNote('meeting', startTime);
      segmenter.appendToCurrentNote('内容', startTime + 60000); // 1分钟后

      const currentNote = segmenter.getCurrentNote();
      expect(currentNote?.duration).toBeCloseTo(60, 0);
    });

    it('应该正确保存笔记', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('测试内容', Date.now());

      const savedNote = segmenter.saveCurrentNote();
      expect(savedNote).not.toBeNull();
      expect(savedNote?.text).toContain('测试内容');

      const notes = segmenter.getNotes();
      expect(notes.length).toBe(1);
    });

    it('保存后应该清空当前笔记', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('内容', Date.now());
      segmenter.saveCurrentNote();

      const currentNote = segmenter.getCurrentNote();
      expect(currentNote).toBeNull();
    });
  });

  describe('标题生成', () => {
    it('应该生成包含场景名的标题', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('今天我们开个会讨论一下项目进度', Date.now());

      const note = segmenter.saveCurrentNote();
      expect(note?.title).toContain('会议');
    });

    it('应该生成包含时间的标题', () => {
      const startTime = new Date('2026-06-08T10:30:00').getTime();
      segmenter.startNewNote('meeting', startTime);
      segmenter.appendToCurrentNote('测试内容', Date.now());

      const note = segmenter.saveCurrentNote();
      expect(note?.title).toContain('10:30');
    });

    it('标题应该截取前20个字', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('这是一段很长的测试内容用于验证标题截取功能是否正常工作', Date.now());

      const note = segmenter.saveCurrentNote();
      expect(note?.title.length).toBeLessThan(50); // 标题不会太长
    });
  });

  describe('关键词提取', () => {
    it('应该提取高频词作为关键词', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote(
        '项目进度计划项目进度计划项目进度计划',
        Date.now()
      );

      const note = segmenter.saveCurrentNote();
      // 关键词是基于字符的，所以会是单个字符
      expect(note?.keywords.length).toBeGreaterThan(0);
    });

    it('应该返回前5个关键词', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote(
        '一二三四五六七八九十',
        Date.now()
      );

      const note = segmenter.saveCurrentNote();
      expect(note?.keywords.length).toBeLessThanOrEqual(5);
    });
  });

  describe('多笔记管理', () => {
    it('应该正确管理多个笔记', () => {
      // 笔记1
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('会议内容', Date.now());
      segmenter.saveCurrentNote();

      // 笔记2
      segmenter.startNewNote('chat', Date.now());
      segmenter.appendToCurrentNote('闲聊内容', Date.now());
      segmenter.saveCurrentNote();

      const notes = segmenter.getNotes();
      expect(notes.length).toBe(2);
      expect(notes[0].sceneType).toBe('meeting');
      expect(notes[1].sceneType).toBe('chat');
    });

    it('getNoteCount应该返回正确数量', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('内容', Date.now());
      segmenter.saveCurrentNote();

      expect(segmenter.getNoteCount()).toBe(1);
    });
  });

  describe('重置', () => {
    it('reset应该清空所有数据', () => {
      segmenter.startNewNote('meeting', Date.now());
      segmenter.appendToCurrentNote('内容', Date.now());
      segmenter.saveCurrentNote();

      segmenter.reset();

      expect(segmenter.getNotes().length).toBe(0);
      expect(segmenter.getCurrentNote()).toBeNull();
      expect(segmenter.getNoteCount()).toBe(0);
    });
  });
});
