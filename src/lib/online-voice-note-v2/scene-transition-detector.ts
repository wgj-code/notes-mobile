// 7×24 在线语音笔记系统 v2 - 场景转换检测器

import type { SceneType, TransitionDecision, SegmentProcessResult } from './types';
import { identifyScene, extractKeywords } from './scene-detector';

// ===== 配置 =====
const CONFIG = {
  // 阈值设置
  HIGH_THRESHOLD: 0.8,           // 高置信度阈值（确认转换）
  MEDIUM_THRESHOLD: 0.6,         // 中等阈值（观察中）
  LOW_THRESHOLD: 0.4,            // 低阈值（不转换）

  // 时间参数（秒）
  TIME_THRESHOLDS: {
    CONTINUOUS: 10,              // 完全连续
    BASIC: 30,                   // 基本连续
    POSSIBLE: 60,                // 可能断续
  },

  // 冷却期
  COOLDOWN_PERIOD: 3,            // 转换后 3 个片段内不再检测

  // 多片段确认
  CONFIRMATION_COUNT: 3,         // 需要连续 3 个片段确认

  // 内容相似度
  CONTENT_SIMILARITY_THRESHOLD: 0.6,

  // 超长笔记分段
  MAX_NOTE_LENGTH: 20000,        // 单个笔记最大字数
};

// ===== 场景转换检测器 =====
export class SceneTransitionDetector {
  private currentScene: SceneType = 'unknown';
  private sceneHistory: SceneType[] = [];
  private noteBuffer: string = '';
  private noteStartTime: number = 0;
  private lastSegmentTime: number = 0;
  private segmentCount: number = 0;

  // 冷却期状态
  private inCooldown: boolean = false;
  private cooldownCount: number = 0;

  // 待确认的转换
  private pendingTransition: SceneType | null = null;
  private pendingCount: number = 0;

  // 用户手动指定场景
  private manualSceneOverride: SceneType | null = null;

  // 重置
  reset(): void {
    this.currentScene = 'unknown';
    this.sceneHistory = [];
    this.noteBuffer = '';
    this.noteStartTime = 0;
    this.lastSegmentTime = 0;
    this.segmentCount = 0;
    this.inCooldown = false;
    this.cooldownCount = 0;
    this.pendingTransition = null;
    this.pendingCount = 0;
    this.manualSceneOverride = null;
  }

  // 设置用户手动指定的场景
  setManualScene(scene: SceneType | null): void {
    this.manualSceneOverride = scene;
    if (scene) {
      this.currentScene = scene;
      console.log('[SceneTransitionDetector] Manual scene set:', scene);
    }
  }

  // 获取用户手动指定的场景
  getManualScene(): SceneType | null {
    return this.manualSceneOverride;
  }

  // 是否有用户手动指定的场景
  hasManualScene(): boolean {
    return this.manualSceneOverride !== null;
  }

