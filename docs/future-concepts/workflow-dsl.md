# ワークフローDSL構想

## 概要

現在ハードコードされているSDDワークフローを、DSL（Domain Specific Language）で記述可能にし、ユーザーが自由にカスタマイズできるようにする構想。

## 現状の課題

### ハードコードされている要素

| 要素 | 場所 | 形式 |
|------|------|------|
| ワークフローフェーズ | `workflow.ts` | 固定配列 `WORKFLOW_PHASES` |
| 状態管理 | `spec.json` | JSON（approvals構造） |
| コマンド定義 | `.claude/commands/kiro/*.md` | Markdownプロンプト |
| ルール定義 | `.kiro/settings/rules/*.md` | Markdownガイドライン |
| フェーズ間の条件分岐 | `AutoExecutionService.ts` | TypeScriptロジック |

### 条件分岐ロジックの現状

`AutoExecutionService.ts` に以下の条件分岐がハードコードされている：

```typescript
// requirements フェーズは前提条件なし
if (phase === 'requirements') {
  return { valid: true, ... };
}

// design/tasks フェーズは前のフェーズの承認が必要
if (phaseIndex > 0 && phaseIndex < 3) {
  const prevPhase = WORKFLOW_PHASES[phaseIndex - 1];
  // prevApproval.approved をチェック
}

// impl フェーズは tasks の承認が必要
if (phase === 'impl') {
  const tasksApproval = specJson.approvals.tasks;
  // ...
}
```

---

## DSL設計オプション

### Option A: 宣言的YAML DSL

```yaml
# .kiro/workflow.yaml
workflow:
  name: "sdd-full"
  phases:
    - id: requirements
      command: spec-requirements
      outputs: [requirements.md]
      approval_required: true
      validations:
        - validate-gap

    - id: design
      command: spec-design
      depends_on: [requirements]
      outputs: [design.md]
      approval_required: true
      validations:
        - validate-design

    - id: tasks
      command: spec-tasks
      depends_on: [design]
      outputs: [tasks.md]
      approval_required: true

    - id: implementation
      command: spec-impl
      depends_on: [tasks]
      sub_tasks: dynamic  # tasks.mdから動的生成

    - id: verification
      command: validate-impl
      depends_on: [implementation]

    - id: deployment
      command: deployment
      depends_on: [verification]
```

**メリット**:
- 読みやすい
- バリデーションしやすい
- UIとの親和性が高い

### Option B: プログラマブルDSL（TypeScript）

```typescript
// .kiro/workflow.ts
export const sddWorkflow = defineWorkflow({
  name: "sdd-full",
  phases: [
    phase("requirements", {
      command: "spec-requirements",
      onComplete: async (ctx) => {
        if (ctx.hasExistingCode) {
          await ctx.runValidation("validate-gap");
        }
      }
    }),
    phase("design", {
      command: "spec-design",
      dependsOn: ["requirements"],
      validations: ["validate-design"],
    }),
    // ...
  ],
  hooks: {
    beforePhase: async (phase, ctx) => {
      // カスタムロジック
    },
  }
});
```

**メリット**:
- 条件分岐やカスタムロジックが書ける
- 型安全

### Option C: ハイブリッド（推奨）

```yaml
# .kiro/workflow.yaml - 基本構造
extends: "@kiro/sdd-standard"  # 標準ワークフローを継承

overrides:
  design:
    approval_required: false  # 自動承認に変更

additions:
  - id: security-review
    after: design
    command: security-review
    optional: true
```

**メリット**:
- 標準ワークフローを簡単にカスタマイズ
- 複雑なケースはフルDSLにフォールバック

---

## 条件分岐のDSL表現

### 依存関係 + 条件式

```yaml
phases:
  - id: requirements
    command: spec-requirements
    # 条件なし（最初のフェーズ）

  - id: design
    command: spec-design
    preconditions:
      - phase: requirements
        status: approved
    validations:
      - type: gap
        when: "options.gap == true"

  - id: tasks
    command: spec-tasks
    preconditions:
      - phase: design
        status: approved
    validations:
      - type: design
        when: "options.design == true"

  - id: impl
    command: spec-impl
    preconditions:
      - phase: tasks
        status: approved
```

### より表現力のある条件式

```yaml
phases:
  - id: impl
    command: spec-impl
    preconditions:
      all:
        - "phases.tasks.status == 'approved'"
        - "not agents.running"
    on_complete:
      - action: run_validation
        type: impl
        if: "options.impl"
      - action: auto_approve
        if: "auto_execution.enabled"
```

### フック形式

```yaml
phases:
  - id: design
    command: spec-design
    hooks:
      before:
        - check: "phases.requirements.approved"
          on_fail: "wait_for_approval"
      after:
        - run: validate-design
          when: "validations.design.enabled"
```

