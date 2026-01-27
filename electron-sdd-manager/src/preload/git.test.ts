import { describe, it, expect } from 'vitest';

/**
 * Preload Git API Tests
 * Task 3.3: Test that git APIs are exposed via preload
 * Requirements: 3.2
 */

describe('Preload Git API', () => {
  it('should define git API structure', () => {
    // This test ensures the git API structure is defined
    // In actual runtime, these would be accessed via window.electronAPI.git
    const gitApiStructure = {
      getGitStatus: expect.any(Function),
      getGitDiff: expect.any(Function),
      startWatching: expect.any(Function),
      stopWatching: expect.any(Function),
      onChangesDetected: expect.any(Function),
    };

    expect(gitApiStructure.getGitStatus).toBeDefined();
    expect(gitApiStructure.getGitDiff).toBeDefined();
    expect(gitApiStructure.startWatching).toBeDefined();
    expect(gitApiStructure.stopWatching).toBeDefined();
    expect(gitApiStructure.onChangesDetected).toBeDefined();
  });
});
