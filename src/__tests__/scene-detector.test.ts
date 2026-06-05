// F-001: Scene Detector Unit Tests
import { identifyScene, getSceneName, getSceneIcon } from '../lib/scene-detector';

describe('Scene Detector', () => {
  describe('identifyScene', () => {
    it('should return unknown for empty text', () => {
      expect(identifyScene('')).toBe('unknown');
    });

    it('should return unknown for very short text', () => {
      expect(identifyScene('你好')).toBe('unknown');
    });

    it('should detect meeting scene', () => {
      const meetingText = `
        各位同事大家好，今天我们开一个项目进度会议。
        首先请产品经理汇报一下需求进度。
        张三你说一下测试情况。
        好的，我们讨论一下这个问题的解决方案。
        最后我总结一下今天的决议。
      `;
      expect(identifyScene(meetingText)).toBe('meeting');
    });

    it('should detect chat scene', () => {
      const chatText = `
        哈哈笑死我了，这个段子太搞笑了。
        真的吗？我看看。
        哎你今天中午吃什么？
        不知道啊，随便吧。
        周末有什么计划？在家躺着吧，无聊死了。
      `;
      expect(identifyScene(chatText)).toBe('chat');
    });

    it('should detect monologue scene', () => {
      const monologueText = `
        我在想这个功能应该怎么实现。
        或许可以用React Native来开发。
        让我想想，应该需要一个状态管理。
        我觉得应该用Zustand，比较简单。
        明天开始写代码吧。
      `;
      expect(identifyScene(monologueText)).toBe('monologue');
    });

    it('should detect multi-speaker meeting', () => {
      const multiSpeakerText = `
        经理：今天我们讨论一下Q2的计划。
        张三：我这边测试进度正常。
        李四：开发那边有点延期。
        经理：好的，那我们调整一下排期。
      `;
      expect(identifyScene(multiSpeakerText)).toBe('meeting');
    });
  });

  describe('getSceneName', () => {
    it('should return correct Chinese names', () => {
      expect(getSceneName('meeting')).toBe('会议');
      expect(getSceneName('chat')).toBe('闲聊');
      expect(getSceneName('monologue')).toBe('自言自语');
      expect(getSceneName('unknown')).toBe('未知');
    });
  });

  describe('getSceneIcon', () => {
    it('should return correct icons', () => {
      expect(getSceneIcon('meeting')).toBe('👥');
      expect(getSceneIcon('chat')).toBe('💬');
      expect(getSceneIcon('monologue')).toBe('🤔');
      expect(getSceneIcon('unknown')).toBe('📝');
    });
  });
});
