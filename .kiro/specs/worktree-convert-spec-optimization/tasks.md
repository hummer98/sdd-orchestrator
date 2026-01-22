# Implementation Plan

## Tasks

- [x] 1. Specコミット状態判定機能の実装
- [x] 1.1 SpecCommitStatus型とConvertErrorの拡張
  - specのgitコミット状態を表す型（untracked, committed-clean, committed-dirty）を定義する
  - 新規エラータイプ（SPEC_HAS_UNCOMMITTED_CHANGES, SPEC_NOT_IN_WORKTREE）を追加する
  - 変換ファイルを含む場合のエラーメッセージに対象ファイルリストを含める
  - _Requirements: 1.2, 4.2_

- [x] 1.2 getSpecStatus()メソッドの実装
  - specディレクトリに対して`git status --porcelain`を実行し、出力を解析する
  - 出力が空の場合はcommitted-clean（コミット済み・差分なし）を返す
  - `??`または`A `パターンはuntracked（未コミット）として判定する
  - `M`, `D`, `R`等のパターンはcommitted-dirty（コミット済み・差分あり）として判定する
  - 複数ファイルで異なる状態が混在する場合、優先度ルール（committed-dirty > untracked > committed-clean）を適用する
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. canConvert()の事前検証拡張
  - 既存のcanConvert()にspec状態判定ロジックを統合する
  - committed-dirty状態を検出した場合、SPEC_HAS_UNCOMMITTED_CHANGESエラーを返す
  - エラー時は変更ファイルリストをエラー情報に含める
  - worktreeやブランチ作成前にエラーを検出することで、ロールバック不要な状態で検証を完了する
  - _Requirements: 4.1, 4.3_

- [x] 3. convertToWorktree()の状態別処理分岐
- [x] 3.1 未コミットspecの移動処理
  - spec状態がuntrackedの場合のみ、従来のコピー→削除処理を実行する
  - コピー成功後にmain側のspecディレクトリを削除する
  - コピー失敗時は削除を行わない（順序厳守）
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.2 コミット済み・差分なしspecのスキップ処理
  - spec状態がcommitted-cleanの場合、コピー処理をスキップする
  - main側のspecディレクトリを削除しない（両方に存在する状態を許容）
  - git worktree作成後、worktree側にspecが存在することを検証する
  - specが存在しない場合はSPEC_NOT_IN_WORKTREEエラーを返す
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. エラーメッセージ関数の拡張
  - getConvertErrorMessage()に新規エラータイプのハンドリングを追加する
  - SPEC_HAS_UNCOMMITTED_CHANGES: 「Specに未コミットの変更があります。先にコミットしてください。\n変更ファイル: {files}」
  - SPEC_NOT_IN_WORKTREE: 「Worktree内にSpecが見つかりません: {specPath}」
  - _Requirements: 4.2_

- [x] 5. ユニットテストの実装
- [x] 5.1 (P) getSpecStatus()のテスト
  - git status出力パターン別の解析テスト（空、`??`、`A `、`M`、`D`、`R`等）
  - 複数状態混在時の優先度判定テスト
  - ディレクトリ指定時の全ファイル状態取得テスト
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5.2 (P) canConvert()拡張のテスト
  - committed-dirty状態でのエラー返却テスト
  - untracked状態での正常通過テスト
  - committed-clean状態での正常通過テスト
  - _Requirements: 4.1, 4.3_

- [x] 5.3 (P) convertToWorktree()分岐のテスト
  - untracked時のコピー→削除実行確認テスト
  - committed-clean時のコピースキップ確認テスト
  - committed-clean時のworktree内spec存在確認テスト
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6. 統合テストの実装
  - 実際のgitリポジトリを使用した状態判定の統合テスト
  - 未コミットspec → worktree変換の完全フロー確認
  - コミット済み・差分なしspec → worktree変換の完全フロー確認（移動スキップ確認）
  - コミット済み・差分ありspec → エラー確認
  - spec.jsonのworktreeフィールド更新確認
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | worktree変換開始時にspec git状態確認 | 1.2 | Feature |
| 1.2 | 3状態の判別 | 1.1, 1.2 | Feature |
| 1.3 | 複数状態混在時の優先度判定 | 1.2 | Feature |
| 2.1 | 未コミットspec時にコピー処理実行 | 3.1 | Feature |
| 2.2 | コピー成功後にmain側spec削除 | 3.1 | Feature |
| 2.3 | コピー→削除の順序厳守 | 3.1 | Feature |
| 3.1 | コミット済み・差分なし時にコピースキップ | 3.2 | Feature |
| 3.2 | コミット済み・差分なし時にmain側spec削除しない | 3.2 | Feature |
| 3.3 | worktree側にspec存在確認 | 3.2 | Feature |
| 4.1 | コミット済み・差分あり時に変換中止 | 2 | Feature |
| 4.2 | エラーメッセージ表示 | 1.1, 4 | Feature |
| 4.3 | worktree/ブランチ未作成でエラー検出 | 2 | Feature |
| 5.1 | 成功時にworktree側spec.json更新 | 6 | Feature |
| 5.2 | worktreeフィールド内容 | 6 | Feature |
| 5.3 | コミット済み時にmain側spec.json更新しない | 3.2, 6 | Feature |
