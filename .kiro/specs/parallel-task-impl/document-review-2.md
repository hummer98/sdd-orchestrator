# Specification Review Report #2

**Feature**: parallel-task-impl
**Review Date**: 2026-01-05
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- planning.md
- document-review-1.md
- document-review-1-reply.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/steering/design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 1 |
| Warning | 3 |
| Info | 2 |

前回レビュー（#1）での指摘事項（W3: コマンドセット判定、W5: SpecManagerService明示化）は修正が適用されています。今回のレビューでは、design.mdとtasks.mdの間に新たに発見された重大な不整合を報告します。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- 全ての要件（Req 1〜9）がDesignの要件トレーサビリティ表で明確にマッピングされている
- 各要件に対応するコンポーネント、インターフェース、フローが特定されている

**課題なし**

### 1.2 Design ↔ Tasks Alignment

**🔴 Critical: 設計変更とタスク内容の重大な不整合**

design.mdには以下の設計方針変更が明記されている（design.md:497-501）:

```markdown
**設計方針変更**:
- 既存の `executeTaskImpl` APIを並列実装にも活用（DRY原則）
- 並列実行制御はRenderer側 `ParallelImplService` で管理
- キャンセル処理は既存の `stopAgent` APIを使用
- 新規IPCは `PARSE_TASKS_FOR_PARALLEL` のみ追加
```

しかし、tasks.mdには削除されたはずのタスクが依然として残っている（tasks.md:51-54）:

```markdown
**設計変更による削除タスク**:
- ~~タスク別実装起動IPCハンドラ実装~~: 既存の`EXECUTE_TASK_IMPL`を活用
- ~~キャンセルIPCハンドラ実装~~: 既存の`STOP_AGENT`を活用
```

**問題点**: tasks.mdのTask 2セクションには、削除済みと記載されたタスク（タスク別実装起動IPC、キャンセルIPC）が含まれておらず、設計変更が正しく反映されているように見えるが、design.md側に以下の矛盾がある:

1. **design.md:246-254**では新規APIとして`EXECUTE_TASK_IMPL`チャンネルを定義しているが、設計方針変更では「既存の`executeTaskImpl`を活用」と明記
2. **design.md:244**では`PARSE_TASKS_FOR_PARALLEL`のみ新規追加と明記しているが、API Contract表（design.md:247）には複数のチャンネルが記載されている

| Design文書の記載 | 矛盾状態 |
|-----------------|---------|
| 設計方針: 新規IPCは`PARSE_TASKS_FOR_PARALLEL`のみ | ✅ 正しい意図 |
| API Contract表: `PARSE_TASKS_FOR_PARALLEL`のみ記載 | ✅ 整合 |
| tasks.md: 削除タスクとして`EXECUTE_IMPL_TASK`等を明記 | ⚠️ 命名不整合 |

**根本的問題**: design.md内の既存API参照方法が明確でない。`executeTaskImpl`は`EXECUTE_TASK_IMPL`チャンネルで呼び出すのか、別の既存チャンネル名なのかが不明確。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | ParallelImplButton, PhaseExecutionPanel拡張 | Task 5.1, 5.2 | ✅ |
| Services (Main) | taskParallelParser, SpecManagerService拡張 | Task 1.*, Task 2.* | ⚠️ 不整合あり |
| Services (Renderer) | ParallelImplService | Task 3.* | ✅ |
| IPC Channels | PARSE_TASKS_FOR_PARALLELのみ新規（設計方針） | Task 2.1 | ✅ |
| Preload API | parseTasksForParallelのみ新規 | Task 4 | ⚠️ 削除API記載残存 |
| Types/Models | TaskItem, TaskGroup, ParseResult, ParallelImplState | Task 1内で実装 | ✅ |
| AgentListPanel拡張 | 追加実装不要と明記 | Task 8で動作確認 | ✅ |

**Warning**: Task 4では「既存のexecuteTaskImpl、stopAgent、onAgentStatusChangeを活用（変更なし）」と記載されているが、これらが「既存」であることの確認が必要。コードベースにこれらのAPIが実際に存在するかを実装前に検証すべき。

