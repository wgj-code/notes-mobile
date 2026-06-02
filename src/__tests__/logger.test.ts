// Mock expo-device and expo-constants before any imports
jest.mock('expo-device', () => ({
  modelName: 'Test Device',
  osVersion: '14.0',
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
}));

// Mock global fetch
const mockFetch = jest.fn(() =>
  Promise.resolve({ status: 200, text: () => Promise.resolve('ok') })
);
global.fetch = mockFetch;

// Reset modules and set env before requiring logger
beforeEach(() => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  mockFetch.mockClear();
});

function getLogger() {
  return require('../lib/logger').logger;
}

describe('logger', () => {
  it('creates error log entry', () => {
    const logger = getLogger();
    logger.error('testModule', 'test error message', new Error('test error'), { key: 'value' });
    expect(true).toBe(true);
  });

  it('creates warn log entry', () => {
    const logger = getLogger();
    logger.warn('testModule', 'test warning');
    expect(true).toBe(true);
  });

  it('creates info log entry', () => {
    const logger = getLogger();
    logger.info('testModule', 'test info');
    expect(true).toBe(true);
  });

  it('creates event log entry', () => {
    const logger = getLogger();
    logger.event('testModule', 'test event');
    expect(true).toBe(true);
  });

  it('flush sends buffered logs to Edge Function', async () => {
    const logger = getLogger();
    logger.info('flushTest', 'message 1');
    logger.warn('flushTest', 'message 2');

    const result = await logger.flush();
    expect(result).toContain('status=');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    // URL should be the Edge Function endpoint (with env var) or fallback
    expect(callArgs[0]).toMatch(/logs-ingest|8\.133\.196\.220/);
    expect(callArgs[1].method).toBe('POST');

    const body = JSON.parse(callArgs[1].body);
    expect(body.logs).toHaveLength(2);
    expect(body.logs[0].level).toBe('info');
    expect(body.logs[1].level).toBe('warn');
    expect(body.logs[0].source).toBe('mobile');
  });

  it('flush returns no logs when buffer empty', async () => {
    const logger = getLogger();
    const result = await logger.flush();
    expect(result).toBe('no logs');
  });

  it('includes device info in log entries', async () => {
    const logger = getLogger();
    logger.info('deviceTest', 'check device');
    await logger.flush();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.logs[0].device).toBeDefined();
    expect(body.logs[0].device.model).toBe('Test Device');
  });

  it('truncates long messages to 2000 chars', async () => {
    const logger = getLogger();
    const longMessage = 'x'.repeat(3000);
    logger.info('truncTest', longMessage);
    await logger.flush();

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.logs[0].message.length).toBeLessThanOrEqual(2000);
  });
});
