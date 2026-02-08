/**
 * SSH Workflow E2E Tests
 * SSH接続フロー - SSHConnectDialog、SSHAuthDialogのE2Eテスト
 *
 * テスト内容:
 * - tRPC IPCブリッジの確認（SSH API用）
 * - SSHConnectDialog/SSHAuthDialog のUI要素確認（ダイアログが開いている場合のみ）
 *
 * Requirements: 1.3, 1.4, 2.1, 2.2, 2.3
 *
 * Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合
 * Note: ダイアログのUI要素テストは実際にダイアログを開く操作が必要。
 *       現在はtRPC IPCブリッジ存在確認のみを実施。
 * Note: tRPC完全移行後、window.electronAPIは削除済み
 *       electron-trpc の IPC ブリッジ (window.electronTRPC) を使用
 */

describe('SSH Workflow E2E', () => {
  // ============================================================
  // SSH tRPC API確認
  // Requirements: 1.3, 1.4
  // ============================================================
  describe('SSH tRPC API', () => {
    it('tRPC IPCブリッジが定義されている（SSH API用）', async () => {
      const hasElectronTRPC = await browser.execute(() => {
        return typeof (window as any).electronTRPC !== 'undefined';
      });
      // tRPC IPCブリッジの存在を確認
      expect(hasElectronTRPC).toBe(true);
    });
  });

  // ============================================================
  // SSHConnectDialog UIテスト（ダイアログ表示時のみ実行可能）
  // Requirements: 1.3, 1.4
  // Note: これらのテストは実際にSSH接続ダイアログを開いた状態でのみ有効
  // ============================================================
  describe('SSHConnectDialogコンポーネント', () => {
    it.skip('SSHConnectDialogのUI要素確認 - ダイアログを開く操作が必要', async () => {
      // TODO: SSH接続ダイアログを開くトリガーを実装後に有効化
      const uriInput = await $('[data-testid="ssh-uri-input"]');
      expect(await uriInput.isExisting()).toBe(true);
    });
  });

  // ============================================================
  // SSHAuthDialog UIテスト（ダイアログ表示時のみ実行可能）
  // Requirements: 2.1, 2.2, 2.3
  // Note: これらのテストは実際にSSH認証ダイアログを開いた状態でのみ有効
  // ============================================================
  describe('SSHAuthDialogコンポーネント', () => {
    it.skip('SSHAuthDialogのUI要素確認 - 認証ダイアログを開く操作が必要', async () => {
      // TODO: SSH認証ダイアログを開くトリガーを実装後に有効化
      const authInput = await $('[data-testid="ssh-auth-input"]');
      expect(await authInput.isExisting()).toBe(true);
    });
  });

  // Note: セキュリティ設定・安定性テストは app-launch.spec.ts に統合
});