### 1.4 Cross-Document Contradictions

**🔴 Critical: IPC/API命名の不整合**

| 文書 | 記載内容 | 問題 |
|------|----------|------|
| design.md:251 | `EXECUTE_TASK_IMPL`: 既存チャンネルで個別タスク実装起動 | 「既存」と記載 |
| tasks.md:52 | ~~タスク別実装起動IPCハンドラ実装~~: 既存の`EXECUTE_TASK_IMPL`を活用 | design.mdと一致 |
| document-review-1-reply.md:205 | Task 2.3: 「SpecManagerServiceにexecuteImplTaskメソッドを追加する」 | メソッド名が`executeImplTask`（design.mdは`executeTaskImpl`） |

**命名不整合**:
- design.md: `executeTaskImpl` / `EXECUTE_TASK_IMPL`
- document-review-1-reply.md: `executeImplTask` / `EXECUTE_IMPL_TASK`

この不整合により、実装時にどちらの命名を使用すべきかが不明確。

---

## 2. Gap Analysis

### 2.1 Technical Considerations

| 項目 | 状態 | 詳細 |
|------|------|------|
| エラーハンドリング | ✅ カバー済み | Req 6, Design Error Handling章で詳細に定義 |
| セキュリティ | ✅ カバー済み | Design - Security Considerations で既存チェック活用を明記 |
| パフォーマンス | ✅ カバー済み | Design - Performance & Scalability で制限・キューイング定義 |
| テスト戦略 | ✅ カバー済み | Design - Testing Strategy, Tasks 6.* で網羅 |
| 既存API存在確認 | ⚠️ 未検証 | `executeTaskImpl`, `stopAgent`, `onAgentStatusChange`の存在を実装前に確認必要 |

### 2.2 Operational Considerations

| 項目 | 状態 | 詳細 |
|------|------|------|
| デプロイ手順 | N/A | 既存Electronアプリへの機能追加のため特別な手順不要 |
| ロールバック戦略 | N/A | 機能フラグなしの直接実装（既存ボタン維持で問題なし） |
| モニタリング/ロギング | ✅ カバー済み | Design - Monitoring でProjectLogger活用を明記 |
| Remote UI対応 | ⚠️ 未定義 | steering/tech.mdではRemote UI影響チェックを推奨しているが、本Specでは言及なし |

---

## 3. Ambiguities and Unknowns

### 3.1 曖昧な記述

| 箇所 | 内容 | 影響度 |
|------|------|--------|
| design.md:251-253 | 「既存チャンネル」と記載されているが、channels.tsに`EXECUTE_TASK_IMPL`が存在するかが不明 | Critical |
| tasks.md:68 | 「既存`executeTaskImpl` IPC経由でAgent起動する」- このAPIの正確なシグネチャが未確認 | Warning |

### 3.2 既存API依存の検証

design.mdでは以下を「既存API」として活用すると記載:
- `executeTaskImpl(specId, featureName, taskId, commandPrefix?)`
- `stopAgent(agentId)`
- `onAgentStatusChange(callback)`

**確認必要事項**:
1. これらのAPIがpreload/index.tsに実際に存在するか
2. シグネチャがdesign.mdの記載と一致するか
3. 並列実装のユースケースで正しく動作するか（特に複数同時呼び出し時）

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**評価: ✅ 良好**

- **IPC設計パターン**: Steeringで定義されたchannels.ts/handlers.tsパターンに準拠
- **Zustand使用**: ParallelImplStoreはSteeringのStore Patternに準拠
- **ディレクトリ構造**: 新規ファイルはSteeringのstructure.mdパターンに沿っている

### 4.2 Design Principles Compliance

| 原則 | 評価 | 詳細 |
|------|------|------|
| DRY | ✅ | 既存API（executeTaskImpl等）の再利用を明記 |
| SSOT | ✅ | agentStoreを状態の単一ソースとして使用 |
| KISS | ✅ | 新規IPCを最小限（PARSE_TASKS_FOR_PARALLELのみ）に抑制 |
| YAGNI | ✅ | 必要最小限の機能に絞った設計 |

