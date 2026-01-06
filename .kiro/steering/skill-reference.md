# SDD Skill Reference

プロファイル（コマンドセット）ごとのSlash Command/Skillの動作リファレンス。

---

## cc-sdd

直接実行型Slash Command。Claude プロセス内で完結。

### 自動実行ワークフロー

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| spec-requirements | - | `requirements.md` | spec.json存在, project description | phase: `requirements-generated`, approvals.requirements.generated: true | 変更なし | Claude |
| spec-design | `design.md`, `research.md` | - | requirements approved | phase: `design-generated`, approvals.design.generated: true | 変更なし | Claude |
| spec-design -y | `design.md`, `research.md` | - | requirements.md存在 | phase: `design-generated`, approvals.design.generated: true, approvals.requirements.approved: true | 変更なし | Claude |
| spec-tasks | `tasks.md` | - | design approved | phase: `tasks-generated`, approvals.tasks.generated: true | 変更なし | Claude |
| spec-tasks -y | `tasks.md` | - | design.md存在 | phase: `tasks-generated`, approvals.tasks.generated: true, approvals.requirements.approved: true, approvals.design.approved: true | 変更なし | Claude |
| spec-impl | 実装ファイル, テストファイル | `tasks.md` (チェックボックス) | tasks approved | phase: `implementation-complete` (全タスク完了時) | 変更なし | **Electron** |
| document-review | `document-review-{n}.md` | - | 仕様ファイル存在 | 変更なし | 変更なし | - |
| document-review-reply | `document-review-{n}-reply.md` | - | review存在 | 変更なし | 変更なし | - |
| document-review-reply --autofix | `document-review-{n}-reply.md` | 仕様ファイル | review存在 | roundDetails更新 | 変更なし | Claude |
| spec-inspection | `inspection-{n}.md` | - | 全仕様ファイル存在 | GO: inspection フィールド追加 | 変更なし | Claude (GO時) |

### その他のコマンド

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| spec-init | `spec.json`, `requirements.md` | - | テンプレート存在 | phase: `initialized` | 変更なし | Claude |
| spec-plan | `spec.json`, `requirements.md` | - | 説明文提供 | phase: `requirements-generated`, approvals.requirements.generated: true, approved: false | 変更なし | Claude |
| spec-status | - | - | spec.json存在 | - | - | - (読取専用) |
| validate-gap | `gap-analysis.md` | - | requirements.md存在 | 変更なし | 変更なし | - |
| validate-design | `design-review-report.md` | - | design.md存在 | 変更なし | 変更なし | - |
| validate-impl | `validation-report.md` | - | 完了タスク存在 | 変更なし | 変更なし | - |
| steering | `product.md`, `tech.md`, `structure.md` | 既存steering | - | - | - | - (spec.json無関係) |
| steering-custom | `{name}.md` | - | ドメイン指定 | - | - | - (spec.json無関係) |

**ツール**: Bash, Glob, Grep, Read, Write, Edit, MultiEdit, WebSearch, WebFetch

---

## cc-sdd-agent

Slash Command経由でkiroサブエージェントに委譲。Task ツールで呼び出し。

### 自動実行ワークフロー

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| spec-requirements | - | `requirements.md` | spec.json存在 | phase: `requirements-generated`, approvals.requirements.generated: true | 変更なし | kiroサブエージェント |
| spec-design | `design.md`, `research.md` | - | requirements approved | phase: `design-generated`, approvals.design.generated: true | 変更なし | kiroサブエージェント |
| spec-design -y | `design.md`, `research.md` | - | requirements.md存在 | phase: `design-generated`, approvals.design.generated: true, approvals.requirements.approved: true | 変更なし | kiroサブエージェント |
| spec-tasks | `tasks.md` | - | design approved | phase: `tasks-generated`, approvals.tasks.generated: true | 変更なし | kiroサブエージェント |
| spec-tasks -y | `tasks.md` | - | design.md存在 | phase: `tasks-generated`, approvals.tasks.generated: true, approvals.requirements.approved: true, approvals.design.approved: true | 変更なし | kiroサブエージェント |
| spec-impl | 実装ファイル, テストファイル | `tasks.md` (チェックボックス) | tasks approved | phase: `implementation-complete` (全タスク完了時) | 変更なし | **Electron** |
| document-review | `document-review-{n}.md` | - | 仕様ファイル存在 | 変更なし | 変更なし | - |
| document-review-reply | `document-review-{n}-reply.md` | - | review存在 | 変更なし | 変更なし | - |
| document-review-reply --autofix | `document-review-{n}-reply.md` | 仕様ファイル | review存在 | roundDetails更新 | 変更なし | Claude |
| spec-inspection | `inspection-{n}.md` | - | 全仕様ファイル存在 | GO: inspection フィールド追加 | 変更なし | kiroサブエージェント (GO時) |

### その他のコマンド

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| spec-init | `spec.json`, `requirements.md` | - | テンプレート存在 | phase: `initialized` | 変更なし | Claude |
| spec-plan | `spec.json`, `requirements.md` | - | 説明文提供 | phase: `requirements-generated`, approvals.requirements.generated: true, approved: false | 変更なし | Claude |
| spec-quick | `spec.json`, `requirements.md`, `design.md`, `tasks.md` | - | 説明文提供 | phase: `tasks-generated` | 中断時点のphase | Claude (各フェーズ経由) |
| spec-status | - | - | spec.json存在 | - | - | - (読取専用) |
| validate-gap | `gap-analysis.md` | - | requirements.md存在 | 変更なし | 変更なし | - |
| validate-design | `design-review-report.md` | - | design.md存在 | 変更なし | 変更なし | - |
| validate-impl | `validation-report.md` | - | 完了タスク存在 | 変更なし | 変更なし | - |
| steering | `product.md`, `tech.md`, `structure.md` | 既存steering | - | - | - | - (spec.json無関係) |
| steering-custom | `{name}.md` | - | ドメイン指定 | - | - | - (spec.json無関係) |

