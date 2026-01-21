# Requirements: Spec Path SSOT Refactor

## Decision Log

### 1. 問題の本質: FileWatcher監視対象とselectedSpec.pathの不整合

- **Discussion**: worktree変換後にUIが正しく更新されない問題を調査。SpecListItemは更新されるが、SpecWorkflowFooterとArtifactが更新されない現象が発生。
- **Conclusion**: 2つの根本原因を特定
  1. FileWatcher（specsWatcherService）がworktree変換後の新しいパスを監視していない
  2. Renderer側のselectedSpec.pathが古いまま保持され、Main側へのAPI呼び出しに古いパスが使用される
- **Rationale**: 場当たり的な修正ではなく、アーキテクチャレベルでの解決が必要

### 2. 2段階監視方式の採用

- **Discussion**: worktree変換後に新しいパスを監視対象に追加する方法として、(A) watcherリスタート、(B) 動的パス追加、(C) 2段階監視を検討
- **Conclusion**: 2段階監視方式を採用。`.kiro/worktrees/specs/`を常時監視し、worktree追加/削除を動的に検知して内部specパスを監視対象に追加/削除
- **Rationale**: watcherリスタートは非効率、単純な動的追加はトリガーが不明確。2段階監視はworktreeライフサイクルに自然に対応できる

### 3. specNameベースAPI設計への移行

- **Discussion**: Renderer側がpathを保持・指定する現状の設計を見直し。pathはファイルシステムに近いMain側が管理すべきか検討
- **Conclusion**: すべてのspec関連APIをspecNameベースに変更。`readSpecJson(path)` → `readSpecJson(projectPath, specName)`
- **Rationale**: Renderer側でpathを計算・保持するのは責務の分離として不適切。SSOT原則に従い、path解決はMain側で一元管理

### 4. 対象APIの範囲

- **Discussion**: readSpecJsonのみ先行して変更するか、すべてのAPIを一括で変更するか
- **Conclusion**: すべてのspec関連APIを一貫してspecNameベースに変更（readSpecJson, readArtifact, updateSpecJson等）
- **Rationale**: 一部だけ変更すると不整合が生じる。一貫性のある設計変更が保守性を高める

### 5. path解決ロジックの配置

- **Discussion**: specName→path解決ロジックを(A) FileServiceに追加、(B) 新規SpecPathResolverサービスを作成
- **Conclusion**: FileServiceに追加
- **Rationale**: 既にFileServiceがspecファイル操作を担当しており、新規サービス追加は複雑性が増す

### 6. path解決の優先順位

- **Discussion**: specNameから実際のpathを解決する際の検索順序
- **Conclusion**: 以下の優先順位で解決
  1. `.kiro/worktrees/{entityType}/{name}/.kiro/{entityType}/{name}/` が存在 → worktree内のpath
  2. `.kiro/{entityType}/{name}/` が存在 → 通常のpath
  3. どちらも存在しない → エラー
- **Rationale**: worktreeモードが有効な場合はそちらを優先すべき

### 7. SpecMetadata型の扱い

- **Discussion**: pathフィールド削除後、SpecMetadataをどうするか。(A) 型として残す、(B) type aliasに簡略化、(C) stringに置換
- **Conclusion**: 型として残し、pathフィールドのみ削除。`interface SpecMetadata { name: string }`
- **Rationale**: 将来の拡張性（worktreeモード情報等の追加可能性）と型安全性を確保

### 8. Bugsワークフローの同時対応

- **Discussion**: BugMetadataも同様にpathフィールドを持っている。Specsのみ修正するとBugsとの設計不整合が生じる
- **Conclusion**: Bugsワークフローも同時に修正。ローレベルAPIは共通化する
- **Rationale**: 修正パターンが同一であり、後から同じ作業をやり直すより効率的。設計の一貫性も保たれる

### 9. ローレベルAPI共通化

- **Discussion**: specs/bugs両方のpath解決、ファイル監視パターンは同じ構造を持つ
- **Conclusion**: 共通の`resolveEntityPath`関数とWatcher基底パターンを実装
- **Rationale**: DRY原則に従い、重複コードを排除。将来の拡張（新しいentityタイプ追加）にも対応しやすい

## Introduction

