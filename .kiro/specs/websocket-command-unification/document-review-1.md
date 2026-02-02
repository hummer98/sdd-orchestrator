# Specification Review Report #1

**Feature**: websocket-command-unification
**Review Date**: 2026-02-02
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- steering/product.md
- steering/tech.md
- steering/structure.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning | 3 |
| Info | 2 |

全体として、Requirements → Design → Tasks の整合性は良好であり、各受入基準に対応するタスクが明確にマッピングされています。ただし、**Critical** な問題として、Requirement 6（Remote UI呼び出し側更新）において、現在の実装と要件に齟齬があります。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果**: ✅ 良好

Requirements 1-7 の全ての受入基準が Design ドキュメントの Components and Interfaces セクションおよび Requirements Traceability 表に記載されています。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: EXECUTE_PROJECT_COMMAND | WebSocketHandler, WorkflowController | ✅ |
| Req 2: EXECUTE_SPEC_COMMAND | WebSocketHandler, WorkflowController | ✅ |
| Req 3: WorkflowController拡張 | WorkflowController Interface | ✅ |
| Req 4: 個別ハンドラ削除 | WebSocketHandler | ✅ |
| Req 5: WebSocketApiClient更新 | WebSocketApiClient, ApiClient | ✅ |
| Req 6: Remote UI呼び出し側更新 | Impact Analysis Contract | ✅ |
| Req 7: IpcApiClient整合性 | IpcApiClient | ✅ |

### 1.2 Design ↔ Tasks Alignment

**結果**: ✅ 良好

Design で定義された全コンポーネントに対応するタスクが存在します。

| Design Component | Corresponding Task | Status |
|-----------------|-------------------|--------|
| WebSocketHandler ハンドラ追加 | Task 2.1, 2.2 | ✅ |
| WorkflowController 拡張 | Task 1.1 | ✅ |
| WebSocketApiClient 更新 | Task 4.1, 4.2, 4.3 | ✅ |
| ApiClient Interface 更新 | Task 5.1 | ✅ |
| IpcApiClient 追加 | Task 6.1 | ✅ |
| 個別ハンドラ削除 | Task 3.1, 3.2 | ✅ |
| Remote UI 呼び出し更新 | Task 7.1-7.5 | ✅ |
| ユニットテスト | Task 8.1-8.6 | ✅ |
| 統合テスト | Task 9.1, 9.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**結果**: ⚠️ 警告あり

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（バックエンド変更のみ） | N/A | ✅ |
| Services (WebSocketHandler) | handleExecuteProjectCommand, handleExecuteSpecCommand | Task 2.1, 2.2 | ✅ |
| Services (WorkflowController) | executeProjectCommand, executeSpecCommand | Task 1.1 | ✅ |
| Types/Models | WebSocketMessage types | 暗黙的（既存型拡張） | ⚠️ |

