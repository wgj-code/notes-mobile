import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const LOG_API_URL = 'https://waveletvolt.xin/api/logs';
const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BUFFER = 20;

interface LogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  device: {
    model: string | null;
    osVersion: string | null;
    appVersion: string;
  };
  timestamp: string;
}

let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getDeviceInfo() {
  return {
    model: Device.modelName,
    osVersion: Device.osVersion,
    appVersion: Constants.expoConfig?.version || 'unknown',
  };
}

function createEntry(level: LogEntry['level'], message: string, stack?: string): LogEntry {
  return {
    level,
    message: message.slice(0, 2000), // truncate long messages
    stack: stack?.slice(0, 3000),
    device: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  };
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = [...buffer];
  buffer = [];

  try {
    await fetch(LOG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: batch }),
    });
  } catch {
    // Silently fail — don't crash the app for logging
  }
}

function startAutoFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL);
}

export const logger = {
  error(message: string, error?: Error) {
    const entry = createEntry('error', message, error?.stack);
    buffer.push(entry);
    if (buffer.length >= MAX_BUFFER) flush();
    startAutoFlush();
  },

  warn(message: string) {
    buffer.push(createEntry('warn', message));
    if (buffer.length >= MAX_BUFFER) flush();
    startAutoFlush();
  },

  info(message: string) {
    buffer.push(createEntry('info', message));
    if (buffer.length >= MAX_BUFFER) flush();
    startAutoFlush();
  },

  flush,
};