---

## UI表現の課題

### 現状のUI（固定ワークフロー）

```
✅要件定義
↓  ☐ validate-gap
✅設計
↓  ☐ validate-design
⏳タスク [実行中]
↓
⬜実装
↓
⬜検査
↓
⬜デプロイ
```

UIコンポーネントが「6フェーズ固定」「バリデーション3種固定」を前提に設計されている。

### DSL化した場合のUI課題

| 課題 | 説明 |
|------|------|
| 動的レンダリング | フェーズ数・順序が可変 → ハードコードのリストが使えない |
| 条件分岐の可視化 | `when: "options.gap"` をどう表示する？ |
| 依存関係の表現 | 並列実行可能なフェーズがある場合、線形UIでは表現しにくい |
| カスタムフェーズのアイコン/色 | 新しいフェーズに対応するアイコンがない |
| エラー状態の表示 | 条件式エラーをどう伝える？ |

---

## UI実装アプローチ

### 案1: 「見た目は固定、中身は可変」

```yaml
# DSLで定義しても、UIは標準テンプレートにマッピング
ui_template: "linear-6-phase"  # 標準の6フェーズUI
phases:
  - id: requirements
    display: { slot: 1, label: "要件定義" }
  - id: my-custom-review
    display: { slot: 2, label: "設計" }  # 「設計」スロットに割り当て
```

**メリット**: UI変更最小限
**デメリット**: 柔軟性が制限される

### 案2: ジェネリックUIコンポーネント

```tsx
// DSLから動的にUIを生成
<WorkflowView phases={workflow.phases} />

// 各フェーズは汎用コンポーネント
<PhaseItem
  label={phase.display?.label || phase.id}
  icon={phase.display?.icon || "default"}
  status={getStatus(phase)}
  validations={phase.validations}
/>
```

**メリット**: 完全に動的
**デメリット**: 開発コスト大、既存コンポーネント大改修

### 案3: ハイブリッド（推奨）

```yaml
workflow:
  # 基本は標準ワークフローを継承
  extends: "sdd-standard"

  # カスタマイズは限定的に許可
  customizations:
    - disable_phase: deploy        # デプロイを無効化
    - add_validation:              # バリデーション追加
        after: design
        type: security-review
```

UIは「標準ワークフロー + オプショナルなカスタマイズ」を前提に設計。
完全自由なDSLより制約があるが、UI実装が現実的。

---

## 推奨アプローチ

| アプローチ | UI難易度 | 柔軟性 | 推奨度 |
|-----------|---------|--------|-------|
| 完全動的DSL | 高 | 高 | △ |
| 固定テンプレート + スロット | 低 | 低 | ○ |
| 標準継承 + 限定カスタマイズ | 中 | 中 | ◎ |

**案3（ハイブリッド）が現実解**

「フェーズの追加・削除・無効化」「バリデーションのON/OFF」程度のカスタマイズに絞れば、現在のUIを大きく変えずに対応可能。

---

## 実装時の検討事項

| 観点 | 検討内容 |
|------|----------|
| スコープ | プロジェクト単位 vs Spec単位でワークフローを変えるか |
| UIへの影響 | ワークフロービューを動的に生成する必要 |
| 後方互換性 | 既存のspec.jsonとの整合性 |
| バリデーション | DSL定義のスキーマ検証 |
| エラーハンドリング | 不正なDSLへの対応 |

---

## 条件分岐パターン一覧（DSL化対象）

| 条件 | 現在のハードコード場所 | DSL化の難易度 |
|------|----------------------|--------------|
| 前フェーズの承認チェック | `validatePreconditions` | ◎ 容易 |
| エージェント実行中チェック | `validatePreconditions` | ◎ 容易 |
| バリデーション有効チェック | `executeValidationIfEnabled` | ◎ 容易 |
| フェーズ固有ロジック（impl_completed等） | `getPhaseStatus` | ○ 可能 |
| 自動承認の判断 | `autoApproveCompletedPhase` | ○ 可能 |

---

## 次のステップ

1. ユースケースの洗い出し（どんなカスタマイズが必要か）
2. DSLスキーマの詳細設計
3. パーサー/バリデーターの実装
4. UI コンポーネントの改修範囲決定
5. マイグレーション戦略（既存ワークフローとの互換性）

---

## 関連ファイル

- [workflow.ts](../../electron-sdd-manager/src/renderer/types/workflow.ts) - 現在のフェーズ定義
- [AutoExecutionService.ts](../../electron-sdd-manager/src/renderer/services/AutoExecutionService.ts) - 条件分岐ロジック
- [new-workflow-concept.md](../../.kiro/concepts/new-workflow-concept.md) - 既存のワークフロー構想
