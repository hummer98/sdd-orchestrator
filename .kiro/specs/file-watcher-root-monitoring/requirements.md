# Requirements: File Watcher Root Monitoring

## Decision Log

### Decision 1: 短期 vs 中長期施策の選択
- **Discussion**: メモに記載された「短期施策（watchedPaths Set導入）」と「中長期施策（ルート監視への移行）」のどちらを実装するか
- **Conclusion**: 中長期施策（ルート監視方式）のみを実装
- **Rationale**:
  - `watchedPaths: Set<string>` は既に実装済み（L38 in BugsWatcherService, L52 in SpecsWatcherService）
  - 二重監視防止ロジックも実装済み（L241-244, L289-292）
  - 残る構造的課題は「500ms待機のタイミング依存」と「イベント処理オーバーヘッド」
  - これらはルート監視への移行で根本解決可能

### Decision 2: 対象サービスのスコープ
- **Discussion**: どのWatcherサービスをリファクタリング対象とするか
- **Conclusion**: `BugsWatcherService` と `SpecsWatcherService` のみ
- **Rationale**:
  - `AgentRecordWatcherService` は既に最適化済み（depth: 0、スコープ切替方式）
  - `GitFileWatcherService` は `.git/index` 単一ファイル監視で既に最適
  - Bugs/Specsの2つが「個別パス監視 + 動的追加」方式を採用しており、複雑性が高い

### Decision 3: ルート監視の範囲
- **Discussion**: `.kiro` ディレクトリ全体を監視するか、特定ディレクトリのみか
- **Conclusion**: 以下のパスを監視対象とし、除外パターンで不要なイベントを削減
  ```
  監視対象:
  - .kiro/bugs/
  - .kiro/specs/
  - .kiro/worktrees/bugs/
  - .kiro/worktrees/specs/

  除外パターン (chokidar ignored):
  - **/runtime/**
  - **/.git/**
  - **/logs/**
  - **/*.log
  ```
- **Rationale**:
  - `.kiro/runtime/` は頻繁に更新されるログ等が含まれるため除外
  - `.kiro/steering/` は静的ファイルで変更頻度が低いため監視不要
  - 監視範囲を最小限にすることでパフォーマンスを維持

### Decision 4: Globパターンの設計方針
- **Discussion**: 初期監視を広域にして後でフィルタリングするか、初期から絞り込むか
- **Conclusion**: 初期監視範囲を必要なディレクトリのみに絞る + イベントハンドラで拡張子フィルタリング
- **Rationale**:
  - `chokidar.watch([paths])` に必要なパスのみを渡すことで、OS負荷を軽減
  - イベントハンドラで `.json/.md` 以外を早期除外し、不要なパス解析を回避

### Decision 5: Worktree動的監視の扱い
- **Discussion**: 現在の2層監視（Worktreeディレクトリ監視 → 内部パス追加）は必要か
- **Conclusion**: ルート監視に移行することで、2層監視ロジック全体を削除
- **Rationale**:
  - `.kiro/worktrees/bugs/` および `.kiro/worktrees/specs/` を初期監視対象に含めることで、Worktree内部のファイルも自動的に監視される
  - `handleWorktreeAddition()`, `handleWorktreeRemoval()`, `worktreeAdditionTimers` が不要に
  - 500ms待機ロジックも削除可能

### Decision 6: タイミング依存の解消方法
- **Discussion**: Worktree作成時の500ms待機をどう解消するか
- **Conclusion**: ルート監視により、ファイルシステムイベントをリアルタイムで検知できるため、待機不要
- **Rationale**:
  - Worktreeディレクトリ作成と同時に内部ファイルも監視対象になる
  - `chokidar` の `awaitWriteFinish` オプションでファイル書き込み完了を検知

### Decision 7: パス解析ロジックの変更要否
- **Discussion**: `extractBugName()` / `extractSpecId()` をルート監視用に変更する必要があるか
- **Conclusion**: 既存ロジックをそのまま維持可能
- **Rationale**:
  - パス形式は変わらないため、既存のパターンマッチロジックで対応可能
  - ただし、`.json/.md` 以外のファイルを早期除外するフィルタリングを追加

