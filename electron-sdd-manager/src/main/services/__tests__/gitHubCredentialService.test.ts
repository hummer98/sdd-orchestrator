/**
 * GitHubCredentialService Unit Tests
 * TDD: Testing PAT encryption/decryption and project-scoped credential management
 *
 * github-issue-integration: Task 2.2
 * Requirements: 1.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron safeStorage
const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(),
  encryptString: vi.fn(),
  decryptString: vi.fn(),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
}));

// Mock electron-store
const mockStoreData = new Map<string, unknown>();
const mockStore = {
  get: vi.fn((key: string, defaultValue?: unknown) => {
    return mockStoreData.has(key) ? mockStoreData.get(key) : defaultValue;
  }),
  set: vi.fn((key: string, value: unknown) => {
    mockStoreData.set(key, value);
  }),
  delete: vi.fn((key: string) => {
    mockStoreData.delete(key);
  }),
  has: vi.fn((key: string) => {
    return mockStoreData.has(key);
  }),
};

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => mockStore),
}));

describe('GitHubCredentialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreData.clear();
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
    mockSafeStorage.encryptString.mockImplementation((text: string) => {
      return Buffer.from(`encrypted:${text}`);
    });
    mockSafeStorage.decryptString.mockImplementation((buffer: Buffer) => {
      const str = buffer.toString();
      if (str.startsWith('encrypted:')) {
        return str.slice('encrypted:'.length);
      }
      throw new Error('Failed to decrypt');
    });
  });

  // --- Token Encryption & Storage ---

  describe('storeToken', () => {
    it('should encrypt and store a PAT for a project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');

      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('ghp_test_token_123');
      // Verify the encrypted token is stored (as base64 string in electron-store)
      expect(mockStore.set).toHaveBeenCalled();
    });

    it('should throw when encryption is not available', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      expect(() => {
        service.storeToken('/path/to/project', 'ghp_test_token_123');
      }).toThrow();
    });
  });

  describe('getToken', () => {
    it('should decrypt and return a stored PAT', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      // Store first, then retrieve
      service.storeToken('/path/to/project', 'ghp_test_token_123');
      const token = service.getToken('/path/to/project');

      expect(token).toBe('ghp_test_token_123');
      expect(mockSafeStorage.decryptString).toHaveBeenCalled();
    });

    it('should return null when no token is stored for the project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      const token = service.getToken('/path/to/nonexistent');

      expect(token).toBeNull();
    });

    it('should return null when encryption is not available', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      // Store with encryption available
      service.storeToken('/path/to/project', 'ghp_test_token_123');

      // Now encryption becomes unavailable
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const token = service.getToken('/path/to/project');
      expect(token).toBeNull();
    });
  });

  // --- Project-scoped Token Isolation ---

  describe('project-scoped token isolation', () => {
    it('should store and retrieve tokens independently per project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/project/alpha', 'ghp_alpha_token');
      service.storeToken('/project/beta', 'ghp_beta_token');

      expect(service.getToken('/project/alpha')).toBe('ghp_alpha_token');
      expect(service.getToken('/project/beta')).toBe('ghp_beta_token');
    });

    it('should not affect other projects when removing a token', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/project/alpha', 'ghp_alpha_token');
      service.storeToken('/project/beta', 'ghp_beta_token');

      service.removeToken('/project/alpha');

      expect(service.getToken('/project/alpha')).toBeNull();
      expect(service.getToken('/project/beta')).toBe('ghp_beta_token');
    });
  });

  // --- Remove Token ---

  describe('removeToken', () => {
    it('should remove a stored token for a project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');
      service.removeToken('/path/to/project');

      expect(service.getToken('/path/to/project')).toBeNull();
    });

    it('should not throw when removing a non-existent token', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      expect(() => {
        service.removeToken('/path/to/nonexistent');
      }).not.toThrow();
    });
  });

  // --- hasCredentials ---

  describe('hasCredentials', () => {
    it('should return true when a token is stored for the project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');

      expect(service.hasCredentials('/path/to/project')).toBe(true);
    });

    it('should return false when no token is stored for the project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      expect(service.hasCredentials('/path/to/nonexistent')).toBe(false);
    });

    it('should return false after token is removed', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');
      service.removeToken('/path/to/project');

      expect(service.hasCredentials('/path/to/project')).toBe(false);
    });
  });

  // --- Enterprise URL ---

  describe('storeEnterpriseUrl', () => {
    it('should store an enterprise URL for a project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeEnterpriseUrl('/path/to/project', 'https://github.example.com');

      expect(service.getEnterpriseUrl('/path/to/project')).toBe('https://github.example.com');
    });

    it('should store enterprise URLs independently per project', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeEnterpriseUrl('/project/alpha', 'https://gh.alpha.com');
      service.storeEnterpriseUrl('/project/beta', 'https://gh.beta.com');

      expect(service.getEnterpriseUrl('/project/alpha')).toBe('https://gh.alpha.com');
      expect(service.getEnterpriseUrl('/project/beta')).toBe('https://gh.beta.com');
    });
  });

  describe('getEnterpriseUrl', () => {
    it('should return null when no enterprise URL is stored', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      expect(service.getEnterpriseUrl('/path/to/nonexistent')).toBeNull();
    });
  });

  describe('removeEnterpriseUrl', () => {
    it('should remove a stored enterprise URL', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeEnterpriseUrl('/path/to/project', 'https://github.example.com');
      service.removeEnterpriseUrl('/path/to/project');

      expect(service.getEnterpriseUrl('/path/to/project')).toBeNull();
    });

    it('should not affect tokens when removing enterprise URL', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');
      service.storeEnterpriseUrl('/path/to/project', 'https://github.example.com');
      service.removeEnterpriseUrl('/path/to/project');

      // Token should still be available
      expect(service.getToken('/path/to/project')).toBe('ghp_test_token_123');
      // Enterprise URL should be removed
      expect(service.getEnterpriseUrl('/path/to/project')).toBeNull();
    });
  });

  // --- safeStorage availability ---

  describe('encryption availability', () => {
    it('should use safeStorage.isEncryptionAvailable before encrypting', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');

      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
    });

    it('should use safeStorage.isEncryptionAvailable before decrypting', async () => {
      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      service.storeToken('/path/to/project', 'ghp_test_token_123');
      mockSafeStorage.isEncryptionAvailable.mockClear();

      service.getToken('/path/to/project');

      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalled();
    });

    it('should store enterprise URLs without requiring encryption', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const { GitHubCredentialService } = await import('../gitHubCredentialService');
      const service = new GitHubCredentialService();

      // Enterprise URL does not require encryption
      service.storeEnterpriseUrl('/path/to/project', 'https://github.example.com');
      expect(service.getEnterpriseUrl('/path/to/project')).toBe('https://github.example.com');
    });
  });
});
