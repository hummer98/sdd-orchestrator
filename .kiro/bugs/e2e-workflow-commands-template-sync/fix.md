# Bug Fix: e2e-workflow-commands-template-sync

## Summary
テンプレートファイル（cc-sdd, cc-sdd-agent）の spec-inspection.md を agents 版の最新実装（E2E Pipeline 対応）に同期した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md` | 最新 agents 版に完全同期（472行 → 741行） |
| `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md` | 最新 agents 版に完全同期（467行 → 741行） |

### Code Changes

両ファイルに以下の主要な変更が適用された：

**1. Architecture Overview の追加**
```diff
+## Architecture Overview
+
+```
+spec-inspection (Orchestrator)
+    |
+    +-- Phase 1: Context Preparation
+    |       -> Generate context-summary.json
+    |
+    +-- Phase 2: Parallel Sub-Agent Invocation (Static Checks)
+    |       -> requirements-checker
+    |       -> design-checker
+    |       -> code-quality-checker
+    |       -> integration-checker
+    |
+    +-- Phase 2.5: E2E Pipeline (Full Mode only, Sequential)
+    |       -> e2e-planner
+    |       -> e2e-creator (if needed)
+    |       -> e2e-validator (if new tests)
+    |       -> e2e-runner
```

**2. Mode Determination の追加**
```diff
+**Mode Determination**:
+- Default: Full Mode (static + E2E inspection)
+- `--skip-e2e`: Quick Mode (static inspection only, no E2E Pipeline)
```

**3. Phase 2.5: E2E Pipeline セクションの追加（全体）**
```diff
+### Phase 2.5: E2E Pipeline (Default, Skip with --skip-e2e)
+
+**IMPORTANT**: This phase is executed by default. Skip ONLY when `--skip-e2e` option is specified.
+
+After static checks complete, invoke the E2E Pipeline sequentially:
+
+#### 2.5.2 Invoke e2e-planner
+Task(subagent_type="e2e-planner-agent", ...)
+
+#### 2.5.3 Invoke e2e-creator (Conditional)
+Task(subagent_type="e2e-creator-agent", ...)
+
+#### 2.5.4 Invoke e2e-validator (Conditional)
+Task(subagent_type="e2e-validator-agent", ...)
+
+#### 2.5.5 Invoke e2e-runner
+Task(subagent_type="e2e-runner-agent", ...)
```

**4. E2E Failure Classification の追加**
```diff
+**E2E Failure Classification Impact**:
+- **E2E Critical**: User Journey test failure (test linked to journeyId in e2e-plan.json)
+  - Counts toward Critical total
+  - Blocks GO judgment
+- **E2E Warning**: Unrelated existing test failure
+  - Does NOT count toward Critical/Major total
+- **E2E Info**: Known flaky test failure
+  - Does not affect judgment
```

**5. Inspection Modes セクションの追加**
```diff
+## Inspection Modes
+
+### Full Mode (Default)
+- Static checks (parallel) + E2E Pipeline (sequential)
+- Mode recording: inspection-{n}.md will show `Mode: Full`
+
+### Quick Mode (--skip-e2e)
+- Static checks only
+- Mode recording: inspection-{n}.md will show `Mode: Quick`
```

## Implementation Notes
- ソースファイル（`.claude/agents/kiro/spec-inspection.md`）の内容を完全に同期
- 両テンプレートは同一内容（741行）
- 今後の変更漏れを防ぐため、e2e-workflow の tasks.md にテンプレート同期タスクを追加することを推奨

## Breaking Changes
- [x] No breaking changes

既存の spec-inspection コマンドの動作に下位互換性あり。`--skip-e2e` オプションを指定しなければ Full Mode（E2E Pipeline 付き）で動作するようになる。

## Rollback Plan
以下のコマンドで旧バージョンに戻せる：
```bash
git checkout HEAD~1 -- electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md
git checkout HEAD~1 -- electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md
```

## Related Commits
- (コミット後に記載)