worktree変換後にElectron UIが正しく更新されない問題を根本的に解決するため、spec/bug path管理のアーキテクチャを刷新する。具体的には、WatcherServiceに2段階監視方式を導入してworktreeの動的な追加/削除に対応し、関連APIをnameベースに統一してRenderer側からpath管理の責務を排除する。Specs/Bugsの共通部分はローレベルAPIとして共通化し、保守性と一貫性を向上させる。

## Requirements

### Requirement 1: 共通path解決ロジックの実装

**Objective:** システムとして、entityName（specName/bugName）から実際のファイルパスを一元的に解決できることで、path管理のSSOT（Single Source of Truth）を実現したい

#### Acceptance Criteria

1.1. FileServiceに`resolveEntityPath(projectPath: string, entityType: 'specs' | 'bugs', entityName: string): Promise<Result<string, FileError>>`メソッドが追加される

1.2. path解決は以下の優先順位で行われる:
   - 優先1: `.kiro/worktrees/{entityType}/{entityName}/.kiro/{entityType}/{entityName}/`が存在する場合、このパスを返す
   - 優先2: `.kiro/{entityType}/{entityName}/`が存在する場合、このパスを返す
   - 優先3: どちらも存在しない場合、`NOT_FOUND`エラーを返す

1.3. 便利メソッドとして`resolveSpecPath`と`resolveBugPath`が提供され、内部で`resolveEntityPath`を呼び出す

1.4. path解決は非同期で行われ、ファイルシステムの存在確認を実行する

### Requirement 2: 2段階監視方式の実装（Specs）

**Objective:** システム運用者として、worktree変換後も自動的に新しいパスが監視対象になることで、UIが常に最新状態を反映できるようにしたい

#### Acceptance Criteria

2.1. specsWatcherServiceは起動時に`.kiro/specs/`と`.kiro/worktrees/specs/`の両方を監視対象とする

2.2. `.kiro/worktrees/specs/{worktree-name}`ディレクトリが追加された場合、システムは`.kiro/worktrees/specs/{worktree-name}/.kiro/specs/{feature-name}/`を監視対象に動的に追加する

2.3. `.kiro/worktrees/specs/{worktree-name}`ディレクトリが削除された場合、システムは対応する内部specパスを監視対象から除外する

2.4. worktree追加検知から内部specパス監視開始までの間、ディレクトリ構造の作成完了を適切に待機する

2.5. 既存のspec変更イベント（add, change, unlink, addDir, unlinkDir）の処理は変更なく動作する

### Requirement 3: 2段階監視方式の実装（Bugs）

**Objective:** システム運用者として、bugsワークフローでもworktree変換後に自動的に新しいパスが監視対象になるようにしたい

#### Acceptance Criteria

3.1. bugsWatcherServiceは起動時に`.kiro/bugs/`と`.kiro/worktrees/bugs/`の両方を監視対象とする

3.2. `.kiro/worktrees/bugs/{worktree-name}`ディレクトリが追加された場合、システムは`.kiro/worktrees/bugs/{worktree-name}/.kiro/bugs/{bug-name}/`を監視対象に動的に追加する

3.3. `.kiro/worktrees/bugs/{worktree-name}`ディレクトリが削除された場合、システムは対応する内部bugパスを監視対象から除外する

3.4. worktree追加検知から内部bugパス監視開始までの間、ディレクトリ構造の作成完了を適切に待機する

3.5. 既存のbug変更イベントの処理は変更なく動作する

### Requirement 4: Watcher共通パターンの抽出

**Objective:** 開発者として、specs/bugsのWatcherServiceに共通する2段階監視ロジックが共通化されることで、コードの重複を排除し保守性を向上させたい

#### Acceptance Criteria

4.1. 2段階監視のコアロジック（worktreeディレクトリ追加検知、内部パス動的追加、削除時の監視解除）が共通ユーティリティまたは基底クラスとして抽出される

4.2. specsWatcherServiceとbugsWatcherServiceは共通ロジックを利用して実装される

4.3. 共通ロジックはentityType（'specs' | 'bugs'）をパラメータとして受け取り、適切なパスパターンを生成する

4.4. 個別のWatcherServiceは固有のイベント処理ロジック（task completion check等）を維持する

### Requirement 5: specNameベースAPI設計（Specs）

**Objective:** 開発者として、spec関連APIがspecNameベースで統一されることで、path管理の複雑さから解放され、worktree変換時の不整合を心配せずに開発できるようにしたい

#### Acceptance Criteria

5.1. `readSpecJson`APIは`(projectPath: string, specName: string)`シグネチャに変更され、Main側でpathを解決する

