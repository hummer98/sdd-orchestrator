# Implementation Plan

- [x] 1. タスク番号解析ロジックの追加
- [x] 1.1 (P) 既存タスクから最大番号を特定するロジックを実装する
  - tasks.mdを読み込み、`N.M`形式のタスクIDを正規表現で抽出する
  - 抽出したタスクIDの整数部分（N）の最大値を計算する
  - 空のtasks.mdや番号が見つからない場合のフォールバック（0から開始）を実装する
  - _Requirements: 4.1, 4.2_

- [x] 1.2 (P) 新規Fix Tasksの番号を連番で生成する
  - 最大番号N+1を新しいタスクグループ番号として使用する
  - サブタスクは`(N+1).1`, `(N+1).2`形式で生成する
  - `FIX-N`形式を使用しないことを確認する
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

- [x] 2. Inspection Fixesセクション構造の実装
- [x] 2.1 セクション挿入位置の判定ロジックを実装する
  - `## Appendix`セクションの存在を検出する
  - Appendixがある場合はその直前、ない場合は`---`区切り線の後に挿入位置を決定する
  - 既存の`## Inspection Fixes`セクションがある場合は追記モードを判定する
  - _Requirements: 2.4, 4.4, 4.5_

- [x] 2.2 Inspection Fixesセクションとラウンドサブセクションを生成する
  - `## Inspection Fixes`ヘッダーを生成する（新規の場合）
  - `### Round N (YYYY-MM-DD)`サブセクションをISO 8601日付形式で生成する
  - ラウンド番号は既存のラウンド数+1で計算する
  - _Requirements: 2.1, 2.2_

- [x] 2.3 Fix Taskに関連情報を付記する
  - 各Fix Taskの下に`- 関連: Task X.Y, Requirement Z.Z`形式で関連情報を記載する
  - 関連タスク・要件はInspection結果から抽出する
  - _Requirements: 2.3_

- [x] 3. spec-inspection Agentテンプレートの更新
- [x] 3.1 メインAgentテンプレートを更新する
  - `.claude/agents/kiro/spec-inspection.md`にタスク番号解析ロジックを追加する
  - Fix Tasks生成時の連番継続ルールを定義する
  - Inspection Fixesセクション構造の生成ルールを追加する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.2 (P) リソーステンプレートを更新する
  - `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md`を同期する
  - コマンドテンプレート群（`commands/kiro/spec-inspection.md`等）を必要に応じて更新する
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 4. 後方互換性の確認
- [x] 4.1 既存パーサーの動作を確認する
  - `specsWatcherService.ts`のタスク完了検出が`FIX-N`形式と`N.M`形式の両方で動作することを確認する
  - 既存の正規表現（`/^- \[x\]/gim`, `/^- \[ \]/gm`）が両形式をカバーすることを検証する
  - _Requirements: 3.1_

- [x] 4.2 既存ファイルの非変換を確認する
  - 新規生成時のみ連番形式を使用し、既存の`FIX-N`形式は変換しないことを確認する
  - 混在形式（`N.M`と`FIX-N`が共存）でのタスク進捗計算が正常に動作することを検証する
  - _Requirements: 3.2_

- [x] 5. 統合テスト
- [x] 5.1 Fix Tasks生成フローの統合テストを実施する
  - spec-inspection --fixモードで連番生成が正しく動作することを確認する
  - 複数ラウンドでの連番継続が正しく動作することを確認する
  - Appendixセクション有無での挿入位置が正しいことを確認する
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 4.1, 4.3, 4.4, 4.5_

---

## Inspection Fixes

### Round 1 (2026-01-17)

- [x] 6.1 cc-sdd/spec-inspection.mdの--fix Modeセクションから`FIX-{n}`形式を削除する
  - 関連: Task 3.2, Requirement 1.3
  - `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`を修正
  - --fix Modeセクション内の`(use format FIX-{n})`を削除
  - Step 5.1-5.3と同様の連番継続ロジック（タスク番号解析、最大番号+1からの連番生成）を記載
  - メインAgentテンプレート（`.claude/agents/kiro/spec-inspection.md`）のStep 5.1-5.3を参照して同期

### Round 2 (2026-01-17)

- [x] 7.1 cc-sdd/spec-inspection.mdの--fix Modeセクションを連番継続形式に完全に更新する
  - 関連: Task 6.1, Requirement 1.3
  - `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`を修正
  - 現在line 193: `6. Append to tasks.md with new task numbers (use format \`FIX-{n}\`)`
  - 連番継続ロジックに変更:
    1. tasks.mdを読み込み、既存タスクの最大番号Nを特定する
    2. 新規Fix Tasksは(N+1).1, (N+1).2形式で生成する
    3. `## Inspection Fixes`セクションと`### Round M (YYYY-MM-DD)`サブセクションを使用する
  - メインAgentテンプレート（`.claude/agents/kiro/spec-inspection.md`）のStep 5.1-5.3を参照

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 既存タスクの最大番号の次から連番でタスクID付与 | 1.2, 3.1 | Feature |
| 1.2 | サブタスクはN.M形式を使用 | 1.2, 3.1 | Feature |
| 1.3 | FIX-N形式を使用しない（新規生成時） | 1.2, 3.1, 6.1, 7.1 | Feature |
| 2.1 | tasks.md末尾にInspection Fixesセクション追加 | 2.2, 3.1 | Feature |
| 2.2 | Round N (YYYY-MM-DD)サブセクション作成 | 2.2, 3.1 | Feature |
| 2.3 | 各タスクに関連情報記載 | 2.3, 3.1 | Feature |
| 2.4 | Appendixセクションがある場合その前に挿入 | 2.1, 3.1 | Feature |
| 3.1 | 既存パーサーがFIX-N形式を引き続き認識 | 4.1 | Infrastructure |
| 3.2 | 既存ファイルのFIX-Nは変換しない | 4.2 | Infrastructure |
| 4.1 | --fixモードでtasks.md読み込み、最大番号特定 | 1.1, 3.1 | Feature |
| 4.2 | N.M形式から最大整数部分Nを取得 | 1.1, 3.1 | Feature |
| 4.3 | 新タスクグループ番号(N+1)から開始 | 1.2, 3.1 | Feature |
| 4.4 | Inspection Fixesセクションが存在しない場合---後に新規作成 | 2.1, 3.1 | Feature |
| 4.5 | Appendixセクションがある場合その直前に挿入 | 2.1, 3.1 | Feature |
