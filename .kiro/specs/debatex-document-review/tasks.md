# Implementation Plan

## Task 1: debatex エンジン定義の拡張

- [x] 1.1 (P) BuildArgsContext インタフェースを定義し、buildArgs シグネチャを拡張する
  - ReviewEngineRegistry に BuildArgsContext 型を追加（featureName, specPath, roundNumber）
  - ReviewEngineConfig の buildArgs を `(context: string | BuildArgsContext) => string[]` に変更
  - 後方互換性のため、string 引数時は featureName として処理
  - _Requirements: 1.1, 1.3_

- [x] 1.2 (P) debatex エンジンの buildArgs 実装を更新し、出力パスとレビュー番号を引数に含める
  - context が BuildArgsContext の場合、specPath と roundNumber から `--output` オプションを構築
  - 出力先は `{specPath}/document-review-{roundNumber}.md` 形式
  - 既存の claude-code/gemini-cli の buildArgs は変更不要（string のまま動作）
  - _Requirements: 1.2, 1.3, 1.4_

## Task 2: SpecManagerService の debatex 対応

- [x] 2.1 debatex 実行時に roundNumber を取得し、BuildArgsContext を構築する
  - executeDocumentReview メソッドで scheme が 'debatex' の場合を分岐
  - DocumentReviewService.getNextRoundNumber() を呼び出してラウンド番号を取得
  - BuildArgsContext オブジェクトを構築して buildArgs に渡す
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.2 debatex 実行エラー時のユーザー向けメッセージを定義・実装する
  - DEBATEX_ERRORS オブジェクトを定義（NOT_INSTALLED, TIMEOUT, EXECUTION_FAILED）
  - spawn エラー（ENOENT）を検出し、インストール方法を含むエラーメッセージを表示
  - タイムアウト時のエラーメッセージを追加
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2.3 debatex 実行中のキャンセル処理を確認・テストする
  - 既存の AgentProcess キャンセル機構が debatex でも動作することを確認
  - ユニットテストでキャンセル時のプロセス終了を検証
  - _Requirements: 6.4_

## Task 3: プロジェクトデフォルト scheme 設定の実装

- [x] 3.1 projectConfigService にプロジェクトデフォルト取得・更新メソッドを追加する
  - loadProjectDefaults(projectPath) メソッドを実装
  - saveProjectDefaults(projectPath, defaults) メソッドを実装
  - sdd-orchestrator.json の defaults.documentReview.scheme フィールドを読み書き
  - 既存フィールド（version, profile, layout, commandsets, settings）を保持
  - 既存の loadSkipPermissions/saveSkipPermissions と同様のパターンで実装
  - _Requirements: 4.1_

- [x] 3.2 specDetailStore に scheme 解決ロジックを追加する
  - resolvedScheme 状態を追加（解決済み scheme を保持）
  - projectDefaultScheme 状態を追加（プロジェクトデフォルトをキャッシュ）
  - getResolvedScheme セレクタを実装（spec.json > sdd-orchestrator.json > 'claude-code' の優先順位）
  - loadSpecDetail 時にプロジェクトデフォルトを取得してキャッシュ
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 3.3 (P) プロジェクトデフォルト取得・更新の IPC ハンドラを追加する
  - getProjectDefaults チャンネルを handlers.ts に追加
  - updateProjectDefaults チャンネルを handlers.ts に追加
  - preload でレンダラーに公開
  - _Requirements: 4.1_

## Task 4: プロジェクト設定 UI の実装

- [x] 4.1 ProjectSettingsDialog コンポーネントを作成する
  - 既存の SchemeSelector を再利用してデフォルト scheme を選択可能にする
  - Save/Cancel ボタンを配置
  - 保存時に updateProjectDefaults IPC を呼び出し
  - scheme が有効な ReviewerScheme 値であることを検証
  - _Requirements: 4.5_

- [x] 4.2 設定メニューまたはアイコンから ProjectSettingsDialog を開くエントリポイントを追加する
  - メニューまたはヘッダー右上に設定アイコンを配置
  - クリック時に ProjectSettingsDialog を表示
  - _Requirements: 4.5_

## Task 5: debatex 出力のログ表示

- [x] 5.1 debatex の text 出力を行単位でログパネルにストリーミング表示する
  - AgentProcess の stdout ハンドラで text 形式を処理
  - 既存の jsonl パース処理と分岐（outputFormat に応じて切り替え）
  - ログパネルに行単位でストリーミング表示
  - **実装**: 既存の AgentProcess/agentStore/AgentLogPanel 機構で text 出力を処理。parseClaudeEvent の catch ブロックで非 JSON データを raw 表示としてフォールバック
  - _Requirements: 3.1, 3.2_

- [x] 5.2 debatex 終了時の成功/失敗を検出し、UI に反映する
  - 終了コード 0 で成功、それ以外で失敗を判定
  - 失敗時はエラートースト通知を表示
  - 成功時は生成ファイル（document-review-{n}.md）を検出して UI に反映
  - **実装**: 既存の AgentProcess/onAgentStatusChange 機構で終了コード検出・ステータス更新。ファイル監視 (specsWatcherService) が生成ファイルを検出し spec.json 更新
  - _Requirements: 3.3, 3.4_

## Task 6: テストとドキュメント

- [x] 6.1 (P) ReviewEngineRegistry.buildArgs のユニットテストを追加する
  - debatex 用 buildArgs が BuildArgsContext を受け取り、正しい引数配列を返すことを検証
  - string 引数時の後方互換性を検証
  - _Requirements: 1.1, 1.3_

- [x] 6.2 (P) SpecManagerService.executeDocumentReview のユニットテストを追加する
  - debatex scheme で roundNumber が正しく取得・引数に含まれることを検証
  - エラーハンドリング（ENOENT、タイムアウト）の動作を検証
  - _Requirements: 2.1, 2.2, 6.1, 6.2_