5.2. `readArtifact`（spec用）APIは`(projectPath: string, specName: string, artifactType: string)`シグネチャに変更され、Main側でpathを解決する

5.3. `updateSpecJson`APIは`(projectPath: string, specName: string, updates: object)`シグネチャに変更され、Main側でpathを解決する

5.4. `syncSpecPhase`、`syncDocumentReview`等の補助APIも同様にspecNameベースに変更される

5.5. Renderer側のコードからspec pathの計算・保持ロジックが排除される

### Requirement 6: bugNameベースAPI設計（Bugs）

**Objective:** 開発者として、bug関連APIがbugNameベースで統一されることで、specsと同様にpath管理の複雑さから解放されるようにしたい

#### Acceptance Criteria

6.1. `readBugJson`APIは`(projectPath: string, bugName: string)`シグネチャに変更され、Main側でpathを解決する

6.2. `readBugArtifact`APIは`(projectPath: string, bugName: string, artifactType: string)`シグネチャに変更され、Main側でpathを解決する

6.3. `updateBugJson`APIは`(projectPath: string, bugName: string, updates: object)`シグネチャに変更され、Main側でpathを解決する

6.4. Renderer側のコードからbug pathの計算・保持ロジックが排除される

### Requirement 7: SpecMetadata型の簡素化

**Objective:** 開発者として、SpecMetadata型がspecNameのみを含む簡素な型になることで、path不整合の可能性が型レベルで排除されるようにしたい

#### Acceptance Criteria

7.1. SpecMetadata型からpathフィールドが削除され、`{ name: string }`のみとなる

7.2. SpecMetadataを使用するすべてのコンポーネント・サービスがpath参照を削除する

7.3. `SelectProjectResult.specs`は`SpecMetadata[]`（nameのみ）を返す

7.4. specDetailStore、specListStore等のstoreからpath依存ロジックが排除される

7.5. SpecListItem、SpecDetailView等のUIコンポーネントからpath依存ロジックが排除される

### Requirement 8: BugMetadata型の簡素化

**Objective:** 開発者として、BugMetadata型からpathフィールドが削除されることで、specsと一貫した設計になるようにしたい

#### Acceptance Criteria

8.1. BugMetadata型からpathフィールドが削除される

8.2. BugMetadata型の他のフィールド（phase, updatedAt, reportedAt, worktree, worktreeBasePath）は維持される

8.3. BugMetadataを使用するすべてのコンポーネント・サービスがpath参照を削除する

8.4. bugStore等のstoreからpath依存ロジックが排除される

8.5. BugListItem、BugDetailView等のUIコンポーネントからpath依存ロジックが排除される

### Requirement 9: 後方互換性とマイグレーション

**Objective:** システム運用者として、既存のspec.json/bug.jsonファイルや設定が変更なく動作し続けることで、破壊的変更による運用影響を回避したい

#### Acceptance Criteria

9.1. 既存のspec.json/bug.jsonファイル形式に変更は加えない

9.2. 既存のworktree設定（spec.json/bug.json内のworktreeフィールド）は引き続き正常に動作する

9.3. API変更に伴うIPCチャネル名の変更は、必要に応じて段階的に行う

9.4. Remote UI（WebSocket API）も同様の変更が適用され、IPC APIと一貫性を保つ

## Out of Scope

- spec.json/bug.jsonファイル形式の変更
- path解決結果のキャッシュ機構（パフォーマンス問題が顕在化した場合に対応）
- 新規entityタイプの追加（共通化により将来対応は容易になる）

## Open Questions

- Q1: WatcherService共通化の実装方式は基底クラスか、共通ユーティリティ関数か？
  - **決定**: ユーティリティ関数方式を採用（design.md DD-004参照）。TypeScriptではコンポジションが推奨され、各WatcherServiceは固有のイベント処理ロジックを持つため基底クラスより柔軟

- Q2: テストコードのモック（mockSpec.path、mockBug.path参照）の修正方針は？
  - 暫定回答: 型定義変更に伴い自動的にコンパイルエラーとなるため、順次修正

- Q3: IPCチャネル名の命名規則はどうするか？（例: `READ_SPEC_JSON` → `READ_SPEC_JSON_BY_NAME`）
  - 暫定回答: 設計フェーズで検討。既存チャネルをそのまま使い、シグネチャのみ変更する方が影響が小さい
