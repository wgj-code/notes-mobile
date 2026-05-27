import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const LOG_API_URL = 'http://8.133.196.220/api/logs';
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

async function flush(): Promise<string> {
  if (buffer.length === 0) return 'no logs';
  const batch = [...buffer];
  buffer = [];

  try {
    const resp = await fetch(LOG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: batch }),
    });
    const text = await resp.text();
    return `status=${resp.status} body=${text}`;
  } catch (err: any) {
    return `error=${err?.message || String(err)}`;
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
