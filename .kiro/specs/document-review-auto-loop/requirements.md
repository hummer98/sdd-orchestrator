# Requirements: Document Review Auto Loop

## Decision Log

### ループ制御の実装場所
- **Discussion**: `handlers.ts` にロジックを書くか、`autoExecutionCoordinator.ts` に集約するか
- **Conclusion**: `autoExecutionCoordinator.ts` の `handleDocumentReviewCompleted()` を拡張
- **Rationale**: 関心の分離（handlers は IPC 受け渡しのみ）、SSOT（自動実行状態は Coordinator が管理）、既存パターンとの整合

### 最大ラウンド数
- **Discussion**: 無限ループ防止の上限値
- **Conclusion**: 7回
- **Rationale**: ユーザー指定

### ループのトリガー条件
- **Discussion**: 常時 / `--autofix` 時のみ / 新フラグ
- **Conclusion**: 自動実行時（`--autofix`）のみ
- **Rationale**: 手動実行時は従来通り1回で終了、自動実行時のみループ

### ラウンド数の管理場所
- **Discussion**: spec.json のみ / Coordinator + spec.json
- **Conclusion**: Coordinator の状態 + spec.json（各ラウンド完了時に永続化）
- **Rationale**: SSOT（実行中の状態は Coordinator）、クラッシュ時のリカバリ可能

### 7回到達時の動作
- **Discussion**: paused / error / completed (with warning)
- **Conclusion**: paused（ユーザー介入待ち）
- **Rationale**: 自動修正では対応できない問題がある = 人間の判断が必要

### UI連携
- **Discussion**: リアルタイム通知 / spec.json 書き込み後のみ
- **Conclusion**: spec.json 書き込み後のみ表示
- **Rationale**: KISS、既存パターンとの整合、必要なら後から追加可能

### 中断・再開時の動作
- **Discussion**: 最初から / 中断したラウンドから
- **Conclusion**: 中断したラウンドから再開（`roundDetails.length + 1`）
- **Rationale**: ユーザー指定

### `--fix` モードとの関係
- **Discussion**: 自動実行で `--fix` を使うか
- **Conclusion**: `--autofix` のみ使用、`--fix` は手動実行専用
- **Rationale**: ユーザー指定

### approved 判定基準
- **Discussion**: Fix Required = 0 のみ / Needs Discussion も考慮
- **Conclusion**: `Fix Required = 0 AND Needs Discussion = 0` で approved
- **Rationale**: Needs Discussion = 人間の判断が必要 = 自動ループで解決不可

### Needs Discussion 発生時の動作
- **Discussion**: ループ継続 / 即座に paused
- **Conclusion**: Fix Required 解決後、Needs Discussion が残っていれば paused
- **Rationale**: 判断できない問題を回し続けても無駄、早期に人間の介入を促す

## Introduction

Document Review の自動実行において、`documentReview.status === "approved"` になるまで review → reply のサイクルを自動的に繰り返す機能。現状の `--autofix` モードは1回の fix 適用で終了するが、本機能により最大7ラウンドまで自動的にループし、全ての issue が解決されるか人間の介入が必要な状態になるまで継続する。

## Requirements

### Requirement 1: 自動実行ループ制御

**Objective:** 自動実行システムの管理者として、Document Review が approved になるまで自動的にループさせたい。これにより、人間の介入なしで解決可能な issue を全て自動修正できる。

#### Acceptance Criteria

1. 自動実行中に `document-review-reply --autofix` が完了したとき、`documentReview.status !== "approved"` かつ `Fix Required > 0` の場合、システムは次の review → reply サイクルを自動的に開始すること
2. ループは `autoExecutionCoordinator.ts` の `handleDocumentReviewCompleted()` メソッドで制御すること
3. ループ中の現在ラウンド数は `AutoExecutionState` で管理し、各ラウンド完了時に spec.json へ永続化すること

### Requirement 2: 最大ラウンド数制限

**Objective:** システム管理者として、無限ループを防止したい。これにより、解決不可能な問題でリソースを浪費することを防げる。

#### Acceptance Criteria

1. 最大ラウンド数は 7 回とすること（`MAX_DOCUMENT_REVIEW_ROUNDS = 7`）
2. 7ラウンド到達時、システムは自動実行を `paused` 状態に遷移させること
3. paused 状態では、ユーザーが手動で問題を解決し、自動実行を再開できること

### Requirement 3: 終了条件の判定

**Objective:** 自動実行システムとして、適切なタイミングでループを終了したい。これにより、不要なループを防ぎ、人間の介入が必要な状況を正しく検出できる。

#### Acceptance Criteria

1. `Fix Required = 0 AND Needs Discussion = 0` の場合、`documentReview.status` を `"approved"` に設定し、ループを終了して次フェーズ（impl）へ進むこと
2. `Fix Required = 0 AND Needs Discussion > 0` の場合、自動実行を `paused` 状態に遷移させること
3. `Fix Required > 0` の場合、次ラウンドを実行すること（最大ラウンド数未満の場合）
4. エージェント実行が失敗した場合、自動実行を `error` 状態に遷移させること

### Requirement 4: 中断・再開

**Objective:** ユーザーとして、自動実行を中断した後、中断したラウンドから再開したい。これにより、既に完了したラウンドを無駄に再実行しなくて済む。

#### Acceptance Criteria

1. 自動実行が中断（stop）された場合、現在のラウンド状態は spec.json に保存されていること
2. 自動実行を再開（start）した場合、システムは `roundDetails.length + 1` 番目のラウンドから実行を再開すること
3. 中断前に完了したラウンドの結果は保持されること

### Requirement 5: 1ラウンドの実行内容

**Objective:** 自動実行システムとして、各ラウンドで document-review と document-review-reply を順番に実行したい。

#### Acceptance Criteria

1. 1ラウンドは以下の順序で実行すること:
   - `document-review {feature}` 実行 → `document-review-{n}.md` 生成
   - `document-review-reply {feature} --autofix` 実行 → reply 生成 + fix 適用 + spec.json 更新
2. `--fix` モードは自動実行では使用しないこと（手動実行専用）

### Requirement 6: document-review-reply の approved 判定変更

**Objective:** document-review-reply コマンドとして、Needs Discussion が残っている場合は approved にしないようにしたい。

#### Acceptance Criteria

1. `document-review-reply` コマンドは、`Fix Required = 0 AND Needs Discussion = 0` の場合のみ `documentReview.status = "approved"` を設定すること
2. `Fix Required = 0 AND Needs Discussion > 0` の場合、`documentReview.status` は `"approved"` にしないこと
3. この判定は `document-review-reply.md` のコマンド仕様を更新して実装すること

### Requirement 7: Remote UI 対応

**Objective:** Remote UI ユーザーとして、自動実行の Document Review ループ状態を確認したい。

#### Acceptance Criteria

1. Remote UI からも Document Review パネルで現在のラウンド数を確認できること
2. spec.json の `documentReview.roundDetails` を読み取って表示すること
3. 追加の IPC / WebSocket 通知は不要（spec.json 書き込み後の表示で十分）

## Out of Scope

- Document Review パネル UI の新規作成（既存パネルを使用）
- リアルタイムのラウンド進捗通知（spec.json 書き込み後の表示で十分）
- 手動実行時のループ機能
- `--fix` モードの変更（手動実行専用のまま）

## Open Questions

- なし
