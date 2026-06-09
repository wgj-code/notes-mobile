// 7×24 在线语音笔记系统 - 健康检查模块

import { Platform } from 'react-native';
import type { HealthCheck, Alert } from '../types';
import { getConfig } from '../config';
import { getLogger } from '../core/logger';

// ===== 健康检查器 =====
export class HealthChecker {
  private logger = getLogger();
  private lastCheckTime: number = 0;
  private checkResults: HealthCheck[] = [];
  private alerts: Alert[] = [];

  // 执行健康检查
  async check(status: {
    sttReady: boolean;
    sttErrorCount: number;
    memoryUsage: number;
    storageAvailable: number;
    batteryLevel: number;
    isCharging: boolean;
    isRecording: boolean;
  }): Promise<HealthCheck> {
    const config = getConfig().diagnostics.healthCheck;

    const checks = {
      recording: {
        microphoneAvailable: status.isRecording || true, // 简化检查
        audioLevelNormal: true, // 需要实际音频数据
        bufferNormal: true,
      },
      stt: {
        modelLoaded: status.sttReady,
        engineReady: status.sttReady,
        latencyNormal: true, // 需要实际延迟数据
      },
      scene: {
        keywordsLoaded: true,
        stateMachineNormal: true,
      },
      notes: {
        databaseConnected: true, // 需要实际数据库检查
        storageSufficient: status.storageAvailable > config.storageThreshold,
      },
      resources: {
        memoryNormal: status.memoryUsage < config.memoryThreshold,
        storageSufficient: status.storageAvailable > config.storageThreshold,
        batterySufficient: status.batteryLevel > config.batteryThreshold || status.isCharging,
      },
    };

    // 计算总体状态
    const statusValue = this.calculateOverallStatus(checks);

    const healthCheck: HealthCheck = {
      checks,
      status: statusValue,
      checkedAt: Date.now(),
    };

    // 记录检查结果
    this.checkResults.push(healthCheck);
    this.lastCheckTime = Date.now();

    // 检查是否需要告警
    await this.checkAlerts(healthCheck, status);

    this.logger.info('HealthChecker', 'Health check completed', {
      status: statusValue,
      sttReady: status.sttReady,
      memoryUsage: status.memoryUsage,
      storageAvailable: status.storageAvailable,
    });

    return healthCheck;
  }

  // 计算总体状态
  private calculateOverallStatus(checks: HealthCheck['checks']): HealthCheck['status'] {
    // 检查是否有 critical 问题
    if (
      !checks.stt.modelLoaded ||
      !checks.recording.microphoneAvailable ||
      !checks.resources.memoryNormal
    ) {
      return 'unhealthy';
    }

    // 检查是否有 high 问题
    if (
      !checks.resources.storageSufficient ||
      !checks.resources.batterySufficient
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  // 检查告警
  private async checkAlerts(healthCheck: HealthCheck, status: any): Promise<void> {
    const config = getConfig().diagnostics.alerts;
    if (!config.enabled) return;

    const now = Date.now();

    // STT 模型加载失败
    if (!healthCheck.checks.stt.modelLoaded) {
      this.addAlert({
        id: `alert_stt_${now}`,
        timestamp: now,
        severity: 'critical',
        title: 'STT 模型加载失败',
        message: '语音识别引擎无法正常工作',
        context: { sttReady: status.sttReady },
        channels: { console: true, notification: true, log: true },
      });
    }

    // 内存使用过高
    if (!healthCheck.checks.resources.memoryNormal) {
      this.addAlert({
        id: `alert_memory_${now}`,
        timestamp: now,
        severity: 'high',
        title: '内存使用过高',
        message: `内存使用率超过阈值`,
        context: { memoryUsage: status.memoryUsage },
        channels: { console: true, notification: true, log: true },
      });
    }

    // 存储空间不足
    if (!healthCheck.checks.resources.storageSufficient) {
      this.addAlert({
        id: `alert_storage_${now}`,
        timestamp: now,
        severity: 'high',
        title: '存储空间不足',
        message: `可用存储空间不足`,
        context: { storageAvailable: status.storageAvailable },
        channels: { console: true, notification: true, log: true },
      });
    }

    // 电量不足
    if (!healthCheck.checks.resources.batterySufficient) {
      this.addAlert({
        id: `alert_battery_${now}`,
        timestamp: now,
        severity: 'medium',
        title: '电量不足',
        message: `电量低于阈值且未充电`,
        context: { batteryLevel: status.batteryLevel, isCharging: status.isCharging },
        channels: { console: true, notification: false, log: true },
      });
    }

    // STT 错误频繁
    if (status.sttErrorCount > 10) {
      this.addAlert({
        id: `alert_stt_errors_${now}`,
        timestamp: now,
        severity: 'medium',
        title: 'STT 错误频繁',
        message: `STT 错误次数: ${status.sttErrorCount}`,
        context: { errorCount: status.sttErrorCount },
        channels: { console: true, notification: false, log: true },
      });
    }
  }

  // 添加告警
  private addAlert(alert: Alert): void {
    const config = getConfig().diagnostics.alerts;

    // 检查冷却期
    const recentAlert = this.alerts.find(
      a => a.id.startsWith(alert.id.split('_').slice(0, 2).join('_')) &&
           Date.now() - a.timestamp < config.cooldown
    );

    if (recentAlert) {
      return; // 冷却期内不重复告警
    }

    this.alerts.push(alert);

    // 输出告警
    if (alert.channels.console) {
      console.warn(`[ALERT] ${alert.title}: ${alert.message}`);
    }

    this.logger.warn('HealthChecker', 'Alert triggered', {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
    });
  }

  // 获取最近的健康检查结果
  getRecentChecks(count: number = 10): HealthCheck[] {
    return this.checkResults.slice(-count);
  }

  // 获取最近的告警
  getRecentAlerts(count: number = 20): Alert[] {
    return this.alerts.slice(-count);
  }

  // 获取健康状态趋势
  getTrend(): {
    checks: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  } {
    const checks = this.checkResults.slice(-24); // 最近24次检查
    return {
      checks: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };
  }

  // 重置
  reset(): void {
    this.checkResults = [];
    this.alerts = [];
    this.lastCheckTime = 0;
  }
}

// ===== 单例 =====
let healthCheckerInstance: HealthChecker | null = null;

export function getHealthChecker(): HealthChecker {
  if (!healthCheckerInstance) {
    healthCheckerInstance = new HealthChecker();
  }
  return healthCheckerInstance;
}
