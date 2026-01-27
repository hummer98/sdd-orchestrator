# design.md肥大化問題の分析と対策提案

## 問題の概要

最近のspecでdesign.mdが1000行を超える肥大化が発生している。

**現状のサイズ**:
- spec-manager-commands: 1347行 (36%超過)
- commandset-unified-installer: 1270行 (27%超過)
- jj-merge-support: 1143行 (14%超過)
- agent-stale-recovery: 833行
- テンプレートの警告閾値: 1000行

## 肥大化の主要原因

### 1. Implementation Exampleの過剰記述

**問題**: Service Interfaceセクションに50-70行のTypeScript実装コードが記載されている

**例** (spec-manager-commands/design.md:417-489):
```typescript
// Implementation Example セクション
class ImplCompletionAnalyzerImpl implements ImplCompletionAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeCompletion(...): Promise<Result<CheckImplResult, AnalyzeError>> {
    // 50行以上の実装ロジック
  }
}
```

**影響**:
- コンポーネント数 × 50-70行 = 各specで300-500行増加
- 設計フェーズで実装コードを記述するのは本来の役割外

### 2. Simple Componentの詳細ブロック化

**テンプレート指示**:
> Simple presentation components can rely on the summary row plus a short Implementation Note.

**実態**:
- 全てのコンポーネントに100行の詳細ブロック（Responsibilities, Dependencies, Contracts, Implementation Notes）
- spec-manager-commands: 10個以上のコンポーネント × 100行 = 1000行

**例**:
```markdown
#### ComponentName

| Field | Detail |
|-------|--------|
| Intent | ... |

**Responsibilities & Constraints** (20行)
**Dependencies** (15行)
**Contracts**: Service [x]
##### Service Interface (30行)
**Implementation Notes** (20行)
```

### 3. System Flowsの冗長説明

**テンプレート指示**:
> Capture key decisions in text and let diagrams carry structural detail—avoid repeating the same information in prose.

**実態**:
- Mermaidダイアグラム + 10-20行の詳細説明
- 各フロー × 3-4個 = 60-100行

**例** (spec-manager-commands/design.md:90-156):
- requirements/design/tasks フロー: mermaid + 説明
- impl完了判定フロー: mermaid + 説明
- インストールフロー: mermaid + 説明

### 4. Data Modelsの重複記述

**問題**: Domain Model / Logical Data Model / Data Contracts が別セクションで重複記述

**実態**:
- 同じデータ構造が3箇所で記載される
- spec-manager-commands: 行1203-1281 (約80行)

### 5. research.mdへの分離不足

**本来の役割分担**:
- **design.md**: 設計決定の**結果**（WHAT & HOW）
- **research.md**: 設計決定の**プロセス**（WHY & 調査内容）

**実態**:
- design.mdに調査プロセス、代替案の詳細評価、実装ガイドまで含まれている
- research.mdは空または最小限

## 削減可能な記述パターンと効果

| 削減対象 | 削減量 | 削減率 | 実施難度 |
|--------|--------|--------|--------|
| Implementation Exampleの削除 | コンポーネント×50-70行 | 20-30% | 低 |
| Simple Component詳細ブロックの統合 | component×80-100行 | 15-25% | 中 |
| System Flow説明の簡潔化 | フロー×10-15行 | 5-8% | 低 |
| Data Modelsセクション統合 | 20-40行 | 2-4% | 低 |
| Error Handlingの簡潔化 | 20-30行 | 2-3% | 低 |
| **合計削減量** | **300-500行** | **30-40%** | |

## spec-tasksとspec-implが実際に必要とする情報

### spec-tasksの要求事項 (spec-tasks.md:68-87)

```markdown
- **Include implementation method when specified in design.md**:
  - If design.md specifies "use X", "call Y", or "via Z" for a component, include it in task description
  - Add `_Method:` field listing function/class/pattern names that MUST be used
```

