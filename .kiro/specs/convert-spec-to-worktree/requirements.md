# Requirements: 通常SpecからWorktreeへの変換機能

## Decision Log

### 1. ボタン表示条件
- **Discussion**: impl開始前のみか、特定フェーズのみかを検討
- **Conclusion**: impl未開始 かつ 実行中のspec agentが存在しないこと
- **Rationale**: 実装開始後は変換不可。agent実行中は競合を避けるため無効化

### 2. 元specディレクトリの扱い
- **Discussion**: シンボリックリンクを残すか、完全削除か
- **Conclusion**: 完全削除。代わりに `.kiro/worktrees/specs/` を監視対象に追加
- **Rationale**: シンボリックリンクより監視拡張のほうがシンプル。SSOTを維持

### 3. Worktree監視方式
- **Discussion**: specsWatcherService拡張か、新規サービス作成か
- **Conclusion**: specsWatcherServiceを拡張して `.kiro/worktrees/specs/*/` も監視
- **Rationale**: spec関連の監視ロジックを1箇所に集約。イベント処理の一貫性維持

### 4. Remote UI対応
- **Discussion**: Desktop専用にするか、Remote UIからも利用可能にするか
- **Conclusion**: Remote UI対応
- **Rationale**: リモートからもworktree変換操作を可能に

### 5. Worktree内パス構造
- **Discussion**: 現行構造維持か、フラット構造か
- **Conclusion**: 現行通り（`.kiro/worktrees/specs/{feature}/.kiro/specs/{feature}/`）
- **Rationale**: メインプロジェクトと同じパス構造を維持し、既存処理との整合性確保

## Introduction

impl開始前のspecについて、通常モードからworktreeモードへ途中から切り替えられる機能を追加する。SpecWorkflowFooterに「Worktreeに変更」ボタンを配置し、押下時にgit branch作成、worktree登録、specファイル移動、spec.json更新を行う。

## Requirements

### Requirement 1: UIボタン表示

**Objective:** ユーザーとして、impl未開始のspecをworktreeモードに変換したいので、適切なタイミングでボタンが表示される

#### Acceptance Criteria
1. When specがworktreeモードでない かつ impl未開始 かつ 実行中agentがない場合、SpecWorkflowFooterに「Worktreeに変更」ボタンが表示される
2. If specが既にworktreeモード（worktree.pathあり）の場合、ボタンは表示されない
3. If impl開始済み（worktree.branchあり）の場合、ボタンは表示されない
4. While agent実行中の場合、ボタンは無効化（disabled）される

### Requirement 2: Worktree変換処理

**Objective:** ユーザーとして、ボタン押下でspecがworktreeモードに変換されるので、隔離された開発環境で作業できる

#### Acceptance Criteria
1. When 「Worktreeに変更」ボタンを押下した場合、以下の処理が順次実行される:
   - git branch `feature/{specName}` が作成される
   - git worktree が `.kiro/worktrees/specs/{specName}` に作成される
   - spec.json に worktree設定（path, branch, created_at, enabled: true）が追加される
   - specディレクトリがworktree内に移動される（元の場所から削除）
   - logs/runtimeディレクトリのシンボリックリンクが作成される
2. If mainブランチ以外で実行された場合、エラーメッセージ「mainブランチでのみ変換できます」が表示される
3. If worktree作成に失敗した場合、作成したbranchは削除（rollback）される
4. If ファイル移動に失敗した場合、worktreeとbranchは削除（rollback）される
5. When 処理完了後、成功メッセージが表示される

### Requirement 3: Spec監視の拡張

**Objective:** システムとして、worktree内のspecも監視対象に含めるので、変換後のspecが正しく表示される

#### Acceptance Criteria
1. When プロジェクト選択時、`.kiro/specs/` と `.kiro/worktrees/specs/*/` の両方が監視対象になる
2. When worktree内にspecが追加された場合、spec一覧に反映される
3. When worktree内のspec.jsonが変更された場合、変更が検知される
4. If 元の `.kiro/specs/{specName}` が削除された場合、worktree内のspecのみが表示される

### Requirement 4: Remote UI対応

**Objective:** ユーザーとして、ブラウザからもworktree変換操作を行いたいので、Remote UIでもボタンが利用できる

#### Acceptance Criteria
1. When Remote UIでspecを表示した場合、同じ条件で「Worktreeに変更」ボタンが表示される
2. When Remote UIからボタンを押下した場合、WebSocket経由で変換処理が実行される
3. When 処理完了後、Remote UI上でも成功/エラーメッセージが表示される

### Requirement 5: エラーハンドリング

**Objective:** ユーザーとして、エラー発生時に適切なフィードバックを受けるので、問題を理解し対処できる

#### Acceptance Criteria
1. If mainブランチ以外の場合、「mainブランチでのみ変換できます。現在: {branch}」が表示される
2. If specが見つからない場合、「仕様が見つかりません」が表示される
3. If 既にworktreeモードの場合、「既にWorktreeモードです」が表示される
4. If impl開始済みの場合、「実装開始後は変換できません」が表示される
5. If worktree作成失敗の場合、「Worktree作成に失敗しました」が表示される
6. If ファイル移動失敗の場合、「ファイル移動に失敗しました」が表示される

## Out of Scope

- Worktreeモードから通常モードへの逆変換
- 複数specの一括変換
- impl開始後のworktree変換
- Worktree作成時のカスタムブランチ名指定

## Open Questions

- なし（対話で全て解決済み）
