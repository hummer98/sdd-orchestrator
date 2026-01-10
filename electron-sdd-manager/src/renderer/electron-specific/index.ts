/**
 * Electron-specific components barrel export
 *
 * Task 8.1: Electron専用コンポーネントの分離
 * Requirements: 3.4
 *
 * このディレクトリにはElectron環境でのみ使用されるコンポーネントを配置する。
 * Remote UIでは使用されない機能（ファイルシステムアクセス、SSH接続等）を含む。
 *
 * TODO: 以下のコンポーネントを将来的に移動予定:
 *
 * SSH関連:
 * - SSHConnectDialog
 * - SSHAuthDialog
 * - SSHStatusIndicator
 *
 * Cloudflare/RemoteAccess関連:
 * - CloudflareSettingsPanel
 * - RemoteAccessPanel
 * - RemoteAccessDialog
 * - InstallCloudflaredDialog
 *
 * CLI/Claudemd関連:
 * - CliInstallDialog
 * - ClaudeMdInstallDialog
 * - CommandsetInstallDialog
 *
 * プロジェクト選択関連:
 * - RecentProjects
 * - RecentRemoteProjects
 * - ProjectSwitchConfirmDialog
 *
 * 注意: 現時点では既存のインポートパスを維持するため、
 * これらのコンポーネントは元の場所に残っている。
 * 完全な移行はElectron版のApp.tsx更新と合わせて行う。
 */

// 将来のエクスポート用プレースホルダー
// export { SSHConnectDialog } from './SSHConnectDialog';
// export { SSHAuthDialog } from './SSHAuthDialog';
// export { SSHStatusIndicator } from './SSHStatusIndicator';
// export { CloudflareSettingsPanel } from './CloudflareSettingsPanel';
// export { RemoteAccessPanel } from './RemoteAccessPanel';
// export { RemoteAccessDialog } from './RemoteAccessDialog';
// export { InstallCloudflaredDialog } from './InstallCloudflaredDialog';
// export { CliInstallDialog } from './CliInstallDialog';
// export { ClaudeMdInstallDialog } from './ClaudeMdInstallDialog';
// export { CommandsetInstallDialog } from './CommandsetInstallDialog';
// export { RecentProjects } from './RecentProjects';
// export { RecentRemoteProjects } from './RecentRemoteProjects';
// export { ProjectSwitchConfirmDialog } from './ProjectSwitchConfirmDialog';
