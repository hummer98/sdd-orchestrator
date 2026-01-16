# Requirements: Worktree実行UIの改善

## Decision Log

### 実装フロー枠の範囲
- **Discussion**: impl, inspection, deploy の3フェーズを囲むか、DocumentReviewPanelも含めるか
- **Conclusion**: impl, inspection, deploy の3フェーズのみを囲む
- **Rationale**: DocumentReviewPanelは tasks と impl の間に配置されており、実装フローとは別の概念

### 現在の2ボタンUIの廃止
- **Discussion**: ImplStartButtons（「カレントブランチで実装」「Worktreeで実装」）を維持するか廃止するか
- **Conclusion**: 廃止し、チェックボックスで事前にモードを決定する形に変更
- **Rationale**: 実装フロー全体で一貫したモード管理が可能になる

### worktree存在時のチェックボックス動作
- **Discussion**: すでにworktreeが存在する場合、チェックボックスをどうするか
- **Conclusion**: 自動的にONになり、変更不可
- **Rationale**: 既存のworktreeがある場合は継続使用が前提

### 「実装開始」の判定条件
- **Discussion**: 通常モードで「実装開始」をどう検知するか
- **Conclusion**: `spec.json.worktree.branch` の存在で判定
- **Rationale**: worktreeモードでは既にこのフィールドが使われており、通常モードでも同じフィールドを使用することで一貫性を保つ

### データモデルの設計
- **Discussion**: `worktree.path` と `worktree.branch` の二重管理について
- **Conclusion**: 現状維持（両方保存）。ただし `path` をオプショナルに変更
- **Rationale**: 冗長だがgitコマンド不要で高速。`path` の有無で「実際のworktreeモードか」を判定可能

### 背景色の変更
- **Discussion**: worktreeモード時の背景色をどうするか
- **Conclusion**: 実装者に委任
- **Rationale**: 既存のworktree情報表示（紫系）との調和を考慮

## Introduction

specワークフローにおけるworktree実行のOn/Offインターフェースを改善する。現在の2ボタン選択UI（ImplStartButtons）を廃止し、実装フロー全体を囲む枠とチェックボックスによるモード切り替えUIに変更する。これにより、実装開始前にworktreeモードを選択し、実装フロー全体で一貫したモード管理が可能になる。

## Requirements

### Requirement 1: データモデルの拡張

**Objective:** 開発者として、通常モードでの実装開始も永続化したい。これにより、モード切り替えの一貫した管理が可能になる。

#### Acceptance Criteria
1. `WorktreeConfig` 型の `path` フィールドがオプショナルになること
2. worktreeモードの場合、`spec.json.worktree` は `{ path, branch, created_at }` の形式で保存されること
3. 通常モードで実装開始した場合、`spec.json.worktree` は `{ branch, created_at }` の形式で保存されること（pathなし）
4. 実装未開始の場合、`spec.json.worktree` フィールドが存在しないこと

### Requirement 2: 判定関数の追加

**Objective:** 開発者として、実装開始済みか、worktreeモードかを判定する関数が欲しい。

#### Acceptance Criteria
1. `isWorktreeConfig` 関数が `path` なしの場合でも `branch` と `created_at` があれば `true` を返すこと
2. 新しい `isActualWorktreeMode` 関数が追加され、`spec.json.worktree.path` が存在する場合のみ `true` を返すこと
3. 実装開始済み判定は `spec.json.worktree?.branch` の存在で行えること

### Requirement 3: 実装フロー枠の追加

**Objective:** ユーザーとして、実装〜デプロイまでの3つのプロセス（impl, inspection, deploy）が視覚的にグループ化されていることを確認したい。

#### Acceptance Criteria
1. impl, inspection, deploy の3フェーズを囲む枠（実装フロー枠）が表示されること
2. 枠のヘッダー領域に「worktreeで実行」チェックボックスが配置されること
3. DocumentReviewPanelは実装フロー枠に含まれないこと

### Requirement 4: チェックボックスの動作

