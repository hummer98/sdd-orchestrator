# Research & Design Decisions: File Watcher Root Monitoring

## Summary

- **Feature**: file-watcher-root-monitoring
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存の2層監視方式は、Worktree作成時の500ms待機に依存し、タイミング問題を抱えている
  - chokidarライブラリは、ルート監視 + `ignored`オプションでパフォーマンスを維持できる
  - 既存のパス解析ロジック（`extractBugName`, `extractSpecId`）はそのまま再利用可能

## Research Log

### 既存実装の分析

**Context**: ファイル監視機構の現在の実装パターンを理解し、リファクタリングの範囲を特定する必要があった。

**Sources Consulted**:
- `electron-sdd-manager/src/main/services/bugsWatcherService.ts`
- `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts`
- `electron-sdd-manager/src/main/services/GitFileWatcherService.ts`

**Findings**:
- **BugsWatcherService / SpecsWatcherService**: 2層監視方式を採用
  - 初期化時: `.kiro/bugs/`, `.kiro/worktrees/bugs/`（ベースディレクトリのみ、`depth: 2`）を監視
  - Worktree追加検知: `addDir`イベントで`.kiro/worktrees/bugs/{bugName}/`を検知 → 500ms待機 → 内部パス`.kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/`を動的に追加監視
  - Worktree削除検知: `unlinkDir`イベントで内部パスを監視解除
- **AgentRecordWatcherService**: 既に最適化済み（`depth: 0`、スコープ切替方式）
- **GitFileWatcherService**: 単一ファイル監視（`.git/index`）で最適

**Implications**:
- リファクタリング対象は`BugsWatcherService`と`SpecsWatcherService`のみ
- `AgentRecordWatcherService`と`GitFileWatcherService`は変更不要
- 既存のパス解析ロジック（`extractBugName`, `extractSpecId`）は維持可能

### 500ms待機タイマーの問題

**Context**: Worktree作成時の500ms待機が、なぜ不安定性を引き起こすのかを調査する必要があった。

**Findings**:
- **タイミング依存**: 500msはディレクトリ構造の作成完了を"期待"するだけで、確実性がない
  - Worktreeディレクトリ作成と内部ファイル作成のタイミングは、ファイルシステムの負荷によって変動する
  - 500ms以内に内部ファイルが作成されない場合、監視対象に含まれない
- **複雑性**: `handleWorktreeAddition()`, `handleWorktreeRemoval()`, `worktreeAdditionTimers`による状態管理が複雑
  - タイマーのクリア処理が複数箇所に分散（`stop()`, `handleWorktreeRemoval()`）
  - デバッグ時に、どのタイマーがアクティブかを追跡することが困難

**Implications**:
- ルート監視方式に移行することで、500ms待機を完全削除できる
- タイマー管理のコードを削除でき、保守性が向上

### chokidar設定の調査

**Context**: ルート監視方式に移行する際、chokidarの設定でパフォーマンスを維持する必要があった。

**Sources Consulted**:
- chokidar公式ドキュメント: https://github.com/paulmillr/chokidar
- 既存コードベース（`specsWatcherService.ts` L164-173）

**Findings**:
- **depth設定**:
  - `depth: 2`: 2階層までのディレクトリを監視（既存設定）
  - `depth: undefined`: すべての階層を監視（デフォルト動作）
  - Worktree内部のファイル構造が変化しても、`depth: undefined`なら確実に監視できる
- **ignoredオプション**:
  - Glob パターンで監視対象外のディレクトリ・ファイルを指定可能
  - 例: `**/runtime/**`, `**/.git/**`, `**/logs/**`, `**/*.log`
  - chokidarの内部で監視対象外になるため、OS側の監視負荷を軽減
- **awaitWriteFinish**:
  - ファイル書き込み完了を待機する設定（既存設定を維持）
  - `stabilityThreshold: 200` — ファイルサイズが200ms間変化しなければ完了とみなす
  - `pollInterval: 100` — 100msごとにファイルサイズをチェック

**Implications**:
- `depth: undefined`に変更しても、`ignored`オプションで不要なディレクトリを除外すれば、パフォーマンスを維持できる
- 既存の`awaitWriteFinish`設定を維持することで、ファイル書き込み中のイベント発火を防止

### パス解析ロジックの再利用性

**Context**: 既存の`extractBugName()`と`extractSpecId()`がルート監視方式でも動作するかを確認する必要があった。

**Findings**:
- **既存ロジック**（`bugsWatcherService.ts` L51-80）:
  - 標準パス: `.kiro/bugs/{bugName}/...` → `bugName`を抽出
  - Worktreeパス: `.kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...` → `bugName`を抽出
  - パターンマッチロジックは、ルート監視方式でも変更不要
- **拡張子フィルタリング**:
  - 既存実装では拡張子フィルタリングが行われていない
  - ルート監視方式では、`.json`, `.md`以外のファイルを早期除外する必要がある

**Implications**:
- `extractBugName()`と`extractSpecId()`は変更不要
- イベントハンドラで拡張子フィルタリングを追加する必要がある

### 除外パターンの設計

**Context**: どのディレクトリ・ファイルを監視対象外にすべきかを決定する必要があった。

**Sources Consulted**:
- 既存のディレクトリ構造（`.kiro/`配下）
- `specsWatcherService.ts` L168（既存の除外パターン: `**/logs/**`, `**/*.log`）