**つまり**:
- **条件付き**: design.mdに明示的に記載されている場合のみ
- Implementation Exampleは不要

### spec-implの要求事項 (spec-impl.md:86-96)

```markdown
**0. TASK ANALYSIS (Pre-TDD)**:
   - Read the full task description including implementation hints
   - Extract any explicit implementation requirements:
     - From task description: keywords like "を使用", "use", "via", "call"
     - From `_Method:` field: function/class/pattern names that MUST be used
```

**つまり**:
- tasks.mdのタスク記述とメソッド指定が主な情報源
- design.mdは型定義とインターフェース確認に使用
- Implementation Exampleは参照されない

**結論**: Implementation Exampleは以降のフェーズで使われていない

## 対策提案

### 対策1: spec-design agentプロンプトの修正（最優先）

**ファイル**: `.claude/agents/kiro/spec-design.md`

#### 1.1 Implementation Example禁止の明記

**現状** (行99-104):
```markdown
2. **Generate Design Document**:
   - **Follow specs/design.md template structure and generation instructions strictly**
   - **Integrate all discovery findings**: Use researched information (APIs, patterns, technologies) throughout component definitions, architecture decisions, and integration points
   - If existing design.md found in Step 1, use it as reference context (merge mode)
   - Apply design rules: Type Safety, Visual Communication, Formal Tone
   - Use language specified in spec.json
```

**修正案**:
```markdown
2. **Generate Design Document**:
   - **Follow specs/design.md template structure and generation instructions strictly**
   - **PROHIBITED**: Do NOT include Implementation Examples or sample code in Service Interface sections
   - **Interface Definition Only**: Service Interface sections must contain ONLY type definitions (TypeScript interfaces, function signatures)
   - **Implementation details belong in research.md**: Move detailed implementation guidance, code examples, and operational procedures to research.md
   - **Integrate all discovery findings**: Use researched information (APIs, patterns, technologies) throughout component definitions, architecture decisions, and integration points
   - If existing design.md found in Step 1, use it as reference context (merge mode)
   - Apply design rules: Type Safety, Visual Communication, Formal Tone
   - Use language specified in spec.json
```

#### 1.2 Simple Component簡潔化の強調

**現状** (行160):
```markdown
- **Design Focus**: Architecture and interfaces ONLY, no implementation code
```

**修正案**:
```markdown
- **Design Focus**: Architecture and interfaces ONLY, no implementation code
- **Component Detail Levels**:
  - **Full Detail Block**: ONLY for components introducing new architectural boundaries (e.g., new service layers, external integrations, persistence)
  - **Summary Row + Brief Note**: For simple presentation components, utility functions, and straightforward integrations
  - **Rule of Thumb**: If a component's implementation is obvious from its interface, use summary-only format
```

#### 1.3 System Flow説明の簡潔化指示

**追加箇所**: Critical Constraints セクション

**追加内容**:
```markdown
- **Visual Communication**:
  - Mermaid diagrams carry structural detail
  - Text explanations limited to 3-5 bullet points of key decisions per diagram
  - Do NOT narrate the diagram step-by-step in prose
  - Focus on WHY (decisions, trade-offs) not WHAT (already shown in diagram)
```

### 対策2: design.mdテンプレートの修正

**ファイル**: `.kiro/settings/templates/specs/design.md`

#### 2.1 Implementation Example禁止の明記

**現状** (行160-171):
```markdown
##### Service Interface
```typescript
interface [ComponentName]Service {
  methodName(input: InputType): Result<OutputType, ErrorType>;
}
```
- Preconditions:
- Postconditions:
- Invariants:
```

**修正案**:
```markdown
##### Service Interface
```typescript
interface [ComponentName]Service {
  methodName(input: InputType): Result<OutputType, ErrorType>;
}
```

**PROHIBITED**: Do NOT include implementation examples, sample code, or detailed operational procedures here. Service Interface sections must contain ONLY:
- Type definitions (interfaces, function signatures)
- Preconditions, postconditions, invariants (semantic contracts)

For implementation guidance, use research.md or defer to implementation phase.

- Preconditions:
- Postconditions:
- Invariants:
```