**注意**: WebSocketメッセージの型定義（`EXECUTE_PROJECT_COMMAND`、`EXECUTE_SPEC_COMMAND`のペイロード型）の明示的な定義タスクがありません。既存の`WebSocketMessage`型を使用する前提ですが、型安全性のために専用のペイロード型を定義することを推奨します。

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | EXECUTE_PROJECT_COMMAND送信時にstartAgent呼び出し | 2.1, 9.1 | Feature | ✅ |
| 1.2 | command/titleをargs/phaseに渡す | 2.1 | Feature | ✅ |
| 1.3 | command/title未指定時にINVALID_PAYLOAD | 2.1, 8.1 | Feature | ✅ |
| 1.4 | 成功時にEXECUTE_PROJECT_COMMAND_STARTEDを返却 | 2.1, 8.1, 9.1 | Feature | ✅ |
| 1.5 | 失敗時にERRORを返却 | 2.1, 8.1 | Feature | ✅ |
| 2.1 | EXECUTE_SPEC_COMMAND送信時にstartAgent呼び出し | 2.2, 9.2 | Feature | ✅ |
| 2.2 | specId/featureName/command/titleを渡す | 2.2 | Feature | ✅ |
| 2.3 | 必須フィールド未指定時にINVALID_PAYLOAD | 2.2, 8.2 | Feature | ✅ |
| 2.4 | 成功時にEXECUTE_SPEC_COMMAND_STARTEDを返却 | 2.2, 8.2, 9.2 | Feature | ✅ |
| 2.5 | 失敗時にERRORを返却 | 2.2, 8.2 | Feature | ✅ |
| 3.1 | WorkflowController.executeProjectCommand定義 | 1.1 | Infrastructure | ✅ |
| 3.2 | WorkflowController.executeSpecCommand定義 | 1.1 | Infrastructure | ✅ |
| 3.3 | 個別メソッド削除 | 1.1 | Cleanup | ✅ |
| 3.4 | createWorkflowController実装更新 | 1.1, 8.3, 8.4 | Feature | ✅ |
| 4.1 | 個別メッセージタイプcase文削除 | 3.1 | Cleanup | ✅ |
| 4.2 | 個別ハンドラメソッド削除 | 3.1 | Cleanup | ✅ |
| 4.3 | 関連テスト削除 | 3.2 | Cleanup | ✅ |
| 5.1 | WebSocketApiClient.executeProjectCommand実装 | 4.1, 8.5 | Feature | ✅ |
| 5.2 | WebSocketApiClient.executeSpecCommand追加 | 4.2, 8.6 | Feature | ✅ |
| 5.3 | executeAskProject/executeAskSpec削除 | 4.3 | Cleanup | ✅ |
| 5.4 | ApiClient interface更新（削除） | 5.1 | Cleanup | ✅ |
| 5.5 | ApiClient.executeSpecCommand追加 | 5.1 | Feature | ✅ |
| 6.1 | Project Ask呼び出し更新 | 7.1 | Feature | ✅ |
| 6.2 | Spec Ask呼び出し更新 | 7.2 | Feature | ✅ |
| 6.3 | Spec作成呼び出し更新 | 7.3 | Feature | ✅ |
| 6.4 | Bug作成呼び出し更新 | 7.4 | Feature | ✅ |
| 6.5 | Spec Plan呼び出し更新 | 7.5 | Feature | ✅ |
| 7.1 | IpcApiClient.executeSpecCommand実装 | 6.1 | Feature | ✅ |
| 7.2 | IPC経由でエージェント起動 | 6.1 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| WebSocket → WorkflowController → SpecManagerService | EXECUTE_PROJECT_COMMAND シーケンス | 9.1 | ✅ |
| WebSocket → WorkflowController → SpecManagerService (Spec-level) | EXECUTE_SPEC_COMMAND シーケンス | 9.2 | ✅ |
| バリデーションエラー | 1.3, 2.3 | 8.1, 8.2 (unit) | ⚠️ |

**注意**: バリデーションエラーの統合テストが明示的に定義されていません。Unit Testでカバーされていますが、E2Eでのエラーハンドリング検証タスクの追加を推奨します。

### 1.6 Refactoring Integrity Check

**結果**: ✅ 良好

| Check | Validation | Status |
|-------|------------|--------|
| 削除対象ファイル | 個別ハンドラメソッドは同一ファイル内（webSocketHandler.ts）で削除 | ✅ |
| Consumer更新 | Task 7.1-7.5 でRemote UI呼び出し側を更新 | ✅ |
| 旧APIの完全削除 | Task 4.3, 5.1 で executeAskProject/executeAskSpec を削除 | ✅ |

### 1.7 Cross-Document Contradictions

**❌ CRITICAL: Requirement 6 と現状実装の不整合**

Requirements 6.3（Spec作成）と 6.4（Bug作成）において、現在の実装との齟齬があります：

**Requirements 6.3 の記述**:
> When Remote UIでSpec作成を実行する場合、the system shall `executeProjectCommand('/kiro:spec-init "${description}"', 'spec-init')` を呼び出す

**現在の実装（CreateSpecDialogRemote.tsx:79）**:
```typescript
const result = await apiClient.executeSpecPlan(description.trim(), useWorktree);
```

**要件との差異**:
- 要件では `spec-init` コマンドを使用すると記載
- 現在の実装は `executeSpecPlan` を使用（これは `spec-plan` コマンド相当）
- `spec-init` と `spec-plan` は異なる動作をする可能性がある

**解決オプション**:
1. Requirements を修正して `spec-plan` を使用することを明記する（現状追認）
2. 要件通り `spec-init` を使用するよう Tasks 7.3 を更新する

**同様に Requirements 6.4（Bug作成）**:
- 要件では `executeProjectCommand('/kiro:bug-create ${name} "${description}"', 'bug-create')` を指定
- 現在の実装は `bugStore.createBug()` → `apiClient.createBug()` を使用
- `apiClient.createBug` は `CREATE_BUG` WebSocketメッセージを送信

これは意図的な設計選択の可能性がありますが、要件との不整合を解消する必要があります。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Details |
|-----|----------|---------|
| WebSocketメッセージ型定義 | Warning | EXECUTE_PROJECT_COMMAND/EXECUTE_SPEC_COMMAND の payload 型が明示されていない |
| エラーハンドリングE2E | Info | バリデーションエラーのE2Eテストタスクがない |
| Worktreeオプション | Info | Requirement 6.3 で useWorktree オプションの扱いが未記載 |