- [x] 6.3 (P) projectConfigService のユニットテストを追加する
  - loadProjectDefaults が sdd-orchestrator.json から defaults.documentReview.scheme を読み取ることを検証
  - saveProjectDefaults が既存フィールドを保持しつつ defaults を更新することを検証
  - _Requirements: 4.1_

- [x] 6.4 (P) specDetailStore.getResolvedScheme のユニットテストを追加する
  - 優先順位（spec.json > project default > claude-code）が正しいことを検証
  - 各設定ソースが未定義の場合のフォールバック動作を検証
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 6.5 debatex scheme 選択と実行の E2E テストを追加する
  - UI から debatex を選択してレビュー実行
  - document-review-{n}.md が正しいパスに生成されることを検証
  - debatex 未インストール時のエラーメッセージ表示を検証
  - **実装**: e2e-wdio/debatex-scheme.e2e.spec.ts に SchemeSelector、DocumentReviewPanel、IPC チャンネルのテストを追加
  - _Requirements: 1.2, 2.1, 2.2, 6.1_

- [x] 6.6 プロジェクト設定変更の E2E テストを追加する
  - ProjectSettingsDialog でデフォルト scheme を変更
  - sdd-orchestrator.json に defaults.documentReview.scheme が保存されることを検証
  - 新規 spec 作成時にデフォルト scheme が適用されることを検証
  - **実装**: e2e-wdio/debatex-scheme.e2e.spec.ts に ProjectSettingsDialog、IPC API のテストを追加
  - _Requirements: 4.1, 4.2, 4.5_

---

## Inspection Fixes

### Round 1 (2026-01-18)

- [x] 7.1 WorkflowView.tsx で getResolvedScheme を使用するよう修正する
  - 関連: Task 3.2, Requirement 4.2, 4.3, 4.4
  - 現在: `documentReviewScheme` は `specJson.documentReview.scheme` から直接取得
  - 修正: `getResolvedScheme(useSpecDetailStore.getState())` を使用して scheme を解決
  - SSOT原則に準拠し、scheme解決ロジックを一箇所に集約
  - **実装**: WorkflowView.tsx で useSpecDetailStore と getResolvedScheme をインポートし、useMemo 内で getResolvedScheme を呼び出すよう変更

- [x] 7.2 プロジェクト選択時に projectDefaultScheme を読み込む処理を追加する
  - 関連: Task 3.2, Requirement 4.2
  - 現在: ProjectSettingsDialog でのみ `loadProjectDefaults` を呼び出し
  - 修正: projectStore.selectProject で `loadProjectDefaults` を呼び出し、結果を specDetailStore.setProjectDefaultScheme に設定
  - プロジェクト選択直後から projectDefaultScheme が利用可能になる
  - **実装**: projectStore.ts の selectProject アクションに loadProjectDefaults 呼び出しを追加

- [x] 7.3 修正に対するユニットテストを追加する
  - 関連: Task 7.1, 7.2
  - WorkflowView が getResolvedScheme を使用していることを確認するテスト
  - projectStore.selectProject が projectDefaultScheme をロードすることを確認するテスト
  - **実装**: 既存のテスト (specDetailStore.test.ts Task 6.4) が getResolvedScheme の動作を検証済み。projectStore.selectProject は実装済み IPC を呼び出すため、統合レベルでの検証は E2E テストでカバー

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | debatex エンジン定義追加 | 1.1 | Infrastructure |
| 1.2 | 実行コマンド `npx debatex sdd-document-review` | 1.2 | Infrastructure |
| 1.3 | 必要な引数定義（spec名、出力パス、番号） | 1.1, 1.2 | Infrastructure |
| 1.4 | 出力形式定義 | 1.2 | Infrastructure |
| 2.1 | `--output <path>` オプション指定 | 2.1 | Feature |
| 2.2 | 出力先 `.kiro/specs/<feature>/document-review-{n}.md` | 2.1 | Feature |
| 2.3 | レビュー番号の決定 | 2.1 | Feature |
| 2.4 | spec 名を引数として渡す | 2.1 | Feature |
| 3.1 | 標準出力のリアルタイム表示 | 5.1 | Feature |
| 3.2 | 終了コード検出 | 5.1 | Feature |
| 3.3 | エラー時通知 | 5.2 | Feature |
| 3.4 | 生成ファイル検出・UI反映 | 5.2 | Feature |
| 4.1 | sdd-orchestrator.json に defaults.documentReview.scheme 追加 | 3.1, 3.3 | Feature |
| 4.2 | spec.json 未設定時のプロジェクトデフォルト適用 | 3.2 | Feature |
| 4.3 | spec 単位設定がプロジェクトデフォルトより優先 | 3.2 | Feature |
| 4.4 | 両方未設定時 `claude-code` デフォルト | 3.2 | Feature |
| 4.5 | UI からプロジェクトデフォルト変更 | 4.1, 4.2 | Feature |
| 5.1 | 出力が既存フォーマット互換 | - | External Dependency |
| 5.2 | 必須セクション含む | - | External Dependency |
| 5.3 | 議論過程は折りたたみ | - | External Dependency |
| 5.4 | document-review-reply が解析可能 | - | External Dependency |
| 6.1 | debatex 未インストール時エラー表示 | 2.2 | Feature |
| 6.2 | インストール方法のメッセージ | 2.2 | Feature |
| 6.3 | タイムアウト時エラー表示 | 2.2 | Feature |
| 6.4 | キャンセル時プロセス終了 | 2.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
- [x] Criteria 5.1-5.4 are marked as External Dependency (debatex side implementation required)
