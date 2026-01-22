# Requirements: Agent Log UI Improvement

## Decision Log

### 共通コンポーネント化
- **Discussion**: AgentLogPanel（renderer）とAgentView（remote-ui）で同じログ表示機能が必要。現状は別々の実装で、remote-uiは生ログ表示のみ。
- **Conclusion**: `src/shared/components/agent/` に共通コンポーネントを作成し、両方から使用する
- **Rationale**: 既存の共通コンポーネントパターン（AgentListItem等）に従い、コードの重複を排除

### RAW表示モード
- **Discussion**: 現在の「整形表示/RAW表示」切り替え機能を維持するか
- **Conclusion**: 削除する
- **Rationale**: デバッグ用途は開発者ツールで対応可能。UIをシンプルに保つ

### 折りたたみ戦略
- **Discussion**: ツール使用、ツール結果、テキストそれぞれの表示方法
- **Conclusion**: ツール使用・ツール結果は折りたたみ（デフォルト閉じ）、テキストは10行以上で折りたたみ
- **Rationale**: 情報の階層化により視認性向上。Claudix（VSCode Claude Code拡張の参考実装）のパターンを採用

### truncate廃止
- **Discussion**: 現在の固定長truncate（40-100文字）で情報が失われる問題
- **Conclusion**: truncateを廃止し、折りたたみUIで全文表示可能にする
- **Rationale**: 必要な情報にアクセスできることを優先。折りたたみで視覚的ノイズは抑制

### アイコン
- **Discussion**: 現在は絵文字（📖, 💻, 🔍等）を使用
- **Conclusion**: Lucide Reactアイコンに統一
- **Rationale**: 他のUIコンポーネントとの一貫性、ダーク/ライトテーマでの表示品質

### テーマ対応
- **Discussion**: 現在はダークテーマ固定（bg-gray-900）
- **Conclusion**: ライト/ダーク両対応
- **Rationale**: Remote UIやユーザー設定に応じた表示を可能にする

### ファイルパスクリック
- **Discussion**: ファイルパスをクリックしてエディタで開く機能
- **Conclusion**: 今回のスコープ外（将来の拡張として検討）
- **Rationale**: 優先度を絞り、コア機能の品質を確保

## Introduction

Claude Codeの`--output-format stream-json`出力を表示するAgentログエリアのUI改善。現在の固定長truncateによる情報欠落を解消し、VSCode Claude Code拡張に準拠したReactコンポーネントベースの見やすい表示を実現する。renderer（AgentLogPanel）とremote-ui（AgentView）で共通コンポーネントを使用する。

## Requirements

### Requirement 1: 共通ログ表示コンポーネント

**Objective:** 開発者として、renderer/remote-ui両方で一貫したログ表示を使用したい。コードの重複を排除し、保守性を向上させるため。

#### Acceptance Criteria
1. When ログ表示が必要な場合, the system shall `src/shared/components/agent/` 配下の共通コンポーネントを使用する
2. The system shall AgentLogPanel（renderer）とAgentView（remote-ui）で同一のログ表示コンポーネントを使用する
3. The system shall 既存のlogFormatter.tsのパース機能を維持しつつ、表示コンポーネントを分離する

### Requirement 2: ツール使用（tool_use）表示

**Objective:** ユーザーとして、ツール使用の情報を階層的に確認したい。必要な詳細を見たいときだけ展開できるように。

#### Acceptance Criteria
1. The system shall ツール使用ブロックをデフォルトで折りたたんだ状態で表示する
2. When ユーザーがツール使用ブロックをクリックした場合, the system shall 詳細（入力パラメータ等）を展開表示する
3. The system shall ツール名とサマリー情報（ファイルパス、コマンド説明等）を折りたたみ時でも表示する
4. The system shall ツール別に最適化された表示を提供する:
   - Read/Write/Edit: ファイルパスを表示
   - Bash: descriptionを優先表示、なければコマンドの要約
   - Grep/Glob: 検索パターンを表示
   - Task: subagent_typeとdescriptionを表示
5. The system shall Lucide Reactアイコンでツール種別を視覚的に区別する

### Requirement 3: ツール結果（tool_result）表示

**Objective:** ユーザーとして、ツール実行結果を必要に応じて確認したい。長い出力でもログが見づらくならないように。

#### Acceptance Criteria
1. The system shall ツール結果ブロックをデフォルトで折りたたんだ状態で表示する
2. When ユーザーがツール結果ブロックをクリックした場合, the system shall 全内容を展開表示する
3. If ツール結果がエラーの場合, then the system shall エラー状態を視覚的に強調表示する（赤色等）
4. The system shall 折りたたみ時に結果の有無とエラー状態を示すインジケーターを表示する

### Requirement 4: テキスト（assistant text）表示

**Objective:** ユーザーとして、Claudeの応答テキストを読みやすく表示したい。長文でも適切に折りたたまれるように。

#### Acceptance Criteria
1. If テキストが10行未満の場合, then the system shall 全文を展開状態で表示する
2. If テキストが10行以上の場合, then the system shall デフォルトで折りたたみ、クリックで展開可能にする
3. The system shall テキスト内容をそのまま表示する（truncateしない）
4. The system shall 改行とホワイトスペースを保持して表示する

### Requirement 5: セッション情報表示

**Objective:** ユーザーとして、セッション開始時の情報（作業ディレクトリ、モデル等）を確認したい。

#### Acceptance Criteria
1. When system/initイベントを受信した場合, the system shall 作業ディレクトリ、モデル名、Claude Codeバージョンを表示する
2. The system shall セッション情報を他のログエントリと視覚的に区別する

### Requirement 6: 完了・エラー表示

**Objective:** ユーザーとして、タスクの完了状態と統計情報を確認したい。

#### Acceptance Criteria
1. When resultイベントを受信した場合, the system shall 成功/エラー状態を明確に表示する
2. The system shall 統計情報（所要時間、トークン使用量、コスト）を表示する
3. If エラーの場合, then the system shall エラーメッセージを強調表示する

### Requirement 7: ライト/ダークテーマ対応

**Objective:** ユーザーとして、システム設定やアプリ設定に応じたテーマでログを表示したい。

#### Acceptance Criteria
1. The system shall ダークテーマとライトテーマの両方に対応した配色を使用する
2. The system shall Tailwind CSSのdark:クラスを使用してテーマ切り替えに対応する
3. The system shall 各要素（背景、テキスト、ボーダー、アイコン）がテーマに応じて適切なコントラストを持つ

### Requirement 8: RAW表示モード削除

**Objective:** 開発者として、UIをシンプルに保ち保守性を向上させたい。

#### Acceptance Criteria
1. The system shall AgentLogPanelから「整形表示/RAW表示」切り替え機能を削除する
2. The system shall 常に整形表示のみを提供する

### Requirement 9: 既存機能の維持

**Objective:** ユーザーとして、既存の便利な機能を引き続き使用したい。

#### Acceptance Criteria
1. The system shall 新しいログ到着時に自動スクロールする機能を維持する
2. The system shall ログのコピー機能を維持する
3. The system shall ログのクリア機能を維持する
4. The system shall トークン使用量の集計表示を維持する
5. The system shall Agent実行中のローディングインジケーターを維持する

## Out of Scope

- ファイルパスクリックでエディタを開く機能
- Markdown描画（コードブロックのシンタックスハイライト等）
- ログの永続化・エクスポート機能
- ログのフィルタリング・検索機能

## Open Questions

- 折りたたみ状態の永続化（セッション中のみか、永続化するか）は設計フェーズで検討
- system-reminderタグの除去処理を行うかどうか（claude-cleanでは非verbose時に除去している）
