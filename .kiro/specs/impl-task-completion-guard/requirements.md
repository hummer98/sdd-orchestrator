# Requirements: Impl Task Completion Guard

## Decision Log

### 未完了時の挙動
- **Discussion**: tasks未完了でAgent終了した場合、(A)impl再実行、(B)自動実行停止、のどちらが適切か
- **Conclusion**: impl再実行（フォールバック）
- **Rationale**: ユーザーの意図は「全タスク完了」であり、Agent側の都合で中途終了した場合は自動的にリトライすべき

### 完了判定基準
- **Discussion**: (A)tasks.mdのチェックボックス、(B)spec.json.phase、(C)両方、のどれで判定するか
- **Conclusion**: tasks.mdのチェックボックス全て`[x]`であること
- **Rationale**: tasks.mdがSSOT（Single Source of Truth）であり、spec.json.phaseはspecsWatcherServiceによる非同期更新のためタイミング問題がある

### チェック方法
- **Discussion**: (A)specsWatcherService.checkTaskCompletion()を活用、(B)autoExecutionCoordinator内で独自パース
- **Conclusion**: autoExecutionCoordinator内で直接tasks.mdをパース
- **Rationale**: (1)ポーリングベースのspecsWatcherServiceはタイミング問題がある、(2)フロー制御の判断はautoExecutionCoordinatorが自己完結で行うべき、(3)同期的に判定する方が確実

### 再実行上限
- **Discussion**: 無限リトライはリソース浪費・無限ループのリスク
- **Conclusion**: 最大7回
- **Rationale**: 十分なリトライ機会を与えつつ、明らかな問題がある場合は停止

### 再実行方法
- **Discussion**: (A)未完了タスクのみを引数指定、(B)引数なしでimpl全体を再実行
- **Conclusion**: 引数なしでimpl全体を再実行
- **Rationale**: Agent側で未完了タスクを判断する方がシンプルで、既存のimpl実行フローと一貫性がある

### カウント管理
- **Discussion**: (A)インメモリ、(B)spec.jsonに永続化
- **Conclusion**: インメモリ（executionStatesに追加）
- **Rationale**: Electron再起動でリセットされるが、それは「新しいセッション=新しい試行」として許容できる

### 上限到達時の挙動
- **Discussion**: (A)一時停止、(B)エラー状態、(C)通知のみ
- **Conclusion**: エラー状態（明示的なリセット必要）
- **Rationale**: 7回失敗は明らかな問題があるため、ユーザーの明示的な介入を要求すべき

### ユーザー通知
- **Discussion**: (A)イベントログのみ、(B)UIトーストのみ、(C)両方
- **Conclusion**: イベントログ + UIトースト両方
- **Rationale**: ログで履歴を残しつつ、リアルタイムでユーザーに状況を伝える

## Introduction

自動実行時にimplフェーズのAgentが終了した際、tasks.mdの完了度が100%でなくてもinspectionフェーズに移行してしまうバグを修正する。impl Agent終了時にtasks.mdのチェックボックスを検証し、未完了タスクがある場合はimplを再実行するガード機構を実装する。

## Requirements

### Requirement 1: Tasks完了度チェック

**Objective:** 自動実行コーディネーターとして、impl Agent完了時にtasks.mdの完了度を検証したい。未完了タスクがあるままinspectionに進むことを防ぐためである。

#### Acceptance Criteria
1. When impl Agentが`completed`ステータスで終了した場合, the system shall tasks.mdのチェックボックスをパースして完了度を判定する
2. If 全てのチェックボックスが`[x]`である場合, then the system shall 通常通り次フェーズ（inspection）への移行を許可する
3. If 未完了のチェックボックス`[ ]`が1つ以上存在する場合, then the system shall inspectionへの移行をブロックする

### Requirement 2: Impl再実行（フォールバック）

**Objective:** 自動実行コーディネーターとして、tasks未完了でimpl Agentが終了した場合に自動的にimplを再実行したい。ユーザーの介入なしにタスク完了を試みるためである。

#### Acceptance Criteria
1. When tasks未完了でimpl Agentが終了した場合, the system shall 引数なしでimplフェーズを再実行する
2. When impl再実行が発生した場合, the system shall 再実行回数をインメモリでカウントする
3. When Electronアプリが再起動された場合, the system shall 再実行カウントをリセットする（新しいセッション）

### Requirement 3: 再実行上限と エラー状態

**Objective:** 自動実行コーディネーターとして、無限ループを防ぐために再実行回数に上限を設けたい。明らかな問題がある場合はユーザーの介入を要求するためである。

#### Acceptance Criteria
1. The system shall impl再実行の最大回数を7回とする
2. When 再実行回数が7回に達した場合, the system shall 自動実行を「エラー」状態に遷移させる
3. While 自動実行が「エラー」状態である間, the system shall 自動実行を継続しない
4. If ユーザーが明示的にリセット操作を行った場合, then the system shall エラー状態を解除し、再実行カウントをリセットする

### Requirement 4: ユーザー通知

**Objective:** ユーザーとして、impl再実行の発生および上限到達を知りたい。自動実行の状況を把握し、必要に応じて介入するためである。

#### Acceptance Criteria
1. When impl再実行が発生した場合, the system shall イベントログ（event-log.jsonl）に記録する
2. When impl再実行が発生した場合, the system shall UIにトースト通知を表示する
3. When 再実行上限に到達した場合, the system shall イベントログに「エラー」として記録する
4. When 再実行上限に到達した場合, the system shall UIにエラートースト通知を表示する

## Out of Scope

- spec.json.phaseの更新ロジック変更（既存のspecsWatcherServiceの責務）
- 未完了タスクのみを引数指定してimplを再実行する機能
- 再実行カウントのspec.jsonへの永続化
- 再実行上限のユーザーカスタマイズ機能

## Open Questions

- tasks.mdのパースロジックは既存のユーティリティ（parseTasksCompletion等）を再利用できるか、設計時に確認が必要
