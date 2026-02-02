# E2E Workflow Integration & Inspection Architecture Refactoring - 統合計画

> **作成日**: 2026-02-02
> **ベース**: e2e-workflownize-review.md（主流）
> **統合元**: e2e-workflow-plan-prompt.md（良い点を採用）

---

## 1. Executive Summary

### 1.1 目的

AI主導開発（AI-DLC）における品質保証プロセスを根本から変革する。具体的には：

1. **E2Eテストを仕様（Design）の一部として定義**し、検証の契約書とする
2. **Inspection責務を複数サブエージェントに分散**し、検査品質を向上
3. **E2Eテストのワークフロー化**により、統合ミスを体系的に検出

### 1.2 解決する課題

| 課題 | 現状 | 本計画での解決 |
|------|------|---------------|
| 統合漏れ | Inspectionで検出できない | E2E必須化 + integration-checker |
| Inspection肥大化 | 1エージェントが8カテゴリ | 5+サブエージェントに分散 |
| E2E基準の曖昧さ | steering/プロンプト依存 | design.mdで契約、e2e-plannerが判断 |
| プロジェクト差 | 汎用プロンプトで対応困難 | generate-inspection-e2e で steering生成 |

---

## 2. Core Architecture

### 2.1 Design as the Source of Truth for Verification

> *採用元: e2e-workflow-plan-prompt.md*

`design.md` を「どう実装するか」だけでなく「どう検証するか」の契約書とする。

#### design.md テンプレート拡張

```markdown
## Verification Contract

### User Journey Definition
本機能で実現するユーザー操作フローと期待値を定義する。

| Journey ID | 操作フロー | 期待結果 | E2E必須? |
|------------|-----------|---------|---------|
| UJ-1 | タスク作成ダイアログを開く → プロンプト入力 → 保存 | タスクが一覧に表示される | Yes |
| UJ-2 | 既存タスクを編集 → プロンプト変更 → 保存 | 変更が反映される | Yes |

### Impact Analysis Contract
本実装で削除・置換される機能、廃棄すべきテスト、削除すべきプレースホルダーを宣言する。

| 対象 | アクション | 理由 |
|------|-----------|------|
| `OldComponent.tsx` | DELETE | 新コンポーネントに置換 |
| `placeholder-task-6.3` in ScheduleTaskEditPage | DELETE | 実装完了 |
| `old-component.spec.ts` | UPDATE | 新API対応 |
```

**効果**:
- 検証の根拠が設計段階で明確になる
- Dead Code Detection の判断基準として活用
- プレースホルダー残存問題を設計段階で防止

### 2.2 Decoupled Inspection Architecture

8カテゴリを5+サブエージェントに分散し、spec-inspectionは統合・判定に専念する。

```
spec-inspection (Orchestrator)
│
├── Phase 1: Context Preparation
│   └── 共通コンテキスト読み込み・サマリー作成
│
├── Phase 2: Parallel Static Checks
│   ├── requirements-checker
│   ├── design-checker
│   └── code-quality-checker
│
├── Phase 3: Integration & E2E (Full Mode only)
│   └── integration-checker
│       ├── Static Integration Check
│       └── E2E Pipeline
│           ├── e2e-planner
│           ├── e2e-creator (if needed)
│           ├── e2e-validator (for new tests)
│           └── e2e-runner
│
└── Phase 4: Judgment
    └── 結果統合・GO/NOGO判定・レポート生成
```

### 2.3 Sub-Agent Responsibilities

#### 2.3.1 requirements-checker

| 項目 | 内容 |
|------|------|
| 担当カテゴリ | Requirements Compliance |
| 入力 | requirements.md, 実装ファイル |
| 出力 | JSON形式の検査結果 |
| 判定基準 | 各要件が実装に反映されているか |

#### 2.3.2 design-checker