#### 2.2 Simple Component簡潔化の例示

**現状** (行130-134):
```markdown
- Summaries can be a table or compact list. Example table:
  | Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
  |-----------|--------------|--------|--------------|--------------------------|-----------|
  | ExampleComponent | UI | Displays XYZ | 1, 2 | GameProvider (P0), MapPanel (P1) | Service, State |
- Only components introducing new boundaries (e.g., logic hooks, external integrations, persistence) require full detail blocks. Simple presentation components can rely on the summary row plus a short Implementation Note.
```

**修正案**:
```markdown
- Summaries can be a table or compact list. Example table:
  | Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
  |-----------|--------------|--------|--------------|--------------------------|-----------|
  | ExampleComponent | UI | Displays XYZ | 1, 2 | GameProvider (P0), MapPanel (P1) | Service, State |

**CRITICAL RULE - Component Detail Levels**:

**Full Detail Block Required** (use detailed format below):
- Components introducing new architectural boundaries
- External service integrations
- Persistence layers
- Complex business logic services
- Stateful components with lifecycle management

**Summary Row ONLY** (no detailed block):
- Simple presentation components (display-only UI)
- Straightforward utility functions
- Standard CRUD operations following existing patterns
- Components with obvious implementation from interface

**Rule of Thumb**: If you can implement it correctly from just the interface definition + steering context, use summary-only format.
```

#### 2.3 System Flow説明の簡潔化

**現状** (行98):
```markdown
> Describe flow-level decisions (e.g., gating conditions, retries) briefly after the diagram instead of restating each step.
```

**修正案**:
```markdown
> After each diagram, provide ONLY 3-5 bullet points of key decisions/trade-offs. Do NOT narrate the diagram step-by-step. Focus on WHY (rationale, constraints) not WHAT (already visible in diagram).

**Example** (good):
```mermaid
[diagram]
```
**Key Decisions**:
- Circuit breaker pattern chosen for external API reliability (alternative: simple retry rejected due to cascading failure risk)
- Async event publish to avoid blocking user response
- Idempotency key required for payment operations

**Anti-pattern** (bad - do NOT do this):
- Step 1: User submits form
- Step 2: Validator checks input
- Step 3: Service processes request
[... narrating every box in the diagram ...]
```

### 対策3: research.mdへの分離促進

#### 3.1 spec-design agentにresearch.md生成を義務化

**現状**: research.mdは「optional」として扱われている

**修正案**: `.claude/agents/kiro/spec-design.md` に追加

```markdown
### Step 3: Generate Design Document

1. **Load Design Template and Rules**:
   ...

2. **Generate Design Document**:
   ...

3. **Generate or Update research.md** (MANDATORY for complex features):
   - Use `.kiro/settings/templates/specs/research.md` template
   - Record all discovery findings, architecture pattern evaluation, and detailed trade-off analysis
   - Move implementation guidance and operational procedures from design.md to research.md
   - Criteria for "complex features requiring research.md":
     - Full discovery process was executed
     - Multiple architecture patterns were evaluated
     - External service integrations with API research
     - If in doubt, generate research.md
```

#### 3.2 design.mdとresearch.mdの責任分離の明確化

**追加**: `.kiro/settings/rules/design-discovery-full.md`

**追加箇所**: 最後のセクション

