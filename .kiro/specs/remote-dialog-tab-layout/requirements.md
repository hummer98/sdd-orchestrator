# Requirements: Remote Dialog Tab Layout

## Decision Log

### タブ構成

- **Discussion**: 現在のRemoteAccessDialogは3つのパネル（RemoteAccessPanel、CloudflareSettingsPanel、McpSettingsPanel）が縦に並んでおり、ダイアログが長くなっている。WebサーバーとMCPは異なる機能のため分離が妥当。2タブか3タブかを検討。
- **Conclusion**: 「Webサーバー」「MCP」の2タブ構成
- **Rationale**: CloudflareはWebサーバー公開の手段であり、RemoteAccessPanelと密接に関連するため同一タブに配置

### タブ命名

- **Discussion**: 各タブの名称を検討
- **Conclusion**: タブ1「Webサーバー」、タブ2「MCP」
- **Rationale**: 機能を端的に表す名称

### デフォルトタブ

- **Discussion**: ダイアログを開いた時にどちらのタブを表示するか
- **Conclusion**: Webサーバータブをデフォルト表示
- **Rationale**: 既存のRemote Access機能の動作を維持し、ユーザーの期待に沿う

### スコープ

- **Discussion**: 変更範囲の確認
- **Conclusion**: RemoteAccessDialogのUI構造のみを変更。IPCハンドラ、バックエンドロジック、他のダイアログは変更しない
- **Rationale**: 最小限の変更でUIの使いやすさを改善

## Introduction

RemoteAccessDialogが複数のパネル（Webサーバー制御、Cloudflare設定、MCP設定）を含むことでダイアログが縦長になり、使いにくくなっている。本機能では、ダイアログをタブ構成にリファクタリングし、関連する機能をグループ化することでUIの整理と操作性向上を図る。

## Requirements

### Requirement 1: タブコンポーネント

**Objective:** ユーザーとして、Remote設定ダイアログでタブを使って設定カテゴリを切り替えたい。これにより、関連する設定がグループ化され、ダイアログが整理される。

#### Acceptance Criteria

1. RemoteAccessDialogは「Webサーバー」と「MCP」の2つのタブを表示する
2. タブはダイアログ上部に水平に配置される
3. アクティブなタブは視覚的に区別される（背景色、下線など）
4. タブをクリックすると、対応するコンテンツに切り替わる

### Requirement 2: Webサーバータブ

**Objective:** ユーザーとして、Webサーバーに関連する設定を一箇所で管理したい。

#### Acceptance Criteria

1. 「Webサーバー」タブには以下のパネルが含まれる:
   - RemoteAccessPanel（サーバー制御、QRコード表示）
   - CloudflareSettingsPanel（Tunnel Token設定）
2. 各パネルは現在と同じ機能・外観を維持する
3. パネル間には視覚的な区切り（Divider）が表示される

### Requirement 3: MCPタブ

**Objective:** ユーザーとして、MCP Server設定を独立したタブで管理したい。

#### Acceptance Criteria

1. 「MCP」タブにはMcpSettingsPanelが含まれる
2. McpSettingsPanelは現在と同じ機能・外観を維持する

### Requirement 4: デフォルト表示

**Objective:** ユーザーとして、ダイアログを開いた時にWebサーバー設定が表示されることを期待する。

#### Acceptance Criteria

1. ダイアログを開いた時、「Webサーバー」タブがデフォルトで選択される
2. タブの選択状態はダイアログを閉じるとリセットされる（永続化しない）

### Requirement 5: アクセシビリティ

**Objective:** すべてのユーザーがタブUIを問題なく操作できるようにする。

#### Acceptance Criteria

1. タブは適切なARIA属性（role="tablist", role="tab", role="tabpanel"）を持つ
2. キーボードナビゲーション（左右矢印キー）でタブ間を移動できる
3. Enterキーまたはスペースキーでタブを選択できる

## Out of Scope

- IPCハンドラやバックエンドロジックの変更
- タブ選択状態の永続化（LocalStorageやストアへの保存）
- 他のダイアログやパネルへの変更
- 新しいタブや機能の追加
- Remote UI対応: 不要（Electron UIダイアログ内部の変更のみ）

## Open Questions

- なし（すべての設計判断が対話で確定済み）
