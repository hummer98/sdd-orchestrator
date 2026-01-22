# Implementation Plan

## Task Format

- `(P)` マーカー: 並列実行可能なタスク
- `_Requirements: X.X_`: 要件へのトレーサビリティ
- `_Method:_`: design.mdで指定された実装方法
- `_Verify:_`: Inspectionで確認するパターン

---

## Tasks

- [x] 1. logFormatterの共有配置移動とtruncate廃止

- [x] 1.1 logFormatterをsrc/shared/utils/へ移動
  - renderer/utils/logFormatter.tsをsrc/shared/utils/logFormatter.tsへ移動
  - ParsedLogEntry型を拡張し、session/tool/toolResult/text/result構造に対応
  - 後方互換のためrenderer/utils/からre-exportを設定
  - _Requirements: 1.3_
  - _Method: parseLogData, getColorClass_
  - _Verify: Grep "from.*shared/utils/logFormatter" in AgentLogPanel, AgentView_

- [x] 1.2 truncate処理を廃止し全文保持
  - truncate関数呼び出しを削除
  - 全テキスト内容をそのまま保持する形式に変更
  - _Requirements: 4.3_

- [x] 2. 共通ログ表示コンポーネントの作成

- [x] 2.1 (P) LogEntryBlockコンポーネントを作成
  - src/shared/components/agent/LogEntryBlock.tsxを新規作成
  - ParsedLogEntryのtype判定による子コンポーネントへのルーティング
  - 共通スタイル（余白、境界線）の適用
  - 不明なtypeは'text'として表示
  - _Requirements: 1.1, 1.2_
  - _Method: LogEntryBlock, LogEntryBlockProps_

- [x] 2.2 (P) ToolUseBlockコンポーネントを作成
  - src/shared/components/agent/ToolUseBlock.tsxを新規作成
  - デフォルト折りたたみ状態（useState(false)）
  - クリックで詳細展開
  - ツール名とサマリーの常時表示
  - ツール別最適化表示（Read/Write/Edit: ファイルパス、Bash: description、Grep/Glob: パターン、Task: subagent_type+description）
  - Lucide Reactアイコンでツール種別を視覚的に区別
  - ダーク/ライトテーマ両対応（dark:クラス使用）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3_
  - _Method: ToolUseBlock, ToolUseBlockProps, TOOL_ICONS_
  - _Verify: Grep "FileText|Pencil|Terminal|Search" in ToolUseBlock_

- [x] 2.3 (P) ToolResultBlockコンポーネントを作成
  - src/shared/components/agent/ToolResultBlock.tsxを新規作成
  - デフォルト折りたたみ状態
  - クリックで全内容展開
  - エラー状態の視覚的強調（赤色背景/枠線）
  - 結果有無とエラー状態のインジケーター表示
  - ダーク/ライトテーマ両対応
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3_
  - _Method: ToolResultBlock, ToolResultBlockProps_
  - _Verify: Grep "bg-red|border-red" in ToolResultBlock_

- [x] 2.4 (P) TextBlockコンポーネントを作成
  - src/shared/components/agent/TextBlock.tsxを新規作成
  - 10行未満は全文展開、10行以上はデフォルト折りたたみ
  - 改行・ホワイトスペースの保持（whitespace-pre-wrap）
  - ダーク/ライトテーマ両対応
  - _Requirements: 4.1, 4.2, 4.4, 7.1, 7.2, 7.3_
  - _Method: TextBlock, TextBlockProps, foldThreshold_
  - _Verify: Grep "whitespace-pre-wrap" in TextBlock_

- [x] 2.5 (P) SessionInfoBlockコンポーネントを作成
  - src/shared/components/agent/SessionInfoBlock.tsxを新規作成
  - cwd, model, versionの構造化表示
  - 他のログエントリとの視覚的区別（専用背景色）
  - ダーク/ライトテーマ両対応
  - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.3_
  - _Method: SessionInfoBlock, SessionInfoBlockProps_
  - _Verify: Grep "bg-cyan|bg-blue" in SessionInfoBlock_

- [x] 2.6 (P) ResultBlockコンポーネントを作成
  - src/shared/components/agent/ResultBlock.tsxを新規作成
  - 成功/エラー状態の明確な表示（CheckCircle/XCircle）
  - 統計情報（所要時間、コスト、トークン使用量）の表示
  - エラーメッセージの強調表示
  - ダーク/ライトテーマ両対応
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_
  - _Method: ResultBlock, ResultBlockProps_
  - _Verify: Grep "CheckCircle|XCircle|durationMs|costUsd" in ResultBlock_

- [x] 2.7 shared/components/agent/index.tsを更新
  - 新規作成した全コンポーネントをexport
  - 依存タスク: 2.1-2.6完了後
  - _Requirements: 1.1_

- [x] 3. AgentLogPanelの修正

- [x] 3.1 RAW表示モードを削除
  - isFormatted stateの削除
  - RAW表示分岐の削除
  - 常に整形表示のみ提供
  - _Requirements: 8.1, 8.2_

- [x] 3.2 共通コンポーネントを使用した表示に変更
  - FormattedLogLineDisplayをLogEntryBlockに置換
  - shared/components/agent/からLogEntryBlockをimport
  - parseLogDataで取得したエントリをLogEntryBlockで表示
  - 依存タスク: 1.1, 2.7完了後
  - _Requirements: 1.2_
  - _Method: LogEntryBlock_
  - _Verify: Grep "LogEntryBlock" in AgentLogPanel_

- [x] 3.3 既存機能の維持を確認
  - 自動スクロール機能の動作確認
  - ログコピー機能の動作確認
  - ログクリア機能の動作確認
  - トークン集計表示の動作確認
  - ローディングインジケーターの動作確認
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. AgentViewの修正

