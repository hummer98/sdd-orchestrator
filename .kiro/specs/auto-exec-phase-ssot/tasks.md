# Implementation Plan

## Task 1. `getLastCompletedPhase` のシグネチャ変更と SpecPhase マッピング実装
- [x] 1.1 (P) `getLastCompletedPhase` の第1引数を `SpecPhase` に変更し、switch 文で全 SpecPhase 値を WorkflowPhase にマッピングする
  - 第1引数を `approvals: ApprovalsStatus` から `specPhase: SpecPhase` に変更する
  - 第2引数 `documentReviewStatus` と戻り値型 `WorkflowPhase | null` は維持する
  - switch 文で `initialized` → `null`, `requirements-generated` → `'requirements'`, `design-generated` → `'design'`, `tasks-generated` → `documentReviewStatus` による分岐（`'approved'` なら `'document-review'`, それ以外は `'tasks'`）, `implementation-complete` → `'impl'`, `inspection-complete` → `'inspection'`, `deploy-complete` → `'inspection'` をマッピングする
  - default ケースで未知の SpecPhase 値に対して `null` を返す
  - `SpecPhase` 型を import する（定義元 `renderer/types/index.ts` から import。注: `autoExecutionCoordinator.ts` では初の `renderer/types/` import となるが、同 `services/` ディレクトリ内の37ファイルで同パターンが使用されており問題なし）
  - 既存の `ApprovalsStatus` ベースの条件分岐ロジックを削除する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_
  - _Method: getLastCompletedPhase, SpecPhase_
  - _Verify: Grep "getLastCompletedPhase.*specPhase.*SpecPhase" in autoExecutionCoordinator.ts_

## Task 2. `start()` メソッドの呼び出し元修正
- [x] 2.1 `start()` メソッド内で `spec.json` から `phase` フィールドを読み取り、新シグネチャで `getLastCompletedPhase` を呼び出すよう修正する
  - 既存の `spec.json` 読み取りブロック内で `phase` フィールドを追加取得する（追加のファイル I/O なし）
  - `specJson.phase` が未定義の場合は `'initialized'` をフォールバック値とする
  - `spec.json` 読み取り失敗時（catch ブロック）でも `specPhase = 'initialized'` を設定する
  - `this.getLastCompletedPhase(approvals, documentReviewStatus)` を `this.getLastCompletedPhase(specPhase, documentReviewStatus)` に変更する
  - `getLastCompletedPhase` 呼び出しを `approvals` 条件分岐の外に移動する（DD-002 に準拠: `specPhase` は `approvals` の有無に関係なく利用可能）。具体的な移動先: `if (approvals)` ブロックの直後、`getImmediateNextPhase` 呼び出しの直前（現行コード L590 付近）。`documentReviewStatus` は `spec.json` 読み取りブロック内（L494-500）で `approvals` とは独立して取得済みのため、条件分岐外での呼び出しに問題なし
  - 自動承認ロジック（`getUnapprovedGeneratedPhases`）は既存のまま `approvals` 条件分岐内に維持する
  - Task 1.1 に依存するため `(P)` マーカーなし
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Method: start, getLastCompletedPhase, specPhase_
  - _Verify: Grep "getLastCompletedPhase\(specPhase" in autoExecutionCoordinator.ts_

## Task 3. ユニットテストの更新と新テストケース追加
- [x] 3.1 既存の `getLastCompletedPhase` テスト（6件）を新シグネチャ（`SpecPhase` 引数）に書き換える
  - `ApprovalsStatus` オブジェクトを渡す既存テストを、対応する `SpecPhase` 文字列に置き換える
  - 既存の `null`/`'requirements'`/`'design'`/`'tasks'`/`'document-review'` の期待値は維持する
  - `documentReviewStatus` 引数を使用するテストはそのまま維持する
  - Task 1.1 に依存するため `(P)` マーカーなし
  - _Requirements: 4.1_

- [x] 3.2 `implementation-complete`, `inspection-complete`, `deploy-complete`, `initialized` のテストケースを追加する
  - `specPhase === 'implementation-complete'` → `'impl'` を返すテスト
  - `specPhase === 'inspection-complete'` → `'inspection'` を返すテスト
  - `specPhase === 'deploy-complete'` → `'inspection'` を返すテスト
  - `specPhase === 'initialized'` → `null` を返すテスト
  - 未知の `SpecPhase` 値 → `null` を返すテスト
  - Task 3.1 と同一ファイルだが、新規テスト追加のみなので並行不可（同一 describe ブロック内）
  - _Requirements: 4.2_

- [x] 3.3 `start()` メソッドの既存テストが新しいフェーズ判定ロジックで正常パスすることを確認・修正する
  - `spec.json` モックデータに `phase` フィールドを追加する
  - `implementation-complete` 状態から自動実行開始 → inspection フェーズが実行されるテストケースを追加する
  - 既存テストが `specPhase` ベースの判定で壊れていないことを確認する
  - _Requirements: 4.3, 3.4_

## Task 4. E2E テスト追加
- [x] 4.1 impl 完了済み状態からの自動実行再開を検証する E2E テストを追加する
  - `phase === 'implementation-complete'` の `spec.json` を fixture として用意する
  - 自動実行を開始し、inspection フェーズが実行されることを検証する（impl が再実行されないことの確認）
  - 既存の `auto-execution-impl-flow.e2e.spec.ts` パターン（Mock Claude CLI、fixture 構成、waitFor パターン）に準拠する
  - 固定遅延（`sleep`）を使用せず、イベントリスナーまたは `waitFor` パターンで状態変化を検出する
  - _Requirements: 5.1, 5.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 第1引数を `SpecPhase` に変更 | 1.1 | Feature |
| 1.2 | 第2引数 `documentReviewStatus` 維持 | 1.1 | Feature |
| 1.3 | 戻り値型 `WorkflowPhase \| null` 維持 | 1.1 | Feature |
| 2.1 | SpecPhase → WorkflowPhase マッピング | 1.1 | Feature |
| 2.2 | 未知の SpecPhase で `null` を返す | 1.1 | Feature |
| 3.1 | `start()` が `phase` を読み取る | 2.1 | Feature |
| 3.2 | `specPhase` を新シグネチャで渡す | 2.1 | Feature |
| 3.3 | 読み取り失敗時 `'initialized'` フォールバック | 2.1 | Feature |
| 3.4 | impl-complete → inspection シナリオ | 2.1, 3.3 | Feature |
| 4.1 | 既存テストの新シグネチャ対応 | 3.1 | Feature |
| 4.2 | 新 SpecPhase テストケース追加 | 3.2 | Feature |
| 4.3 | `start()` テストの正常パス確認 | 3.3 | Feature |
| 5.1 | impl 完了状態からの E2E テスト | 4.1 | Feature |
| 5.2 | 既存 E2E テストパターン準拠 | 4.1 | Feature |
