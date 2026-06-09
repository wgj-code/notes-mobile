// 7×24 在线语音笔记系统 - 监控模块

import { Platform } from 'react-native';
import type { SystemStatus, DiagnosticExport } from '../types';
import { getLogger } from '../core/logger';

// ===== 监控器 =====
export class Monitor {
  private logger = getLogger();
  private statusHistory: SystemStatus[] = [];
  private startTime: number = Date.now();
  private errorCount: number = 0;
  private errorsByModule: Record<string, number> = {};

  // 记录状态快照
  recordStatus(status: Partial<SystemStatus>): void {
    const fullStatus: SystemStatus = {
      uptime: (Date.now() - this.startTime) / 1000,
      lastStartTime: this.startTime,
      recording: {
        isActive: false,
        duration: 0,
        audioLevel: 0,
        sampleRate: 16000,
        bufferSize: 4096,
        ...status.recording,
      },
      stt: {
        isReady: false,
        modelLoaded: false,
        processingLatency: 0,
        totalProcessed: 0,
        errorCount: 0,
        ...status.stt,
      },
      scene: {
        currentScene: 'unknown',
        sceneDuration: 0,
        totalScenes: 0,
        transitionCount: 0,
        ...status.scene,
      },
      notes: {
        todayCount: 0,
        totalDuration: 0,
        discardedCount: 0,
        averageInfoScore: 0,
        ...status.notes,
      },
      resources: {
        memoryUsage: 0,
        storageUsage: 0,
        storageAvailable: 0,
        batteryLevel: 1,
        isCharging: false,
        ...status.resources,
      },
      errors: {
        total: this.errorCount,
        byModule: { ...this.errorsByModule },
        ...status.errors,
      },
    };

    this.statusHistory.push(fullStatus);

    // 只保留最近 100 条记录
    if (this.statusHistory.length > 100) {
      this.statusHistory = this.statusHistory.slice(-100);
    }
  }

  // 记录错误
  recordError(module: string, message: string): void {
    this.errorCount++;
    this.errorsByModule[module] = (this.errorsByModule[module] || 0) + 1;

    this.logger.error('Monitor', 'Error recorded', {
      module,
      message,
      totalErrors: this.errorCount,
    });
  }

  // 获取当前状态
  getCurrentStatus(): SystemStatus | null {
    return this.statusHistory.length > 0
      ? this.statusHistory[this.statusHistory.length - 1]
      : null;
  }

  // 获取状态历史
  getStatusHistory(count?: number): SystemStatus[] {
    if (count) {
      return this.statusHistory.slice(-count);
    }
    return [...this.statusHistory];
  }

  // 获取错误统计
  getErrorStats(): {
    total: number;
    byModule: Record<string, number>;
  } {
    return {
      total: this.errorCount,
      byModule: { ...this.errorsByModule },
    };
  }

  // 生成诊断信息
  async generateDiagnostic(): Promise<DiagnosticExport> {
    const currentStatus = this.getCurrentStatus();

    return {
      appVersion: '0.1.106', // 应从 app.json 读取
      buildNumber: '1',
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      deviceModel: Platform.OS === 'android' ? 'Android' : 'iOS',
      uptime: currentStatus?.uptime || 0,
      lastStartTime: this.startTime,
      performance: {
        memoryUsage: currentStatus?.resources.memoryUsage || 0,
        storageUsage: currentStatus?.resources.storageUsage || 0,
      },
      errorLogs: this.logger.getErrorLogs().slice(-50),
      statusHistory: this.statusHistory.slice(-24),
      recentEvents: this.logger.getRecentLogs(100),
    };
  }

  // 导出诊断信息为字符串
  async exportDiagnosticString(): Promise<string> {
    const diagnostic = await this.generateDiagnostic();
    return JSON.stringify(diagnostic, null, 2);
  }

  // 重置
  reset(): void {
    this.statusHistory = [];
    this.startTime = Date.now();
    this.errorCount = 0;
    this.errorsByModule = {};
  }
}

// ===== 单例 =====
let monitorInstance: Monitor | null = null;

export function getMonitor(): Monitor {
  if (!monitorInstance) {
    monitorInstance = new Monitor();
  }
  return monitorInstance;
}