**Objective:** ユーザーとして、worktreeモードのOn/Offをチェックボックスで切り替えたい。

#### Acceptance Criteria
1. 実装フロー枠内のチェックボックスと自動実行ボタン横のチェックボックスが連動すること（同じ値を示す）
2. チェックボックスの状態変更が即座に両方に反映されること
3. 既存のworktree（`spec.json.worktree.path` が存在）がある場合、チェックボックスは自動的にONになり変更不可となること

### Requirement 5: チェックボックスのロック

**Objective:** ユーザーとして、実装開始後にモードを変更できないようにしたい。

#### Acceptance Criteria
1. 実装ボタン押下時点でチェックボックスが変更不可能になること
2. `spec.json.worktree.branch` が存在する場合、チェックボックスはロック状態となること
3. deploy完了後（`spec.json.phase` が `deploy-complete`）にチェックボックスが変更可能になること
4. 自動実行中でもチェックボックスは変更可能であること（ただし実装開始後は不可）

### Requirement 6: worktreeモード時のUI変更

**Objective:** ユーザーとして、worktreeモードが有効な場合に視覚的なフィードバックを得たい。

#### Acceptance Criteria
1. worktreeモード時、実装フロー枠の背景色が微妙に変更されること
2. 実装パネルの実行ボタンが「worktreeで実装」と表示されること
3. 検査パネルは従来通りの表示であること
4. コミットパネルが「マージ」と表示されること

### Requirement 7: 通常モード時のUI

**Objective:** ユーザーとして、通常モード（worktreeなし）の場合は従来通りの表示を確認したい。

#### Acceptance Criteria
1. パネル背景は従来通りであること
2. 実装パネル、検査パネル、コミットパネルは従来通りの表示であること

### Requirement 8: ImplStartButtonsの廃止

**Objective:** 開発者として、2ボタン選択UI（ImplStartButtons）を廃止し、チェックボックスベースのUIに移行したい。

#### Acceptance Criteria
1. `ImplStartButtons` コンポーネントが使用されなくなること
2. 実装パネル下の独立した実装ボタンが廃止されること
3. 実装パネル内のPhaseItem実行ボタンでimpl実行が可能であること

### Requirement 9: 通常モード実装開始時の永続化

**Objective:** システムとして、通常モードで実装を開始した場合もその状態を永続化したい。

#### Acceptance Criteria
1. 通常モードで実装ボタン押下時、`spec.json.worktree` に `{ branch: "{current-branch}", created_at: "{timestamp}" }` が保存されること
2. `branch` には実装開始時点のカレントブランチ名が保存されること
3. ファイル監視により、UIが自動更新されること

### Requirement 10: deploy処理の分岐

**Objective:** システムとして、worktreeモードと通常モードで適切なdeploy処理を実行したい。

#### Acceptance Criteria
1. `spec.json.worktree.path` が存在する場合、`spec-merge` が実行されること
2. `spec.json.worktree.path` が存在しない場合（通常モード）、従来の `/commit` が実行されること
3. deploy完了後、`spec.json.worktree` フィールドが削除されること

### Requirement 11: worktree情報表示の条件

**Objective:** ユーザーとして、実際のworktreeが存在する場合のみworktree情報を確認したい。

#### Acceptance Criteria
1. `spec.json.worktree.path` が存在する場合のみ、SpecDetailにworktree情報セクションが表示されること
2. 通常モード（pathなし）の場合、worktree情報セクションは表示されないこと
3. SpecListのworktreeバッジは `path` が存在する場合のみ表示されること

## Out of Scope

- worktreeの自動削除・クリーンアップ機能
- worktreeモードと通常モードの途中切り替え（実装開始後）
- 複数worktreeの同時管理
- worktreeパスのカスタマイズ
- Remote UI対応: 不要（本仕様はElectron UI専用）

## Open Questions

- deploy完了後の `worktree` フィールド削除は、通常モード・worktreeモード両方で行うべきか？（現在の想定: 両方で削除）
