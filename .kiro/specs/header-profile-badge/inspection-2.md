# 検査レポート - header-profile-badge

## 概要
- **日付**: 2026-01-15T04:15:00Z
- **判定**: NOGO
- **検査者**: spec-inspection-agent
- **ラウンド**: 2

## 前回検査(ラウンド1)からの変更

前回の検査(2026-01-15T03:30:00Z)で指摘されたCritical問題について:

| 問題 | ラウンド1の状態 | ラウンド2の状態 | 結果 |
|------|----------------|----------------|------|
| Remote UIへのProfileBadge配置 | 未実装 | 未実装 | **未修正** |
| インストール完了後のプロファイル再読み込み | 未実装 | 未実装 | **未修正** |

## カテゴリ別検出結果

### 要件準拠

| 要件ID | ステータス | 重大度 | 詳細 |
|--------|--------|--------|------|
| 1.1 | PASS | - | `LOAD_PROFILE` IPCチャンネルが `channels.ts` に定義されている |
| 1.2 | PASS | - | 未インストール時はnullを返却（`layoutConfigService.loadProfile()`経由） |
| 1.3 | PASS | - | `preload/index.ts` で `window.electronAPI.loadProfile()` が公開されている |
| 2.1 | PASS | - | インストール済みプロファイル名がバッジで表示される |
| 2.2 | PASS | - | nullの場合は「not installed」が表示される |
| 2.3 | PASS | - | プロジェクト未選択時はバッジが非表示（`currentProject &&`条件） |
| 2.4 | PASS | - | アウトラインスタイル（`border rounded-full`）が適用されている |
| 2.5 | PASS | - | ダークモードクラス（`dark:border-gray-500 dark:text-gray-400`）が適用されている |
| 3.1 | PASS | - | `selectProject()`内で`loadProfile()`が呼び出されている |
| 3.2 | FAIL | Critical | **インストール完了後にプロファイルが再読み込みされていない** - `App.tsx`の`onInstall`コールバックで`loadProfile()`が呼び出されていない |
| 3.3 | PARTIAL | Major | 手動リフレッシュは不要だが、インストール後の自動更新が不完全（3.2に依存） |
| 4.1 | FAIL | Critical | **Remote UIにProfileBadgeが表示されていない** - `MobileLayout.tsx`と`DesktopLayout.tsx`にProfileBadgeコンポーネントが配置されていない |
| 4.2 | FAIL | Major | Remote UIでのスタイリング検証不可（4.1が未実装のため） |
| 4.3 | PARTIAL | Major | ProfileBadgeコンポーネントは`shared/components/ui/`に配置されているが、Remote UIで使用されていない |
| 5.1 | PASS | - | `src/shared/components/ui/ProfileBadge.tsx` が存在する |
| 5.2 | PASS | - | `profile: ProfileName | null` propsを受け取る |
| 5.3 | PASS | - | アウトラインピルスタイルが適用されている |
| 5.4 | PASS | - | nullの場合は「not installed」が表示される |

### 設計整合性

| コンポーネント | ステータス | 重大度 | 詳細 |
|--------------|--------|--------|------|
| ProfileBadge | PASS | - | 設計通り`shared/components/ui/`に配置 |
| IPC:LOAD_PROFILE | PASS | - | 設計通りIPCチャンネル追加 |
| projectStore拡張 | PASS | - | `installedProfile`状態と読み込みロジックが実装されている |
| WebSocket統合 | PASS | - | `webSocketHandler.ts`に`GET_PROFILE`ハンドラと`handleGetProfile`が実装されている |
| WebSocketApiClient | PASS | - | `getProfile()`メソッドが実装されている |
| App.tsx統合 | PARTIAL | Major | ProfileBadgeは配置されているが、インストール後の更新が不完全 |
| Remote UI統合 | FAIL | Critical | MobileLayout/DesktopLayoutにProfileBadgeが配置されていない |

### タスク完了状況

| タスクID | ステータス | 重大度 | 詳細 |
|---------|--------|--------|------|
| 1.1 | PASS | - | ProfileBadgeコンポーネントが実装されている |
| 1.2 | PASS | - | ユニットテストが8件全て成功 |
| 2.1 | PASS | - | LOAD_PROFILEチャンネルが追加されている |
| 2.2 | PASS | - | preloadに`loadProfile` APIが公開されている |
| 2.3 | PASS | - | WebSocketハンドラに`GET_PROFILE`が追加されている |
| 3.1 | PASS | - | projectStoreに`installedProfile`状態と読み込みロジックが追加されている |
| 3.2 | PASS | - | projectStoreのユニットテストが成功 |
| 4.1 | PARTIAL | Major | App.tsxにProfileBadgeは配置されているが、インストール後更新が不完全 |
| 4.2 | FAIL | Critical | コマンドセットインストール完了後の`loadProfile()`呼び出しがない |
| 5.1 | FAIL | Critical | MobileLayout/DesktopLayoutにProfileBadgeが配置されていない |
| 6.1 | PASS | - | ProfileBadge表示の統合テストは要件を満たしている（Electron版） |

### ステアリング整合性

| ドキュメント | ステータス | 詳細 |
|------------|--------|------|
| product.md | PASS | ワークフロー可視化の一部として整合 |
| tech.md | PASS | React/Zustand/Tailwindパターンに準拠 |
| structure.md | PASS | `shared/components/ui/`配置パターンに準拠 |
| design-principles.md | PASS | DRY（共有コンポーネント）、KISS（シンプルなバッジ表示）に準拠 |

### 設計原則