| 項目 | 内容 |
|------|------|
| 担当カテゴリ | Design Alignment, Steering Consistency |
| 入力 | design.md, steering/*.md, 実装ファイル |
| 出力 | JSON形式の検査結果 |
| 判定基準 | 設計・steeringとの整合性 |

#### 2.3.3 code-quality-checker

| 項目 | 内容 |
|------|------|
| 担当カテゴリ | Design Principles, Dead Code Detection, Logging Compliance |
| 入力 | design.md (Impact Analysis), 実装ファイル, CLAUDE.md |
| 出力 | JSON形式の検査結果 |
| 判定基準 | DRY/SSOT/KISS/YAGNI遵守、Impact Analysisに基づくDead Code検出 |

#### 2.3.4 integration-checker

| 項目 | 内容 |
|------|------|
| 担当カテゴリ | Task Completion, Integration Verification, E2E Verification |
| 入力 | tasks.md, design.md (User Journey), 実装ファイル |
| 出力 | JSON形式の検査結果 + e2e-report-{n}.md |
| 判定基準 | タスク完了、統合ポイント確認、E2E結果 |

### 2.4 E2E Pipeline Detail

```
integration-checker
│
├── Static Integration Check
│   ├── 新規コンポーネントのimport確認
│   ├── 使用箇所確認
│   └── プレースホルダー残存検出
│
└── E2E Pipeline (Full Mode)
    │
    ├── e2e-planner (The Architect)
    │   ├── design.md の User Journey 抽出
    │   ├── 既存テストとのギャップ分析
    │   ├── 実行スコープ決定
    │   │   ├── 新規E2Eテスト作成が必要 → e2e-creator呼び出し
    │   │   ├── 既存E2Eテストで十分 → 関連テストのみ実行
    │   │   └── マージ後E2Eに委譲 → スキップ
    │   └── テスト計画書出力
    │
    ├── e2e-creator (The Builder) - 必要時のみ
    │   ├── テストコード生成
    │   ├── fixture作成
    │   └── e2e-wdio/generated/ に配置
    │
    ├── e2e-validator (The Quality Gate) - 新規テストのみ
    │   ├── 3回実行して安定性確認
    │   ├── フレイキー検出時は修正または除外
    │   └── 安定テストのみ本番実行へ
    │
    └── e2e-runner (The Executor)
        ├── クリーン環境確保（ポート競合、DB状態チェック）
        ├── テスト実行
        ├── 失敗時の証拠収集（DOM、スクリーンショット）
        └── e2e-report-{n}.md 生成
```

---

## 3. Execution Modes

### 3.1 モード定義

| Mode | 内容 | 所要時間 | ユースケース |
|------|------|---------|-------------|
| Quick (デフォルト) | 静的検査のみ、E2Eは計画のみ | 数分 | 開発中の頻繁な確認 |
| Full (--full) | Quick + E2E実行 | 数十分 | マージ前の最終確認 |
| E2E Only (--e2e-only) | E2E計画・実行のみ | 可変 | inspection後の追加検証 |

### 3.2 UIへの反映

```
[Inspection] [Quick ▼]
             ├── Quick (recommended for development)
             ├── Full (recommended before merge)
             └── E2E Only
```

### 3.3 モード別実行フロー

```
Quick Mode:
  spec-inspection
  ├── Context Preparation
  ├── requirements-checker (parallel)
  ├── design-checker (parallel)
  ├── code-quality-checker (parallel)
  ├── integration-checker (static only)
  │   └── e2e-planner (計画のみ、実行なし)
  └── Judgment

Full Mode:
  spec-inspection
  ├── Context Preparation
  ├── requirements-checker (parallel)
  ├── design-checker (parallel)
  ├── code-quality-checker (parallel)
  ├── integration-checker (full)
  │   ├── Static Integration Check
  │   └── E2E Pipeline (full execution)
  └── Judgment
```

---

## 4. Context Management

### 4.1 コンテキスト爆発の防止

**問題**: 5+サブエージェントが同じコンテキストを読む → トークン使用量増大

**解決**: コンテキスト階層化

```
spec-inspection (親)
│
├── Step 1: 共通コンテキスト読み込み（1回のみ）
│   ├── .kiro/specs/{feature}/*.md
│   ├── .kiro/steering/*.md
│   └── 関連実装ファイル
│
├── Step 2: コンテキストサマリー作成
│   └── context-summary.json
│       ├── spec_overview: 仕様の要約
│       ├── key_components: 主要コンポーネント一覧
│       ├── integration_points: 統合ポイント一覧
│       └── impact_analysis: 削除・更新対象一覧
│
└── Step 3: サブエージェントに配布
    └── 「サマリー + 担当カテゴリの詳細ファイル」のみ
```

### 4.2 サブエージェント間の情報共有

```
inspection-context/
├── context-summary.json        # 共通サマリー
├── requirements-result.json    # requirements-checker出力
├── design-result.json          # design-checker出力
├── code-quality-result.json    # code-quality-checker出力
└── integration-result.json     # integration-checker出力
```

spec-inspectionが最終的にこれらをマージしてレポート生成。

---

## 5. Project-Specific Context

### 5.1 generate-inspection-e2e コマンド

プロジェクト固有のE2E情報を解析し、steering/inspection-e2e.md を生成する。

**実行タイミング**: 初回セットアップ時、E2Eフレームワーク変更時

**解析対象**:
- E2Eフレームワーク検出（WebdriverIO, Playwright等）
- 設定ファイル解析（wdio.conf.ts, playwright.config.ts）
- 既存テストファイル構造
- fixture構造
- helper関数一覧

### 5.2 steering/inspection-e2e.md テンプレート

```markdown
# E2E Testing Context

## Framework
- **Runner**: WebdriverIO 9.x
- **Service**: wdio-electron-service 9.x
- **Framework**: Mocha

## Configuration
- **Config File**: `electron-sdd-manager/wdio.conf.ts`
- **Specs Directory**: `electron-sdd-manager/e2e-wdio/`
- **Fixtures Directory**: `electron-sdd-manager/e2e-wdio/fixtures/`

## Execution Commands
```bash
# 開発版（デフォルト）
npm run build && task electron:test:e2e

# パッケージ版
task electron:build && E2E_USE_PACKAGED_APP=true task electron:test:e2e

# 特定テストのみ
task electron:test:e2e -- --spec "e2e-wdio/specs/workflow-*.spec.ts"
```

## Mock Claude CLI
- **Path**: `scripts/e2e-mock/mock-claude.sh`
- **Streaming**: `scripts/e2e-mock/mock-claude-streaming.sh`
- **Environment Variables**:
  - `E2E_MOCK_CLAUDE_COMMAND`: Mock CLIパス
  - `E2E_MOCK_CLAUDE_DELAY`: 応答遅延（秒）

## Helper Functions
| Function | File | Description |
|----------|------|-------------|
| selectProjectViaStore | auto-execution.helpers.ts | Store経由でプロジェクト選択 |
| waitForCondition | auto-execution.helpers.ts | 条件待機 |
| ... | ... | ... |

## Test Coverage Summary
| Area | Test File | Coverage |
|------|-----------|----------|
| Spec Workflow | spec-workflow.e2e.spec.ts | 42 tests |
| Bug Workflow | bug-workflow.e2e.spec.ts | 38 tests |
| ... | ... | ... |

## Exclusivity Requirements
- Electron app must be stopped before E2E execution
- Port 9222 must be available (Chrome DevTools Protocol)
```

---

## 6. Report Structure

### 6.1 ファイル配置

```
.kiro/specs/<spec-name>/
├── spec.json
├── requirements.md
├── design.md              # User Journey, Impact Analysis 含む
├── tasks.md
├── inspection-1.md        # 「E2Eテスト結果: e2e-report-1.md 参照」
├── inspection-2.md
├── e2e-report-1.md        # 独立ファイル
└── e2e-report-2.md
```

### 6.2 inspection-{n}.md フォーマット（拡張）

```markdown
# Inspection Report - {feature} (Round {n})

## Summary
- **Date**: {timestamp}
- **Mode**: Quick / Full
- **Judgment**: GO / NOGO
- **Inspector**: spec-inspection (orchestrator)

## Sub-Agent Results

### Requirements Compliance (requirements-checker)
| Requirement | Status | Severity | Details |
|-------------|--------|----------|---------|
| REQ-1.1 | PASS | - | ... |

### Design Alignment (design-checker)
...

### Code Quality (code-quality-checker)
...

### Integration & E2E (integration-checker)
| Check | Status | Details |
|-------|--------|---------|
| Static Integration | PASS | 全コンポーネント統合確認 |
| E2E Verification | PASS | See: e2e-report-1.md |

## Judgment Rationale
> *採用元: e2e-workflow-plan-prompt.md のセマンティック判定*

### GO/NOGO 判定理由
- User Journey UJ-1, UJ-2 のE2EテストがPASS（必須条件充足）
- 無関係な既存テスト failure-X は警告として記録（スコープ外）
- Impact Analysisで宣言された削除が完了

## Statistics
...

## Next Steps
...
```

### 6.3 e2e-report-{n}.md フォーマット

```markdown
# E2E Test Report - {feature} (Round {n})

## Summary
- **Date**: {timestamp}
- **Scope**: spec-scoped / project-wide
- **Result**: PASS / FAIL
- **Mode**: Quick (plan only) / Full (executed)

## Test Plan (e2e-planner output)

### User Journeys to Verify
| Journey ID | Description | Existing Test? | Action |
|------------|-------------|----------------|--------|
| UJ-1 | タスク作成フロー | No | Create new |
| UJ-2 | タスク編集フロー | Yes | Execute existing |

### Scope Decision
- **New tests required**: 1
- **Existing tests to run**: 3
- **Deferred to project E2E**: 0

## Executed Tests
| Test File | Test Case | Status | Duration |
|-----------|-----------|--------|----------|
| schedule-task.e2e.spec.ts | should create task with prompt | PASS | 2.3s |
| schedule-task.e2e.spec.ts | should edit existing task | PASS | 1.8s |

## New Tests Created
- `e2e-wdio/generated/schedule-task-creation.e2e.spec.ts`
  - Validation status: STABLE (3/3 passes)

## Failure Analysis (if any)
| Test | Failure Type | Judgment | Details |
|------|--------------|----------|---------|
| unrelated-test.spec.ts | Environment | Warning | Port conflict, not related to this spec |

## Evidence (for failures)
- Screenshot: `.kiro/specs/{feature}/evidence/failure-1.png`
- DOM snapshot: `.kiro/specs/{feature}/evidence/failure-1.html`

## Coverage Analysis
| Integration Point | Covered? | Details |
|-------------------|----------|---------|
| PromptListEditor → ScheduleTaskEditPage | ✅ | UJ-1 test |
| formState.prompts validation | ✅ | UJ-1 test |
```

---

## 7. Judgment Algorithm

> *採用元: e2e-workflow-plan-prompt.md のセマンティック判定を拡張*

### 7.1 Severity Levels

| Level | 定義 | GO/NOGO影響 |
|-------|------|------------|
| Critical | リリースブロック、即時修正必須 | 1件でもNOGO |
| Major | リリース前に修正すべき | 3件以上でNOGO |
| Minor | 将来イテレーションで修正可 | GOに影響なし |
| Info | 改善提案 | GOに影響なし |

### 7.2 Judgment Logic

```python
def judge(results):
    critical_count = count_by_severity(results, 'Critical')
    major_count = count_by_severity(results, 'Major')

    # Rule 1: Critical は即NOGO
    if critical_count > 0:
        return 'NOGO', f'{critical_count} Critical issues found'

    # Rule 2: Major は3件以上でNOGO
    if major_count >= 3:
        return 'NOGO', f'{major_count} Major issues found'

    # Rule 3: E2E関連の特別ルール（Full Mode時）
    if mode == 'Full':
        # User JourneyテストのFailは Critical扱い
        uj_failures = get_user_journey_failures(results)
        if uj_failures:
            return 'NOGO', f'User Journey tests failed: {uj_failures}'

        # 無関係な既存テストのFailは Warning（スコープ限定）
        unrelated_failures = get_unrelated_failures(results)
        if unrelated_failures:
            add_warnings(unrelated_failures)
            # GOは維持、ただし警告を記録

    return 'GO', 'All checks passed'
```

### 7.3 スコープ限定判断

> *採用元: e2e-workflow-plan-prompt.md*

| 失敗タイプ | 判定 | 理由 |
|-----------|------|------|
| User Journey テスト失敗 | Critical (NOGO) | 本Specの核心機能 |
| 関連既存テスト失敗 | Major | リグレッションの可能性 |
| 無関係既存テスト失敗 | Warning | スコープ外、記録のみ |
| 環境起因（タイムアウト等） | Warning | 再実行推奨 |
| 新規テストのフレイキー | Info | テスト修正推奨 |

---

## 8. Evaluation Criteria

> *採用元: e2e-workflow-plan-prompt.md*

### 8.1 成功基準

| 基準 | 測定方法 | 目標 |
|------|---------|------|
| 統合バグの検出率 | インシデント発生数 / マージ数 | 100%検出（インシデント0） |
| 自律的メンテナンス | 破壊的変更時のテスト自動更新率 | 90%以上 |
| 判断の妥当性 | GO/NOGO理由の説明可能性 | 全判定にセマンティックな理由 |
| フィードバックループ | Quick Mode所要時間 | 5分以内 |

### 8.2 検証方法

1. **統合バグ検出**: 過去のインシデント（docs/incidents/）を再現し、本アーキテクチャで検出できるか確認
2. **自律的メンテナンス**: 意図的に破壊的変更を導入し、テスト自動更新を確認
3. **判断妥当性**: inspection-{n}.md の Judgment Rationale をレビュー

---

## 9. Implementation Phases

### Phase 1: 基盤整備（1-2日）

| タスク | 成果物 |
|--------|--------|
| design.md テンプレート拡張 | User Journey, Impact Analysis セクション追加 |
| generate-inspection-e2e コマンド作成 | .claude/commands/kiro/generate-inspection-e2e.md |
| steering/inspection-e2e.md テンプレート定義 | .kiro/settings/templates/steering/inspection-e2e.md |
| e2e-report-{n}.md フォーマット定義 | ドキュメント化 |

### Phase 2: サブエージェント定義（2-3日）

| タスク | 成果物 |
|--------|--------|
| requirements-checker-agent.md | .claude/agents/kiro/requirements-checker.md |
| design-checker-agent.md | .claude/agents/kiro/design-checker.md |
| code-quality-checker-agent.md | .claude/agents/kiro/code-quality-checker.md |
| integration-checker-agent.md | .claude/agents/kiro/integration-checker.md |
| e2e-planner-agent.md | .claude/agents/kiro/e2e-planner.md |
| e2e-creator-agent.md | .claude/agents/kiro/e2e-creator.md |
| e2e-validator-agent.md | .claude/agents/kiro/e2e-validator.md |
| e2e-runner-agent.md | .claude/agents/kiro/e2e-runner.md |

### Phase 3: spec-inspection改修（1-2日）

| タスク | 成果物 |
|--------|--------|
| サブエージェント呼び出し追加 | spec-inspection.md 改修 |
| Quick/Full モード分岐 | --full, --e2e-only オプション |
| コンテキスト階層化 | context-summary.json 生成ロジック |
| 結果統合ロジック | JSON結果マージ、レポート生成 |

### Phase 4: 検証・調整（1-2日）

| タスク | 成果物 |
|--------|--------|
| 過去インシデント再現テスト | 検出率レポート |
| 実際のSpecで試行 | フィードバック |
| パフォーマンス測定 | Quick Mode 所要時間 |
| 調整 | 各エージェントの調整 |

---

## 10. Risk Mitigation

| リスク | 対策 |
|--------|------|
| サブエージェント間の情報共有不足 | context-summary.json + 構造化JSON出力 |
| コンテキスト使用量増大 | 階層化、サマリー配布 |
| E2E実行時間によるフィードバックループ悪化 | Quick/Full モード分離 |
| 生成テストの品質問題 | e2e-validator による安定性検証 |
| 判断の不透明性 | Judgment Rationale のセマンティック記述必須化 |

---

## 11. Appendix

### A. 関連ドキュメント

- `docs/bootstrap/e2e-workflownize.md` - 元の構想
- `docs/bootstrap/e2e-workflownize-review.md` - レビュー（本計画のベース）
- `docs/bootstrap/e2e-workflow-plan-prompt.md` - 他AIの提案（良い点を統合）

### B. 関連インシデント

- `docs/incidents/2026-01-30-schedule-task-prompt-editor-integration-missing.md`
- `docs/incidents/2026-01-29-agent-log-json-display-issue.md`
- `docs/incidents/auto-execution-state-sync-bug.md`
- `docs/incidents/agent-log-ui-not-updating-bug.md`

### C. 参照した既存ファイル

- `.kiro/steering/e2e-testing.md`
- `.claude/agents/kiro/spec-inspection.md`
- `.claude/agents/kiro/generate-release.md`
