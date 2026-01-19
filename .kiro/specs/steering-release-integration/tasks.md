# Implementation Plan

## Task 1: release.md テンプレート作成

- [x] 1.1 (P) リリースワークフローテンプレートを作成する
  - `.kiro/settings/templates/commands/release.md` にテンプレートを配置
  - Prerequisites, Version Decision, CHANGELOG, Build, Commit, Publish の各セクションを含む
  - allowed-tools を `Bash, Read, Write, Glob, Grep` に設定
  - プロジェクトタイプ別のプレースホルダーを含む
  - _Requirements: 1.4, 2.1_

## Task 2: steering-release-agent 実装

- [x] 2.1 steering-release-agent のプロンプトファイルを作成する
  - `.claude/agents/kiro/steering-release.md` にエージェント定義を作成
  - プロジェクト分析ロジック: **優先順位 package.json > electron-builder > CI config の順で検出**
  - プロジェクトタイプ別生成戦略（Electron, npm, Cargo, Make, Unknown）を実装
  - **Unknown タイプの場合は Data Models - release.md Format に準拠した汎用テンプレートを使用**
  - テンプレート参照による release.md 生成
  - 既存ファイルの上書き確認ロジック
  - _Requirements: 1.2, 1.3, 2.2, 2.3_
  - _Method: Glob, Read, Write, AskUserQuestion_
  - _Verify: Grep "Glob|Read|Write|AskUserQuestion" in steering-release.md_

## Task 3: kiro:steering-release コマンド実装

- [x] 3.1 (P) cc-sdd プロファイル用コマンドを作成する
  - `.claude/commands/kiro/steering-release.md` に直接実行型コマンドを作成
  - `.claude/commands/` ディレクトリ存在確認とエラーハンドリング
  - steering-release-agent と同等の分析・生成ロジック
  - _Requirements: 1.1, 1.5_

- [x] 3.2 (P) cc-sdd-agent プロファイル用コマンドを作成する
  - `cc-sdd-agent/commands/kiro/steering-release.md` にTask委譲型コマンドを作成
  - steering-release-agent への委譲ロジック
  - _Requirements: 1.1, 1.5_

## Task 4: UI コンポーネント実装（ReleaseSection）

- [x] 4.1 ReleaseSection 共有コンポーネントを実装する
  - `src/shared/components/project/ReleaseSection.tsx` を作成
  - SteeringSection と同様のパターンで実装
  - release.md 存在状態の表示
  - 生成ボタンの表示・クリックハンドリング
  - Props: releaseCheck, releaseGenerateLoading, onGenerateReleaseMd
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 4.2 ReleaseSection を ProjectValidationPanel に統合する
  - 既存の Steering セクションの後に Release セクションを追加
  - props 経由で releaseCheck 状態を渡す
  - _Requirements: 3.1_

## Task 5: IPC 実装（CHECK_RELEASE_MD, GENERATE_RELEASE_MD）

- [x] 5.1 IPC チャンネル定義を追加する
  - `src/main/ipc/channels.ts` に CHECK_RELEASE_MD, GENERATE_RELEASE_MD を追加
  - _Requirements: 3.2_

- [x] 5.2 release ファイル存在チェックハンドラを実装する
  - `src/main/ipc/handlers.ts` に CHECK_RELEASE_MD ハンドラを追加
  - `.claude/commands/release.md` の存在確認
  - ReleaseCheckResult を返却
  - _Requirements: 3.2_

- [x] 5.3 release.md 生成ハンドラを実装する
  - `src/main/ipc/handlers.ts` に GENERATE_RELEASE_MD ハンドラを追加
  - executeProjectAgent を使用してエージェント起動
  - AgentInfo を返却
  - _Requirements: 3.4_
  - _Method: executeProjectAgent_
  - _Verify: Grep "executeProjectAgent" in handlers.ts_

## Task 6: projectStore 拡張

- [x] 6.1 release 関連状態を projectStore に追加する
  - `src/shared/stores/projectStore.ts` に releaseCheck, releaseGenerateLoading を追加
  - ReleaseCheckResult 型定義
  - _Requirements: 3.2, 3.3_

- [x] 6.2 checkReleaseFiles アクションを実装する
  - CHECK_RELEASE_MD を呼び出して状態更新
  - _Requirements: 3.2_

- [x] 6.3 generateReleaseMd アクションを実装する
  - GENERATE_RELEASE_MD を呼び出してエージェント起動
  - agentStore への追加とタブ切り替え
  - _Requirements: 3.4_

## Task 7: skill-reference.md 更新

- [x] 7.1 (P) skill-reference.md に steering-release を追記する
  - cc-sdd の「その他のコマンド」テーブルに追加
  - cc-sdd-agent の「その他のコマンド」テーブルに追加
  - kiro サブエージェント一覧に steering-release-agent を追加
  - **spec-manager には追記しない**（UI経由でのみ使用、steering-verification と同パターン）
  - _Requirements: 4.1, 4.2_

## Task 8: Remote UI 対応

- [x] 8.1 WebSocket ハンドラに release チェック・生成を追加する
  - `src/main/services/webSocketHandler.ts` に CHECK_RELEASE_MD, GENERATE_RELEASE_MD を追加
  - _Requirements: 3.5_

- [x] 8.2 Remote UI の ProjectValidationPanel に ReleaseSection を統合する
  - shared/components から ReleaseSection をインポート
  - WebSocketApiClient 経由で状態取得・アクション実行
  - _Requirements: 3.5_

## Task 9: 統合テスト

- [x] 9.1 (P) ReleaseSection コンポーネントのユニットテストを作成する
  - 状態に応じた表示切替テスト
  - ボタンクリックハンドラのテスト
  - _Requirements: 3.1, 3.3_

- [x] 9.2 (P) projectStore release 機能のユニットテストを作成する
  - checkReleaseFiles, generateReleaseMd のテスト
  - _Requirements: 3.2, 3.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | steering-release コマンド実行で agent 起動 | 3.1, 3.2 | Infrastructure |
| 1.2 | package.json, electron-builder, CI config 分析 | 2.1 | Feature |
| 1.3 | release.md 生成 | 2.1 | Feature |
| 1.4 | テンプレート参照 | 1.1 | Infrastructure |
| 1.5 | コマンドプリセット同梱 | 3.1, 3.2 | Infrastructure |
| 2.1 | release.md セクション構成 | 1.1 | Infrastructure |
| 2.2 | 実行可能なコマンド例 | 2.1 | Feature |
| 2.3 | プロジェクト固有情報反映 | 2.1 | Feature |
| 3.1 | ProjectValidationPanel に Release セクション追加 | 4.1, 4.2 | Feature |
| 3.2 | release.md 存在チェック | 5.1, 5.2, 6.1, 6.2 | Feature |
| 3.3 | 生成ボタン表示 | 4.1, 6.1 | Feature |
| 3.4 | ボタンクリックでエージェント起動 | 5.3, 6.3 | Feature |
| 3.5 | Remote UI 対応 | 4.1, 8.1, 8.2 | Feature |
| 4.1 | skill-reference.md に steering-release 追加 | 7.1 | Infrastructure |
| 4.2 | cc-sdd, cc-sdd-agent 両プロファイルに追記 | 7.1 | Infrastructure |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 4.1), not container tasks (e.g., 4)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
