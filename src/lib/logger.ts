import * as Device from 'expo-device';
import Constants from 'expo-constants';

const FLUSH_INTERVAL = 30000;
const MAX_BUFFER = 50;

// B-012: 日志写入 Supabase Edge Function（logs-ingest）
function getLogApiUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return supabaseUrl
    ? `${supabaseUrl}/functions/v1/logs-ingest`
    : 'http://8.133.196.220/api/logs'; // fallback
}

interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'event';
  module: string;
  message: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  device: {
    model: string | null;
    osVersion: string | null;
    appVersion: string;
  };
  source: 'mobile';
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

function createEntry(level: LogEntry['level'], module: string, message: string, metadata?: Record<string, unknown>, stack?: string): LogEntry {
  return {
    level,
    module,
    message: message.slice(0, 2000),
    metadata,
    stack: stack?.slice(0, 3000),
    device: getDeviceInfo(),
    source: 'mobile',
    timestamp: new Date().toISOString(),
  };
}

async function flush(): Promise<string> {
  if (buffer.length === 0) return 'no logs';
  const batch = [...buffer];
  buffer = [];

  try {
    const resp = await fetch(getLogApiUrl(), {
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

function push(level: LogEntry['level'], module: string, message: string, metadata?: Record<string, unknown>, stack?: string) {
  buffer.push(createEntry(level, module, message, metadata, stack));
  if (buffer.length >= MAX_BUFFER) flush();
  startAutoFlush();
}

export const logger = {
  error(module: string, message: string, metadata?: Record<string, unknown>) {
    push('error', module, message, metadata);
  },

  warn(module: string, message: string, metadata?: Record<string, unknown>) {
    push('warn', module, message, metadata);
  },

  info(module: string, message: string, metadata?: Record<string, unknown>) {
    push('info', module, message, metadata);
  },

  event(module: string, message: string, metadata?: Record<string, unknown>) {
    push('event', module, message, metadata);
  },

  flush,
};
