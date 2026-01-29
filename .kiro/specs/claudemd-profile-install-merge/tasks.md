# Implementation Plan

## Task Overview

プロファイルインストール時にCLAUDE.mdのセマンティックマージをProject Agent経由で自動実行する機能を実装し、未使用コードを削除する。

---

## Tasks

- [x] 1. CLAUDE.mdマージAgent定義の作成
- [x] 1.1 (P) claudemd-merge Agent定義ファイルを作成
  - CLAUDE.md存在確認ロジックを記述
  - 存在しない場合のテンプレートコピー処理を記述
  - 存在する場合のセマンティックマージ処理を記述
  - テンプレート構造を基本としつつユーザーカスタマイズを保持するマージルールを記述
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. テンプレートのプレースホルダー削除
- [x] 2.1 (P) CLAUDE.mdテンプレートのプレースホルダーを置換
  - `{{KIRO_DIR}}`を`.kiro`に置換
  - `{{DEV_GUIDELINES}}`を削除
  - 有効なMarkdownであることを確認
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. プロファイルインストール時のAgent呼び出し実装
- [x] 3.1 INSTALL_COMMANDSET_BY_PROFILEハンドラにAgent起動ロジックを追加
  - プロファイルインストール成功後にcc-sdd/cc-sdd-agentの場合のみAgentを起動
  - spec-managerプロファイルではAgentを起動しない
  - バックグラウンド実行（await不要、fire-and-forget）
  - インストール結果は即座に返却
  - Agent起動失敗時はプロファイルインストール成功扱いとし、警告ログのみ出力
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Method: specManagerService.startAgent_
  - _Verify: Grep "startAgent.*claudemd-merge" in installHandlers.ts_

- [x] 4. 未使用UIコンポーネントの削除
- [x] 4.1 (P) ClaudeMdInstallDialogを物理削除
  - `ClaudeMdInstallDialog.tsx`を物理削除
  - `components/index.ts`からexportを削除
  - _Requirements: 4.1.1, 4.1.2_

- [x] 5. 未使用IPCチャネルの削除
- [x] 5.1 (P) IPCチャネル定義を削除
  - `channels.ts`から`CHECK_CLAUDE_MD_EXISTS`を削除
  - `channels.ts`から`INSTALL_CLAUDE_MD`を削除
  - `channels.ts`から`CHECK_CC_SDD_WORKFLOW_STATUS`を削除
  - `channels.ts`から`INSTALL_CC_SDD_WORKFLOW`を削除
  - _Requirements: 4.2.1, 4.2.2, 4.2.3, 4.2.4_

- [x] 6. 未使用IPCハンドラーの削除
- [x] 6.1 (P) installHandlersからハンドラーを削除
  - `CHECK_CLAUDE_MD_EXISTS`ハンドラを削除
  - `INSTALL_CLAUDE_MD`ハンドラを削除
  - `CHECK_CC_SDD_WORKFLOW_STATUS`ハンドラを削除
  - `INSTALL_CC_SDD_WORKFLOW`ハンドラを削除
  - _Requirements: 4.3.1, 4.3.2, 4.3.3, 4.3.4_

- [x] 7. Preload APIの削除
- [x] 7.1 (P) preload/index.tsからAPIを削除
  - `checkClaudeMdExists`を削除
  - `installClaudeMd`を削除
  - `checkCcSddWorkflowStatus`を削除
  - `installCcSddWorkflow`を削除
  - _Requirements: 4.4.1, 4.4.2, 4.4.3, 4.4.4_

- [x] 7.2 (P) electron.d.tsから型定義を削除
  - 対応する4つのAPI型定義を削除
  - _Requirements: 4.5.1_

- [x] 8. サービスメソッドの削除
- [x] 8.1 (P) commandInstallerServiceから未使用コードを削除
  - `claudeMdExists()`メソッドを削除
  - `installClaudeMd()`メソッドを削除
  - `semanticMergeClaudeMd()`メソッドを削除
  - `ClaudeMdInstallMode`型を削除
  - `ClaudeMdInstallResult`型を削除
  - _Requirements: 4.6.1_

- [x] 8.2 (P) ccSddWorkflowInstallerから未使用コードを削除
  - `updateClaudeMd()`メソッドを削除
  - `mergeClaudeMdWithClaude()`メソッドを削除
  - `hasCcSddWorkflowSection()`メソッドを削除
  - `mergeCcSddSection()`メソッドを削除
  - `isClaudeAvailable()`メソッドを削除
  - `CC_SDD_WORKFLOW_CLAUDE_MD_SECTION`定数を削除
  - `ClaudeMdUpdateResult`型を削除
  - `installAll()`から`updateClaudeMd()`呼び出しを削除
  - _Requirements: 4.6.2_