**ツール**: Read, Task（kiroサブエージェントに委譲）

### kiroサブエージェント一覧

| サブエージェント | 委譲元コマンド |
|----------------|---------------|
| spec-requirements-agent | spec-requirements |
| spec-design-agent | spec-design |
| spec-tasks-agent | spec-tasks |
| spec-tdd-impl-agent | spec-impl |
| validate-gap-agent | validate-gap |
| validate-design-agent | validate-design |
| validate-impl-agent | validate-impl |
| spec-inspection-agent | spec-inspection |
| steering-agent | steering |
| steering-custom-agent | steering-custom |

**kiroサブエージェントのツール**: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch

---

## spec-manager

Electron UI統合用純粋生成コマンド。**spec.jsonの状態管理はElectronが担当**。

### 自動実行ワークフロー

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| requirements | - | `requirements.md` | spec.json存在 | phase: `requirements-generated`, approvals.requirements.generated: true | 変更なし | **Electron** |
| design | `design.md` | - | requirements.md存在 | phase: `design-generated`, approvals.design.generated: true | 変更なし | **Electron** |
| tasks | `tasks.md` | - | design.md存在 | phase: `tasks-generated`, approvals.tasks.generated: true | 変更なし | **Electron** |
| impl | 実装ファイル, テストファイル | `tasks.md` (チェックボックス) | tasks.md存在 | - | 変更なし | **Electron** |
| impl (完了時) | - | - | 全タスク完了 | phase: `implementation-complete` | - | **Electron** |
| document-review | `document-review-{n}.md` | - | 仕様ファイル存在 | 変更なし | 変更なし | - |
| document-review-reply | `document-review-{n}-reply.md` | - | review存在 | 変更なし | 変更なし | - |
| document-review-reply --autofix | `document-review-{n}-reply.md` | 仕様ファイル | review存在 | roundDetails更新 | 変更なし | **Electron** |
| inspection | `inspection-{n}.md` | - | 全仕様ファイル存在 | GO: inspection フィールド追加 | 変更なし | kiroサブエージェント (GO時) |

### その他のコマンド

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | OK時のspec.json | NG時のspec.json | 書き換え主体 |
|---------|-------------|-------------|---------|-----------------|-----------------|-------------|
| init | `spec.json`, `requirements.md` | - | テンプレート存在 | phase: `initialized` | 変更なし | Claude |

**ツール**: Read, Write, Glob (Bash は impl のみ)

**重要な制約**:
- `DO NOT read or update spec.json` (language設定の参照のみ許可)
- research.md は生成しない（純粋生成のみ）
- 次ステップガイダンス、承認ワークフローメッセージは出力しない

---

## 共通コマンド: ask-*

プロファイル非依存のAsk実行コマンド。ユーザーが任意のプロンプトでAgentを起動し、コンテキスト付きで質問・指示を実行。

| コマンド | 用途 | 引数 | コンテキスト | ログ保存先 |
|---------|------|------|------------|-----------|
| project-ask | プロジェクト全体への質問・指示 | `<prompt>` | `.kiro/steering/*.md` | `.kiro/logs/` |
| spec-ask | 特定Specへの質問・指示 | `<feature-name> <prompt>` | `.kiro/steering/*.md` + `.kiro/specs/{feature}/*.md` | `.kiro/specs/{feature}/logs/` |

**前提条件**:
- `project-ask`: プロジェクトが選択済み、プロンプトが空でない
- `spec-ask`: Specが存在、プロンプトが空でない

**Agent phase**: `ask`（Agent一覧で表示されるラベル）

**書き換え主体**: なし（読み取り専用 + プロンプト実行）

---

## 共通コマンド: bug-*

プロファイル非依存の軽量バグ修正ワークフロー。**bug.jsonは存在しない**（ファイル存在ベースでステータス管理）。

| コマンド | ファイル作成 | ファイル編集 | 前提条件 | ステータス判定 |
|---------|-------------|-------------|---------|--------------|
| bug-create | `report.md` | - | bug名, 説明 | → Reported |
| bug-analyze | `analysis.md` | - | report.md存在 | → Analyzed |
| bug-fix | `fix.md` | アプリコード | analysis.md存在 | → Fixed |
| bug-verify | `verification.md` | - | fix.md存在 | → Resolved |
| bug-status | - | - | bugsディレクトリ存在 | ファイル存在から計算 |

**ファイル構造**:
```
.kiro/bugs/{bug-name}/
├── report.md      # Reported
├── analysis.md    # Analyzed
├── fix.md         # Fixed
└── verification.md # Resolved
```

**書き換え主体**: 全て Claude プロセス

---

## 付録: spec.json 書き換え責任まとめ

| フェーズ | cc-sdd | cc-sdd-agent | spec-manager |
|---------|--------|--------------|--------------|
| init | Claude | Claude | Claude |
| requirements | Claude | kiroサブエージェント | **Electron** |
| design | Claude | kiroサブエージェント | **Electron** |
| tasks | Claude | kiroサブエージェント | **Electron** |
| impl | **Electron** | **Electron** | **Electron** |
| validate-* | - | - | - |
| steering-* | - | - | - |
| document-review | - | - | - |
| document-review-reply --autofix | Claude | Claude | **Electron** |
| inspection (GO時) | Claude | kiroサブエージェント | kiroサブエージェント |
