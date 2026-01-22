# Requirements: Worktree Convert Spec Optimization

## Decision Log

### specのコミット状態による処理分岐

- **Discussion**: worktree変換時にspecを常にコピー→削除する現行実装では、コミット済みspecの場合にmain側でgit削除状態が発生する。git worktreeの仕様上、コミット済みファイルはworktree作成時に自動で含まれるため、コピーは不要。
- **Conclusion**: specのコミット状態を判定し、未コミットの場合のみ移動処理を行う
- **Rationale**: gitの仕組みに沿った処理により、不要なファイル操作とgit状態の不整合を回避

### コミット済みspecのmain側での扱い

- **Discussion**: コミット済みspecをworktree化する際、main側のspecを（A）残す、（B）削除コミット、（C）FS削除のみ、の選択肢があった
- **Conclusion**: main側にspecを残す（両方に存在）
- **Rationale**: merge時にworktree側のspec.json（phase=deploy-complete）で上書きされるため、削除操作は不要。削除コミットを行うとコミット履歴が複雑になる

### コミット済み・差分ありの場合の処理

- **Discussion**: specがコミット済みだが未コミット変更がある場合、（A）差分をコミットしてから変換、（B）差分のみコピー、（C）エラーにする、の選択肢
- **Conclusion**: エラーにして「先にコミットしてください」と案内
- **Rationale**: 差分のみコピーは複雑で、自動コミットはユーザーの意図しないコミットを生む可能性がある。明示的なユーザーアクションを求める方が安全

### コミット履歴の分離許容

- **Discussion**: コミット済みspecをworktree化すると、specがmainで先行し実装が後からmergeされる形になる。spec+implが一体のコミット履歴にならない
- **Conclusion**: 許容する
- **Rationale**: 運用上はspecを未コミットのままworktree化することを推奨。コミット済みの場合も機能的には問題なく動作する

## Introduction

worktree変換（convert-to-worktree）時のspec処理を最適化する。現行実装ではspecのgitコミット状態に関わらず一律でコピー→削除を行っているが、git worktreeの仕様を活用し、コミット済みspecは移動処理を省略することで、git状態の不整合を解消し処理を簡潔にする。

## Requirements

### Requirement 1: specコミット状態の判定

**Objective:** システムとして、worktree変換前にspecのgitコミット状態を正確に判定したい。適切な処理分岐を行うため。

#### Acceptance Criteria

1. When worktree変換が開始された時、the system shall specディレクトリ内のファイルのgit状態を確認する
2. The system shall 以下の3状態を判別できること:
   - 未コミット（untracked または staged）
   - コミット済み・差分なし（clean）
   - コミット済み・差分あり（modified）
3. If specディレクトリ内に複数状態のファイルが混在する場合、then the system shall 最も制約の厳しい状態を採用する（差分あり > 未コミット > clean）

### Requirement 2: 未コミットspecの移動処理

**Objective:** システムとして、未コミットのspecをworktreeに移動したい。gitに追跡されていないファイルをworktree側で作業できるようにするため。

#### Acceptance Criteria

1. When specが未コミット状態の場合、the system shall specディレクトリをworktreeにコピーする
2. When コピーが成功した場合、the system shall main側のspecディレクトリを削除する
3. The system shall コピー→削除の順序を厳守し、コピー失敗時は削除を行わないこと

### Requirement 3: コミット済み・差分なしspecの処理

**Objective:** システムとして、コミット済みで差分がないspecはworktree作成のみで処理を完了したい。git worktreeの仕組みにより自動で含まれるため。

#### Acceptance Criteria

1. When specがコミット済みかつ差分なしの場合、the system shall コピー処理をスキップする
2. When specがコミット済みかつ差分なしの場合、the system shall main側のspecディレクトリを削除しない
3. The system shall worktree側にspecが存在することを確認する（git worktree作成後）

### Requirement 4: コミット済み・差分ありspecのエラー処理

**Objective:** ユーザーとして、コミット済みspecに未コミット変更がある場合は明確なエラーメッセージを受け取りたい。意図しない状態での変換を防ぐため。

#### Acceptance Criteria

1. When specがコミット済みかつ差分ありの場合、the system shall 変換処理を中止する
2. When 変換が中止された場合、the system shall 「specに未コミットの変更があります。先にコミットしてください」というエラーメッセージを表示する
3. The system shall エラー時にworktreeやブランチを作成しないこと（ロールバック不要な状態で検出）

### Requirement 5: spec.jsonのworktreeフィールド更新

**Objective:** システムとして、worktree変換後にspec.jsonを適切に更新したい。worktreeモードであることを記録するため。

#### Acceptance Criteria

1. When worktree変換が成功した場合、the system shall worktree側のspec.jsonにworktreeフィールドを追加する
2. The system shall worktreeフィールドに以下を含めること:
   - `enabled: true`
   - `path`: worktreeのパス
   - `branch`: feature branchの名前
   - `created_at`: 変換日時（UTC ISO 8601）
3. If specがコミット済み（main側に残る）の場合、the system shall main側のspec.jsonは更新しない

## Out of Scope

- `/kiro:spec-plan --worktree`（新規worktree作成）への変更
- spec-merge処理の変更（現行のsquash merge動作で対応可能）
- UIでの警告表示（将来的に追加可能だが本specでは対象外）
- コミット済みspecの自動コミット機能

## Open Questions

- コミット済み・差分なしの場合、worktree側でspec.jsonを更新・コミットする際にmain側との差分が発生するが、spec-merge時に問題なく解決されるか要確認（設計フェーズで検証）
