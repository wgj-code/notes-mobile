import { addPunctuation, deduplicateSttText } from '../lib/punctuation';

describe('deduplicateSttText', () => {
  it('去重 2 连续相同汉字', () => {
    expect(deduplicateSttText('生生成')).toBe('生成');
  });

  it('去重 3 连续相同汉字', () => {
    expect(deduplicateSttText('本本轮轮')).toBe('本轮');
  });

  it('去重 4 连续相同汉字', () => {
    expect(deduplicateSttText('鑫鑫鑫鑫')).toBe('鑫');
  });

  it('保留高高兴兴（AABB不同字）', () => {
    expect(deduplicateSttText('高高兴兴')).toBe('高高兴兴');
  });

  it('去重混合文本中的重复字', () => {
    expect(deduplicateSttText('本本轮轮是在那那个上上一轮')).toBe('本轮是在那个上一轮');
  });

  it('去重长文本中的多处重复', () => {
    expect(deduplicateSttText('鑫鑫鑫鑫开开会画')).toBe('鑫开会画');
  });

  it('空字符串返回空', () => {
    expect(deduplicateSttText('')).toBe('');
  });

  it('无重复字的文本不变', () => {
    expect(deduplicateSttText('自动生成笔记')).toBe('自动生成笔记');
  });
});

describe('punctuation', () => {
  describe('addPunctuation', () => {
    it('should return empty string for empty input', () => {
      expect(addPunctuation('')).toBe('');
      expect(addPunctuation('   ')).toBe('   ');
    });

    it('should add period after sentence enders', () => {
      expect(addPunctuation('今天天气很好的')).toBe('今天天气很好的。');
      expect(addPunctuation('我去上班了')).toBe('我去上班了。');
      expect(addPunctuation('你说得对呢')).toBe('你说得对呢。');
    });

    it('should add question mark after question words', () => {
      expect(addPunctuation('你好吗')).toBe('你好吗？');
      expect(addPunctuation('你去哪里')).toBe('你去哪里');
    });

    it('should add comma after enumeration items', () => {
      expect(addPunctuation('第一我们开会')).toBe('第一，我们开会');
      expect(addPunctuation('第二讨论方案')).toBe('第二，讨论方案');
    });

    it('should not add duplicate punctuation', () => {
      expect(addPunctuation('今天天气不错。')).toBe('今天天气不错。');
      expect(addPunctuation('你好吗？')).toBe('你好吗？');
    });

    it('should handle mixed text', () => {
      const input = '今天天气不错我们去爬山吧你觉得好吗';
      const result = addPunctuation(input);
      expect(result).toContain('。');
      expect(result).toContain('？');
    });

    it('should handle text with segments', () => {
      const text = '今天天气不错我们去爬山吧';
      const segments = [
        { text: '今天天气不错', timestamp: 0 },
        { text: '我们去爬山吧', timestamp: 500 }, // 500ms gap > 300ms threshold
      ];
      const result = addPunctuation(text, segments);
      expect(result).toContain('，');
    });

    it('should not add comma for short pauses', () => {
      const text = '今天天气不错我们去爬山';
      const segments = [
        { text: '今天天气', timestamp: 0 },
        { text: '不错我们去爬山', timestamp: 200 }, // 200ms < 300ms threshold
      ];
      const result = addPunctuation(text, segments);
      // Should not have comma from pause, only from rules
      expect(result).not.toMatch(/不错，我们/);
    });
  });
});
