# SDD プロセスにおける統合テストのギャップ分析と改善提案

## 背景

mcp-server-integration 機能において、設定画面（McpSettingsPanel）では「MCP有効」と表示されるが、ヘッダーのインジケーター（McpStatusIndicator）では「Stopped」と表示される不整合が発生した。

### 原因

- **McpSettingsPanel**: ConfigStoreの「設定値」（enabled: true）を表示
- **McpStatusIndicator**: mcpStoreの「実行状態」（isRunning: false）を表示
- Main ProcessからRendererへの**IPC通知が未実装**だったため、状態が同期されていなかった

Design.mdには「Remote UI Synchronization Flow」としてシーケンス図が明記されていたが、対応する実装・テストが欠落していた。

### 発見プロセス

- 単体テストは全て通過
- Design.mdの要件は明確に記載されていた
- しかし、**統合テストが存在しなかった**ため、モジュール間の連携不備を検出できなかった

---

## 現状分析：テストに関する記述の欠落

### 各ドキュメントにおけるテスト言及の現状

| ドキュメント | テストへの言及 | 問題点 |
|-------------|---------------|--------|
| `tasks-generation.md` | "Testing tasks (unit, integration, E2E)" を含めろ | 統合テストの**具体的な生成基準がない** |
| `design-review.md` | "Testability and debugging considerations" | 統合テスト戦略の**検証項目がない** |
| `document-review.md` | "Testing strategy" がGap Analysisに含まれる | 統合テストの**有無を検証する基準がない** |
| `spec-impl.md` | "TDD Mode: strict (test-first)" | **単体テストのみを想定**、統合テストの指示なし |

### 根本的問題

1. **Design.mdに統合テスト戦略の記載義務がない**
   - 「Integration & Deprecation Strategy」で結合ポイントは明示するが、「どうテストするか」の記載がない

2. **Tasks生成時に統合テストタスクが自動生成されない**
   - Implementation / Wiring / Cleanup の3カテゴリのみ
   - Integration Test Tasks のカテゴリが存在しない

3. **Document Reviewが統合テストの欠落を検出しない**
   - Requirements ↔ Design ↔ Tasks の整合性はチェック
   - 「IPC/イベント連携に対する統合テストタスクの有無」はチェック対象外

---

## 改善提案

### 1. `spec-design.md` の修正

Design生成時に統合テスト戦略の記載を必須化する。

#### 追加するプロンプト指示

```markdown
CRITICAL: When design includes cross-boundary communication (IPC, events, store synchronization),
generate "Integration Test Strategy" section specifying:
- Components involved in integration
- Data flow to be tested
- Mock boundaries
- Test verification points
```

#### Design.mdテンプレートへの追加セクション

```markdown
## Integration Test Strategy

### Cross-Boundary Communication Points

| Integration Point | Components | Data Flow | Test Approach |
|-------------------|------------|-----------|---------------|
| MCP Status Sync | McpServerService → mcpStore | IPC: mcp:status-changed | Integration test: verify Renderer store updates when Main emits |

### Mock Boundaries

- Unit tests: Mock at service layer
- Integration tests: Mock at IPC transport layer
- E2E tests: No mocks, full stack

### Verification Points

- [ ] Main→Renderer IPC delivery
- [ ] Store state update on IPC receipt
- [ ] UI component reactivity to store changes
```

---

### 2. `tasks-generation.md` の修正

#### 新規カテゴリの追加

