import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for Zustand persist middleware
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  showOpenDialog: vi.fn(),
  validateKiroDirectory: vi.fn(),
  readSpecs: vi.fn(),
  readSpecJson: vi.fn(),
  readArtifact: vi.fn(),
  createSpec: vi.fn(),
  writeFile: vi.fn(),
  updateApproval: vi.fn(),
  executeCommand: vi.fn(),
  cancelExecution: vi.fn(),
  onCommandOutput: vi.fn(() => vi.fn()),
  getRecentProjects: vi.fn(),
  addRecentProject: vi.fn(),
  getAppVersion: vi.fn(),
  getPlatform: vi.fn(() => 'darwin'),
  // Project/Spec Management APIs
  setProjectPath: vi.fn().mockResolvedValue(undefined),
  watchSpecs: vi.fn().mockResolvedValue(undefined),
  unwatchSpecs: vi.fn().mockResolvedValue(undefined),
  startSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  stopSpecsWatcher: vi.fn().mockResolvedValue(undefined),
  onSpecsChanged: vi.fn(() => vi.fn()),
  executeSpecManagerPhase: vi.fn(),
  executePhase: vi.fn().mockResolvedValue(undefined),
  executeValidation: vi.fn().mockResolvedValue(undefined),
  executeSpecStatus: vi.fn().mockResolvedValue(undefined),
  executeTaskImpl: vi.fn().mockResolvedValue(undefined),
  // Agent Management APIs (Task 29)
  startAgent: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  getAgents: vi.fn(),
  getAllAgents: vi.fn(),
  getAgentLogs: vi.fn().mockResolvedValue([]),
  sendAgentInput: vi.fn(),
  onAgentOutput: vi.fn(() => vi.fn()),
  onAgentStatusChange: vi.fn(() => vi.fn()),
  onAgentRecordChanged: vi.fn(() => vi.fn()),
  getHangThreshold: vi.fn(),
  setHangThreshold: vi.fn(),
  // Phase/Review Sync APIs
  syncSpecPhase: vi.fn(),
  syncDocumentReview: vi.fn().mockResolvedValue(false),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