  // 处理新片段
  processSegment(text: string, timestamp: number): SegmentProcessResult {
    this.segmentCount++;

    // ===== 用户手动指定场景：强制跟随，不运行自动识别 =====
    if (this.manualSceneOverride !== null) {
      // 第一个片段：初始化
      if (this.segmentCount === 1) {
        this.currentScene = this.manualSceneOverride;
        this.noteBuffer = text;
        this.noteStartTime = timestamp;
        this.lastSegmentTime = timestamp;
        this.sceneHistory.push(this.currentScene);

        // 检查是否超长
        if (this.noteBuffer.length >= CONFIG.MAX_NOTE_LENGTH) {
          const savedText = this.noteBuffer;
          this.noteBuffer = '';
          this.noteStartTime = timestamp;

          console.log('[SceneTransitionDetector] Auto-split note due to length (first segment):', {
            length: savedText.length,
            scene: this.currentScene,
          });

          return {
            shouldSaveNote: true,
            shouldStartNewNote: true,
            scene: this.currentScene,
            noteText: savedText,
            isConfirmed: true,
          };
        }

        return {
          shouldSaveNote: false,
          shouldStartNewNote: false,
          scene: this.currentScene,
          isConfirmed: true,
        };
      }

      // 后续片段：强制跟随用户指定的场景
      this.noteBuffer += '\n' + text;
      this.lastSegmentTime = timestamp;
      this.sceneHistory.push(this.currentScene);

      // ===== 超长笔记自动分段 =====
      if (this.noteBuffer.length >= CONFIG.MAX_NOTE_LENGTH) {
        const savedText = this.noteBuffer;
        this.noteBuffer = '';
        this.noteStartTime = timestamp;

        console.log('[SceneTransitionDetector] Auto-split note due to length:', {
          length: savedText.length,
          scene: this.currentScene,
        });

        return {
          shouldSaveNote: true,
          shouldStartNewNote: true,
          scene: this.currentScene,
          noteText: savedText,
          isConfirmed: true,
        };
      }

      return {
        shouldSaveNote: false,
        shouldStartNewNote: false,
        scene: this.currentScene,
        isConfirmed: true,
      };
    }

    // ===== 自动场景识别模式 =====

    // 第一个片段：初始化
    if (this.segmentCount === 1) {
      this.currentScene = identifyScene(text);
      this.noteBuffer = text;
      this.noteStartTime = timestamp;
      this.lastSegmentTime = timestamp;
      this.sceneHistory.push(this.currentScene);

      return {
        shouldSaveNote: false,
        shouldStartNewNote: false,
        scene: this.currentScene,
        isConfirmed: false,
      };
    }

    // 识别当前片段场景
    const newScene = identifyScene(text);

    // 计算时间间隔
    const timeSinceLast = (timestamp - this.lastSegmentTime) / 1000;
    this.lastSegmentTime = timestamp;

    // 检查冷却期
    if (this.inCooldown) {
      this.cooldownCount++;
      if (this.cooldownCount >= CONFIG.COOLDOWN_PERIOD) {
        this.inCooldown = false;
        this.cooldownCount = 0;
        this.pendingTransition = null;
        this.pendingCount = 0;
      }

      // 冷却期内，跟随当前场景
      this.noteBuffer += '\n' + text;
      this.sceneHistory.push(this.currentScene);

      return {
        shouldSaveNote: false,
        shouldStartNewNote: false,
        scene: this.currentScene,
        isConfirmed: false,
      };
    }

    // 三维度检测
    const decision = this.detectTransition(
      this.currentScene,
      this.noteBuffer,
      newScene,
      text,
      timeSinceLast
    );

    // 记录检测结果
    console.log('[SceneTransitionDetector] Detection result:', {
      segmentCount: this.segmentCount,
      currentScene: this.currentScene,
      newScene,
      shouldTransition: decision.shouldTransition,
      confidence: decision.confidence,
      reasons: decision.reasons,
    });

    // 决策逻辑
    if (newScene === this.currentScene) {
      // 场景相同，继续当前场景
      this.noteBuffer += '\n' + text;
      this.sceneHistory.push(this.currentScene);
      this.pendingTransition = null;
      this.pendingCount = 0;

      return {
        shouldSaveNote: false,
        shouldStartNewNote: false,
        scene: this.currentScene,
        isConfirmed: true,
      };
    }

    // 场景不同，检查是否需要转换
    if (decision.shouldTransition && decision.confidence >= CONFIG.HIGH_THRESHOLD) {
      // 高置信度：确认转换
      const savedText = this.noteBuffer;
      this.noteBuffer = text;
      this.currentScene = newScene;
      this.noteStartTime = timestamp;
      this.sceneHistory.push(newScene);
      this.inCooldown = true;
      this.cooldownCount = 0;
      this.pendingTransition = null;
      this.pendingCount = 0;

      return {
        shouldSaveNote: true,
        shouldStartNewNote: true,
        scene: newScene,
        noteText: savedText,
        isConfirmed: true,
      };
    }

    // 中等置信度：进入待确认状态
    if (decision.confidence >= CONFIG.MEDIUM_THRESHOLD) {
      if (this.pendingTransition === newScene) {
        this.pendingCount++;

        // 连续 N 个片段确认
        if (this.pendingCount >= CONFIG.CONFIRMATION_COUNT) {
          // 确认转换
          const savedText = this.noteBuffer;
          this.noteBuffer = text;
          this.currentScene = newScene;
          this.noteStartTime = timestamp;
          this.sceneHistory.push(newScene);
          this.inCooldown = true;
          this.cooldownCount = 0;
          this.pendingTransition = null;
          this.pendingCount = 0;

          return {
            shouldSaveNote: true,
            shouldStartNewNote: true,
            scene: newScene,
            noteText: savedText,
            isConfirmed: true,
          };
        }
      } else {
        // 新的待确认转换
        this.pendingTransition = newScene;
        this.pendingCount = 1;
      }
    } else {
      // 低置信度：不转换
      this.pendingTransition = null;
      this.pendingCount = 0;
    }

    // 继续当前场景
    this.noteBuffer += '\n' + text;
    this.sceneHistory.push(this.currentScene);

    return {
      shouldSaveNote: false,
      shouldStartNewNote: false,
      scene: this.currentScene,
      isConfirmed: false,
    };
  }