### Decision 8: Watcher統合 vs 独立保持
- **Discussion**: `BugsWatcher` と `SpecsWatcher` を統合して単一Watcherにするか
- **Conclusion**: 各サービスが独立してルート監視を持つ
- **Rationale**:
  - それぞれ異なるイベントハンドラとコールバックを持つ
  - 統合すると責務が不明瞭になり、既存の `onChange()` インターフェースが破壊される
  - 独立性を保つことでテスト容易性を維持

### Decision 9: 移行戦略
- **Discussion**: 段階的移行（フラグ切り替え）か一気にリファクタリングか
- **Conclusion**: Worktree環境で一気にリファクタリング → E2Eテスト → 問題なければmerge
- **Rationale**:
  - 段階的移行はコードの複雑性が増すだけ
  - Worktree環境で隔離して開発すれば、mainブランチへの影響を最小化
  - E2Eテストが充実しているため、動作検証の信頼性が高い

### Decision 10: テスト戦略
- **Discussion**: E2Eテストでの動作確認は必要か
- **Conclusion**: E2Eテストで動作確認を実施
- **Rationale**:
  - ファイル監視機構の変更は、UI更新やワークフロー全体に影響
  - 既存のE2Eテスト（`spec-workflow.e2e.spec.ts`, `bug-workflow.e2e.spec.ts`）で回帰テスト
  - 新規にファイル監視イベントのテストシナリオを追加

## Introduction

ファイル監視機構（`BugsWatcherService`, `SpecsWatcherService`）を「個別パス監視 + 動的追加」方式から「ルート監視 + Globフィルタリング」方式に移行することで、500ms待機のタイミング依存性を解消し、イベント処理のオーバーヘッドを削減する。これにより、Worktree作成時の不安定性を排除し、ファイル変更検知の信頼性と効率性を向上させる。

## Requirements

### Requirement 1: ルート監視方式への移行

**Objective:** ユーザーとして、Worktree作成時に500ms待機なしでファイル監視が正常に動作することを期待する。

#### Acceptance Criteria
1. When `BugsWatcherService.start()` が呼ばれたとき、システムは以下のパスを監視する:
   - `.kiro/bugs/`
   - `.kiro/worktrees/bugs/`
2. When `SpecsWatcherService.start()` が呼ばれたとき、システムは以下のパスを監視する:
   - `.kiro/specs/`
   - `.kiro/worktrees/specs/`
3. If Worktree内のファイルが作成・変更・削除された場合、システムは即座にイベントを検知し、コールバックを実行する
4. The システムは、`handleWorktreeAddition()` および `handleWorktreeRemoval()` メソッドを呼び出さない（削除される）
5. The システムは、`worktreeAdditionTimers` を使用しない（削除される）

### Requirement 2: 除外パターンによる最適化

**Objective:** システムとして、不要なファイル監視イベントを削減し、CPU負荷を軽減する。

#### Acceptance Criteria
1. When `chokidar.watch()` を初期化するとき、システムは以下のパターンを `ignored` オプションで除外する:
   - `**/runtime/**`
   - `**/.git/**`
   - `**/logs/**`
   - `**/*.log`
2. When ファイル変更イベントが発生したとき、システムは `.json` または `.md` 以外のファイルを早期除外する
3. The システムは、除外パターンに該当するファイルのイベントを処理しない

### Requirement 3: 既存パス解析ロジックの維持

**Objective:** 開発者として、既存の `extractBugName()` および `extractSpecId()` ロジックを変更せずに再利用できる。

#### Acceptance Criteria
1. When ファイルパスが `.kiro/bugs/{bugName}/...` の形式のとき、システムは `extractBugName()` で `bugName` を正しく抽出する
2. When ファイルパスが `.kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...` の形式のとき、システムは `extractBugName()` で `bugName` を正しく抽出する
3. When ファイルパスが `.kiro/specs/{specId}/...` の形式のとき、システムは `extractSpecId()` で `specId` を正しく抽出する
4. When ファイルパスが `.kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/...` の形式のとき、システムは `extractSpecId()` で `specId` を正しく抽出する

### Requirement 4: 2層監視ロジックの削除

**Objective:** コードベースとして、不要になった動的パス追加ロジックを削除し、保守性を向上させる。