- [x] 4.1 共通コンポーネントを使用した表示に変更
  - 現在の生ログ表示をLogEntryBlock使用に変更
  - shared/utils/logFormatterからparseLogDataをimport
  - shared/components/agent/からLogEntryBlockをimport
  - 依存タスク: 1.1, 2.7完了後
  - _Requirements: 1.2, 7.1, 7.2, 7.3_
  - _Method: LogEntryBlock, parseLogData_
  - _Verify: Grep "LogEntryBlock" in AgentView_

- [x] 4.2 自動スクロール機能の維持を確認
  - 新しいログ到着時の自動スクロール動作確認
  - _Requirements: 9.1_

- [x] 5. テスト実装

- [x] 5.1 (P) logFormatter.test.tsを作成
  - parseLogData関数の各イベントタイプパーステスト
  - system/init、tool_use、tool_result、text、resultの各パース
  - エラーケース（不正JSON、空データ）のハンドリング
  - _Requirements: 1.3_

- [x] 5.2 (P) ToolUseBlock.test.tsxを作成
  - 折りたたみ状態切り替えテスト
  - ツール別表示（Read, Bash, Grep等）テスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.3 (P) ToolResultBlock.test.tsxを作成
  - エラー状態表示テスト
  - 折りたたみ動作テスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5.4 (P) TextBlock.test.tsxを作成
  - 行数判定テスト（10行未満/以上）
  - 折りたたみ閾値テスト
  - _Requirements: 4.1, 4.2_

- [x] 5.5 (P) LogEntryBlock.test.tsxを作成
  - タイプ別ルーティングテスト
  - 各子コンポーネントへの正しいprops渡しテスト
  - _Requirements: 1.1_

- [x] 5.6 (P) SessionInfoBlock.test.tsxを作成
  - cwd, model, version表示テスト
  - 全フィールドundefined時の非表示テスト
  - 視覚的区別（背景色）テスト
  - _Requirements: 5.1, 5.2_

- [x] 5.7 (P) ResultBlock.test.tsxを作成
  - 成功/エラー状態表示テスト
  - 統計情報（duration, cost, tokens）表示テスト
  - エラーメッセージ強調表示テスト
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. 統合テストと検証

- [x] 6.1 AgentLogPanelの統合テスト
  - 共通コンポーネント統合の動作確認
  - RAW表示削除後の正常動作確認
  - 依存タスク: 3.1, 3.2, 3.3完了後
  - _Requirements: 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6.2 AgentViewの統合テスト
  - Remote UIでの共通コンポーネント使用確認
  - 依存タスク: 4.1, 4.2完了後
  - _Requirements: 1.2, 7.1, 7.2, 7.3_

- [x] 6.3 ビルド・型チェック検証
  - `npm run build` の成功確認
  - `npm run typecheck` の成功確認
  - 全テスト実行と成功確認

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 共通コンポーネント配置 | 2.1, 2.7 | Infrastructure |
| 1.2 | 両環境で同一コンポーネント使用 | 3.2, 4.1 | Feature |
| 1.3 | logFormatterパース機能維持 | 1.1, 5.1 | Infrastructure |
| 2.1 | ツール使用デフォルト折りたたみ | 2.2, 5.2 | Feature |
| 2.2 | クリックで詳細展開 | 2.2, 5.2 | Feature |
| 2.3 | 折りたたみ時サマリー表示 | 2.2, 5.2 | Feature |
| 2.4 | ツール別最適化表示 | 2.2, 5.2 | Feature |
| 2.5 | Lucideアイコン使用 | 2.2, 5.2 | Feature |
| 3.1 | ツール結果デフォルト折りたたみ | 2.3, 5.3 | Feature |
| 3.2 | クリックで全内容展開 | 2.3, 5.3 | Feature |
| 3.3 | エラー状態強調表示 | 2.3, 5.3 | Feature |
| 3.4 | 結果有無インジケーター | 2.3, 5.3 | Feature |
| 4.1 | 10行未満は展開表示 | 2.4, 5.4 | Feature |
| 4.2 | 10行以上は折りたたみ | 2.4, 5.4 | Feature |
| 4.3 | truncateしない | 1.2 | Feature |
| 4.4 | 改行・ホワイトスペース保持 | 2.4 | Feature |
| 5.1 | セッション情報表示 | 2.5, 5.6 | Feature |
| 5.2 | 視覚的区別 | 2.5, 5.6 | Feature |
| 6.1 | 成功/エラー状態表示 | 2.6, 5.7 | Feature |
| 6.2 | 統計情報表示 | 2.6, 5.7 | Feature |
| 6.3 | エラーメッセージ強調 | 2.6, 5.7 | Feature |
| 7.1 | ダーク/ライト両対応 | 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 6.2 | Feature |
| 7.2 | Tailwind dark:クラス使用 | 2.2, 2.3, 2.4, 2.5, 2.6 | Feature |
| 7.3 | テーマ別コントラスト | 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 6.2 | Feature |
| 8.1 | RAW表示切替削除 | 3.1, 6.1 | Feature |
| 8.2 | 整形表示のみ提供 | 3.1, 6.1 | Feature |
| 9.1 | 自動スクロール維持 | 3.3, 4.2, 6.1 | Feature |
| 9.2 | コピー機能維持 | 3.3, 6.1 | Feature |
| 9.3 | クリア機能維持 | 3.3, 6.1 | Feature |
| 9.4 | トークン集計表示維持 | 3.3, 6.1 | Feature |
| 9.5 | ローディングインジケーター維持 | 3.3, 6.1 | Feature |
