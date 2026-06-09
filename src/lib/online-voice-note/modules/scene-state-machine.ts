// 7×24 在线语音笔记系统 - 场景状态机

import type { SceneType, SceneTransition, SceneSegment } from '../types';
import { getConfig, getSceneKeywords, isTransitionWord } from '../config';
import { getLogger } from '../core/logger';

// ===== 场景状态 =====
type SceneState = 'idle' | 'detecting' | 'active' | 'transitioning';

// ===== 场景状态机 =====
export class SceneStateMachine {
  private currentState: SceneState = 'idle';
  private currentScene: SceneType = 'unknown';
  private currentSegment: SceneSegment | null = null;
  private segments: SceneSegment[] = [];
  private lastTransitionTime: number = 0;
  private sceneStartTime: number = 0;
  private sceneTextBuffer: string = '';
  private logger = getLogger();

  // 获取当前状态
  getState(): {
    state: SceneState;
    currentScene: SceneType;
    currentSegment: SceneSegment | null;
    segments: SceneSegment[];
  } {
    return {
      state: this.currentState,
      currentScene: this.currentScene,
      currentSegment: this.currentSegment,
      segments: [...this.segments],
    };
  }

  // 处理新的转写文本
  processText(text: string, timestamp: number): SceneTransition {
    const config = getConfig().sceneTransition;

    // 状态：idle → detecting
    if (this.currentState === 'idle') {
      this.currentState = 'detecting';
      this.sceneStartTime = timestamp;
      this.sceneTextBuffer = text;
      this.currentScene = this.detectScene(text);

      this.logger.debug('SceneStateMachine', 'State changed to detecting', {
        scene: this.currentScene,
        text: text.substring(0, 50),
      });

      return {
        isTransition: false,
        newScene: this.currentScene,
        confidence: 0.5,
        reason: 'Initial detection',
      };
    }

    // 状态：detecting → active（达到最小场景时长）
    if (this.currentState === 'detecting') {
      const duration = (timestamp - this.sceneStartTime) / 1000;
      if (duration >= config.minSceneDuration) {
        this.currentState = 'active';
        this.currentSegment = this.createSegment(timestamp);

        this.logger.info('SceneStateMachine', 'Scene activated', {
          scene: this.currentScene,
          duration,
          textLength: this.sceneTextBuffer.length,
        });
      }
    }

    // 检测场景转换
    const transition = this.detectTransition(text, timestamp);

    if (transition.isTransition) {
      // 保存当前片段
      if (this.currentSegment || this.sceneTextBuffer.length > 0) {
        this.saveCurrentSegment(timestamp);
      }

      // 转换到新场景
      this.currentScene = transition.newScene;
      this.sceneStartTime = timestamp;
      this.sceneTextBuffer = text;
      this.currentState = 'detecting';
      this.currentSegment = null;

      this.logger.info('SceneStateMachine', 'Scene transition detected', {
        from: this.segments.length > 0 ? this.segments[this.segments.length - 1].sceneType : 'none',
        to: transition.newScene,
        confidence: transition.confidence,
        reason: transition.reason,
      });
    } else {
      // 继续当前场景
      this.sceneTextBuffer += text;
    }

    return transition;
  }

  // 检测场景类型
  private detectScene(text: string): SceneType {
    const scores: Record<SceneType, number> = {
      meeting: 0,
      chat: 0,
      monologue: 0,
      unknown: 0,
    };

    // 计算各场景得分
    for (const scene of ['meeting', 'chat', 'monologue'] as SceneType[]) {
      const keywords = getSceneKeywords(scene);
      let score = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 1;
        }
      }

      // 文本长度奖励
      score += Math.min(text.length / 100, 3);

