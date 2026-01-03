# Research & Design Decisions

## Summary

- **Feature**: commandset-version-detection
- **Discovery Scope**: Extension（既存システムへの機能拡張）
- **Key Findings**:
  - CommandsetDefinitionManagerに既にバージョンフィールドが存在（version: "1.0.0"）
  - UpdateManagerにLATEST_VERSIONS定数が重複定義されている（SSOTに反する）
  - sdd-orchestrator.jsonは現在version: 2でprofile/layoutを管理
  - RecentProjectsコンポーネントが既存のプロジェクト一覧表示を担当

## Research Log

### 既存バージョン管理の調査

- **Context**: バージョン定義のSSOT化要件（5.1-5.4）の実現可能性確認
- **Sources Consulted**:
  - `commandsetDefinitionManager.ts`
  - `updateManager.ts`
  - `layoutConfigService.ts`
- **Findings**:
  - `CommandsetDefinitionManager`の`CommandsetDefinition`インターフェースに`version: string`フィールドが既に存在
  - 現在は`'cc-sdd': '1.0.0'`, `'bug': '1.0.0'`, `'spec-manager': '1.0.0'`として静的に定義
  - `UpdateManager`に別途`LATEST_VERSIONS`定数が定義されており、DRY違反
  - `UpdateManager.detectVersion()`はファイル内コメントからバージョンを抽出しようとするが、スケルトン実装
- **Implications**:
  - CommandsetDefinitionManager.getVersion()を追加すればSSOT化が容易
  - UpdateManagerのLATEST_VERSIONSは削除可能

### sdd-orchestrator.jsonスキーマの調査

- **Context**: スキーマ拡張要件（6.1-6.4）の後方互換性確認
- **Sources Consulted**:
  - `layoutConfigService.ts`
  - 実際の`.kiro/sdd-orchestrator.json`ファイル
- **Findings**:
  - 現在version: 2で運用中
  - Zodスキーマで厳密にバリデーション
  - v1→v2のマイグレーション処理が既に存在
  - profile/layoutフィールドはoptional
- **Implications**:
  - v3への拡張はcommandsets追加のみで後方互換
  - 既存のマイグレーションパターンを踏襲可能

### プロジェクト一覧表示の調査

- **Context**: 警告表示要件（3.1-3.4）の実装箇所特定
- **Sources Consulted**:
  - `RecentProjects.tsx`
  - `projectStore.ts`
- **Findings**:
  - `RecentProjects`コンポーネントがプロジェクト一覧を表示
  - `projectStore.recentProjects`でパス一覧を管理
  - 現在はアイコンなしのシンプルなリスト表示
  - Lucide Reactアイコンライブラリを使用中
- **Implications**:
  - AlertTriangleアイコンを使用して警告表示可能
  - 新しいVersionStatusStoreでバージョン状態を管理

### セマンティックバージョン比較の調査

- **Context**: バージョン比較要件（2.5）の実装方針確認
- **Sources Consulted**:
  - `updateManager.ts`のcompareVersions関数
- **Findings**:
  - 既存のcompareVersions関数が存在
  - MAJOR.MINOR.PATCH形式を想定
  - プレリリースサフィックス（-alpha等）は無視
- **Implications**:
  - 既存実装を流用可能
  - CommandsetVersionServiceに移動して再利用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| UpdateManager拡張 | 既存UpdateManagerにバージョンチェック機能を追加 | 既存コードの再利用 | UpdateManagerはスケルトン実装で責務が曖昧 | 非推奨 |
| CommandsetVersionService新設 | 専用サービスとしてバージョン検出を分離 | 単一責務、テスト容易 | 新ファイル追加 | **採用** |
| ProjectStore拡張 | Renderer側でバージョンチェック | 既存パターン踏襲 | Mainプロセスでのファイルアクセスが困難 | 非推奨 |

## Design Decisions

### Decision: CommandsetVersionServiceの新設

- **Context**: バージョン検出ロジックの配置場所
- **Alternatives Considered**:
  1. UpdateManager拡張 - スケルトン実装の責務が曖昧
  2. CommandsetDefinitionManager拡張 - 定義管理と検出ロジックの混在
  3. 新サービス作成 - 明確な責務分離
- **Selected Approach**: CommandsetVersionServiceとして新設
- **Rationale**: 単一責務の原則に従い、バージョン検出・比較ロジックを集約
- **Trade-offs**: 新ファイル追加だが、テスト容易性と保守性が向上
- **Follow-up**: UpdateManagerのLATEST_VERSIONSを削除し、このサービスへ移行

### Decision: sdd-orchestrator.json v3スキーマ

- **Context**: バージョン情報の永続化方法
- **Alternatives Considered**:
  1. 別ファイル（.kiro/commandset-versions.json）
  2. 既存スキーマ拡張（v3）
  3. profileフィールド内にバージョン追加
- **Selected Approach**: v3スキーマとしてcommandsetsフィールドを追加
- **Rationale**: 単一ファイルでプロジェクト設定を管理、既存マイグレーションパターン踏襲
- **Trade-offs**: スキーマバージョン増加だが、後方互換性を維持
- **Follow-up**: v2→v3のマイグレーション処理をloadProjectConfigに追加

### Decision: レガシープロジェクトの0.0.1扱い

- **Context**: commandsetsフィールドがない既存プロジェクトの扱い
- **Alternatives Considered**:
  1. バージョン不明として警告なし
  2. 0.0.0として常に更新必要
  3. 0.0.1として常に更新必要
- **Selected Approach**: 0.0.1として常に更新必要と判定
- **Rationale**: 要件2.3に明記、保守的な判定で更新漏れを防止
- **Trade-offs**: 既存プロジェクト全てに警告が出る可能性
- **Follow-up**: ユーザーへの初期警告対応のドキュメント追加

### Decision: VersionStatusStoreの新設

- **Context**: Renderer側でのバージョン状態管理
- **Alternatives Considered**:
  1. ProjectStoreに追加
  2. 専用Store新設
  3. コンポーネントローカル状態
- **Selected Approach**: VersionStatusStoreとして新設
- **Rationale**: 関心の分離、ProjectStoreの肥大化防止
- **Trade-offs**: Store増加だが、各Storeの責務が明確
- **Follow-up**: 必要に応じてProjectStoreとの統合を検討

## Risks & Mitigations

- **大量プロジェクトでのパフォーマンス** - 並列バージョンチェック、遅延ロードで対応
- **スキーママイグレーション失敗** - try-catchで既存フォーマットにフォールバック
- **バージョン形式不正** - 正規表現バリデーション、不正時は0.0.0扱い
- **LATEST_VERSIONS削除の影響** - UpdateManagerの既存機能が依存していないことを確認済み

## References

- [Semantic Versioning 2.0.0](https://semver.org/) - セマンティックバージョン仕様
- [Zod Documentation](https://zod.dev/) - スキーマバリデーション
- [Zustand Documentation](https://zustand-demo.pmnd.rs/) - 状態管理パターン
