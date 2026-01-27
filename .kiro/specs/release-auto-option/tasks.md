# Implementation Plan

## Task 1: release.md コマンドに --auto オプションを追加

- [x] 1.1 (P) release.md に --auto オプションセクションを追加
  - コマンドファイルに `## --auto オプション` セクションを新規追加
  - オプションの使用方法と動作仕様（確認プロンプトスキップ）を記載
  - 従来の対話モードとの違いを明確に説明
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 (P) 未コミット変更チェックロジックを追加
  - `git status --porcelain` による未コミット変更の検出手順を記載
  - ファイル拡張子によるフィルタリング（.ts/.tsx/.js → ブロック、.md/.json → スキップ）
  - ソースコード変更検出時のエラーメッセージとファイルリスト表示
  - スキップしたドキュメント変更のログ出力
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 1.3 (P) バージョン番号自動判定ロジックを追加
  - `git describe --tags --abbrev=0` による最新タグ取得手順を記載
  - `git log` によるコミットメッセージ解析手順を記載
  - BREAKING CHANGE → major、feat: → minor、fix:/docs:/chore: → patch の判定ルール
  - 決定されたバージョン番号のログ出力
  - タグが存在しない場合の v0.0.0 からのフォールバック
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

## Task 2: UI リリースボタンを --auto で実行するように変更

- [x] 2.1 ProjectAgentPanel.tsx の handleRelease を更新
  - `executeProjectCommand` の第2引数を `/release` から `/release --auto` に変更
  - 既存の成功/エラー通知ロジックは維持
  - _Requirements: 4.1, 4.2_
  - _Method: executeProjectCommand_
  - _Verify: Grep "\/release --auto" in ProjectAgentPanel.tsx_

## Task 3: generate-release.md テンプレートを更新

- [x] 3.1 (P) cc-sdd プロファイル用 generate-release.md を更新
  - 生成される release.md に --auto オプションのセクションを含める記述を追加
  - 動作仕様（変更スキップ、バージョン自動判定）の説明を追加
  - _Requirements: 5.1, 5.2_

- [x] 3.2 (P) cc-sdd-agent プロファイル用 generate-release.md を更新
  - 3.1 と同様の --auto オプション説明を追加
  - _Requirements: 5.1, 5.2_

- [x] 3.3 (P) agents/kiro 用 generate-release.md を更新
  - 3.1 と同様の --auto オプション説明を追加
  - _Requirements: 5.1, 5.2_

- [x] 3.4 (P) コマンドセットインストール用テンプレートを更新
  - `resources/templates/settings/templates/commands/release.md` に --auto セクションを追加
  - _Requirements: 5.3_

## Task 4: テスト

- [x] 4.1 ProjectAgentPanel.test.tsx を更新
  - `handleRelease` が `/release --auto` で呼び出されることを確認するテストケース
  - 既存のリリースボタンテストがある場合は更新
  - _Requirements: 4.1_

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 5.1 release.md に `--auto` オプションセクションを実装（Critical）
  - 関連: Task 1.1, 1.2, 1.3, Requirement 1.1-3.5
  - `.claude/commands/release.md` に `## --auto オプション` セクションを追加
  - 未コミット変更のファイル種別フィルタリングロジックを実装（.ts/.tsx/.js → abort, .md/.json → skip with log）
  - コミットログ解析とバージョンタイプ判定ロジックを実装（BREAKING CHANGE → major, feat: → minor, fix:/docs:/chore: → patch）
  - 各ステップのログ出力を実装
  - design.md L234-283 の Pseudo-code を参考にする

- [x] 5.2 ProjectAgentPanel.tsx の handleRelease を `/release --auto` に修正（Critical）
  - 関連: Task 2.1, Requirement 4.1
  - L159: `/release` → `/release --auto` に変更
  - _Method: executeProjectCommand_
  - _Verify: Grep "/release --auto" in ProjectAgentPanel.tsx_

- [x] 5.3 ProjectAgentPanel.test.tsx を `/release --auto` に修正（Major）
  - 関連: Task 4.1
  - テストで `/release --auto` が呼び出されることを検証するように更新
  - _Verify: Grep "/release --auto" in ProjectAgentPanel.test.tsx_

- [x] 5.4 cc-sdd プロファイル用 generate-release.md テンプレートを更新（Major）
  - 関連: Task 3.1, Requirement 5.1, 5.2
  - `electron-sdd-manager/resources/templates/commands/cc-sdd/generate-release.md` に `--auto` オプション説明を追加
  - 生成される release.md に含めるべき `--auto` セクションの内容を記載

- [x] 5.5 cc-sdd-agent プロファイル用 generate-release.md テンプレートを更新（Major）
  - 関連: Task 3.2, Requirement 5.1, 5.2
  - `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/generate-release.md` に `--auto` オプション説明を追加

- [x] 5.6 agents/kiro 用 generate-release.md テンプレートを更新（Major）
  - 関連: Task 3.3, Requirement 5.1, 5.2
  - `electron-sdd-manager/resources/templates/agents/kiro/generate-release.md` に `--auto` オプション説明を追加

- [x] 5.7 コマンドセットインストール用 release.md テンプレートを更新（Major）
  - 関連: Task 3.4, Requirement 5.3
  - `electron-sdd-manager/resources/templates/settings/templates/commands/release.md` に `--auto` セクションを追加

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `/release --auto` で確認プロンプトをスキップ | 1.1 | Feature |
| 1.2 | `--auto` なしは従来通り確認を求める | 1.1 | Feature |
| 1.3 | release.md に --auto オプションの使用方法を記載 | 1.1 | Feature |
| 2.1 | ドキュメント変更のみの場合は警告スキップ | 1.2 | Feature |
| 2.2 | ソースコード変更ありはエラー終了 | 1.2 | Feature |
| 2.3 | スキップしたファイルをログ出力 | 1.2 | Feature |
| 3.1 | 前回タグからのコミットを解析 | 1.3 | Feature |
| 3.2 | BREAKING CHANGE で major インクリメント | 1.3 | Feature |
| 3.3 | feat: で minor インクリメント | 1.3 | Feature |
| 3.4 | fix:/docs:/chore: で patch インクリメント | 1.3 | Feature |
| 3.5 | 決定バージョンをログ出力 | 1.3 | Feature |
| 4.1 | UI リリースボタンで `/release --auto` 実行 | 2.1, 4.1 | Feature |
| 4.2 | 従来と同じ成功/エラー通知を表示 | 2.1 | Feature |
| 5.1 | generate-release で --auto セクションを含める | 3.1, 3.2, 3.3 | Feature |
| 5.2 | --auto の動作仕様を記載 | 3.1, 3.2, 3.3 | Feature |
| 5.3 | コマンドセットテンプレートも更新 | 3.4 | Feature |

