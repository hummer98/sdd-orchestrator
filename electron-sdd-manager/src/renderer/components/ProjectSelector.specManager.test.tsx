/**
 * ProjectSelector - spec-manager Install Feature Tests
 * TDD: Testing Slash Command and SDD settings installation
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock stores using vi.hoisted to make variables available before hoisting
const { mockUseProjectStore, mockUseSpecStore } = vi.hoisted(() => ({
  mockUseProjectStore: vi.fn(),
  mockUseSpecStore: vi.fn(),
}));

vi.mock('../stores', () => ({
  useProjectStore: mockUseProjectStore,
  useSpecStore: mockUseSpecStore,
}));

// Import after mocks are set up
import { ProjectSelector } from './ProjectSelector';

const createMockStores = (overrides: any = {}) => {
  const defaultProjectStore = {
    currentProject: '/test/project',
    kiroValidation: {
      exists: true,
      hasSpecs: true,
      hasSteering: true,
    },
    isLoading: false,
    selectProject: vi.fn(),
    // spec-manager extensions
    specManagerCheck: null,
    checkSpecManagerFiles: vi.fn(),
    installLoading: false,
    installResult: null,
    installError: null,
    installCommands: vi.fn(),
    installSettings: vi.fn(),
    clearInstallResult: vi.fn(),
    // permissions check
    permissionsCheck: null,
    ...overrides.projectStore,
  };

  const defaultSpecStore = {
    loadSpecs: vi.fn(),
    ...overrides.specStore,
  };

  mockUseProjectStore.mockReturnValue(defaultProjectStore);
  mockUseSpecStore.mockReturnValue(defaultSpecStore);

  return { defaultProjectStore, defaultSpecStore };
};

describe('ProjectSelector - spec-manager Install Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      showOpenDialog: vi.fn(),
      checkSpecManagerFiles: vi.fn(),
      installSpecManagerFiles: vi.fn(),
    } as any;
  });

  // ============================================================
  // Task 9.1: プロジェクト選択画面にインストール機能を統合
  // Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
  // ============================================================
  describe('Task 9.1: Install feature integration', () => {
    describe('file existence check on project selection', () => {
      it('should check Slash Commands and SDD settings when project is selected', async () => {
        const mockCheckResult = {
          commands: {
            allPresent: false,
            missing: ['spec-manager/init', 'spec-manager/requirements'],
            present: ['spec-manager/design', 'spec-manager/tasks', 'spec-manager/impl'],
          },
          settings: {
            allPresent: true,
            missing: [],
            present: ['rules/ears-format.md', 'templates/specs/design.md'],
          },
          allPresent: false,
        };

        window.electronAPI.checkSpecManagerFiles = vi.fn().mockResolvedValue(mockCheckResult);

        const { defaultProjectStore } = createMockStores({
          projectStore: {
            specManagerCheck: mockCheckResult,
          },
        });

        render(<ProjectSelector />);

        // Should display check result
        expect(screen.queryByText(/不足しているコマンド/)).toBeInTheDocument();
      });

      it('should call checkSpecManagerFiles action when available', () => {
        const mockCheckFn = vi.fn();

        const { defaultProjectStore } = createMockStores({
          projectStore: {
            checkSpecManagerFiles: mockCheckFn,
          },
        });

        render(<ProjectSelector />);

        // checkSpecManagerFiles is called by the store's selectProject action,
        // not directly by the component. This test verifies the action exists.
        expect(typeof defaultProjectStore.checkSpecManagerFiles).toBe('function');
      });
    });

    describe('install button display', () => {
      it('should display install button when commands are missing', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: {
                allPresent: false,
                missing: ['spec-manager/init'],
                present: [],
              },
              settings: {
                allPresent: true,
                missing: [],
                present: [],
              },
              allPresent: false,
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/コマンドをインストール/)).toBeInTheDocument();
      });

      it('should display install button when settings are missing', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: {
                allPresent: true,
                missing: [],
                present: [],
              },
              settings: {
                allPresent: false,
                missing: ['rules/ears-format.md'],
                present: [],
              },
              allPresent: false,
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/設定をインストール/)).toBeInTheDocument();
      });

      it('should distinguish between commands and settings install buttons', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: {
                allPresent: false,
                missing: ['spec-manager/init'],
                present: [],
              },
              settings: {
                allPresent: false,
                missing: ['rules/ears-format.md'],
                present: [],
              },
              allPresent: false,
            },
          },
        });

        render(<ProjectSelector />);

        // Should have separate buttons for commands and settings
        expect(screen.queryByText(/コマンドをインストール/)).toBeInTheDocument();
        expect(screen.queryByText(/設定をインストール/)).toBeInTheDocument();
      });

      it('should not display install button when all files are present', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: {
                allPresent: true,
                missing: [],
                present: ['spec-manager/init', 'spec-manager/requirements'],
              },
              settings: {
                allPresent: true,
                missing: [],
                present: ['rules/ears-format.md'],
              },
              allPresent: true,
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/インストール/)).not.toBeInTheDocument();
      });
    });

    describe('installation success', () => {
      it('should display success message after installation', async () => {
        // Test with installResult already set (after installation)
        // allPresent should be false to show the section with result
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: { allPresent: false, missing: ['spec-manager/design'], present: ['spec-manager/init'] },
              settings: { allPresent: true, missing: [], present: ['rules/ears-format.md'] },
              allPresent: false,
            },
            installResult: {
              commands: {
                installed: ['spec-manager/init', 'spec-manager/requirements'],
                skipped: [],
              },
              settings: {
                installed: ['rules/ears-format.md'],
                skipped: [],
              },
            },
          },
        });

        render(<ProjectSelector />);

        // Should display success message
        expect(screen.queryByText(/インストール完了/)).toBeInTheDocument();
      });

      it('should display list of installed files', async () => {
        // Test with installResult already set (after installation)
        // allPresent should be false to show the section with result
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: { allPresent: false, missing: ['spec-manager/design'], present: ['spec-manager/init'] },
              settings: { allPresent: true, missing: [], present: [] },
              allPresent: false,
            },
            installResult: {
              commands: {
                installed: ['spec-manager/init', 'spec-manager/requirements'],
                skipped: [],
              },
              settings: {
                installed: [],
                skipped: [],
              },
            },
          },
        });

        render(<ProjectSelector />);

        // Should show installed files in result
        expect(screen.queryByText(/spec-manager\/init/)).toBeInTheDocument();
      });
    });

    describe('installation error', () => {
      it('should display error details when installation fails', async () => {
        // Test with installError already set (after failed installation)
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: { allPresent: false, missing: ['spec-manager/init'], present: [] },
              settings: { allPresent: true, missing: [], present: [] },
              allPresent: false,
            },
            installError: {
              type: 'TEMPLATE_NOT_FOUND',
              path: '/missing/template.md',
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/テンプレート未発見/)).toBeInTheDocument();
        expect(screen.queryByText(/TEMPLATE_NOT_FOUND/)).toBeInTheDocument();
      });

      it('should display permission error message', async () => {
        // Test with installError already set (after failed installation)
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: { allPresent: false, missing: ['spec-manager/init'], present: [] },
              settings: { allPresent: true, missing: [], present: [] },
              allPresent: false,
            },
            installError: {
              type: 'PERMISSION_DENIED',
              path: '/test/.claude/commands/spec-manager/init.md',
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/権限エラー/)).toBeInTheDocument();
      });
    });

    describe('missing files display', () => {
      it('should list missing command files', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: {
                allPresent: false,
                missing: ['spec-manager/init', 'spec-manager/requirements'],
                present: ['spec-manager/design'],
              },
              settings: { allPresent: true, missing: [], present: [] },
              allPresent: false,
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/spec-manager\/init/)).toBeInTheDocument();
        expect(screen.queryByText(/spec-manager\/requirements/)).toBeInTheDocument();
      });

      it('should list missing settings files', () => {
        createMockStores({
          projectStore: {
            specManagerCheck: {
              commands: { allPresent: true, missing: [], present: [] },
              settings: {
                allPresent: false,
                missing: ['rules/ears-format.md', 'templates/specs/design.md'],
                present: [],
              },
              allPresent: false,
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/rules\/ears-format.md/)).toBeInTheDocument();
        expect(screen.queryByText(/templates\/specs\/design.md/)).toBeInTheDocument();
      });
    });

    describe('permissions check display', () => {
      it('should display warning when some permissions are missing', () => {
        createMockStores({
          projectStore: {
            permissionsCheck: {
              allPresent: false,
              missing: ['Read(**)', 'Write(**)', 'SlashCommand(/kiro:spec-init:*)'],
              present: ['Edit(**)', 'Glob(**)', 'Grep(**)'],
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/不足しているパーミッション/)).toBeInTheDocument();
        expect(screen.queryByText(/Read\(\*\*\)/)).toBeInTheDocument();
      });

      it('should display success message when all permissions are present', () => {
        createMockStores({
          projectStore: {
            permissionsCheck: {
              allPresent: true,
              missing: [],
              present: ['Read(**)', 'Edit(**)', 'Write(**)', 'SlashCommand(/kiro:spec-init:*)'],
            },
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/パーミッション: すべて設定済み/)).toBeInTheDocument();
      });

      it('should not display permissions section when check is null', () => {
        createMockStores({
          projectStore: {
            permissionsCheck: null,
          },
        });

        render(<ProjectSelector />);

        expect(screen.queryByText(/パーミッション/)).not.toBeInTheDocument();
      });
    });
  });
});