| 原則 | ステータス | 詳細 |
|------|--------|------|
| DRY | PASS | ProfileBadgeコンポーネントは共有され、Electron/Remote UIで再利用可能 |
| SSOT | PASS | プロファイル情報は`sdd-orchestrator.json`をSSOTとして使用 |
| KISS | PASS | シンプルな表示コンポーネント、複雑なロジックなし |
| YAGNI | PASS | 不要な機能は実装されていない（クリック動作、ツールチップなし） |
| 関心の分離 | PASS | 表示（ProfileBadge）とデータ取得（IPC/projectStore）が分離されている |

### デッドコード検出

| パターン | ステータス | 重大度 | 詳細 |
|---------|--------|--------|------|
| ProfileBadge | OK | - | App.tsxからインポートされ、JSXでレンダリングされている |
| IPC:LOAD_PROFILE | OK | - | handlers.tsで登録され、projectStoreから呼び出されている |
| WebSocket GET_PROFILE | PARTIAL | Minor | WebSocketハンドラで実装されているが、Remote UIから呼び出されていない（Remote UI統合が不完全のため） |
| WebSocketApiClient.getProfile() | PARTIAL | Minor | メソッドは実装されているが、Remote UIから呼び出されていない |

### 統合検証

| 検証項目 | ステータス | 重大度 | 詳細 |
|---------|--------|--------|------|
| Electron版表示 | PASS | - | プロジェクト選択後にヘッダーにバッジが表示される |
| プロジェクト選択時読み込み | PASS | - | selectProject()内でloadProfile()が呼び出されている |
| インストール後更新 | FAIL | Critical | App.tsx onInstallコールバックでloadProfile()が呼び出されていない |
| Remote UI表示 | FAIL | Critical | MobileLayout/DesktopLayoutにProfileBadgeが配置されていない |
| WebSocket通信 | PASS | - | GET_PROFILE/PROFILE_UPDATEDメッセージが実装されている |

### ロギング準拠

| 項目 | ステータス | 詳細 |
|------|--------|------|
| ログレベル対応 | PASS | debug/info/warn/errorが使用されている |
| ログフォーマット | PASS | タイムスタンプ、レベル、コンテキストが含まれている |
| ログ場所言及 | PASS | debugging.mdに記載あり |
| 過剰ログ回避 | PASS | 適切なログ量 |

## 統計
- 総検査数: 35
- 合格: 26 (74%)
- Critical: 4
- Major: 3
- Minor: 2
- Info: 0

## 推奨アクション

### 優先度1: Critical問題の修正（前回から継続）

1. **[Critical] Remote UIへのProfileBadge配置** (要件4.1, 4.2, 4.3)
   - `MobileLayout.tsx`の`MobileHeader`にProfileBadgeを追加
   - `DesktopLayout.tsx`の`DesktopHeader`またはSidebarヘッダーにProfileBadgeを追加
   - WebSocketApiClient経由で`getProfile()`を呼び出してプロファイル情報を取得
   - または、Remote UI用の共有storeでprofile状態を管理

2. **[Critical] インストール完了後のプロファイル再読み込み** (要件3.2, 3.3)
   - `App.tsx`の`CommandsetInstallDialog`の`onInstall`コールバック（648行目付近）を修正
   - インストール成功後に`window.electronAPI.loadProfile(currentProject)`を呼び出す
   - または`useProjectStore`に`reloadProfile()`アクションを追加して呼び出す
   - projectStoreの`installedProfile`状態を更新

### 優先度2: Minor問題

3. **[Minor] Remote UI統合テスト**
   - ProfileBadgeがRemote UIで正しく表示されることを確認するテストを追加

## 修正方法の提案

### App.tsxの修正（インストール後のプロファイル再読み込み）

```typescript
// App.tsx onInstallコールバック内（約648行目以降）
onInstall={async (profileName: ProfileName, _progressCallback) => {
  if (!currentProject) return;

  const result = await window.electronAPI.installCommandsetByProfile(
    currentProject,
    profileName,
    { force: true }
  );

  if (!result.ok) {
    throw new Error(result.error.message || result.error.type);
  }

  // ... existing code ...

  // header-profile-badge: Reload profile after successful install
  // Requirements: 3.2, 3.3
  try {
    const profile = await window.electronAPI.loadProfile(currentProject);
    useProjectStore.setState({ installedProfile: profile });
  } catch (error) {
    console.error('[App] Failed to reload profile:', error);
  }

  return { /* ... */ };
}}
```

### MobileLayout.tsxの修正（ProfileBadge追加）

```typescript
import { ProfileBadge } from '../../shared/components/ui';
import { useApi } from '../../shared';
import { useState, useEffect } from 'react';

function MobileHeader(): React.ReactElement {
  const apiClient = useApi();
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  useEffect(() => {
    apiClient.getProfile().then(result => {
      if (result.ok) {
        setProfile(result.value);
      }
    });
  }, [apiClient]);

  return (
    <header className="...">
      <div className="flex items-center gap-2">
        <h1>SDD Orchestrator</h1>
        <ProfileBadge profile={profile?.name as ProfileName ?? null} />
      </div>
      {/* ... */}
    </header>
  );
}
```

## 次のステップ
- **NOGO**: Critical問題を修正し、再検査を実行してください
- 修正対象:
  1. `App.tsx` - onInstallコールバックでのプロファイル再読み込み追加
  2. `MobileLayout.tsx` - MobileHeaderへのProfileBadge追加
  3. `DesktopLayout.tsx` - DesktopHeaderまたはSidebarヘッダーへのProfileBadge追加