```markdown
## design.md vs research.md Separation

### design.md (Design Decisions - WHAT & HOW)
- **Architecture pattern selected** (1-2 sentences: "We chose X because Y")
- **Component interfaces** (type definitions only)
- **Data models** (schema definitions)
- **Integration points** (which systems connect, via what contracts)
- **Design decisions** (DD-NNN format: Context, Decision, Rationale)

### research.md (Discovery Process - WHY & ALTERNATIVES)
- **Discovery investigation log** (sources consulted, findings)
- **Architecture pattern evaluation table** (all options considered with pros/cons)
- **Detailed trade-off analysis** (performance benchmarks, cost analysis)
- **Implementation guidance** (code examples, operational procedures)
- **External dependency deep-dive** (API investigation details, version compatibility)

### Rule of Thumb
If a reviewer asks "Why did you choose X over Y?":
- **Brief answer (2-3 sentences)**: Include in design.md Design Decisions section
- **Detailed investigation**: Reference research.md for complete analysis
```

### 対策4: validation-design agentへの検証追加

**ファイル**: `.claude/agents/kiro/validate-design-agent.md` (存在しない場合は新規作成不要、存在する場合は修正)

**検証項目の追加**:

```markdown
## Design Quality Checks

### Size and Complexity
- ❌ FAIL if design.md exceeds 1000 lines without explicit justification
- ⚠️  WARN if design.md exceeds 800 lines
- Suggest: Review component granularity, consider splitting feature

### Implementation Example Detection
- ❌ FAIL if Service Interface sections contain class implementations
- ❌ FAIL if code examples exceed 10 lines in design.md
- Pattern: Look for `class.*implements`, `constructor`, multi-line method bodies
- Suggestion: Move implementation examples to research.md

### Component Detail Bloat
- ⚠️  WARN if more than 50% of components have full detail blocks
- Check: Count components in Summary table vs. detailed blocks
- Suggestion: Use summary-only format for simple components

### System Flow Verbosity
- ⚠️  WARN if System Flows section text exceeds diagram count × 100 characters
- Pattern: Long prose paragraphs following diagrams
- Suggestion: Limit to 3-5 bullet points per diagram
```

## 実装優先順位

### Phase 1: 即効性の高い修正（優先度: 高）

1. **spec-design agentプロンプト修正** (対策1.1-1.3)
   - 効果: 新規spec生成時に自動的に簡潔化
   - 工数: 30分
   - リスク: 低

2. **design.mdテンプレート修正** (対策2.1-2.3)
   - 効果: agentへの指示明確化
   - 工数: 30分
   - リスク: 低

### Phase 2: 既存specへの影響検証（優先度: 中）

3. **既存specのリファクタリング（サンプル実施）**
   - 対象: spec-manager-commands (1347行 → 目標800行)
   - 方法: `/kiro:spec-design spec-manager-commands` 再実行で自動修正確認
   - 工数: 1時間
   - リスク: 中（既存実装との整合性確認必要）

### Phase 3: 品質保証の強化（優先度: 低）

4. **research.md分離促進** (対策3.1-3.2)
   - 効果: 長期的な品質向上
   - 工数: 1時間
   - リスク: 低

5. **validation-design agent検証追加** (対策4)
   - 効果: 自動品質チェック
   - 工数: 1時間
   - リスク: 低（validateは既存フロー外）

## 期待効果

### 短期効果（Phase 1実施後）
- 新規spec生成時のdesign.mdサイズ: 1000行 → 600-700行 (30-40%削減)
- Implementation Example削除による明確化
- Simple component簡潔化による可読性向上

### 中期効果（Phase 2実施後）
- 既存specのリファクタリングによる一貫性向上
- メンテナンスコスト削減

### 長期効果（Phase 3実施後）
- design.mdとresearch.mdの役割分離による構造改善
- 自動品質チェックによる継続的改善

## 結論

**肥大化の根本原因**: テンプレートの「簡潔性」指示が不十分で、spec-design agentが「詳細=高品質」と誤解している

**最優先対策**: spec-design agentプロンプト修正（対策1）とテンプレート修正（対策2）

**期待削減率**: 30-40%（1000行 → 600-700行）

**実装工数**: Phase 1のみで1時間、即効性あり
