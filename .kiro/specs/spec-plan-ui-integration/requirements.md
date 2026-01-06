# Requirements: spec-plan UI Integration

## Decision Log

### 1. UIアプローチの選択
- **Discussion**: spec-plan コマンドをUIに組み込む方法として3つの選択肢を検討
  - A. CreateSpecDialog拡張（モード切替追加）
  - B. 専用対話パネル新設
  - C. コマンドのみ追加（UI変更なし）
- **Conclusion**: CreateSpecDialogで実行するコマンドを `spec-init` → `spec-plan` に変更するのみ
- **Rationale**: 対話自体は既存のAgentLogPanel + AgentInputPanelで十分対応可能。最小限の変更で目的を達成できる

### 2. 既存コマンドとの関係
- **Discussion**: spec-plan が spec-init + spec-requirements を置き換えるか、併存させるか
- **Conclusion**: 併存させる。UIのデフォルトは spec-plan に変更するが、spec-init はコマンドセットから削除しない
- **Rationale**: 手動でcc-sdd経由で spec-init を使いたいケースがある

### 3. IPC API名の変更
- **Discussion**: 既存の `executeSpecInit` をそのまま使うか、`executeSpecPlan` にリネームするか
- **Conclusion**: `executeSpecPlan` を新規追加（`executeSpecInit` は維持）
- **Rationale**: API名と実行内容の一致により、AIや開発者の混乱を防ぐ。`executeSpecInit` は手動利用や後方互換性のため残す

### 4. ワークフローにおける requirements フェーズの扱い
- **Discussion**: spec-plan が requirements.md を生成するため、WorkflowView の requirements フェーズを残すか削除するか
- **Conclusion**: requirements フェーズを残す（承認待ち状態でユーザーに渡す）
- **Rationale**:
  - spec-plan は対話的に requirements を生成するが、ユーザーの最終確認は依然として重要
  - 生成された requirements.md をレビューしてから design に進むワークフローを維持
  - 既存のワークフローUI（PhaseItem、approve/reject機能）をそのまま活用

## Introduction

SDD Orchestrator の「新規仕様作成」ワークフローを改善するため、`spec-plan` コマンドをUIに統合する。現状の `spec-init` → `spec-requirements` の2段階プロセスを、対話型の `spec-plan` に置き換えることで、ユーザーとAIの対話から直接 requirements.md を生成できるようにする。

## Requirements

### Requirement 1: Backend - コマンドマッピング

**Objective:** As a developer, I want spec-plan command to be properly mapped in specManagerService, so that the IPC layer can execute it correctly.

#### Acceptance Criteria
1. When `spec-plan` phase is requested, the system shall use `/kiro:spec-plan` command for `kiro` prefix
2. The system shall support `spec-manager` prefix mapping if needed (optional)
3. The system shall have `spec-plan` entry in `PHASE_ALLOWED_TOOLS` with appropriate tools: `['Read', 'Write', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task']`

### Requirement 2: IPC Layer - executeSpecPlan

**Objective:** As a frontend component, I want to call executeSpecPlan API, so that I can launch the spec-plan agent from the UI.

#### Acceptance Criteria
1. The system shall have `EXECUTE_SPEC_PLAN` channel defined in `channels.ts`
2. When `EXECUTE_SPEC_PLAN` is invoked, the system shall start an agent with:
   - `specId: ''` (global agent)
   - `phase: 'spec-plan'`
   - `command: 'claude'`
   - `args: ['/kiro:spec-plan "{description}"']` (with appropriate base flags)
   - `group: 'doc'`
3. The system shall return `AgentInfo` object upon successful agent start
4. If agent start fails, the system shall throw an error with descriptive message

### Requirement 3: Preload API

**Objective:** As a renderer process, I want executeSpecPlan exposed via contextBridge, so that UI components can invoke it.

#### Acceptance Criteria
1. The system shall expose `executeSpecPlan(projectPath: string, description: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo>` via `window.electronAPI`
2. The system shall have corresponding TypeScript type definition in `electron.d.ts`

### Requirement 4: CreateSpecDialog 変更

**Objective:** As a user, I want the "Create Spec" dialog to use spec-plan, so that I can have an interactive planning session when creating a new specification.

#### Acceptance Criteria
1. When user clicks "作成" button in CreateSpecDialog, the system shall call `executeSpecPlan` instead of `executeSpecInit`
2. The system shall pass `currentProject`, `description`, and `commandPrefix` to `executeSpecPlan`
3. The system shall add the returned agent to `agentStore` and navigate to ProjectAgentPanel
4. If `executeSpecPlan` fails, the system shall display error message in the dialog

### Requirement 5: コマンドセットテンプレート追加

**Objective:** As an installer, I want spec-plan.md included in command set templates, so that it is installed when users install cc-sdd or cc-sdd-agent profiles.

#### Acceptance Criteria
1. The system shall have `spec-plan.md` in `resources/templates/commands/cc-sdd/`
2. The system shall have `spec-plan.md` in `resources/templates/commands/cc-sdd-agent/` (if agent delegation version is needed)

### Requirement 6: テスト更新

**Objective:** As a developer, I want CreateSpecDialog tests updated, so that they verify the new spec-plan integration.

#### Acceptance Criteria
1. The system shall have tests that mock `executeSpecPlan` instead of `executeSpecInit`
2. The system shall verify that `executeSpecPlan` is called with correct arguments when create button is clicked

### Requirement 7: spec-plan 完了後の状態

**Objective:** As a user, I want spec-plan to produce a specification in "requirements approval pending" state, so that I can review the generated requirements before proceeding to design.

#### Acceptance Criteria
1. When spec-plan completes successfully, the system shall create spec.json with:
   - `phase: "requirements-generated"`
   - `approvals.requirements.generated: true`
   - `approvals.requirements.approved: false`
2. The system shall create requirements.md with Decision Log section
3. When the spec appears in SpecList, it shall show "requirements" phase as "generated" (approval pending)
4. The user shall be able to review requirements.md in ArtifactEditor and click Approve to proceed to design phase

## Out of Scope

- `spec-manager:plan` コマンドの追加（将来的に検討）
- CreateSpecDialogでのモード切替UI（spec-init vs spec-plan）
- `executeSpecInit` APIの削除（後方互換性のため維持）
- Remote UIへの対応（Desktop UI専用の変更）
- requirements フェーズの自動承認（ユーザー確認を維持）

## Open Questions

1. `cc-sdd-agent` 用の `spec-plan.md` は agent 委譲版として別途作成が必要か、それとも同じファイルを共有するか？
2. `spec-manager` プレフィックス用の plan コマンド（`/spec-manager:plan`）は必要か？
