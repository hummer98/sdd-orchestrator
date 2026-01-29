/**
 * Install Dialogs E2E Tests
 * CLIインストールダイアログ及び統合インストーラーのE2Eテスト
 *
 * テスト内容:
 * - CliInstallDialogの表示と操作
 * - CommandsetInstallDialog（統合インストーラー）の表示と操作
 * - IPC API確認
 * - コマンドセットインストール後のCLAUDE.md非作成確認
 *
 * Note: Phase 2 (commandset-unified-installer) で以下のメニュー項目が削除されました:
 * - 「CLAUDE.mdをインストール...」 → 統合インストーラーに統合
 * - 「spec-managerコマンドを再インストール...」 → 統合インストーラーに統合
 * - 「シェルコマンドの実行許可を追加...」 → 統合インストーラーに統合
 * - 「cc-sdd Workflowをインストール...」 → 統合インストーラーに統合
 *
 * 削除されたメニュー操作のテストは統合インストーラーのテストでカバーされます。
 *
 * Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Install Dialogs E2E', () => {
  // ============================================================
  // CliInstallDialog API
  // ============================================================
  describe('CliInstallDialog API', () => {
    it('Renderer APIにCLIインストールメソッドが存在する', async () => {
      const hasCliInstallAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCliCommand === 'function';
      });
      expect(hasCliInstallAPI).toBe(true);
    });

    // Note: ダイアログUI要素テストはダイアログを開く操作が必要
    // TODO: メニュー操作でダイアログを開いてからUI要素を検証するテストを追加
  });

  // ============================================================
  // CommandsetInstallDialog（統合インストーラー）
  // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
  // Task: 19.2 - 削除されたメニュー機能をカバー
  // ============================================================
  describe('CommandsetInstallDialog（統合インストーラー）', () => {
    it('Renderer APIにコマンドセットインストールメソッドが存在する', async () => {
      const hasCommandsetInstallAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.installCommandsetByProfile === 'function';
      });
      expect(hasCommandsetInstallAPI).toBe(true);
    });

    it('Renderer APIにコマンドセットインストールメニューイベントリスナーが存在する', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCommandset === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    it('Renderer APIにエージェントフォルダ存在確認メソッドが存在する', async () => {
      const hasCheckAgentFolderAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkAgentFolderExists === 'function';
      });
      expect(hasCheckAgentFolderAPI).toBe(true);
    });

    it('Renderer APIにエージェントフォルダ削除メソッドが存在する', async () => {
      const hasDeleteAgentFolderAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.deleteAgentFolder === 'function';
      });
      expect(hasDeleteAgentFolderAPI).toBe(true);
    });
  });

  // ============================================================
  // メニュー関連IPC
  // ============================================================
  describe('メニュー関連IPC', () => {
    it('メニューからCLIインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCliCommand === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    it('メニューからコマンドセットインストールイベントを受信できる', async () => {
      const hasMenuListener = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.onMenuInstallCommandset === 'function';
      });
      expect(hasMenuListener).toBe(true);
    });

    // Note: 以下のメニューイベントはPhase 2で削除されました:
    // - onMenuInstallClaudeMd → 統合インストーラーに統合
    // - onMenuForceReinstall → 統合インストーラーに統合
    // - onMenuAddShellPermissions → 統合インストーラーに統合
    // - onMenuInstallCcSddWorkflow → 統合インストーラーに統合
  });

  // ============================================================
  // パーミッション関連API
  // Note: 個別メニュー項目は削除されましたが、APIは統合インストーラーから使用されます
  // ============================================================
  describe('パーミッション関連API', () => {
    it('Renderer APIにシェルパーミッション追加メソッドが存在する', async () => {
      const hasAddShellPermissionsAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.addShellPermissions === 'function';
      });
      expect(hasAddShellPermissionsAPI).toBe(true);
    });

    it('Renderer APIに必要パーミッション確認メソッドが存在する', async () => {
      const hasCheckRequiredPermissionsAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.checkRequiredPermissions === 'function';
      });
      expect(hasCheckRequiredPermissionsAPI).toBe(true);
    });
  });

  // ============================================================
  // CLAUDE.md非作成確認（claudemd-profile-install-merge）
  // コマンドセットインストール時にbugWorkflowInstallerが
  // CLAUDE.mdを勝手に作成しないことを確認
  // CLAUDE.md管理はclaudemd-merge Agentが担当
  // ============================================================
  describe('CLAUDE.md非作成確認', () => {
    let tempProjectDir: string;

    beforeEach(async () => {
      tempProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-claudemd-test-'));
    });

    afterEach(async () => {
      if (tempProjectDir) {
        await fs.rm(tempProjectDir, { recursive: true, force: true });
      }
    });

    it('コマンドセットインストール後にCLAUDE.mdが作成されないこと', async () => {
      // CLAUDE.mdが存在しないことを事前確認
      const existsBefore = await fileExists(path.join(tempProjectDir, 'CLAUDE.md'));
      expect(existsBefore).toBe(false);

      // cc-sddプロファイルでコマンドセットインストールを実行
      const result = await browser.execute(
        async (projectPath: string) => {
          return await window.electronAPI.installCommandsetByProfile(projectPath, 'cc-sdd');
        },
        tempProjectDir
      );

      // インストール自体は成功すること
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);

      // CLAUDE.mdが作成されていないこと
      // (CLAUDE.md管理はclaudemd-merge Agentが担当するため、
      //  インストーラーが直接作成してはいけない)
      const existsAfter = await fileExists(path.join(tempProjectDir, 'CLAUDE.md'));
      expect(existsAfter).toBe(false);
    });

    it('cc-sdd-agentプロファイルでもCLAUDE.mdが作成されないこと', async () => {
      const result = await browser.execute(
        async (projectPath: string) => {
          return await window.electronAPI.installCommandsetByProfile(projectPath, 'cc-sdd-agent');
        },
        tempProjectDir
      );

      expect(result).toBeDefined();
      expect(result.ok).toBe(true);

      const existsAfter = await fileExists(path.join(tempProjectDir, 'CLAUDE.md'));
      expect(existsAfter).toBe(false);
    });
  });

  // Note: セキュリティ設定・安定性テストは app-launch.spec.ts に統合
});

/**
 * Helper to check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