  // 三维度检测
  private detectTransition(
    currentScene: SceneType,
    currentText: string,
    newScene: SceneType,
    newText: string,
    timeSinceLast: number
  ): TransitionDecision {
    const reasons: string[] = [];

    // ===== 维度1：时间连续性 =====
    const timeScore = this.calculateTimeScore(timeSinceLast);

    if (timeScore < 0.5) {
      reasons.push(`时间间隔过大 (${timeSinceLast.toFixed(1)}s)`);
    }

    // ===== 维度2：内容相似度 =====
    const contentScore = this.calculateContentSimilarity(currentText, newText);

    if (contentScore > CONFIG.CONTENT_SIMILARITY_THRESHOLD) {
      reasons.push(`内容高度相似 (score: ${contentScore.toFixed(2)})`);
    }

    // ===== 维度3：场景得分反转 =====
    const reversalScore = this.calculateReversalScore(currentScene, newScene);

    if (reversalScore < 0.7) {
      reasons.push(`场景反转不明显 (score: ${reversalScore.toFixed(2)})`);
    }

    // ===== 综合决策 =====
    const totalScore = timeScore * 0.3 + contentScore * 0.4 + reversalScore * 0.3;

    return {
      shouldTransition: totalScore >= CONFIG.HIGH_THRESHOLD,
      confidence: totalScore,
      reasons,
      dimensionScores: {
        timeScore,
        contentScore,
        reversalScore,
      },
    };
  }

  // 时间连续性评分
  private calculateTimeScore(timeSinceLast: number): number {
    if (timeSinceLast <= CONFIG.TIME_THRESHOLDS.CONTINUOUS) return 1.0;
    if (timeSinceLast <= CONFIG.TIME_THRESHOLDS.BASIC) return 0.8;
    if (timeSinceLast <= CONFIG.TIME_THRESHOLDS.POSSIBLE) return 0.5;
    return 0.2;
  }

  // 内容相似度评分
  private calculateContentSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // 1. 关键词重叠度
    const keywords1 = extractKeywords(text1);
    const keywords2 = extractKeywords(text2);
    const overlap = this.calculateOverlap(keywords1, keywords2);

    // 2. 主题连贯性
    const coherence = this.calculateTopicCoherence(text1, text2);

    // 加权平均
    return overlap * 0.6 + coherence * 0.4;
  }

  // 计算重叠度
  private calculateOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // 计算主题连贯性
  private calculateTopicCoherence(text1: string, text2: string): number {
    // 简化版：检查是否有共同的关键词
    const words1 = new Set(text1.split(''));
    const words2 = new Set(text2.split(''));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // 场景反转评分
  private calculateReversalScore(currentScene: SceneType, newScene: SceneType): number {
    // 如果场景相同，反转得分为 0
    if (currentScene === newScene) return 0;

    // 检查最近 5 个片段是否持续反转
    const recentWindow = this.sceneHistory.slice(-5);
    const reversalCount = recentWindow.filter(s => s === newScene).length;

    // 需要连续 3 个片段都是新场景才确认反转
    if (reversalCount >= 3) return 1.0;
    if (reversalCount >= 2) return 0.7;
    if (reversalCount >= 1) return 0.4;

    return 0.1; // 只有 1 个片段，不确认
  }

  // 获取当前状态
  getState(): {
    currentScene: SceneType;
    noteBuffer: string;
    segmentCount: number;
    inCooldown: boolean;
  } {
    return {
      currentScene: this.currentScene,
      noteBuffer: this.noteBuffer,
      segmentCount: this.segmentCount,
      inCooldown: this.inCooldown,
    };
  }

  // 获取当前笔记信息
  getCurrentNoteInfo(): {
    scene: SceneType;
    text: string;
    startTime: number;
    segmentCount: number;
  } {
    return {
      scene: this.currentScene,
      text: this.noteBuffer,
      startTime: this.noteStartTime,
      segmentCount: this.segmentCount,
    };
  }
}