**Findings**:
- **監視不要なディレクトリ**:
  - `.kiro/runtime/`: Agent実行ログ等が頻繁に更新される
  - `.kiro/steering/`: 静的ファイルで変更頻度が低い
  - `.kiro/worktrees/{entity}/.git/`: Gitの内部ファイル
  - `**/logs/`: ログディレクトリ
- **監視不要なファイル**:
  - `**/*.log`: ログファイル

**Implications**:
- `ignored`オプションに以下を指定: `**/runtime/**`, `**/.git/**`, `**/logs/**`, `**/*.log`
- `.kiro/steering/`は静的ファイルで変更頻度が低いため、除外パターンに含めない（変更があっても問題ない）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 2層監視（既存） | ベースディレクトリを監視 → Worktree追加検知 → 500ms待機 → 内部パス追加 | 監視対象を最小限にできる | タイミング依存、複雑な状態管理 | 既存実装の問題点を解決するため不採用 |
| ルート監視 + Globフィルタリング | 初期化時にすべての監視対象パスを固定 → `ignored`オプションで除外 | タイミング依存なし、シンプル | 監視対象ファイル数が増加する可能性 | **採用** - `ignored`オプションで軽減可能 |
| 段階的移行（フラグ切り替え） | 旧方式と新方式をフラグで切り替え可能にする | ロールバックが容易 | コードの複雑性が増す | 不採用 - Worktree環境で隔離して開発すれば十分 |

## Design Decisions

### Decision: ルート監視方式の採用

- **Context**: 既存の2層監視方式は、Worktree作成時の500ms待機に依存しており、タイミング問題が発生していた。
- **Alternatives Considered**:
  1. **短期施策（watchedPaths Set導入）**: 既に実装済み（L38 in BugsWatcherService, L52 in SpecsWatcherService）のため、追加対応不要
  2. **段階的移行（フラグ切り替え）**: コードの複雑性が増すだけで、メリットが少ない
- **Selected Approach**: ルート監視方式（Root Monitoring with Glob Filtering）
  - 初期化時に監視対象パスを固定（`.kiro/bugs/`, `.kiro/worktrees/bugs/`, 既存Worktreeの内部パス）
  - `ignored`オプションで不要なディレクトリ・ファイルを除外
  - イベントハンドラで拡張子フィルタリング（`.json`, `.md`のみ）
- **Rationale (Why)**:
  - **タイミング依存性の排除**: Worktree内部のファイルも自動的に監視対象になるため、500ms待機が不要
  - **保守性の向上**: 2層監視ロジック（約200行）を削除でき、コードがシンプルになる
  - **パフォーマンスの維持**: `ignored`オプションでOS側の監視負荷を軽減
  - **テスト容易性**: 既存のE2Eテストで動作検証が可能（インターフェース維持）
- **Trade-offs**:
  - **Benefits**: タイミング依存なし、コード削減、保守性向上
  - **Compromises**: 監視対象ファイル数が増加する可能性があるが、`ignored`オプションで軽減可能
- **Follow-up**: E2Eテストで既存ワークフローが正常動作することを確認する

### Decision: depth設定の変更

- **Context**: 既存の`depth: 2`設定では、Worktree内部の深い階層にあるファイルが監視対象外になる可能性がある。
- **Alternatives Considered**:
  1. **depth: 5等の固定値**: 将来的にディレクトリ構造が変わると対応が必要
  2. **depth: undefined（デフォルト動作）**: すべての階層を監視
- **Selected Approach**: `depth: undefined`
- **Rationale (Why)**:
  - Worktree内部のファイル構造が変化しても、確実に監視できる
  - chokidarのデフォルト動作を利用することで、実装がシンプルになる
- **Trade-offs**:
  - **Benefits**: 将来的なディレクトリ構造の変更に対応可能
  - **Compromises**: 監視対象ファイル数が増加する可能性があるが、`ignored`オプションで軽減可能
- **Follow-up**: なし

### Decision: 既存インターフェースの維持

- **Context**: `BugsWatcherService`と`SpecsWatcherService`は、MainプロセスとRendererプロセスの複数箇所から使用されている。
- **Alternatives Considered**:
  1. **インターフェース変更**: 呼び出し側も変更する必要があり、リグレッションリスクが高い
  2. **インターフェース維持**: 内部実装のみ変更し、外部から見た動作は変わらない
- **Selected Approach**: インターフェース維持
- **Rationale (Why)**:
  - 呼び出し側への影響をゼロにすることで、リグレッションリスクを最小化
  - E2Eテストで既存ワークフローが正常動作することを確認すれば、回帰テストが完了
- **Trade-offs**:
  - **Benefits**: リグレッションリスク最小、呼び出し側の変更不要
  - **Compromises**: なし
- **Follow-up**: なし

## Risks & Mitigations

- **Risk**: ルート監視により、監視対象ファイル数が増加し、パフォーマンスが劣化する
  - **Mitigation**: `ignored`オプションで不要なディレクトリ・ファイルを除外し、イベント処理のオーバーヘッドを削減
- **Risk**: E2Eテストで既存ワークフローが正常動作しない可能性がある
  - **Mitigation**: Worktree環境で開発し、E2Eテストで動作検証してからmerge
- **Risk**: 拡張子フィルタリングの追加により、既存の動作が変わる可能性がある
  - **Mitigation**: `.json`, `.md`以外のファイルは既存実装でも処理対象外なので、影響は最小限

## References

- [chokidar公式ドキュメント](https://github.com/paulmillr/chokidar) — ファイルシステム監視ライブラリ
- 既存実装:
  - `electron-sdd-manager/src/main/services/bugsWatcherService.ts`
  - `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- requirements.md — 本機能の要件定義
