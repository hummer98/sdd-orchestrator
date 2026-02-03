# Requirements: Remote UI Task Display

## Decision Log

### 表示スコープ
- **Discussion**: タスク進捗バーのみ、tasks.md内容表示のみ、両方のいずれか
- **Conclusion**: タスク進捗バー＋tasks.md内容表示の両方を実装
- **Rationale**: Electron版と同等の機能を提供し、ユーザー体験を統一するため

### レイアウト対応範囲
- **Discussion**: DesktopLayoutのみ対応するか、MobileLayoutも含めるか
- **Conclusion**: DesktopLayout + MobileLayout両方に対応
- **Rationale**: 全プラットフォームで統一した体験を提供するため

### データ取得方式
- **Discussion**: specDetail取得時に一括読み込み vs getArtifactContentによる遅延読み込み
- **Conclusion**: getArtifactContentによる遅延読み込み
- **Rationale**: Remote UIでは既に他のartifacts（requirements, design等）で遅延読み込みパターンが確立されており、一貫性を保つ。また、specDetailは頻繁に同期されるため、常にtasks.mdの全文を含めるとネットワーク負荷が増加する

### タスク解析ロジックの配置
- **Discussion**: Electron版のspecDetailStoreにあるロジックをRemote UI用に新規作成するか、shared/に移動して共有するか
- **Conclusion**: shared/に移動して両版で共有
- **Rationale**: DRY原則に従い、同じロジックの重複を避ける

### エラー時の表示
- **Discussion**: tasks.mdが存在しない、または解析失敗時の表示方法
- **Conclusion**: 「タスクなし」と表示
- **Rationale**: ユーザーに明示的なフィードバックを提供し、状態を明確にする

### リアルタイム更新
- **Discussion**: tasks.md更新時の反映タイミング（自動 vs 手動）
- **Conclusion**: specDetail更新時に自動再取得
- **Rationale**: 既存の同期フローに統合し、シームレスな体験を提供

## Introduction

Remote UI（Web版）のDesktopLayoutおよびMobileLayoutで、tasks.mdを元にしたタスク進捗表示を実装する。現在、Electron版ではタスク進捗バーとtasks.md内容の展開表示が可能だが、Remote UI版では未実装となっている。本機能により、Remote UIユーザーもSpec実装の進捗を確認できるようになる。

## Requirements

### Requirement 1: タスク解析ロジックの共有化

**Objective:** 開発者として、タスク解析ロジックを共有モジュールに配置することで、Electron版とRemote UI版でコードの重複を避けたい

#### Acceptance Criteria
1. When tasks.mdの内容が渡されたとき、the system shall マークダウンのチェックボックス（`- [x]`、`- [ ]`）をパースしてタスク数を集計する
2. The system shall `{ total: number, completed: number, percentage: number }` 形式のtaskProgress オブジェクトを返す
3. The system shall 共有モジュールを `src/shared/utils/` または `src/shared/hooks/` に配置する
4. When tasks.mdが空または存在しない場合、the system shall `{ total: 0, completed: 0, percentage: 0 }` を返す

### Requirement 2: Remote UIでのタスクコンテンツ取得

**Objective:** Remote UIユーザーとして、tasks.mdの内容を取得してタスク進捗を表示したい

#### Acceptance Criteria
1. When specDetailが更新されたとき、the system shall tasks.mdのexistsフラグを確認する
2. If tasks.mdが存在する場合、then the system shall getArtifactContent APIを呼び出してコンテンツを取得する
3. When コンテンツ取得が完了したとき、the system shall 共有タスク解析ロジックを使用してtaskProgressを計算する
4. If tasks.mdが存在しない、または取得に失敗した場合、then the system shall 「タスクなし」状態として処理する

### Requirement 3: DesktopLayoutでのタスク進捗表示

**Objective:** デスクトップブラウザユーザーとして、Electron版と同等のタスク進捗表示を確認したい

#### Acceptance Criteria
1. The system shall タスク進捗バー（完了数/総数、パーセンテージ）を表示する
2. The system shall tasks.mdの内容を展開可能なセクションとして表示する
3. When タスクが存在しない場合、the system shall 「タスクなし」メッセージを表示する
4. The system shall Electron版のSpecDetail.tsxと視覚的に一貫した表示とする

### Requirement 4: MobileLayoutでのタスク進捗表示

**Objective:** モバイルブラウザユーザーとして、タッチ操作に適したタスク進捗表示を確認したい

#### Acceptance Criteria
1. The system shall タスク進捗バー（完了数/総数、パーセンテージ）を表示する
2. The system shall tasks.mdの内容を展開可能なセクションとして表示する
3. When タスクが存在しない場合、the system shall 「タスクなし」メッセージを表示する
4. The system shall モバイル画面幅に適したレイアウトで表示する

### Requirement 5: リアルタイム同期

**Objective:** ユーザーとして、tasks.mdが更新されたときに自動的に最新の進捗を確認したい

#### Acceptance Criteria
1. When specDetailがWebSocket経由で更新されたとき、the system shall tasks.mdのexistsフラグの変化を検知する
2. If existsフラグがfalseからtrueに変わった場合、then the system shall 自動的にコンテンツを再取得する
3. If 既にコンテンツを取得済みでspecDetailが更新された場合、then the system shall コンテンツを再取得して表示を更新する

## Out of Scope

- tasks.mdの編集機能（Remote UIは閲覧専用）
- タスクの個別チェック/アンチェック操作
- タスク完了時の通知機能
- 並列タスク実行（parallelTaskInfo）の表示（既存機能として別途存在）

## Open Questions

- WorkflowViewCoreの`renderTaskProgress` propを使用するか、それとも別のコンポーネント構成にするかは設計フェーズで決定
- MobileLayoutでの具体的なUI配置（どのパネルに表示するか）は設計フェーズで決定
