# Research & Design Decisions

## Summary
- **Feature**: `sidebar-refactor`
- **Discovery Scope**: Extension（既存Electron UIの拡張・リファクタリング）
- **Key Findings**:
  - 現在のサイドバーはProjectSelector、新規仕様ボタン、SpecListが直列に配置されており、AgentListPanelは右サイドバーに配置されている
  - プロジェクト選択機能はメニューバーへの移行が必要で、Electron Menu APIを使用する
  - グローバルAgent領域は既存のAgentStoreを活用し、specIdが空またはundefinedのエージェントをフィルタリングして表示可能

## Research Log

### 既存サイドバー構造の分析
- **Context**: サイドバーリファクタリングのために現在の構造を把握する必要がある
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/App.tsx`
  - `/electron-sdd-manager/src/renderer/components/ProjectSelector.tsx`
  - `/electron-sdd-manager/src/renderer/components/SpecList.tsx`
- **Findings**:
  - 左サイドバーは`ProjectSelector`、新規仕様ボタン、`SpecList`の3つで構成
  - `ProjectSelector`は約200行のコンポーネントで、プロジェクト選択、ディレクトリ検証、spec-managerファイルチェック/インストールを担当
  - `SpecList`は仕様一覧表示、ソート、フィルタリングを担当
  - ペイン幅は`leftPaneWidth`ステートで管理（初期値288px、200-500px）
- **Implications**:
  - ProjectSelectorの機能をメニューバーとエラーバナーに分割する必要がある
  - ディレクトリ検証エラー表示とspec-managerインストール機能は新しいErrorBannerコンポーネントに移行

### Electron Menu API調査
- **Context**: プロジェクト選択をメニューバーに移行するための実装方法
- **Sources Consulted**:
  - Electron公式ドキュメント - Menu, MenuItem, dialog
  - 既存コード `/electron-sdd-manager/src/main/`
- **Findings**:
  - Electronでは`Menu.buildFromTemplate()`でアプリケーションメニューを構築
  - `dialog.showOpenDialog()`は既に使用されており、プロジェクト選択に流用可能
  - 最近のプロジェクト一覧はメニューのサブメニューとして表示可能
  - メニュー項目の動的更新は`Menu.setApplicationMenu()`で実現
- **Implications**:
  - メインプロセスでメニュー構築ロジックを実装
  - レンダラープロセスとの連携はIPC経由で行う
  - ウィンドウタイトルはBrowserWindowのsetTitle APIで更新

### AgentStore構造分析
- **Context**: グローバルAgent領域の実装のためにAgentStoreの構造を確認
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/stores/agentStore.ts`
  - `/electron-sdd-manager/src/renderer/components/AgentListPanel.tsx`
- **Findings**:
  - AgentStoreは`Map<string, AgentInfo[]>`でspecId別にエージェントを管理
  - `getAgentsForSpec(specId: string)`メソッドで特定spec のエージェントを取得可能
  - AgentInfoにはagentId, specId, phase, status等の情報が含まれる
  - specIdが空文字列のエージェントはグローバルエージェントとして扱える
- **Implications**:
  - 新しいヘルパーメソッド`getGlobalAgents()`を追加してグローバルエージェントを取得
  - 既存のAgentListPanelを参考にGlobalAgentPanelを実装

