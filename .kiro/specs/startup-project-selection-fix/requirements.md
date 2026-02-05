# Requirements: 起動時プロジェクト選択シーケンス修正

## Decision Log

### Main Process vs Renderer Processの責務
- **Discussion**: 起動時に環境変数`SDD_PROJECT_PATH`でプロジェクトが指定された場合、Main processが`selectProject`を呼ぶが、その結果がRendererのZustandストアに反映されない。Rendererが再度`selectProject`を呼ぶとロック競合が発生する。
- **Conclusion**: Main processが`selectProject`を完了し、その結果をRendererに**ブロードキャスト**する
- **Rationale**: Steeringの原則「セッション状態はMain processが保持」「Main → Rendererへのブロードキャストで同期」に準拠

### ストア更新処理の統一
- **Discussion**: 起動時ブロードキャストとUIからの選択で、別々のストア更新処理を持つべきか
- **Conclusion**: 同じストア更新処理を使用する
- **Rationale**: コードの重複排除、動作の一貫性保証

### 現行コードとの関係
- **Discussion**: `unified-project-selection` specで統一IPCハンドラーは実装済み。今回の問題は起動時のMain→Rendererブロードキャストが欠如していること
- **Conclusion**: 既存の`selectProject`ロジックは変更せず、起動時のブロードキャスト機構を追加
- **Rationale**: 影響範囲を最小化、既存テストへの影響を抑制

## Introduction

SDD OrchestratorのElectronアプリにおいて、環境変数（`SDD_PROJECT_PATH`）やCLI引数でプロジェクトパスが指定された場合の起動シーケンスに問題がある。Main processが`selectProject`を完了しても、その結果がRendererのZustandストアに反映されず、「プロジェクトを開く」画面が表示されてしまう。本修正では、Main processからRendererへのブロードキャスト機構を追加し、起動時のプロジェクト選択を正しく動作させる。

## Requirements

### Requirement 1: 起動時のMain→Rendererブロードキャスト

**Objective:** As a ユーザー, I want 環境変数やCLI引数でプロジェクトを指定して起動した場合に、そのプロジェクトが自動的に選択された状態でUIが表示されることを期待する, so that 手動でプロジェクトを再選択する必要がない

#### Acceptance Criteria
1. When 環境変数`SDD_PROJECT_PATH`でプロジェクトパスが指定された時, Main processは`selectProject`を実行し、結果をキャッシュする
2. When Main processがウィンドウを作成した後, Main processはキャッシュされた`selectProject`結果をRendererにブロードキャストする
3. When Rendererがブロードキャストを受信した時, Rendererは受信した結果でZustandストアを更新する
4. When ストア更新が完了した時, UIは選択されたプロジェクトの情報（Spec一覧、Bug一覧等）を表示する

### Requirement 2: ストア更新処理の統一

**Objective:** As a 開発者, I want 起動時ブロードキャストとUIからの選択で同じストア更新処理を使用したい, so that コードの重複を排除し動作の一貫性を保証できる

#### Acceptance Criteria
1. The SDD Manager shall `SelectProjectResult`を受け取ってストアを更新する単一の処理を持つ
2. When 起動時ブロードキャストを受信した時, Rendererはこの統一処理でストアを更新する
3. When UIからプロジェクトを選択した時, Rendererは同じ統一処理でストアを更新する
4. The 統一処理 shall specs/bugsストアの更新、ファイルウォッチャー登録、各種設定ロードを行う

### Requirement 3: E2Eテスト互換性の維持

**Objective:** As a テスト担当者, I want 既存のE2Eテストが引き続き動作することを期待する, so that テストの再作成が不要

#### Acceptance Criteria
1. When E2Eテストが`SDD_PROJECT_PATH`環境変数を設定して起動した時, プロジェクトが正しく選択される
2. When E2Eテストが`selectProjectViaStore`ヘルパーを使用した時, プロジェクトが正しく選択される
3. The SDD Manager shall 起動時ブロードキャストとUIからの選択の両方で、同じ最終状態を保証する

### Requirement 4: Remote UI対応

**Objective:** As a Remote UIユーザー, I want 本修正がRemote UIに影響しないことを期待する, so that Remote UIが引き続き正常に動作する

#### Acceptance Criteria
1. The 起動時ブロードキャスト shall Electron Renderer processのみを対象とする
2. Remote UI shall 従来通りWebSocket経由でプロジェクト情報を取得する
3. The SDD Manager shall 起動時ブロードキャストとRemote UI向けWebSocket通信を独立して処理する

## Out of Scope

- `selectProject`のMain process側ロジックの変更
- UIからのプロジェクト選択フローの変更（IPCの要求/応答パターンは維持）
- Remote UIの起動時プロジェクト同期（Remote UIは接続時にプロジェクト情報を取得する既存フロー）

## Open Questions

- なし（設計フェーズで詳細化）
