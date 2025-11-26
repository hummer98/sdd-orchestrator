import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
  // Agent Management APIs (Task 29)
  startAgent: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  getAgents: vi.fn(),
  getAllAgents: vi.fn(),
  sendAgentInput: vi.fn(),
  onAgentOutput: vi.fn(() => vi.fn()),
  onAgentStatusChange: vi.fn(() => vi.fn()),
  getHangThreshold: vi.fn(),
  setHangThreshold: vi.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
