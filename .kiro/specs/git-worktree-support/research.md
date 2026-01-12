# Research & Design Decisions: Git Worktree Support

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `git-worktree-support`
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - Git worktreeはgitデフォルトで`../{worktree-name}`に作成される
  - spec.jsonにworktreeフィールドを追加し、フィールドの有無でモード判定
  - Agent起動時のcwd設定とファイル監視パスの切り替えが主要な変更点

## Research Log

### Git Worktree Default Behavior
- **Context**: worktree作成場所とブランチ命名の動作確認
- **Sources Consulted**:
  - [Git - git-worktree Documentation](https://git-scm.com/docs/git-worktree)
  - [GitKraken Git Worktree Guide](https://www.gitkraken.com/learn/git/git-worktree)
- **Findings**:
  - `git worktree add <path> <branch>` で既存ブランチを新しいworktreeにチェックアウト
  - `git worktree add ../hotfix` のように簡易指定可能（パスの最終コンポーネントがブランチ名になる）
  - worktreeディレクトリは空である必要がある
  - 同じブランチを複数のworktreeで同時にチェックアウトできない（`--force`除く）
- **Implications**:
  - ブランチ`feature/{feature-name}`作成後、worktree追加が必要
  - worktreeパスは`../{project}-worktrees/{feature-name}`形式が適切

### 既存アーキテクチャ分析
- **Context**: spec.json、AgentProcess、ファイル監視の既存パターン確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/index.ts` (SpecJson型)
  - `electron-sdd-manager/src/main/services/specManagerService.ts`
  - `electron-sdd-manager/src/main/services/agentProcess.ts`
- **Findings**:
  - SpecJson型は`autoExecution`、`documentReview`、`inspection`などのオプショナルフィールドを持つ
  - AgentProcessはcwdオプションで作業ディレクトリを指定
  - SpecManagerServiceはprojectPath基準でパス解決
  - specsWatcherServiceがファイル変更を監視
- **Implications**:
  - worktreeフィールドはSpecJsonに追加（オプショナル）
  - AgentProcessへのcwd渡しは既存パターンを活用
  - 監視パスの動的切り替えが必要

### Agent起動時のpwd設定
- **Context**: worktreeモード時のAgent cwd設定方法
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/agentProcess.ts`
  - `electron-sdd-manager/src/main/services/specManagerService.ts`
- **Findings**:
  - AgentProcessOptions.cwdで作業ディレクトリを指定
  - SpecManagerService.startAgentでcwdを設定
  - 現在はthis.projectPathを一律使用
- **Implications**:
  - worktreeモード時はworktree.pathを解決してcwdに設定
  - 相対パス→絶対パス変換が必要

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| worktreeフィールド追加 | spec.jsonにworktreeフィールドを追加 | シンプル、フィールド有無で判定可能 | spec.jsonスキーマ変更 | 採用 |
| 別設定ファイル | worktree.jsonを別途作成 | spec.jsonを変更しない | ファイル管理が複雑化 | 不採用 |
| ブランチベース判定 | 現在のブランチ名で判定 | 設定不要 | ブランチ名規則への依存 | 不採用 |

## Design Decisions

### Decision: spec.jsonにworktreeフィールドを追加
- **Context**: worktreeモードの状態管理方法
- **Alternatives Considered**:
  1. 別設定ファイル（worktree.json）
  2. ブランチ名ベースの動的判定
  3. gitコマンドでworktree存在確認
- **Selected Approach**: spec.jsonにworktreeフィールドを追加し、フィールドの有無でモード判定
- **Rationale (Why)**:
  - SSoT（Single Source of Truth）の原則に従う
  - 既存のspec.json読み込みフローを活用できる
  - フィールド削除でモード解除が明確
- **Trade-offs**:
  - spec.jsonスキーマ変更が必要
  - worktreeモード終了時にフィールド削除が必要
- **Follow-up**: spec.json変更時の後方互換性確認

### Decision: 相対パスでworktree.pathを保存
- **Context**: worktreeパスの保存形式
- **Alternatives Considered**:
  1. 絶対パス
  2. プロジェクトルート基準の相対パス
  3. ホームディレクトリ基準のパス
- **Selected Approach**: mainプロジェクトルート基準の相対パス（例: `../sdd-orchestrator-worktrees/feature-name`）
- **Rationale (Why)**:
  - プロジェクト移動時の堅牢性
  - gitリポジトリ内で共有可能
  - 可読性が高い
- **Trade-offs**: パス解決時に絶対パス変換が必要
- **Follow-up**: パス解決ユーティリティの実装

### Decision: impl開始時にworktree自動作成
- **Context**: worktree作成タイミング
- **Alternatives Considered**:
  1. 手動トリガー（ユーザーがボタンを押す）
  2. tasksフェーズ完了時
  3. impl開始時に自動
- **Selected Approach**: impl開始ボタン押下時に自動作成
- **Rationale (Why)**:
  - ユーザー操作の最小化
  - tasksが承認されていることが保証されている
  - ワークフローの自然な流れ
- **Trade-offs**: 作成失敗時のエラーハンドリングが必要
- **Follow-up**: mainブランチ確認ロジックの実装

### Decision: ブランチ命名規則を`feature/{feature-name}`に固定
- **Context**: worktree用ブランチの命名
- **Alternatives Considered**:
  1. カスタマイズ可能
  2. `specs/{feature-name}`
  3. `feature/{feature-name}`
- **Selected Approach**: `feature/{feature-name}` で固定
- **Rationale (Why)**:
  - 一般的なgit-flow命名規則に準拠
  - 一貫性の確保
  - 設定項目を増やさない
- **Trade-offs**: カスタマイズの柔軟性を犠牲にする
- **Follow-up**: なし

### Decision: AIによるコンフリクト自動解決を試行
- **Context**: spec-merge時のコンフリクト対応
- **Alternatives Considered**:
  1. 手動解決のみ
  2. AIによる自動解決を常に試行
  3. ユーザーに選択させる
- **Selected Approach**: AIによる自動解決を試行、失敗時はユーザーに報告
- **Rationale (Why)**:
  - ユーザー介入の最小化
  - AI Agentの能力を最大限活用
  - 失敗時のフォールバックを提供
- **Trade-offs**: AI解決の精度に依存
- **Follow-up**: コンフリクト解決の成功率モニタリング

### Decision: spec-mergeスキルでworktreeクリーンアップを自動実行
- **Context**: worktree削除のタイミングと方法
- **Alternatives Considered**:
  1. 手動削除（ユーザーに任せる）
  2. マージ成功後に自動削除
  3. 確認ダイアログ後に削除
- **Selected Approach**: spec-mergeスキル内でマージ成功後に自動削除
- **Rationale (Why)**:
  - pwdがmainブランチなので安全に削除可能
  - ユーザー操作の最小化
  - クリーンな状態を保証
- **Trade-offs**: やり直しが困難（要再作成）
- **Follow-up**: ロールバック戦略の検討

## Execution Model Decision

### Considered Approaches

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| spec-mergeをスキルとして実装 | `/kiro:spec-merge`コマンドで実行 | 既存のスキル実行パターンと整合 | 新規スキル追加が必要 |
| UI操作のみ | Deployボタンからgitコマンド直接実行 | スキル追加不要 | 複雑なgit操作をUI層で実装することになる |

### Selected Approach

**Choice**: spec-mergeをスキルとして実装

**Rationale**:
- 複雑なgit操作（マージ、コンフリクト解決、クリーンアップ）をAI Agentに委譲
- 既存のスキル実行パターン（`/kiro:*`）と整合
- エラーハンドリングとリカバリをスキル内で完結

**Implications for design.md**:
- `/kiro:spec-merge`コマンドの定義が必要
- Deployボタンはworktreeモード時に`/kiro:spec-merge`を実行
- スキル実装はallowed-toolsにBash, Read, Write, Editを含む

## Risks & Mitigations

- **Risk 1**: worktree作成失敗（ディレクトリ存在、ブランチ競合）
  - **Mitigation**: 事前チェックとエラーメッセージ表示、impl中断

- **Risk 2**: マージコンフリクト解決の失敗
  - **Mitigation**: 7回リトライ後にユーザーに報告、手動解決を案内

- **Risk 3**: 複数Specが同時にworktreeモード
  - **Mitigation**: 各Specは独立したworktreeを持つため問題なし（ドキュメントで明記）

- **Risk 4**: spec.jsonのworktreeフィールド削除漏れ
  - **Mitigation**: spec-merge完了時に必ず削除、状態不整合検出ロジック追加

- **Risk 5**: Remote UI対応の影響
  - **Mitigation**: 初期スコープではDesktop UI専用、Remote UIは将来検討

## References
- [Git - git-worktree Documentation](https://git-scm.com/docs/git-worktree) - git worktreeコマンドの公式ドキュメント
- [GitKraken Git Worktree Guide](https://www.gitkraken.com/learn/git/git-worktree) - worktree運用ガイド
- `docs/future-concepts/git-worktree-support.md` - 本機能の構想ドキュメント