      scores[scene] = score;
    }

    // 找出最高分
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const [topScene, topScore] = sorted[0];
    const [, secondScore] = sorted[1];

    // 如果最高分太低或差距不够，返回 unknown
    if (topScore < 1 || topScore - secondScore < 0.8) {
      return 'unknown';
    }

    return topScene as SceneType;
  }

  // 检测场景转换
  private detectTransition(text: string, timestamp: number): SceneTransition {
    const config = getConfig().sceneTransition;

    // 1. 检查静音间隔
    const silenceDuration = (timestamp - this.lastTransitionTime) / 1000;
    if (silenceDuration > config.silenceThreshold && this.currentState === 'active') {
      return {
        isTransition: true,
        newScene: this.detectScene(text),
        confidence: 0.8,
        reason: `Silence threshold exceeded (${silenceDuration.toFixed(1)}s)`,
      };
    }

    // 2. 检查转换词
    if (isTransitionWord(text) && this.currentState === 'active') {
      return {
        isTransition: true,
        newScene: this.detectScene(text),
        confidence: 0.7,
        reason: `Transition word detected: "${text.substring(0, 10)}"`,
      };
    }

    // 3. 检查场景得分反转
    const currentScore = this.calculateSceneScore(this.sceneTextBuffer, this.currentScene);
    const newScene = this.detectScene(text);
    const newScore = this.calculateSceneScore(text, newScene);

    if (this.currentScene !== 'unknown' && newScene !== 'unknown' && this.currentScene !== newScene) {
      const scoreDiff = Math.abs(currentScore - newScore);
      if (scoreDiff > config.scoreReversalThreshold) {
        return {
          isTransition: true,
          newScene,
          confidence: Math.min(scoreDiff, 1),
          reason: `Scene score reversal: ${this.currentScene}(${currentScore.toFixed(2)}) → ${newScene}(${newScore.toFixed(2)})`,
        };
      }
    }

    return {
      isTransition: false,
      newScene: this.currentScene,
      confidence: 0,
      reason: 'No transition detected',
    };
  }

  // 计算场景得分
  private calculateSceneScore(text: string, scene: SceneType): number {
    if (scene === 'unknown') return 0;

    const keywords = getSceneKeywords(scene);
    let score = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }

    score += Math.min(text.length / 100, 3);
    return score;
  }

  // 创建场景片段
  private createSegment(timestamp: number): SceneSegment {
    return {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sceneType: this.currentScene,
      startTime: this.sceneStartTime,
      endTime: timestamp,
      text: this.sceneTextBuffer,
      textLength: this.sceneTextBuffer.length,
      informationScore: 0, // 后续由 InformationScorer 填充
    };
  }

  // 保存当前片段
  private saveCurrentSegment(timestamp: number): void {
    const segment: SceneSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sceneType: this.currentScene,
      startTime: this.sceneStartTime,
      endTime: timestamp,
      text: this.sceneTextBuffer,
      textLength: this.sceneTextBuffer.length,
      informationScore: 0,
    };

    this.segments.push(segment);
    this.lastTransitionTime = timestamp;

    this.logger.info('SceneStateMachine', 'Segment saved', {
      segmentId: segment.id,
      scene: segment.sceneType,
      duration: (segment.endTime - segment.startTime) / 1000,
      textLength: segment.textLength,
    });
  }

  // 强制结束当前场景
  forceEnd(timestamp: number): SceneSegment | null {
    if (this.sceneTextBuffer.length === 0) {
      return null;
    }

    const segment = this.createSegment(timestamp);
    this.segments.push(segment);

    // 重置状态
    this.currentState = 'idle';
    this.currentScene = 'unknown';
    this.currentSegment = null;
    this.sceneTextBuffer = '';

    return segment;
  }

  // 获取所有片段
  getSegments(): SceneSegment[] {
    return [...this.segments];
  }

  // 清空片段
  clearSegments(): void {
    this.segments = [];
  }

  // 重置状态机
  reset(): void {
    this.currentState = 'idle';
    this.currentScene = 'unknown';
    this.currentSegment = null;
    this.segments = [];
    this.lastTransitionTime = 0;
    this.sceneStartTime = 0;
    this.sceneTextBuffer = '';
  }
}

// ===== 单例 =====
let stateMachineInstance: SceneStateMachine | null = null;

export function getSceneStateMachine(): SceneStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new SceneStateMachine();
  }
  return stateMachineInstance;
}
