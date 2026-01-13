# Requirements: SpecMetadata SSOT リファクタリング

## Decision Log

### SpecMetadata から重複フィールドを削除するか
- **Discussion**: `phase`, `updatedAt`, `approvals` は specJson と完全に重複。リスト表示での軽量性を理由に残す案もあったが、実測で46ファイル184KBと判明し、パフォーマンス上の懸念は否定された
- **Conclusion**: 重複フィールドを削除し、`name` と `path` のみを残す
- **Rationale**: SSOT（Single Source of Truth）原則に従い、同期バグの再発を防止

### specDetail.metadata を廃止するか
- **Discussion**: A案（metadata から重複を削除）vs B案（metadata 自体を廃止）
- **Conclusion**: A案を採用。metadata は `name` と `path` のみを保持
- **Rationale**: `name`（ディレクトリ名）と `path` は specJson に存在しない独自情報。B案は影響範囲が大きすぎる

### 根本原因の特定
- **Discussion**: 「デプロイ完了」Spec をクリックすると進捗タグが「検査完了」に戻る問題を調査
- **Conclusion**: `specDetail.metadata.phase` が selectSpec 時点の snapshot を保持し続け、ファイル変更が反映されない
- **Rationale**: specJson.phase は更新されるが、metadata.phase は古いまま残る二重管理が原因

## Introduction

SpecMetadata と specJson 間で `phase`, `updatedAt`, `approvals` フィールドが重複管理されており、同期不整合によるUIバグが発生している。本リファクタリングでは、SpecMetadata から重複フィールドを削除し、specJson を唯一の真実のソース（SSOT）とすることで、データの一貫性を確保する。

## Requirements

### Requirement 1: SpecMetadata 型定義の変更

**Objective:** 開発者として、SpecMetadata 型から重複フィールドを削除し、SSOT を実現したい

#### Acceptance Criteria

1. SpecMetadata 型は `name` と `path` のみを持つこと
2. 削除対象フィールド: `phase`, `updatedAt`, `approvals`
3. 型定義の変更後、TypeScript コンパイルが通ること

### Requirement 2: fileService.readSpecs の変更

**Objective:** fileService として、SpecMetadata 生成時に重複フィールドを含めないようにしたい

#### Acceptance Criteria

1. `readSpecs` メソッドが返す SpecMetadata に `phase`, `updatedAt`, `approvals` を含めないこと
2. 戻り値の型が新しい SpecMetadata 型と一致すること

### Requirement 3: SpecList フィルタリングの修正

**Objective:** ユーザーとして、フェーズでフィルタリングしたとき、正しい結果が表示されるようにしたい

#### Acceptance Criteria

1. SpecListStore のフィルタリングロジックが specJson.phase を参照すること
2. フィルタリング時に specJson を取得する仕組みが実装されていること
3. 既存のフィルタリング機能が正常に動作すること

### Requirement 4: SpecListItem 表示の修正

**Objective:** ユーザーとして、Spec リストに正しいフェーズバッジが表示されるようにしたい

#### Acceptance Criteria

1. SpecListItem コンポーネントが phase を props として受け取ること（metadata からではなく）
2. フェーズバッジの色とラベルが正しく表示されること
3. Electron版と Remote UI 版の両方で正常に動作すること

### Requirement 5: ソート処理の修正

**Objective:** ユーザーとして、Spec リストが更新日時順に正しくソートされるようにしたい

#### Acceptance Criteria

1. ソート処理が specJson.updated_at を参照すること
2. ソート時に specJson を取得する仕組みが実装されていること
3. 既存のソート機能が正常に動作すること

### Requirement 6: specDetail.metadata の整合性

**Objective:** 開発者として、specDetail.metadata が常に最新の情報を反映するようにしたい

#### Acceptance Criteria

1. specDetail.metadata は `name` と `path` のみを保持すること
2. phase 等の情報は specDetail.specJson から取得されること
3. Spec 選択時、ファイル変更検知時に specJson が正しく更新されること

### Requirement 7: Remote UI 互換性の維持

**Objective:** Remote UI として、Spec リストとフェーズ表示が正常に動作すること

#### Acceptance Criteria

1. WebSocket API で送信する Spec 情報に phase が含まれること
2. Remote UI の SpecListItem が正しくフェーズを表示すること
3. Remote UI のフィルタリング機能が正常に動作すること

### Requirement 8: 既存テストの更新

**Objective:** 開発者として、型変更に伴うテストの修正を行い、CI が通るようにしたい

#### Acceptance Criteria

1. SpecMetadata を使用するテストが新しい型定義に対応していること
2. フェーズフィルタリング・ソートのテストが新しい実装に対応していること
3. 全テストが PASS すること

## Out of Scope

- SpecJson の構造変更
- BugMetadata の同様のリファクタリング（別 Spec で対応）
- パフォーマンス最適化（現時点で問題なし）

## Open Questions

- リスト表示時に各 Spec の specJson を読み込む方式は、ファイル数が大幅に増えた場合（数百件）でも問題ないか？（現時点では46件で問題なし）
