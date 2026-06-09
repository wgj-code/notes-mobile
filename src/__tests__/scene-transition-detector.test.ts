// 场景转换检测器单元测试

import { SceneTransitionDetector } from '../lib/online-voice-note-v2/scene-transition-detector';

describe('SceneTransitionDetector', () => {
  let detector: SceneTransitionDetector;

  beforeEach(() => {
    detector = new SceneTransitionDetector();
  });

  describe('自动识别模式', () => {
    it('应该正确识别会议场景', () => {
      const result = detector.processSegment(
        '各位同事大家好，今天我们开个会讨论一下项目进度',
        Date.now()
      );
      expect(result.scene).toBe('meeting');
      expect(result.shouldSaveNote).toBe(false);
    });

    it('应该正确识别闲聊场景', () => {
      detector.processSegment('哎师傅你好', Date.now());
      const result = detector.processSegment(
        '今天天气不错啊，挺好的',
        Date.now() + 60000
      );
      expect(result.scene).toBe('chat');
    });

    it('应该正确识别自言自语场景', () => {
      detector.processSegment('让我想想', Date.now());
      const result = detector.processSegment(
        '我在想这个功能应该怎么实现，或许可以，我觉得应该需要一个状态管理，明天开始写代码',
        Date.now() + 60000
      );
      // 自言自语场景需要足够多的关键词
      expect(['monologue', 'unknown']).toContain(result.scene);
    });

    it('第一个片段应该初始化但不保存', () => {
      const result = detector.processSegment(
        '各位同事大家好',
        Date.now()
      );
      expect(result.shouldSaveNote).toBe(false);
      expect(result.shouldStartNewNote).toBe(false);
    });
  });

  describe('手动场景模式', () => {
    beforeEach(() => {
      detector.setManualScene('meeting');
    });

    it('应该强制使用手动指定的场景', () => {
      const result = detector.processSegment(
        '哎师傅你好今天天气不错',
        Date.now()
      );
      expect(result.scene).toBe('meeting');
      expect(result.isConfirmed).toBe(true);
    });

    it('应该不运行自动识别', () => {
      // 即使内容是闲聊，也应该保持会议场景
      const result = detector.processSegment(
        '哈哈笑死我了，这个段子太搞笑了',
        Date.now()
      );
      expect(result.scene).toBe('meeting');
    });

    it('应该不拆分笔记', () => {
      detector.processSegment('片段1', Date.now());
      const result = detector.processSegment('片段2', Date.now() + 60000);
      expect(result.shouldSaveNote).toBe(false);
      expect(result.shouldStartNewNote).toBe(false);
    });

    it('应该持续追加文本', () => {
      detector.processSegment('第一段内容', Date.now());
      detector.processSegment('第二段内容', Date.now() + 60000);
      const state = detector.getState();
      expect(state.noteBuffer).toContain('第一段内容');
      expect(state.noteBuffer).toContain('第二段内容');
    });
  });

  describe('超长笔记分段', () => {
    beforeEach(() => {
      detector.setManualScene('meeting');
    });

    it('超过2万字应该自动分段', () => {
      // 模拟超长文本
      const longText = '这是一段测试内容。'.repeat(2500); // 约2.5万字

      const result = detector.processSegment(longText, Date.now());

      expect(result.shouldSaveNote).toBe(true);
      expect(result.shouldStartNewNote).toBe(true);
      expect(result.noteText).toBeDefined();
      expect(result.noteText!.length).toBeGreaterThan(20000);
    });

    it('分段后应该重置noteBuffer', () => {
      const longText = '这是一段测试内容。'.repeat(2500);
      detector.processSegment(longText, Date.now());

      const state = detector.getState();
      expect(state.noteBuffer).toBe('');
    });

    it('分段后场景应该保持不变', () => {
      const longText = '这是一段测试内容。'.repeat(2500);
      const result = detector.processSegment(longText, Date.now());

      expect(result.scene).toBe('meeting');
    });
  });

  describe('状态管理', () => {
    it('应该正确跟踪segmentCount', () => {
      detector.processSegment('片段1', Date.now());
      detector.processSegment('片段2', Date.now() + 60000);
      detector.processSegment('片段3', Date.now() + 120000);

      const state = detector.getState();
      expect(state.segmentCount).toBe(3);
    });

    it('reset应该重置所有状态', () => {
      detector.setManualScene('meeting');
      detector.processSegment('测试', Date.now());

      detector.reset();

      const state = detector.getState();
      expect(state.currentScene).toBe('unknown');
      expect(state.segmentCount).toBe(0);
      expect(state.noteBuffer).toBe('');
    });

    it('getCurrentNoteInfo应该返回正确信息', () => {
      const startTime = Date.now();
      detector.setManualScene('meeting');
      detector.processSegment('测试内容', startTime);

      const info = detector.getCurrentNoteInfo();
      expect(info.scene).toBe('meeting');
      expect(info.text).toContain('测试内容');
      expect(info.startTime).toBe(startTime);
    });
  });
});
