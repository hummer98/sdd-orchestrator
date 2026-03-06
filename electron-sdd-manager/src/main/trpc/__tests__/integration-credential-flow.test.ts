/**
 * Integration Test: Credential Storage and Connection Test Flow
 * github-issue-integration: Task 15.3
 * Requirements: 1.2, 1.6
 * Integration Point: Design.md "Credential Flow"
 *
 * Tests the end-to-end flow of:
 * - PAT input -> safeStorage encryption -> storage
 * - PAT retrieval -> decryption -> connection test
 * - EventBus GITHUB_CONNECTION_CHANGED notifications
 * - Connection status query (configured/connected/error states)
 *
 * Mock boundaries:
 * - safeStorage API (mocked via GitHubCredentialService mock in createMockServices)
 * - GitHub API (mocked via GitHubApiService mock)
 * - tRPC Context via createTestContext
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller, createMockServices } from '../helpers/test-helpers';
import type { ContextServices } from '../context';
import { EVENT_NAMES } from '../services/eventBus';

describe('Integration: Credential Storage and Connection Test Flow', () => {
  let mockServices: ContextServices;

  const projectPath = '/test/project';

  beforeEach(() => {
    mockServices = createMockServices();
  });

  // ==========================================================================
  // PAT Storage Flow
  // ==========================================================================

  describe('PAT storage flow', () => {
    it('should store token via GitHubCredentialService and emit connection changed event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.setGitHubToken({
        projectPath,
        token: 'ghp_test_token_12345',
      });

      // Verify: storeToken called on credential service
      expect(mockServices.gitHubCredentialService!.storeToken).toHaveBeenCalledWith(
        projectPath,
        'ghp_test_token_12345',
      );

      // Verify: connection changed event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.GITHUB_CONNECTION_CHANGED,
        expect.objectContaining({ projectPath }),
      );
    });

    it('should remove token and emit connection changed event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.removeGitHubToken({ projectPath });

      // Verify: removeToken called
      expect(mockServices.gitHubCredentialService!.removeToken).toHaveBeenCalledWith(projectPath);

      // Verify: event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.GITHUB_CONNECTION_CHANGED,
        expect.objectContaining({ projectPath }),
      );
    });

    it('should store enterprise URL and emit connection changed event', async () => {
      const emitSpy = vi.spyOn(mockServices.eventBus!, 'emit');

      const caller = createTestCaller(mockServices);
      await caller.issue.setEnterpriseUrl({
        projectPath,
        url: 'https://github.example.com',
      });

      // Verify: storeEnterpriseUrl called
      expect(mockServices.gitHubCredentialService!.storeEnterpriseUrl).toHaveBeenCalledWith(
        projectPath,
        'https://github.example.com',
      );

      // Verify: event emitted
      expect(emitSpy).toHaveBeenCalledWith(
        EVENT_NAMES.GITHUB_CONNECTION_CHANGED,
        expect.objectContaining({ projectPath }),
      );
    });
  });

  // ==========================================================================
  // Connection Test Flow
  // ==========================================================================

  describe('Connection test flow', () => {
    it('should test connection successfully after token is stored', async () => {
      const mockUser = { login: 'test-user', avatar_url: 'https://example.com/avatar' };
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: true,
        data: mockUser,
      });

      const caller = createTestCaller(mockServices);
      const result = await caller.issue.testConnection({ projectPath });

      // Verify: testConnection called on API service
      expect(mockServices.gitHubApiService!.testConnection).toHaveBeenCalledWith(projectPath);
      expect(result).toEqual(mockUser);
    });

    it('should propagate auth error on connection test failure', async () => {
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Bad credentials' },
      });

      const caller = createTestCaller(mockServices);
      await expect(
        caller.issue.testConnection({ projectPath }),
      ).rejects.toThrow('Bad credentials');
    });
  });

  // ==========================================================================
  // Connection Status Query Flow
  // ==========================================================================

  describe('Connection status query', () => {
    it('should return unconfigured status when no credentials exist', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(false);

      const caller = createTestCaller(mockServices);
      const status = await caller.issue.getConnectionStatus({ projectPath });

      expect(status).toEqual({
        configured: false,
        connected: false,
        user: null,
        repoInfo: null,
        error: null,
      });
    });

    it('should return connected status with user and repo info', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(true);
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: true,
        data: { login: 'test-user', avatar_url: 'https://example.com/avatar' },
      });
      (mockServices.gitHubApiService as any).detectRepoInfo.mockResolvedValue({
        ok: true,
        data: { owner: 'test-owner', repo: 'test-repo', baseUrl: 'https://api.github.com' },
      });

      const caller = createTestCaller(mockServices);
      const status = await caller.issue.getConnectionStatus({ projectPath });

      expect(status).toEqual({
        configured: true,
        connected: true,
        user: { login: 'test-user', avatar_url: 'https://example.com/avatar' },
        repoInfo: { owner: 'test-owner', repo: 'test-repo', baseUrl: 'https://api.github.com' },
        error: null,
      });
    });

    it('should return error status when connection test fails', async () => {
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(true);
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: false,
        error: { type: 'AUTH_FAILED', message: 'Token revoked' },
      });

      const caller = createTestCaller(mockServices);
      const status = await caller.issue.getConnectionStatus({ projectPath });

      expect(status).toEqual({
        configured: true,
        connected: false,
        user: null,
        repoInfo: null,
        error: 'Token revoked',
      });
    });
  });

  // ==========================================================================
  // Full Credential Lifecycle
  // ==========================================================================

  describe('Full credential lifecycle', () => {
    it('should support store token -> test connection -> query status flow', async () => {
      const caller = createTestCaller(mockServices);

      // Step 1: Store token
      await caller.issue.setGitHubToken({
        projectPath,
        token: 'ghp_valid_token',
      });
      expect(mockServices.gitHubCredentialService!.storeToken).toHaveBeenCalledWith(
        projectPath,
        'ghp_valid_token',
      );

      // Step 2: Test connection
      (mockServices.gitHubApiService as any).testConnection.mockResolvedValue({
        ok: true,
        data: { login: 'developer', avatar_url: '' },
      });

      const user = await caller.issue.testConnection({ projectPath });
      expect(user.login).toBe('developer');

      // Step 3: Check connection status
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(true);
      (mockServices.gitHubApiService as any).detectRepoInfo.mockResolvedValue({
        ok: true,
        data: { owner: 'org', repo: 'project', baseUrl: 'https://api.github.com' },
      });

      const status = await caller.issue.getConnectionStatus({ projectPath });
      expect(status.configured).toBe(true);
      expect(status.connected).toBe(true);
      expect(status.user!.login).toBe('developer');
      expect(status.repoInfo!.owner).toBe('org');
    });

    it('should support store -> remove -> status unconfigured flow', async () => {
      const caller = createTestCaller(mockServices);

      // Step 1: Store token
      await caller.issue.setGitHubToken({
        projectPath,
        token: 'ghp_token',
      });

      // Step 2: Remove token
      await caller.issue.removeGitHubToken({ projectPath });

      // Step 3: Check status (now unconfigured)
      (mockServices.gitHubCredentialService as any).hasCredentials.mockReturnValue(false);

      const status = await caller.issue.getConnectionStatus({ projectPath });
      expect(status.configured).toBe(false);
      expect(status.connected).toBe(false);
    });
  });
});