```markdown
## Task Type Classification

Every task must be classified as one of:

### 1. Implementation Tasks (実装タスク)
...

### 2. Wiring/Integration Tasks (結合・配線タスク)
...

### 3. Cleanup/Deprecation Tasks (クリーンアップ・廃止タスク)
...

### 4. Integration Test Tasks (統合テストタスク) ← NEW

Cross-boundary communication requires integration tests:
- "Integration test: Main→Renderer status synchronization via IPC"
- "Integration test: Store state propagation on event emission"
- "Integration test: Callback chain verification"

**Generation Criteria**:
| Design Element | Required Test |
|----------------|---------------|
| IPC channel definition | IPC delivery test |
| Store synchronization flow | State propagation test |
| Event/callback chains | Chain execution test |
| Cross-process data flow | Data integrity test |

**Task Format Example**:
```markdown
- [ ] 8.1 Integration test: MCP status broadcast to Renderer
  - Verify McpServerService.onStatusChange triggers IPC
  - Verify Renderer receives mcp:status-changed event
  - Verify mcpStore.setStatus is called with correct payload
  - _Requirements: 6.9_
  - _Integration Point: Design.md "Remote UI Synchronization Flow"_
```
```

---

### 3. `document-review.md` の修正

#### 新規チェック項目の追加

```markdown
### 1.6 Integration Test Coverage (CRITICAL CHECK)

When Design.md contains cross-boundary communication (IPC, events, store sync):

| Check | Validation | Report if Missing |
|-------|------------|-------------------|
| IPC連携 | 統合テストタスクが存在する | CRITICAL: IPC連携の統合テストなし |
| Store同期 | 状態伝播のテストがある | CRITICAL: Store間同期のテスト欠落 |
| イベントチェーン | コールバック連鎖のテストがある | WARNING: イベント連鎖の検証不足 |
| データフロー図 | 図中の各矢印にテストがある | WARNING: データフロー検証不完全 |

**Anti-Patterns to Flag as CRITICAL**:
- Design.md has sequence diagram but tasks.md has no integration test for it
- IPC channel defined but no test verifies delivery
- Store synchronization flow without state propagation test
- "Remote UI Synchronization Flow" without corresponding test task

**Report Format**:
```markdown
### 1.6 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| MCP Status Sync | "Remote UI Synchronization Flow" | (none) | ❌ CRITICAL |
| Remote Server Status | "Server Lifecycle" | 5.3 | ✅ |

**Validation Results**:
- [ ] All sequence diagrams have corresponding integration tests
- [ ] All IPC channels have delivery verification tests
- [ ] All store sync flows have state propagation tests
```
```

---

### 4. `design-review.md` の修正

#### レビュー基準への追加

```markdown
### 5. Integration Test Strategy (Critical for Cross-Boundary Designs)

When design includes IPC, events, or cross-process communication:

- Integration points clearly identified with test approach
- Mock boundaries defined for each test level
- Verification points specified for data flow validation
- No orphaned integration (every arrow in diagram has a test)

**Red Flags**:
- Sequence diagram without integration test strategy
- IPC channel without delivery verification plan
- Store synchronization without state propagation test plan
```

---

## 実装優先度

| 改善項目 | 優先度 | 理由 |
|----------|--------|------|
| `document-review.md` への統合テストチェック追加 | P0 | 既存Specの問題を検出可能 |
| `tasks-generation.md` への統合テストカテゴリ追加 | P0 | 新規Specで漏れを防止 |
| `spec-design.md` への統合テスト戦略指示追加 | P1 | 設計段階での意識付け |
| `design-review.md` への統合テスト基準追加 | P1 | レビュー品質向上 |

---

## 期待される効果

1. **Design段階**: 統合テスト戦略の記載が必須化され、連携ポイントが明示される
2. **Tasks生成段階**: 統合テストタスクが自動的に生成される
3. **Document Review段階**: 統合テストの欠落がCRITICALとして検出される
4. **実装段階**: TDDで統合テストを先に書くことで、連携不備を早期発見

これにより、今回のような「個々のモジュールは正しく動くが、連携部分が未実装」という問題がSpec承認前に検出可能になる。

---

## 関連ファイル

- `.claude/commands/kiro/spec-design.md`
- `.claude/commands/kiro/spec-tasks.md`
- `.claude/commands/kiro/document-review.md`
- `.kiro/settings/rules/tasks-generation.md`
- `.kiro/settings/rules/design-review.md`