### 4.3 Remote UI Impact

**⚠️ Warning: Remote UI対応が未定義**

steering/tech.md:125-139では新規Spec作成時のRemote UI影響チェックを推奨:

> 新しい機能を設計する際は、以下を明確にすること：
> 1. Remote UIへの影響有無
> 2. Remote UIも変更する場合の対応

本Specではこの確認が行われていない。並列実装機能がRemote UIからも利用可能にするかの判断が必要。

---

## 5. Recommendations

### Critical Issues (Must Fix)

1. **IPC/API命名の統一**
   - 影響: 実装時の混乱、命名不整合によるバグリスク
   - 推奨アクション:
     - design.mdとtasks.mdで使用するIPC/APIの命名を統一
     - `executeTaskImpl` vs `executeImplTask`のどちらを使用するか明確化
     - 既存APIとして参照する場合は、実際のチャンネル名（channels.ts）を確認して記載

### Warnings (Should Address)

1. **既存API存在確認**
   - 影響: 実装時に存在しないAPIを前提にした設計になるリスク
   - 推奨: 実装開始前にpreload/index.tsとchannels.tsを確認し、`executeTaskImpl`, `stopAgent`, `onAgentStatusChange`の存在とシグネチャを検証

2. **Remote UI対応の明確化**
   - 影響: steering準拠の観点で不完全
   - 推奨: requirements.mdまたはdesign.mdに「Remote UI対応: 不要（Desktop専用機能）」または対応方針を明記

3. **document-review-1-reply.mdの修正内容確認**
   - 影響: replyで提案された修正内容と実際のdesign.md/tasks.mdの内容に不整合がある可能性
   - 推奨: replyで適用済みとされた修正が正しくdesign.md/tasks.mdに反映されているか再確認

### Suggestions (Nice to Have)

1. **既存API参照の具体化**
   - design.mdにelectronAPI.executeTaskImpl等の完全なシグネチャを記載（preload/index.tsからコピー）
   - 実装者が参照すべきファイルパスを明記

2. **前回レビュー修正の追跡**
   - document-review-1-reply.mdで適用されたとされる修正が、実際のtasks.mdに反映されているか確認
   - tasks.md:52-54の「設計変更による削除タスク」セクションの記載がreplyの内容と一致していない（replyではTask 2.3, 2.4の修正を記載しているが、tasks.mdでは該当タスク番号が存在しない）

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | IPC/API命名不整合 | 命名を統一（`executeTaskImpl`/`EXECUTE_TASK_IMPL`に統一推奨） | design.md, tasks.md |
| Warning | 既存API存在未確認 | preload/index.ts, channels.tsで存在確認 | - (実装前タスク) |
| Warning | Remote UI対応未定義 | 「Desktop専用」を明記 | requirements.md or design.md |
| Warning | reply適用確認 | 修正内容がdesign.md/tasks.mdに正しく反映されているか確認 | design.md, tasks.md |
| Info | API参照の具体化 | 既存APIのシグネチャ明記 | design.md |
| Info | 削除タスク記載整理 | tasks.mdの「設計変更による削除タスク」セクションを整理 | tasks.md |

---

## 7. Comparison with Review #1

### Resolved Issues from Review #1

| Issue | Status |
|-------|--------|
| W3: コマンドセット判定ロジック | ✅ 修正適用済み（design.md:286-287に追記確認） |
| W5: SpecManagerService拡張明示化 | ⚠️ 部分的（設計方針変更により一部タスク削除、整合性要確認） |

### New Issues in Review #2

| Issue | Severity | Reason |
|-------|----------|--------|
| IPC/API命名不整合 | Critical | design.mdとdocument-review-1-replyの命名が異なる |
| 既存API存在確認 | Warning | 設計方針変更で「既存API活用」に変更されたが、存在確認が未実施 |
| Remote UI対応 | Warning | steering準拠チェックで検出 |

---

_This review was generated by the document-review command._
