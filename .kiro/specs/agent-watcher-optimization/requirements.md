# Requirements: Agent Watcher Optimization

## Decision Log

### 監視スコープの変更
- **Discussion**: プロジェクト全体の`.kiro/runtime/agents/**/*.json`を監視すると、起動時に大量のファイルスキャンとイベント発火が発生し、mainプロセスがブロックされてIPC応答が遅延する問題が発生していた
- **Conclusion**: 選択中のSpec + ProjectAgentのみを監視する
- **Rationale**: ユーザーが操作しているSpecのAgentだけリアルタイム更新が必要。他のSpecのAgent変更はUI上見えないため監視不要

### ProjectAgentの扱い
- **Discussion**: ProjectAgent（specIdが空のAgent）の監視をどうするか
- **Conclusion**: 常時監視する
- **Rationale**: ProjectAgentは数が少なく、どのSpec選択状態でも表示される可能性があるため

### Agent一覧の初期ロード
- **Discussion**: 起動時に全Specの全Agentを読む必要があるか
- **Conclusion**: 起動時は各Specの実行中Agent数のみ取得（軽量版）、Spec選択時にそのSpecのAgent詳細をロード
- **Rationale**: SpecListItemのバッジ表示に必要なのは実行中Agent数のみ。全Agentの詳細は不要

### Agent自動選択ロジック
- **Discussion**: Spec選択時のAgent自動選択の挙動
- **Conclusion**:
  1. 実行中Agentがない場合は何もしない
  2. 実行中Agentがある場合は最新のAgentを選択
  3. 選択状態はオンメモリでSpec単位に管理（永続化不要）
- **Rationale**: 実行中でないAgentのログを自動表示する意味がない。選択状態のSpec単位管理により、Spec切り替え時に以前の選択を復元できる

## Introduction

AgentRecordWatcherの監視スコープをプロジェクト全体から選択中Spec単位に変更し、Spec選択時のローディング遅延を解消する。併せてAgent自動選択ロジックを改善し、実行中Agentがある場合のみ自動選択を行う。

## Requirements

### Requirement 1: Spec単位のAgent監視

**Objective:** システム管理者として、Spec選択時のローディング遅延を解消したい。そのために、AgentRecordWatcherの監視スコープを選択中Specに限定する。

#### Acceptance Criteria
1.1. Spec選択時、システムは`.kiro/runtime/agents/{specId}/`ディレクトリのみを監視対象とすること
1.2. Spec切り替え時、システムは前のSpecの監視を停止し、新しいSpecの監視を開始すること
1.3. ProjectAgent（`.kiro/runtime/agents/`直下のファイル）は常時監視対象とすること
1.4. 監視開始時、`ignoreInitial: true`を設定し、既存ファイルに対するイベント発火を抑制すること

### Requirement 2: 軽量なAgent一覧初期ロード

**Objective:** ユーザーとして、プロジェクト選択時に素早くSpec一覧を表示したい。そのために、起動時のAgentデータ取得を軽量化する。

#### Acceptance Criteria
2.1. プロジェクト選択時、システムは各Specの実行中Agent数のみを取得すること
2.2. SpecListItemは実行中Agent数をバッジとして表示すること（既存動作維持）
2.3. Spec選択時、システムはそのSpecのAgent詳細（全フィールド）をロードすること

### Requirement 3: Agent自動選択ロジックの改善

**Objective:** ユーザーとして、Spec選択時に関連するAgentログを適切に表示したい。そのために、Agent自動選択ロジックを改善する。

#### Acceptance Criteria
3.1. 選択されたSpecに実行中のAgentがない場合、システムはAgentを自動選択しないこと
3.2. 選択されたSpecに実行中のAgentがある場合、システムは最新の（一覧の一番上の）Agentを選択状態とすること
3.3. システムはSpec単位でAgent選択状態をオンメモリで管理すること
3.4. Spec切り替え時、そのSpecの保存された選択状態があれば、システムはその選択状態を復元すること
3.5. Agent選択状態の永続化は行わないこと（アプリ再起動でリセット）

### Requirement 4: パフォーマンス要件

**Objective:** ユーザーとして、Spec選択時に遅延なくコンテンツを表示したい。

#### Acceptance Criteria
4.1. Spec選択からコンテンツ表示までの時間は500ms以内であること
4.2. AgentRecordWatcherの監視切り替えはSpec選択操作をブロックしないこと（非同期処理）

## Out of Scope

- Agentログの内容のキャッシュ最適化
- Agent一覧のページネーション
- Agentファイルの削除・クリーンアップ機能
- Remote UIへの影響（Electron UIのみ対象）

## Open Questions

- なし（設計フェーズで詳細を決定）
