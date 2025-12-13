# Implementation Plan

## Phase 1: 新コマンド追加

> **並列実行に関する注記**: Task 1.0-1.4（Slash Command作成）は相互に独立しており並列実行可能。ただし、インストール機能（Task 4.3）の統合テストにはTask 4.1（テンプレート生成）の完了が前提となる。

- [x] 1. Slash Commandの作成
- [x] 1.0 (P) init初期化コマンドを作成する
  - プロジェクト説明からfeature名を生成するコマンドを実装
  - 直接プロンプト実行（サブエージェント委託なし）
  - 既存specとの名前衝突チェックを実装
  - 入力ファイル: templates/specs/init.json, templates/specs/requirements-init.md
  - 出力ファイル: spec.json, requirements.md（プロジェクト説明のみ）
  - プレースホルダー置換: `{{FEATURE_NAME}}`, `{{TIMESTAMP}}`, `{{PROJECT_DESCRIPTION}}`
  - 完了判定はElectron側で`result.subtype === "success"`により行う
  - _Requirements: 1.1, 1.7_

- [x] 1.1 (P) requirements生成コマンドを作成する
  - 純粋なrequirements.md生成のみを行うコマンドを実装
  - 直接プロンプト実行（サブエージェント委託なし）
  - spec.jsonの読み取りは許可、更新は行わない設計
  - 入力ファイル: spec.json, steering/*.md, ears-format.md, templates/requirements.md
  - 完了判定はElectron側で`result.subtype === "success"`により行う
  - _Requirements: 1.2, 1.6_

- [x] 1.2 (P) design生成コマンドを作成する
  - 純粋なdesign.md生成のみを行うコマンドを実装
  - 直接プロンプト実行（サブエージェント委託なし）
  - spec.jsonの読み取りは許可、更新は行わない設計
  - 入力ファイル: spec.json, requirements.md, steering/*.md, templates/design.md
  - 完了判定はElectron側で`result.subtype === "success"`により行う
  - _Requirements: 1.3, 1.6_

- [x] 1.3 (P) tasks生成コマンドを作成する
  - 純粋なtasks.md生成のみを行うコマンドを実装
  - 直接プロンプト実行（サブエージェント委託なし）
  - spec.jsonの読み取りは許可、更新は行わない設計
  - 入力ファイル: spec.json, requirements.md, design.md, steering/*.md, templates/tasks.md
  - 完了判定はElectron側で`result.subtype === "success"`により行う
  - _Requirements: 1.4, 1.6_

- [x] 1.4 (P) impl実行コマンドを作成する
  - 指定タスクの実装のみを行うコマンドを実装
  - 直接プロンプト実行（サブエージェント委託なし）
  - spec.jsonの読み取りは許可、更新は行わない設計
  - 入力ファイル: spec.json, requirements.md, design.md, tasks.md, steering/*.md
  - 完了判定はImplCompletionAnalyzer（Claude API Structured Output）で行う
  - _Requirements: 1.5, 1.6_

- [x] 2. ImplCompletionAnalyzerの実装
- [x] 2.1 (P) ImplCompletionAnalyzerサービスを作成する
  - Claude API Structured Output（beta.messages.parse）を使用
  - 入力: result行 + 最後のassistantメッセージ
  - Zodスキーマ（CheckImplResultSchema）で型安全な出力を保証
  - completedTasksには完了したタスクIDの配列を含める（例: ["1.1", "1.2"]）
  - statsにはnum_turns, duration_ms, total_cost_usdを含める
  - パース失敗が原理的に発生しない設計
  - @anthropic-ai/sdkをdependencyに追加
  - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 3. LogParserServiceの実装
- [x] 3.1 (P) result行subtype判定機能を作成する
  - ログファイルからresult行を検索しsubtypeを判定
  - ResultSubtype型（success, error_max_turns, error_during_execution, no_result）を定義
  - requirements/design/tasks用のアルゴリズム判定を実装
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 3.2 (P) ログ情報抽出機能を作成する
  - getLastAssistantMessage: ログファイルから最後のassistantメッセージを取得
  - getResultLine: ログファイルからresult行を取得
  - ImplCompletionAnalyzer入力データの準備用
  - ParseError型（NO_RESULT_FOUND, NO_ASSISTANT_FOUND, FILE_READ_ERROR）を定義
  - _Requirements: 2.4_

- [x] 4. Slash Commandインストール機能の実装
- [x] 4.1 cc-sdd変換スクリプトを作成しテンプレートを生成する
  - `scripts/convert-cc-sdd.sh` または `scripts/convert-cc-sdd.ts` を作成
  - cc-sddインストール済みプロジェクトからファイルを読み取り、spec-manager用に変換
  - **Slash Command変換**（セマンティック変換）:
    - 入力: `.claude/commands/kiro/spec-{init,requirements,design,tasks,impl}.md`
    - 出力: `electron-sdd-manager/resources/templates/commands/spec-manager/*.md`
    - 削除対象: spec.json操作（initを除く）、approvals処理、phase遷移、Subagent委託、次フェーズ誘導
    - 保持対象: 入力ファイル読み取り、成果物生成ロジック、ルール適用
  - **SDD設定コピー**（そのままコピー）:
    - 入力: `.kiro/settings/rules/*.md`, `.kiro/settings/templates/specs/*.md`（init.json, requirements-init.md含む）
    - 出力: `electron-sdd-manager/resources/templates/settings/`
  - 変換後の検証チェックリスト:
    - [ ] `allowed-tools`にWrite, Editのみ（spec.json操作なし、initは例外）
    - [ ] Task toolの呼び出しがない
    - [ ] 「次のステップ」「承認待ち」等のガイダンスがない
  - Electronビルド設定（electron-builder.json等）にresources/templatesを含める
  - 推奨: 初期実装は手動変換 + diff検証、後からスクリプト化
  - _Requirements: 4.3_

- [x] 4.2 (P) ファイル存在確認サービスを拡張する
  - ProjectCheckerにSlash CommandとSDD設定の存在確認ロジックを追加
  - checkSlashCommands: `.claude/commands/spec-manager/` の5コマンド（init含む）を確認
  - checkSettings: `.kiro/settings/` の必須設定ファイルを確認
  - checkAll: 一括確認（FullCheckResult型）
  - FileCheckResult型（allPresent, missing, present）を返す
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 4.3 (P) コマンドインストールサービスを作成する
  - installCommands: Slash Commandファイルをコピー
  - installSettings: SDD設定ファイルをコピー
  - installAll: 一括インストール（FullInstallResult型）
  - 既存ファイルの上書き確認ロジックを実装
  - 部分的な失敗時は成功分のみ適用し、ロールバック可能な状態を維持
  - InstallResult型（installed, skipped）、InstallError型を定義
  - 4.3は4.1（テンプレート生成）の完了が前提
  - _Requirements: 4.3, 4.5, 4.6_

## Phase 2: Electron側統合

- [x] 5. SpecManagerServiceの拡張
- [x] 5.1 spec-manager用コマンド実行・完了判定機能を追加する
  - executeSpecManagerPhaseメソッドを実装（生成コマンド実行）
  - requirements/design/tasks: LogParserService.parseResultSubtypeでアルゴリズム判定
  - impl: ImplCompletionAnalyzer.analyzeCompletion()でLLM解析（Structured Output）
  - Mutexパターンによるspec.json更新の排他制御を実装
  - 5.1は1.1-1.4（Slash Command）, 2.1（ImplCompletionAnalyzer）, 3.1, 3.2（LogParserService）の完了が前提
  - _Requirements: 3.1, 3.2, 3.6, 5.1_

- [x] 5.2 自動リトライ機能を追加する
  - retryWithContinueメソッドを実装（セッションレジューム + "continue"）
  - リトライ回数管理（最大2回: MAX_CONTINUE_RETRIES = 2）
  - no_result検出時に自動リトライ実行
  - 実行モード（auto/manual）に応じたstalled処理
  - _Requirements: 5.6, 5.7, 5.8_

- [x] 5.3 impl完了解析機能を追加する
  - analyzeImplCompletionメソッドを実装
  - LogParserService.getResultLine + getLastAssistantMessageで入力データ準備
  - ImplCompletionAnalyzer.analyzeCompletion()で型安全な結果取得
  - _Requirements: 2.4, 5.1_

- [x] 6. FileServiceの拡張
- [x] 6.1 check結果に基づくspec.json更新機能を追加する
  - updateSpecJsonFromPhaseメソッドを実装
  - phase遷移マッピングを実装（requirements: init -> requirements-generated、design: requirements-generated -> design-generated、tasks: design-generated -> tasks-generated）
  - approvals配下のgeneratedフラグを更新
  - updated_atタイムスタンプを現在時刻で更新
  - ResultSubtype !== 'success'の場合はエラーを返す
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 7. specStoreの拡張
- [x] 7.1 spec-manager用状態管理を追加する
  - specManagerExecution状態（isRunning, currentPhase, currentSpecId, lastCheckResult, error, implTaskStatus, retryCount, executionMode）を追加
  - executeSpecManagerGenerationアクションを実装
  - handleCheckImplResultアクションを実装
  - updateImplTaskStatusアクションを実装
  - clearSpecManagerErrorアクションを実装
  - 単一spec操作のみ許可する排他制御
  - 7.1は5.1, 5.2（SpecManagerService拡張）の完了が前提
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

- [x] 8. WorkflowViewの拡張
- [x] 8.1 spec-manager用UI表示を追加する
  - 生成完了時の次フェーズボタン表示
  - subtype === 'success'時に次フェーズへの進行ボタンを表示
  - 進行状況のリアルタイム表示（isRunning状態の反映）
  - エラー時の再実行ボタンとエラー詳細表示
  - specStoreのspecManagerExecution状態を購読
  - 8.1は7.1（specStore拡張）の完了が前提
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 8.2 リトライ状態表示を追加する
  - continuing状態: 「継続処理中...（リトライ 1/2）」表示
  - stalled状態: 「完了確認できず - 手動確認が必要」表示
  - ImplTaskStatusに応じたUI切り替え
  - 8.2は7.1（specStore拡張）の完了が前提
  - _Requirements: 5.7, 5.8_

## Phase 3: 統合・検証

- [x] 9. インストール機能のUI統合
- [x] 9.1 プロジェクト選択画面にインストール機能を統合する
  - プロジェクト選択時にSlash CommandとSDD設定の存在確認を実行（checkAll）
  - 不足ファイルがある場合にインストールボタンを表示（コマンド/設定を区別表示）
  - インストール完了時に成功メッセージを表示（インストール済みファイル一覧）
  - インストールエラー時にエラー詳細を表示
  - 9.1は4.1, 4.2, 4.3の完了が前提
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 10. E2E検証
- [x] 10.1 フルワークフローの動作検証を実施する
  - requirements -> design -> tasksの一連のフローを検証
  - 各フェーズでの生成 -> subtype判定 -> spec.json更新の連携を確認
  - impl実行 -> ImplCompletionAnalyzer -> 完了タスク取得の連携を確認
  - 自動リトライ（continuing -> success/stalled）フローを検証
  - エラー時の再実行フローを検証
  - コマンドインストールフローを検証
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

## Requirements Coverage Matrix

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 1.0, 10.1 |
| 1.2 | 1.1, 10.1 |
| 1.3 | 1.2, 10.1 |
| 1.4 | 1.3, 10.1 |
| 1.5 | 1.4, 10.1 |
| 1.6 | 1.1, 1.2, 1.3, 1.4 |
| 1.7 | 1.0 |
| 2.1 | 3.1, 10.1 |
| 2.2 | 3.1, 10.1 |
| 2.3 | 3.1, 10.1 |
| 2.4 | 2.1, 3.2, 5.3, 10.1 |
| 2.5 | 3.1 |
| 2.6 | 3.1 |
| 3.1 | 5.1, 10.1 |
| 3.2 | 5.1, 10.1 |
| 3.3 | 6.1 |
| 3.4 | 6.1 |
| 3.5 | 6.1 |
| 3.6 | 5.1 |
| 4.1 | 4.2, 9.1 |
| 4.2 | 4.2, 9.1 |
| 4.3 | 4.1, 4.3, 9.1 |
| 4.4 | 4.2 |
| 4.5 | 4.3, 9.1 |
| 4.6 | 4.3, 9.1 |
| 5.1 | 5.1, 5.3, 10.1 |
| 5.2 | 7.1, 8.1, 10.1 |
| 5.3 | 7.1, 8.1, 10.1 |
| 5.4 | 7.1, 8.1, 10.1 |
| 5.5 | 7.1, 8.1, 10.1 |
| 5.6 | 5.2, 10.1 |
| 5.7 | 5.2, 7.1, 8.2, 10.1 |
| 5.8 | 5.2, 7.1, 8.2, 10.1 |
| 6.1 | 2.1 |
| 6.2 | 2.1 |
| 6.3 | 2.1 |
| 6.4 | 2.1 |
| 6.5 | 2.1 |
| 6.6 | 2.1 |
