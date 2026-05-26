module.exports = {
  createStreamingTTS: jest.fn(() => Promise.resolve({
    instanceId: 'mock',
    generateSpeechStream: jest.fn(),
    cancelSpeechStream: jest.fn(),
    startPcmPlayer: jest.fn(),
    writePcmChunk: jest.fn(),
    stopPcmPlayer: jest.fn(),
    getModelInfo: jest.fn(() => Promise.resolve({ sampleRate: 24000, numSpeakers: 103 })),
    getSampleRate: jest.fn(() => Promise.resolve(24000)),
    getNumSpeakers: jest.fn(() => Promise.resolve(103)),
    destroy: jest.fn(),
  })),
  assetModelPath: jest.fn((path) => ({ type: 'asset', path })),
  autoModelPath: jest.fn((path) => ({ type: 'auto', path })),
  fileModelPath: jest.fn((path) => ({ type: 'file', path })),
};