### 2.2 Operational Considerations

| Gap | Severity | Details |
|-----|----------|---------|
| 後方互換性 | Warning | Remote UIクライアントが旧APIを使用している場合の移行パス未記載 |
| ロールバック | Info | 問題発生時のロールバック手順なし（新APIのみ追加→旧API削除の2段階が望ましい） |

## 3. Ambiguities and Unknowns

1. **Requirement 7.2 の実装詳細**: 「既存の `EXECUTE_PROJECT_COMMAND` IPCチャネルを使用して（specIdをコマンドに含めて）」の具体的なコマンド文字列フォーマットが未定義
   - 例: `/kiro:spec-ask "${prompt}"` をそのまま使用？それとも specId を別の方法で埋め込む？

2. **CreateSpecDialogRemote の useWorktree**: 現在の実装は `executeSpecPlan(description, useWorktree)` を呼び出すが、汎用化後の `executeProjectCommand` でどのように worktree オプションを渡すか未記載

3. **createBug API の扱い**: Requirement 6.4 では `executeProjectCommand` を使用するが、`bugStore.createBug()` の内部実装（`apiClient.createBug`）も更新が必要か、または bugStore 自体を `executeProjectCommand` を使うよう変更するか

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果**: ✅ 良好

- `structure.md` に記載のディレクトリパターンに準拠
- `main/services/` に WebSocketHandler が配置
- `shared/api/` に ApiClient 実装が配置
- IPCパターン（`handlers.ts`, `remoteAccessHandlers.ts`）に準拠

### 4.2 Integration Concerns

| Concern | Status | Notes |
|---------|--------|-------|
| 既存の executeSpecPlan/createBug API | ⚠️ | 削除タスクが明示されていない。Requirements 6 と現実装の整合性要確認 |
| Remote UI状態管理 | ✅ | shared/stores を使用、SSOT原則に準拠 |
| IPC/WebSocket抽象化 | ✅ | ApiClient インターフェースで透過化 |

### 4.3 Migration Requirements

| Item | Defined | Notes |
|------|---------|-------|
| 段階的移行 | ❌ | 旧API（ASK_PROJECT等）と新API（EXECUTE_PROJECT_COMMAND）の並行稼働期間なし |
| クライアント更新強制 | ⚠️ | Remote UIは同時リリースだが、サードパーティクライアントがあれば問題 |
| 後方互換性 | ❌ | 旧メッセージタイプは完全削除される |

## 5. Recommendations

### Critical Issues (Must Fix)

1. **Requirements 6.3 と 6.4 の明確化** - 現在の `executeSpecPlan` / `createBug` 実装との整合性を取る
   - オプション A: Requirements を修正して現状追認（spec-plan を使う、createBug APIを維持）
   - オプション B: Tasks 7.3, 7.4 を修正して executeProjectCommand を使うよう変更

### Warnings (Should Address)

1. **WebSocketメッセージ payload 型定義** - 型安全性向上のため、EXECUTE_PROJECT_COMMAND と EXECUTE_SPEC_COMMAND の payload インターフェースを明示的に定義

2. **後方互換性の検討** - 移行期間を設けるか、リリースノートで Breaking Change を明記

3. **useWorktree オプションの扱い** - executeProjectCommand への移行時に worktree モードをどう表現するか明確化

### Suggestions (Nice to Have)

1. **E2Eテストでバリデーションエラーケースを追加** - UJ-003 相当のテストタスクを追加

2. **Requirement 7.2 のコマンドフォーマット例を追記** - IpcApiClient.executeSpecCommand の具体的な実装パターンを Design に記載

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | Req 6.3/6.4 と現実装の不整合 | Requirements または Tasks を修正して整合性を取る | requirements.md または tasks.md |
| Warning | WebSocket payload 型未定義 | Design に payload interface を追加 | design.md |
| Warning | 後方互換性未検討 | Design Decisions に移行戦略を追記 | design.md |
| Warning | useWorktree オプション未記載 | Req 6.3, 6.5 に worktree オプションの扱いを追記 | requirements.md |
| Info | バリデーションE2Eテストなし | Task 9.3 としてエラーハンドリングE2Eを追加検討 | tasks.md |
| Info | Req 7.2 の詳細不足 | IpcApiClient 実装パターンを Design に追記 | design.md |

---

_This review was generated by the document-review command._