### CreateSpecDialog分析
- **Context**: spec-manager:init連携のための既存ダイアログ構造確認
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx`
  - `/electron-sdd-manager/src/main/services/specManagerService.ts`
- **Findings**:
  - 現在は名前と説明の両方を入力、バリデーションはZodスキーマで実装
  - 既存の`createSpec` IPC APIは名前と説明を受け取る
  - spec-managerには`/spec-manager:init`コマンドがあり、説明から名前を自動生成可能
  - SpecManagerServiceに既存のフェーズ実行メソッドあり
- **Implications**:
  - CreateSpecDialogから名前フィールドを削除し、説明のみに簡略化
  - 新しいIPC API `executeSpecInit(description)`を追加
  - ローディング状態とエラー表示を改善

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン踏襲 | Zustand + React + Electron IPC | 既存コードとの一貫性、学習コスト低 | - | 採用 |
| コンポーネント分割 | 大きなコンポーネントを小さく分割 | 責任の明確化、テスト容易性 | 過度な分割は複雑化を招く | 必要最小限の分割 |

## Design Decisions

### Decision: プロジェクト選択のメニューバー移行

- **Context**: サイドバーのスペースを有効活用するため、プロジェクト選択をメニューバーに移行する
- **Alternatives Considered**:
  1. 現状維持（サイドバーにProjectSelector配置） - スペース効率が悪い
  2. メニューバー移行 - スペース効率向上、OSネイティブUI活用
  3. ツールバー追加 - 実装コスト高
- **Selected Approach**: メニューバー移行（Option 2）
- **Rationale**: Electronアプリとしてネイティブなメニューバーを活用することで、UIの一貫性とスペース効率を両立
- **Trade-offs**: メニュー操作が必要になり、ワンクリック選択ができなくなる。ただし最近のプロジェクトはサブメニューで素早くアクセス可能
- **Follow-up**: メニュー項目の国際化対応を確認

### Decision: エラーバナーの実装方式

- **Context**: ディレクトリチェックエラーを正常時は非表示、エラー時のみ表示
- **Alternatives Considered**:
  1. 常時表示（縮小表示） - 情報過多
  2. 条件付き表示（エラー時のみ） - クリーンなUI
  3. モーダルダイアログ - ユーザー操作のブロック
- **Selected Approach**: 条件付きバナー表示（Option 2）
- **Rationale**: 通常操作時のUIがクリーンになり、問題発生時のみ注意を引く
- **Trade-offs**: エラーに気づきにくくなる可能性。ただしバナーは目立つスタイルで表示
- **Follow-up**: アクセシビリティ（エラー通知のaria属性）を確認

### Decision: グローバルAgent領域の配置

- **Context**: specに紐づかないエージェントを一覧表示する場所の決定
- **Alternatives Considered**:
  1. 右サイドバーに配置 - 既存AgentListPanelとの類似性
  2. 左サイドバー下部に配置 - spec一覧との関連性
  3. 別ウィンドウ/パネル - 実装コスト高
- **Selected Approach**: 左サイドバー下部に固定配置（Option 2）
- **Rationale**: 仕様一覧との位置関係が明確で、グローバルな操作として認識しやすい
- **Trade-offs**: サイドバーの縦方向スペースを消費。折りたたみ機能で軽減
- **Follow-up**: 折りたたみ状態の永続化を検討

### Decision: CreateSpecDialogのspec-manager連携

- **Context**: 仕様作成時の入力簡略化とspec-manager機能の活用
- **Alternatives Considered**:
  1. 現状維持（名前+説明入力） - ユーザー負担
  2. 説明のみ入力でspec-manager:init呼び出し - 自動命名
  3. ウィザード形式 - 過度に複雑
- **Selected Approach**: 説明のみ入力でspec-manager:init連携（Option 2）
- **Rationale**: 名前の自動生成により一貫性のある命名が可能、ユーザー入力の簡略化
- **Trade-offs**: 名前の手動指定ができなくなる。ただし後から変更は可能
- **Follow-up**: spec-manager:initのエラーハンドリングを確認

## Risks & Mitigations

- **リスク1**: メニューバー操作への慣れ - ツールチップと初回ガイダンスで軽減
- **リスク2**: グローバルAgent領域が混雑 - 折りたたみ機能と件数表示で対応
- **リスク3**: spec-manager:init失敗時の回復 - エラーメッセージとリトライ機能

## References

- [Electron Menu API](https://www.electronjs.org/docs/latest/api/menu) - メニュー構築
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog) - ダイアログ表示
- [Zustand](https://github.com/pmndrs/zustand) - 状態管理
- [Lucide React](https://lucide.dev/) - アイコンライブラリ
