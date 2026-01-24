# Implementation Plan

## Task 1: テンプレートファイルのリネーム

- [x] 1.1 (P) cc-sdd 用コマンドテンプレートをリネームする
  - `steering-release.md` を `generate-release.md` にリネーム（内容変更なし）
  - 旧ファイル `steering-release.md` を削除
  - _Requirements: 1.3_

- [x] 1.2 (P) cc-sdd-agent 用コマンドテンプレートをリネームする
  - `steering-release.md` を `generate-release.md` にリネーム（内容変更なし）
  - 旧ファイル `steering-release.md` を削除
  - _Requirements: 1.3_

- [x] 1.3 (P) エージェント定義ファイルをリネームする
  - `steering-release.md` を `generate-release.md` にリネーム
  - frontmatter の `name` フィールドを `generate-release-agent` に更新
  - 旧ファイル `steering-release.md` を削除
  - _Requirements: 1.2_

## Task 2: コマンドインストーラーの更新

- [x] 2.1 ccSddWorkflowInstaller でコマンド/エージェント定義を更新する
  - `CC_SDD_COMMANDS` 配列で `steering-release` を `generate-release` に置換
  - `CC_SDD_AGENTS` 配列で `steering-release` を `generate-release` に置換
  - _Requirements: 1.4, 2.1_
  - _Method: CC_SDD_COMMANDS, CC_SDD_AGENTS_
  - _Verify: Grep "generate-release" in ccSddWorkflowInstaller.ts_

- [x] 2.2 unifiedCommandsetInstaller で spec-manager プロファイルを更新する
  - spec-manager インストール時に generate-release をインストール対象に含める
  - cc-sdd-agent テンプレートを参照してインストール
  - _Requirements: 2.1, 2.2_
  - _Method: installCommandset, installCommands_
  - _Verify: Grep "generate-release" in unifiedCommandsetInstaller.ts_

## Task 3: IPC ハンドラの更新

- [x] 3.1 handlers.ts の generateReleaseMd 関数を更新する
  - `/kiro:steering-release` を `/kiro:generate-release` に変更
  - _Requirements: 1.1, 3.1_
  - _Method: generateReleaseMd_
  - _Verify: Grep "/kiro:generate-release" in handlers.ts_

- [x] 3.2 webSocketHandler.ts のコメントを更新する
  - releaseHandlers 関連のコメントで `steering-release` を `generate-release` に変更（機能変更なし）
  - _Requirements: 1.4, 3.2_
  - _Verify: Grep "generate-release" in webSocketHandler.ts_

## Task 4: ドキュメント更新

- [x] 4.1 (P) skill-reference.md を更新する
  - `steering-release` への言及を `generate-release` に変更
  - サブエージェント一覧の `steering-release-agent` を `generate-release-agent` に更新
  - コマンド説明を更新
  - _Requirements: 4.1_

- [x] 4.2 (P) CLAUDE.md を確認・更新する
  - `steering-release` への言及があれば `generate-release` に更新
  - 言及がなければ変更不要
  - _Requirements: 4.2_

## Task 5: 動作確認テスト

- [x] 5.1 全プロファイルでのインストール確認
  - cc-sdd プロファイルで generate-release がインストールされることを確認
  - cc-sdd-agent プロファイルで generate-release がインストールされることを確認
  - spec-manager プロファイルで generate-release がインストールされることを確認
  - handlers.ts 経由の起動動作が正常であることを確認
  - _Requirements: 2.1, 2.3_

- [x] 5.2 ReleaseSection からの起動確認
  - UI ボタンクリックで release.md 生成が開始されることを確認
  - エラーなく動作することを確認
  - _Requirements: 1.5, 3.3_

---

## Inspection Fixes

### Round 1 (2026-01-24)

- [x] 6.1 cc-sdd-agent 用コマンドテンプレートを作成する
  - 関連: Task 1.2, Requirement 1.3
  - cc-sdd/generate-release.md を cc-sdd-agent/generate-release.md にコピー
  - _Method: ファイルコピー_

- [x] 6.2 エージェント定義ファイルの本文ヘッダーを更新する
  - 関連: Task 1.3, Requirement 1.2
  - `# steering-release Agent` を `# generate-release Agent` に変更
  - _Method: 文字列置換_

- [x] 6.3 ユニットテストがパスすることを確認する
  - 関連: Task 5.1, Requirement 2.1
  - `npm run test:run -- "Installer"` で全テストがパスすることを確認
  - テストファイルに generate-release を追加
  - _Method: テスト実行_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `kiro:steering-release` を `kiro:generate-release` にリネーム | 3.1 | Implementation |
| 1.2 | エージェントファイルをリネーム | 1.3 | Implementation |
| 1.3 | テンプレートファイルをリネーム | 1.1, 1.2 | Implementation |
| 1.4 | コード内の参照を更新 | 2.1, 3.2 | Implementation |
| 1.5 | UI ラベルは変更不要（確認のみ） | 5.2 | Validation |
| 2.1 | 全プロファイルでインストール対象に追加 | 2.1, 2.2, 5.1 | Implementation |
| 2.2 | spec-manager 用テンプレートは cc-sdd のものを参照 | 2.2 | Implementation |
| 2.3 | バリデーション必須チェックには追加しない | 5.1 | Validation |
| 3.1 | generateReleaseMd 関数内のコマンドを更新 | 3.1 | Implementation |
| 3.2 | webSocketHandler の releaseHandlers を更新 | 3.2 | Implementation |
| 3.3 | 既存 UI が正常に動作すること | 5.2 | Validation |
| 4.1 | skill-reference.md を更新 | 4.1 | Documentation |
| 4.2 | CLAUDE.md を確認・更新 | 4.2 | Documentation |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
