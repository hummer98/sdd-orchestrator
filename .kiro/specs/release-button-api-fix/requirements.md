# Requirements: Release Button API Fix

## Decision Log

### API設計方針
- **Discussion**: 専用API (`executeRelease`) vs 汎用API (`executeProjectCommand`) のどちらを採用するか
- **Conclusion**: 汎用API `executeProjectCommand` を採用し、`executeAskProject` を廃止して統合
- **Rationale**: 今後プロジェクトレベルのコマンドが増える見込みがあるため、汎用的なAPIで対応

### インターフェース設計
- **Discussion**: phaseパラメータの必要性と命名
- **Conclusion**: `phase`ではなく`title`パラメータとして、UI表示用タイトルを引数で受け取る
- **Rationale**: SDDのphase（requirements, design等）とは概念が異なり、単なる表示タイトルであるため

### コマンド形式
- **Discussion**: `/release` vs `/kiro:generate-release` のどちらを使用するか
- **Conclusion**: `/release` を使用
- **Rationale**: 短縮形で十分であり、ユーザーにとっても分かりやすい

### 移行戦略
- **Discussion**: `executeAskProject`の既存呼び出し箇所の移行タイミング
- **Conclusion**: すべて同時に移行
- **Rationale**: 中途半端な状態を避け、一貫性を保つ

## Introduction

ProjectAgentPanelのreleaseボタンが`executeAskProject`を流用しているため、`/release`コマンドが正しく実行されず、タイトルも「ask」と表示される問題を修正する。汎用的な`executeProjectCommand` APIを新設し、`executeAskProject`を廃止して統合する。

## Requirements

### Requirement 1: executeProjectCommand API

**Objective:** 開発者として、プロジェクトレベルの任意のコマンドを実行できるAPIが欲しい。これにより、releaseやask等のコマンドを統一的に扱える。

#### Acceptance Criteria

1. `executeProjectCommand(projectPath: string, command: string, title: string)` シグネチャでIPC APIを提供すること
2. `command`パラメータで指定されたコマンドをそのまま実行すること（ラップしない）
3. `title`パラメータがAgent情報の表示名として使用されること
4. 実行結果として`AgentInfo`を返却すること
5. エラー発生時は適切なエラーメッセージを返却すること

### Requirement 2: Releaseボタンの修正

**Objective:** ユーザーとして、releaseボタンを押したときに`/release`コマンドが直接実行され、リストに「release」と表示されてほしい。

#### Acceptance Criteria

1. releaseボタンクリック時、`executeProjectCommand(path, '/release', 'release')`が呼び出されること
2. Agent一覧にタイトル「release」で表示されること
3. release実行中の重複起動防止ロジックが正しく動作すること

### Requirement 3: Askボタンの移行

**Objective:** 開発者として、既存のAskボタンも新しいAPIに移行し、`executeAskProject`を廃止したい。

#### Acceptance Criteria

1. Project Askボタンクリック時、`executeProjectCommand(path, '/kiro:project-ask "${prompt}"', 'ask')`が呼び出されること
2. 既存のAsk機能と同等の動作が維持されること
3. Agent一覧にタイトル「ask」で表示されること

### Requirement 4: executeAskProject廃止

**Objective:** 開発者として、旧APIを廃止してコードベースを整理したい。

#### Acceptance Criteria

1. `IPC_CHANNELS.EXECUTE_ASK_PROJECT`を削除すること
2. `electronAPI.executeAskProject`の型定義を削除すること
3. preloadスクリプトから`executeAskProject`を削除すること
4. 関連するハンドラ実装を削除すること

### Requirement 5: isReleaseRunning判定の更新

**Objective:** ユーザーとして、release実行中はreleaseボタンが無効化されてほしい。

#### Acceptance Criteria

1. `title === 'release'`かつ`status === 'running'`のAgentが存在する場合、`isReleaseRunning`がtrueとなること
2. 既存の`args?.includes('/release')`判定から移行すること

## Out of Scope

- Spec Ask (`executeAskSpec`) の移行（別のスコープ）
- 他のプロジェクトコマンドの追加（将来の拡張）
- Remote UI側の対応（WebSocket API経由で同様の対応が必要だが別タスク）

## Open Questions

- WebSocket API (`executeAskProject`) の移行タイミングは？（Remote UI用）