#### Acceptance Criteria
1. The システムは、`handleWorktreeAddition()` メソッドを含まない（削除される）
2. The システムは、`handleWorktreeRemoval()` メソッドを含まない（削除される）
3. The システムは、`worktreeAdditionTimers` プロパティを含まない（削除される）
4. The システムは、`worktreeAdditionDebounceMs` プロパティを含まない（削除される）
5. The システムは、`detectWorktreeAddition()` ヘルパー関数を呼び出さない

### Requirement 5: chokidar設定の最適化

**Objective:** システムとして、効率的なファイル監視設定を適用し、パフォーマンスを維持する。

#### Acceptance Criteria
1. When `chokidar.watch()` を初期化するとき、システムは以下の設定を適用する:
   - `ignoreInitial: true`（既存ファイルのイベントを無視）
   - `persistent: true`（監視を継続）
   - `depth: undefined`（全階層を監視、デフォルト値）
   - `awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }`（書き込み完了待機）
2. The システムは、`depth: 2` 設定を使用しない（削除される）

### Requirement 6: 既存インターフェースの互換性維持

**Objective:** ユーザーとして、既存の `onChange()`, `start()`, `stop()` インターフェースが変更なく動作することを期待する。

#### Acceptance Criteria
1. When `BugsWatcherService.onChange(callback)` が呼ばれたとき、システムはコールバックを登録する
2. When `SpecsWatcherService.onChange(callback)` が呼ばれたとき、システムはコールバックを登録する
3. When ファイル変更イベントが発生したとき、システムは登録された全コールバックを実行する
4. When `stop()` が呼ばれたとき、システムは全監視パスを解除し、デバウンスタイマーをクリアする

### Requirement 7: E2Eテストによる動作検証

**Objective:** 開発者として、ファイル監視機構の変更が既存ワークフローに影響しないことをE2Eテストで確認する。

#### Acceptance Criteria
1. When E2Eテスト（`spec-workflow.e2e.spec.ts`）を実行したとき、全テストケースがパスする
2. When E2Eテスト（`bug-workflow.e2e.spec.ts`）を実行したとき、全テストケースがパスする
3. When Worktree作成後にファイルを追加したとき、新規統合テスト（`file-watcher-root-monitoring.e2e.spec.ts`）でファイル監視イベントが即座に（500ms待機なしで）検知されることを確認する

### Requirement 8: ユニットテストの追加

**Objective:** 開発者として、ルート監視方式の動作をユニットテストで検証する。

#### Acceptance Criteria
1. When `BugsWatcherService.start()` を実行したとき、ユニットテストで監視パスが正しく設定されることを確認する
2. When ファイル変更イベントをシミュレートしたとき、ユニットテストでコールバックが正しく実行されることを確認する
3. When 除外パターンに該当するファイルのイベントが発生したとき、ユニットテストでコールバックが実行されないことを確認する

### Requirement 9: watchedPaths Setの継続使用

**Objective:** システムとして、既存の `watchedPaths: Set<string>` を継続使用し、二重監視を防止する。

#### Acceptance Criteria
1. When `start()` が呼ばれたとき、システムは初期監視パスを `watchedPaths` に追加する
2. When `stop()` が呼ばれたとき、システムは `watchedPaths` からすべてのパスを削除する
3. The システムは、`watchedPaths` に既に存在するパスを重複して監視しない

### Requirement 10: ログ出力の維持

**Objective:** 運用者として、ファイル監視の動作をログで追跡できる。

#### Acceptance Criteria
1. When `start()` が実行されたとき、システムは監視対象パスをログに出力する
2. When ファイル変更イベントが発生したとき、システムは以下の情報をログに出力する:
   - イベントタイプ（add, change, unlink, addDir, unlinkDir）
   - ファイルパス
   - 抽出された bugName または specId
3. When 除外パターンによりイベントが無視されたとき、システムはデバッグレベルでログに出力する

## Out of Scope

以下は本仕様の対象外:
- `AgentRecordWatcherService` のリファクタリング（既に最適化済み）
- `GitFileWatcherService` のリファクタリング（単一ファイル監視で最適）
- Remote UI/SSH経由でのファイル監視の変更（Mainプロセスで監視するため影響なし）
- ファイル監視イベントのデバウンス時間の変更（既存の300msを維持）
- `resetWatchPath()` メソッドのリファクタリング（既存の動作を維持）

## Open Questions

なし。すべての設計方針は対話を通じて確定済み。
