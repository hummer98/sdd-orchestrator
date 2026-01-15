# Implementation Plan

## Task Overview

ヘッダーにインストール済みプロファイル（コマンドプリセット）をバッジ表示する機能の実装。IPC経由でプロファイル情報を取得し、ProfileBadgeコンポーネントでElectron版・Remote UI両方に表示する。

---

- [x] 1. ProfileBadge共有コンポーネントの実装
- [x] 1.1 (P) ProfileBadgeコンポーネントを作成
  - プロファイル名（cc-sdd / cc-sdd-agent / spec-manager）またはnullを受け取り、アウトラインバッジとして表示
  - nullの場合は「未インストール」ラベルを表示
  - Tailwind CSSでピル型アウトラインスタイル（border + rounded-full）を適用
  - ダークモード対応（dark:プレフィックス使用）
  - `src/shared/components/ui/`に配置し、index.tsからエクスポート
  - _Requirements: 2.4, 2.5, 5.1, 5.2, 5.3, 5.4_

- [x] 1.2 (P) ProfileBadgeのユニットテストを作成
  - プロファイル名表示テスト（cc-sdd, cc-sdd-agent, spec-manager）
  - null時の「未インストール」表示テスト
  - classNameプロップの適用テスト
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. プロファイル情報取得IPCの実装
- [x] 2.1 LOAD_PROFILEチャンネルをIPC層に追加
  - `channels.ts`に`LOAD_PROFILE`チャンネル定義を追加
  - `handlers.ts`に`ipcMain.handle()`でプロファイル読み込みハンドラを登録
  - 既存の`projectConfigService.loadProfile()`を呼び出し、ProfileConfigまたはnullを返却
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.2 preloadスクリプトにloadProfile APIを公開
  - `preload/index.ts`に`loadProfile(projectPath: string)`を追加
  - `window.electronAPI.loadProfile()`として公開
  - 型定義を`electron.d.ts`に追加
  - _Requirements: 1.3_

- [x] 2.3 WebSocketハンドラにloadProfileメッセージを追加
  - `webSocketHandler.ts`に`loadProfile`メッセージタイプを追加
  - IPC層と同じ`projectConfigService.loadProfile()`を呼び出し
  - Remote UIからプロファイル情報を取得可能にする
  - _Requirements: 4.1_

- [x] 3. projectStoreへのプロファイル状態追加
- [x] 3.1 projectStoreにprofile状態とreloadProfileアクションを追加
  - `profile: ProfileName | null`状態を追加
  - `reloadProfile()`アクションを追加し、IPC経由でプロファイルを取得して状態更新
  - `selectProject()`内でプロジェクト選択後にプロファイル読み込みを実行
  - _Requirements: 3.1, 3.3_

- [x] 3.2 projectStoreのユニットテストを追加
  - reloadProfile成功時の状態更新テスト
  - selectProject内でのprofile読み込みテスト
  - _Requirements: 3.1, 3.3_

- [x] 4. Electronヘッダーへのプロファイルバッジ統合
- [x] 4.1 App.tsxヘッダー領域にProfileBadgeを配置
  - プロジェクト名の横にProfileBadgeコンポーネントを表示
  - projectStoreのprofile状態をバッジに渡す
  - プロジェクト未選択時はバッジを非表示
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.2 コマンドセットインストール完了後のプロファイル再読み込み
  - `CommandsetInstallDialog`のインストール成功コールバックで`reloadProfile()`を呼び出し
  - インストール完了後に手動リフレッシュなしでバッジが更新されることを確認
  - _Requirements: 3.2, 3.3_

- [x] 5. Remote UIへのプロファイルバッジ統合
- [x] 5.1 Remote UIヘッダー領域にProfileBadgeを配置
  - `MobileLayout.tsx`と`DesktopLayout.tsx`のヘッダー領域にProfileBadgeを配置
  - WebSocketApiClient経由でプロファイル情報を取得
  - Electron版と同一のスタイリングを使用
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. 統合テスト
- [x] 6.1 ProfileBadge表示の統合テスト
  - プロジェクト選択時のバッジ表示確認
  - 未インストール時の「未インストール」バッジ表示確認
  - インストール後のバッジ更新確認
  - _Requirements: 2.1, 2.2, 3.2_

---

## Inspection Fix Tasks (Round 2)

以下は検査ラウンド2で検出されたCritical問題を修正するためのタスク。

- [x] FIX-1. インストール完了後のプロファイル再読み込み
  - `App.tsx`の`CommandsetInstallDialog`の`onInstall`コールバックを修正
  - インストール成功後に`window.electronAPI.loadProfile(currentProject)`を呼び出す
  - 取得したプロファイル情報で`useProjectStore.setState({ installedProfile: profile })`を更新
  - _Requirements: 3.2, 3.3_

- [x] FIX-2. Remote UIへのProfileBadge配置（MobileLayout）
  - `MobileLayout.tsx`の`MobileHeader`コンポーネントを修正
  - `useApi()`フックでApiClientを取得
  - `useEffect`で`apiClient.getProfile()`を呼び出しプロファイル情報を取得
  - ProfileBadgeコンポーネントをヘッダーに追加
  - _Requirements: 4.1, 4.2, 4.3_

- [x] FIX-3. Remote UIへのProfileBadge配置（DesktopLayout）
  - `DesktopLayout.tsx`の`DesktopHeader`またはSidebarヘッダーを修正
  - `useApi()`フックでApiClientを取得
  - `useEffect`で`apiClient.getProfile()`を呼び出しプロファイル情報を取得
  - ProfileBadgeコンポーネントをヘッダーに追加
  - _Requirements: 4.1, 4.2, 4.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | プロファイル情報のIPC公開（profile name + installedAt） | 2.1 | Infrastructure |
| 1.2 | 未インストール時null返却 | 2.1 | Infrastructure |
| 1.3 | loadProfile IPC公開 | 2.1, 2.2 | Infrastructure |
| 2.1 | インストール済みプロファイルバッジ表示 | 1.1, 4.1 | Feature |
| 2.2 | 未インストール時「未インストール」バッジ表示 | 1.1, 4.1 | Feature |
| 2.3 | プロジェクト未選択時バッジ非表示 | 4.1 | Feature |
| 2.4 | アウトラインスタイル（border only, pill-shaped） | 1.1 | Feature |
| 2.5 | ダークモード対応 | 1.1 | Feature |
| 3.1 | プロジェクト選択時プロファイル読み込み | 3.1 | Feature |
| 3.2 | インストール完了後プロファイル更新 | 4.2, 6.1, FIX-1 | Feature |
| 3.3 | 手動リフレッシュ不要 | 3.1, 4.2, FIX-1 | Feature |
| 4.1 | Remote UIでのバッジ表示 | 2.3, 5.1, FIX-2, FIX-3 | Feature |
| 4.2 | 同一スタイリング | 5.1, FIX-2, FIX-3 | Feature |
| 4.3 | コンポーネント共有 | 1.1, 5.1, FIX-2, FIX-3 | Feature |
| 5.1 | ProfileBadgeコンポーネント提供（shared/components/ui/） | 1.1 | Infrastructure |
| 5.2 | profile name props受け取り | 1.1 | Feature |
| 5.3 | アウトラインピルスタイル | 1.1 | Feature |
| 5.4 | null時「未インストール」表示 | 1.1 | Feature |
