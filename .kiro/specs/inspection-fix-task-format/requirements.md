# Requirements: Inspection Fix Task Format

## Decision Log

### タスク番号体系
- **Discussion**: Fix Tasks専用のID体系（`FIX-1`, `R2-1`）vs 通常タスクとの連番継続（`7.1`, `7.2`）
- **Conclusion**: 連番継続方式を採用
- **Rationale**: パーサーへの影響ゼロ、進捗計算がシンプル、セクション見出しで出自は十分明確

### セクション構造
- **Discussion**: Fix Tasksをどのようにtasks.mdに追加するか
- **Conclusion**: `## Inspection Fixes` セクション配下に `### Round N (日付)` サブセクションを設ける
- **Rationale**: ラウンドごとの履歴が明確、関連タスク/要件へのトレーサビリティを保持

### UIでの視覚的区別
- **Discussion**: バッジ、背景色、アイコン、セクション分離のみ
- **Conclusion**: セクション分離のみ（パーサー変更なし）
- **Rationale**: YAGNI原則、tasks.mdのセクション見出しで十分、必要になれば後から拡張可能

## Introduction

Inspection実行後のFix Tasksが独自フォーマット（`FIX-1`, `FIX-2`）を使用しており、通常タスクとのID体系が混在している。これにより、タスク進捗計算や一覧表示での一貫性が損なわれている。本仕様では、Fix Tasksを連番継続方式に統一し、セクション構造で出自を明確にする。

## Requirements

### Requirement 1: Fix Tasksのタスク番号体系

**Objective:** As a 開発者, I want Fix Tasksが通常タスクと同じ番号体系を使用すること, so that タスク一覧での一貫性が保たれ、進捗計算が正確になる

#### Acceptance Criteria
1. When spec-inspection agentがFix Tasksを生成する時, the system shall 既存タスクの最大番号の次から連番でタスクIDを付与する（例: 既存が6タスクなら7.1, 7.2, ...）
2. When Fix Tasksにサブタスクがある場合, the system shall 通常タスクと同じ `N.M` 形式を使用する（例: 7.1, 7.2）
3. The system shall `FIX-N` 形式のタスクIDを使用しない

### Requirement 2: Inspection Fixesセクション構造

**Objective:** As a 開発者, I want Fix Tasksが専用セクションに整理されること, so that Inspectionで追加されたタスクであることが明確にわかる

#### Acceptance Criteria
1. When spec-inspection agentがFix Tasksを追加する時, the system shall tasks.mdの末尾に `## Inspection Fixes` セクションを追加する（既存の場合は追記）
2. When 新しいInspectionラウンドのFix Tasksを追加する時, the system shall `### Round N (YYYY-MM-DD)` サブセクションを作成する
3. When Fix Taskを記述する時, the system shall 各タスクの下に `- 関連: Task X.Y, Requirement Z.Z` 形式で関連情報を記載する
4. The system shall 既存の `## Appendix` セクションがある場合、その前に `## Inspection Fixes` セクションを挿入する

### Requirement 3: 既存フォーマットとの後方互換性

**Objective:** As a システム, I want 既存の `FIX-N` 形式のタスクも正しくパースされること, so that 過去のspecが壊れない

#### Acceptance Criteria
1. The system shall 既存のタスクパーサーが `FIX-N` 形式を引き続き認識する（既存の正規表現 `/[A-Z]+-\d+/` を維持）
2. The system shall 新規生成時のみ連番形式を使用し、既存ファイルの `FIX-N` は変換しない

### Requirement 4: spec-inspection agentの更新

**Objective:** As a spec-inspection agent, I want Fix Tasks生成時に新フォーマットを使用すること, so that 一貫したタスク体系が維持される

#### Acceptance Criteria
1. When --fix または --autofix モードでFix Tasksを生成する時, the system shall tasks.mdを読み込み、既存タスクの最大番号を特定する
2. When 最大番号を特定する時, the system shall `N.M` 形式のタスクIDから最大の整数部分Nを取得する
3. When Fix Tasksを生成する時, the system shall 新しいタスクグループ番号（N+1）から開始する
4. When `## Inspection Fixes` セクションが存在しない場合, the system shall `---` 区切り線の後に新規作成する
5. When `## Appendix` セクションが存在する場合, the system shall その直前に `## Inspection Fixes` セクションを挿入する

## Out of Scope

- UIでのFix Tasks視覚的区別（バッジ、背景色、アイコン）- 将来必要になれば別specで対応
- 既存tasks.mdの `FIX-N` 形式から連番形式への自動マイグレーション
- TaskProgressViewでのセクション別折りたたみ表示

## Open Questions

- なし（設計フェーズで詳細を決定）
