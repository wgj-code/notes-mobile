// 7×24 在线语音笔记系统 - 日志系统

import * as FileSystem from 'expo-file-system';
import type { SystemLog } from '../types';

// ===== 日志级别 =====
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

// ===== 日志配置 =====
interface LoggerConfig {
  consoleEnabled: boolean;
  fileEnabled: boolean;
  maxFileSize: number;
  maxFiles: number;
}

// ===== 日志管理器 =====
class OnlineVoiceLogger {
  private sessionId: string;
  private sequenceNo: number = 0;
  private logs: SystemLog[] = [];
  private config: LoggerConfig;
  private logFilePath: string;

  constructor(config: LoggerConfig) {
    this.sessionId = this.generateSessionId();
    this.config = config;
    this.logFilePath = `${FileSystem.cacheDirectory}online-voice-logs/`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSequenceNo(): number {
    return ++this.sequenceNo;
  }

  private getMemoryUsage(): number {
    // 简化的内存使用估算
    return 0;
  }

  private formatLog(log: SystemLog): string {
    const timestamp = new Date(log.timestamp).toISOString();
    const prefix = `[${timestamp}] [${log.level}] [${log.module}] [${log.event}]`;
    const data = JSON.stringify(log.data, null, 2);
    const error = log.error ? `\nError: ${log.error.message}` : '';
    const duration = log.duration ? `\nDuration: ${log.duration}ms` : '';
    return `${prefix}\n${data}${error}${duration}`;
  }

  // ===== 核心日志方法 =====
  log(
    level: LogLevel,
    module: string,
    event: string,
    data: Record<string, any>,
    error?: { code: string; message: string; stack?: string },
    duration?: number
  ): void {
    const log: SystemLog = {
      timestamp: Date.now(),
      level,
      module,
      event,
      sessionId: this.sessionId,
      sequenceNo: this.generateSequenceNo(),
      data,
      error,
      duration,
      memoryUsage: this.getMemoryUsage(),
    };

    // 添加到内存缓冲
    this.logs.push(log);

    // 控制台输出
    if (this.config.consoleEnabled) {
      this.consoleOutput(log);
    }

    // 文件输出（异步）
    if (this.config.fileEnabled) {
      this.fileOutput(log).catch(err => {
        console.error('Failed to write log to file:', err);
      });
    }
  }

  private consoleOutput(log: SystemLog): void {
    const formatted = this.formatLog(log);
    switch (log.level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'DEBUG':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  private async fileOutput(log: SystemLog): Promise<void> {
    try {
      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.logFilePath, { intermediates: true });
      }

      // 写入日志文件
      const fileName = `log_${new Date(log.timestamp).toISOString().split('T')[0]}.jsonl`;
      const filePath = `${this.logFilePath}${fileName}`;
      const logLine = JSON.stringify(log) + '\n';

      // 追加写入
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        const existing = await FileSystem.readAsStringAsync(filePath);
        await FileSystem.writeAsStringAsync(filePath, existing + logLine);
      } else {
        await FileSystem.writeAsStringAsync(filePath, logLine);
      }
    } catch (err) {
      // 文件写入失败不影响主流程
    }
  }

  // ===== 便捷方法 =====
  info(module: string, event: string, data: Record<string, any>, duration?: number): void {
    this.log('INFO', module, event, data, undefined, duration);
  }

  warn(module: string, event: string, data: Record<string, any>): void {
    this.log('WARN', module, event, data);
  }

  error(module: string, event: string, data: Record<string, any>, error?: { code: string; message: string; stack?: string }): void {
    this.log('ERROR', module, event, data, error);
  }

  debug(module: string, event: string, data: Record<string, any>): void {
    this.log('DEBUG', module, event, data);
  }

  // ===== 日志查询 =====
  getLogs(options?: {
    level?: LogLevel;
    module?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): SystemLog[] {
    let filtered = [...this.logs];

    if (options?.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }
    if (options?.module) {
      filtered = filtered.filter(log => log.module === options.module);
    }
    if (options?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime);
    }
    if (options?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime);
    }
    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getRecentLogs(count: number = 100): SystemLog[] {
    return this.logs.slice(-count);
  }

  getErrorLogs(): SystemLog[] {
    return this.logs.filter(log => log.level === 'ERROR');
  }

  getModuleLogs(module: string): SystemLog[] {
    return this.logs.filter(log => log.module === module);
  }

  // ===== 统计 =====
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byModule: Record<string, number>;
  } {
    const byLevel: Record<LogLevel, number> = {
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      DEBUG: 0,
    };
    const byModule: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level]++;
      byModule[log.module] = (byModule[log.module] || 0) + 1;
    }

    return {
      total: this.logs.length,
      byLevel,
      byModule,
    };
  }

  // ===== 清理 =====
  clear(): void {
    this.logs = [];
  }

  async exportLogs(): Promise<string> {
    return JSON.stringify(this.logs, null, 2);
  }
}

// ===== 单例 =====
let loggerInstance: OnlineVoiceLogger | null = null;

export function getLogger(config?: LoggerConfig): OnlineVoiceLogger {
  if (!loggerInstance) {
    loggerInstance = new OnlineVoiceLogger(config || {
      consoleEnabled: __DEV__,
      fileEnabled: true,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 5,
    });
  }
  return loggerInstance;
}

export function resetLogger(): void {
  loggerInstance = null;
}