- [x] 9. テスト更新
- [x] 9.1 installHandlers.test.tsの更新
  - 削除したハンドラーのテストを削除（CHECK_CLAUDE_MD_EXISTS, INSTALL_CLAUDE_MD, CHECK_CC_SDD_WORKFLOW_STATUS, INSTALL_CC_SDD_WORKFLOW）
  - Agent起動テストを追加（cc-sdd/cc-sdd-agentで起動、spec-managerで起動しない、起動失敗時も成功扱い）
  - _Requirements: 4.7.1, 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 9.2 (P) commandInstallerService.test.tsの更新
  - 削除したメソッドのテストを削除
  - _Requirements: 4.7.1_
  - Note: No CLAUDE.md-related tests existed in this file

- [x] 9.3 (P) ccSddWorkflowInstaller.test.tsの更新
  - 削除したメソッドのテストを削除
  - _Requirements: 4.7.1_

- [x] 10. 検証
- [x] 10.1 ビルドと型チェックの実行
  - `npm run build`でビルド成功を確認
  - `npm run typecheck`で型エラーがないことを確認
  - 削除したコードへの参照がないことを確認
  - _Requirements: 4.1.1, 4.1.2, 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.5.1, 4.6.1, 4.6.2_

- [x] 10.2 ユニットテストの実行
  - 関連テストが通過することを確認（installHandlers: 25 tests, ccSddWorkflowInstaller: 28 tests, commandInstallerService: 10 tests）
  - _Requirements: 4.7.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Agent定義ファイル存在 | 1.1 | Feature |
| 1.2 | CLAUDE.md存在確認 | 1.1 | Feature |
| 1.3 | 存在しない場合テンプレートコピー | 1.1 | Feature |
| 1.4 | 存在する場合セマンティックマージ | 1.1 | Feature |
| 1.5 | マージルール | 1.1 | Feature |
| 2.1 | インストール成功後にAgent起動 | 3.1 | Feature |
| 2.2 | 対象プロファイルcc-sdd/cc-sdd-agent | 3.1 | Feature |
| 2.3 | spec-managerは対象外 | 3.1 | Feature |
| 2.4 | バックグラウンド実行 | 3.1 | Feature |
| 2.5 | インストール結果は即座に返却 | 3.1, 9.1 | Feature |
| 2.6 | Agent起動失敗時も成功扱い | 3.1, 9.1 | Feature |
| 3.1 | `{{KIRO_DIR}}`を`.kiro`に置換 | 2.1 | Feature |
| 3.2 | `{{DEV_GUIDELINES}}`を削除 | 2.1 | Feature |
| 3.3 | 有効なMarkdown | 2.1 | Feature |
| 4.1.1 | ClaudeMdInstallDialog.tsx削除 | 4.1 | Cleanup |
| 4.1.2 | index.tsからexport削除 | 4.1 | Cleanup |
| 4.2.1 | CHECK_CLAUDE_MD_EXISTSチャネル削除 | 5.1 | Cleanup |
| 4.2.2 | INSTALL_CLAUDE_MDチャネル削除 | 5.1 | Cleanup |
| 4.2.3 | CHECK_CC_SDD_WORKFLOW_STATUSチャネル削除 | 5.1 | Cleanup |
| 4.2.4 | INSTALL_CC_SDD_WORKFLOWチャネル削除 | 5.1 | Cleanup |
| 4.3.1 | CHECK_CLAUDE_MD_EXISTSハンドラ削除 | 6.1 | Cleanup |
| 4.3.2 | INSTALL_CLAUDE_MDハンドラ削除 | 6.1 | Cleanup |
| 4.3.3 | CHECK_CC_SDD_WORKFLOW_STATUSハンドラ削除 | 6.1 | Cleanup |
| 4.3.4 | INSTALL_CC_SDD_WORKFLOWハンドラ削除 | 6.1 | Cleanup |
| 4.4.1 | checkClaudeMdExists削除 | 7.1 | Cleanup |
| 4.4.2 | installClaudeMd削除 | 7.1 | Cleanup |
| 4.4.3 | checkCcSddWorkflowStatus削除 | 7.1 | Cleanup |
| 4.4.4 | installCcSddWorkflow削除 | 7.1 | Cleanup |
| 4.5.1 | Preload API型定義削除 | 7.2 | Cleanup |
| 4.6.1 | commandInstallerServiceメソッド削除 | 8.1 | Cleanup |
| 4.6.2 | ccSddWorkflowInstallerメソッド削除 | 8.2 | Cleanup |
| 4.7.1 | 関連テスト更新/削除 | 9.1, 9.2, 9.3, 10.2 | Testing |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
