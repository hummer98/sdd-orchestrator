# Implementation Plan: Remote Dialog Tab Layout

## Overview

RemoteAccessDialogにタブUIを導入し、Webサーバー関連設定とMCPサーバー設定を2つのタブに分離する。

**対象ファイル:**
- `electron-sdd-manager/src/renderer/components/RemoteAccessDialog.tsx`
- `electron-sdd-manager/src/renderer/components/RemoteAccessDialog.test.tsx`

---

## Tasks

- [x] 1. タブ状態管理の実装
- [x] 1.1 タブ識別子の型定義とタブ設定の追加
  - `RemoteDialogTab`型（`'web-server' | 'mcp'`）を定義
  - `TAB_CONFIGS`配列を定義（id、labelを含む）
  - _Requirements: 1.1_

- [x] 1.2 タブ状態のuseState実装
  - `activeTab`状態を`useState<RemoteDialogTab>('web-server')`で初期化
  - Webサーバータブがデフォルト選択される
  - _Requirements: 4.1, 4.2_

- [x] 2. タブUIコンポーネントの実装
- [x] 2.1 タブリストの実装
  - ダイアログコンテンツ上部にタブリストを配置
  - `role="tablist"`属性を付与
  - 水平配置（flexレイアウト）
  - _Requirements: 1.2, 5.1_

- [x] 2.2 タブボタンの実装
  - 各タブを`button`要素として実装
  - `role="tab"`、`aria-selected`、`aria-controls`属性を付与
  - クリックハンドラで`setActiveTab`を呼び出し
  - _Requirements: 1.4, 5.1_

- [x] 2.3 アクティブタブのスタイリング
  - clsxを使用した条件付きスタイル適用
  - アクティブタブは視覚的に区別（背景色または下線）
  - Tailwind CSSクラスを使用
  - _Requirements: 1.3_

- [x] 3. タブパネルの実装
- [x] 3.1 Webサーバータブパネルの実装
  - `role="tabpanel"`属性を付与
  - RemoteAccessPanelを配置
  - Dividerを配置
  - CloudflareSettingsPanelを配置
  - activeTab === 'web-server'の時のみ表示
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 MCPタブパネルの実装
  - `role="tabpanel"`属性を付与
  - McpSettingsPanelを配置
  - activeTab === 'mcp'の時のみ表示
  - _Requirements: 3.1, 3.2_

- [x] 4. キーボードナビゲーションの実装
- [x] 4.1 キーボードハンドラの実装
  - onKeyDownハンドラをタブリストに追加
  - ArrowLeft/ArrowRightでタブ間を移動
  - Enter/Spaceでタブ選択（button要素のデフォルト動作）
  - _Requirements: 5.2, 5.3_

- [x] 5. テストの実装
- [x] 5.1 タブ表示のユニットテスト
  - 2つのタブ（Webサーバー、MCP）が表示されることを確認
  - デフォルトでWebサーバータブが選択されていることを確認
  - _Requirements: 1.1, 4.1_

- [x] 5.2 タブ切り替えのユニットテスト
  - タブクリックでコンテンツが切り替わることを確認
  - Webサーバータブ選択時にRemoteAccessPanelとCloudflareSettingsPanelが表示されることを確認
  - MCPタブ選択時にMcpSettingsPanelが表示されることを確認
  - _Requirements: 1.4, 2.1, 2.2, 3.1_

- [x] 5.3 アクセシビリティのユニットテスト
  - ARIA属性（role、aria-selected、aria-controls）が正しく設定されていることを確認
  - キーボードナビゲーションで左右矢印キーでタブ移動できることを確認
  - _Requirements: 5.1, 5.2, 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 2つのタブを表示 | 1.1, 5.1 | Feature |
| 1.2 | タブはダイアログ上部に水平配置 | 2.1 | Feature |
| 1.3 | アクティブタブの視覚的区別 | 2.3 | Feature |
| 1.4 | タブクリックでコンテンツ切り替え | 2.2, 5.2 | Feature |
| 2.1 | WebサーバータブにRemoteAccessPanel含む | 3.1, 5.2 | Feature |
| 2.2 | WebサーバータブにCloudflareSettingsPanel含む | 3.1 | Feature |
| 2.3 | 各パネルの機能・外観維持 | 3.1 | Feature |
| 2.4 | パネル間のDivider表示 | 3.1 | Feature |
| 3.1 | MCPタブにMcpSettingsPanel含む | 3.2, 5.2 | Feature |
| 3.2 | McpSettingsPanelの機能・外観維持 | 3.2 | Feature |
| 4.1 | Webサーバータブがデフォルト選択 | 1.2, 5.1 | Feature |
| 4.2 | ダイアログ閉じるとタブ状態リセット | 1.2 | Feature |
| 5.1 | ARIA属性（tablist, tab, tabpanel） | 2.1, 2.2, 3.1, 3.2, 5.3 | Feature |
| 5.2 | キーボードナビゲーション（左右矢印） | 4.1, 5.3 | Feature |
| 5.3 | Enter/スペースでタブ選択 | 4.1, 5.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
