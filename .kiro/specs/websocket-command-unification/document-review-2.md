# Specification Review Report #2

**Feature**: websocket-command-unification
**Review Date**: 2026-02-02
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- document-review-1.md
- document-review-1-reply.md
- steering/product.md
- steering/tech.md
- steering/structure.md
- steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 3 |

前回のレビュー（#1）で指摘されたCritical Issue（Requirement 6.3/6.4の不整合）は修正済みです。今回のレビューでは新たなCriticalは発見されませんでしたが、設計の詳細化に関するWarningが2件検出されました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果**: ✅ 良好

前回修正後、Requirements 1-7 の全ての受入基準が Design ドキュメントに正しくマッピングされています。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: EXECUTE_PROJECT_COMMAND | WebSocketHandler, WorkflowController | ✅ |
| Req 2: EXECUTE_SPEC_COMMAND | WebSocketHandler, WorkflowController | ✅ |
| Req 3: WorkflowController拡張（個別メソッド削除は2件のみ） | WorkflowController Interface | ✅ |
| Req 4: 個別ハンドラ削除（ASK_PROJECT, ASK_SPECのみ） | WebSocketHandler | ✅ |
| Req 5: WebSocketApiClient更新 | WebSocketApiClient, ApiClient | ✅ |
| Req 6: Remote UI呼び出し側更新（既存API維持） | Impact Analysis Contract | ✅ |
| Req 7: IpcApiClient整合性 | IpcApiClient | ✅ |

### 1.2 Design ↔ Tasks Alignment

**結果**: ✅ 良好

| Design Component | Corresponding Task | Status |
|-----------------|-------------------|--------|
| WebSocketHandler ハンドラ追加 | Task 2.1, 2.2 | ✅ |
| WorkflowController 拡張 | Task 1.1 | ✅ |
| WebSocketApiClient 更新 | Task 4.1, 4.2, 4.3 | ✅ |
| ApiClient Interface 更新 | Task 5.1 | ✅ |
| IpcApiClient 追加 | Task 6.1 | ✅ |
| 個別ハンドラ削除（ASK_*, のみ） | Task 3.1, 3.2 | ✅ |
| Remote UI 呼び出し更新（変更不要マーク済み） | Task 7.1-7.5 | ✅ |
| ユニットテスト | Task 8.1-8.6 | ✅ |
| 統合テスト | Task 9.1, 9.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（バックエンド変更のみ） | N/A | ✅ |
| Services (WebSocketHandler) | handleExecuteProjectCommand, handleExecuteSpecCommand | Task 2.1, 2.2 | ✅ |
| Services (WorkflowController) | executeProjectCommand, executeSpecCommand | Task 1.1 | ✅ |
| Types/Models | WebSocketMessage types | 暗黙的（既存型拡張） | ✅ |

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
| 3.3 | 個別メソッド削除（executeAskProject, executeAskSpecのみ） | 1.1 | Cleanup | ✅ |
| 3.4 | createWorkflowController実装更新 | 1.1, 8.3, 8.4 | Feature | ✅ |
| 4.1 | 個別メッセージタイプcase文削除（ASK_PROJECT, ASK_SPECのみ） | 3.1 | Cleanup | ✅ |
| 4.2 | 個別ハンドラメソッド削除（handleAskProject, handleAskSpecのみ） | 3.1 | Cleanup | ✅ |
| 4.3 | 関連テスト削除 | 3.2 | Cleanup | ✅ |
| 5.1 | WebSocketApiClient.executeProjectCommand実装 | 4.1, 8.5 | Feature | ✅ |
| 5.2 | WebSocketApiClient.executeSpecCommand追加 | 4.2, 8.6 | Feature | ✅ |
| 5.3 | executeAskProject/executeAskSpec削除 | 4.3 | Cleanup | ✅ |
| 5.4 | ApiClient interface更新（削除） | 5.1 | Cleanup | ✅ |
| 5.5 | ApiClient.executeSpecCommand追加 | 5.1 | Feature | ✅ |
| 6.1 | Project Ask呼び出し更新 | 7.1 | Feature | ✅ |
| 6.2 | Spec Ask呼び出し更新 | 7.2 | Feature | ✅ |
| 6.3 | Spec作成呼び出し（既存API維持） | 7.3 [x] | No Change | ✅ |
| 6.4 | Bug作成呼び出し（既存API維持） | 7.4 [x] | No Change | ✅ |
| 6.5 | Spec Plan呼び出し（既存API維持） | 7.5 [x] | No Change | ✅ |
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
| バリデーションエラー | 1.3, 2.3 | 8.1, 8.2 (unit) | ✅ |

**注意**: バリデーションエラーの統合テストはUnit Testでカバーされており、E2Eテストでの検証は前回レビューで「No Fix Needed」と判断済み。

### 1.6 Refactoring Integrity Check

**結果**: ✅ 良好

| Check | Validation | Status |
|-------|------------|--------|
| 削除対象ファイル | 個別ハンドラメソッドは同一ファイル内（webSocketHandler.ts）で削除 | ✅ |
| Consumer更新 | Task 7.1-7.5 でRemote UI呼び出し側を更新（7.3-7.5は「変更不要」マーク済み） | ✅ |
| 旧APIの完全削除 | Task 4.3, 5.1 で executeAskProject/executeAskSpec を削除 | ✅ |
| 維持対象の明確化 | CREATE_SPEC, CREATE_BUG, EXECUTE_SPEC_PLAN は維持する旨が明記 | ✅ |

### 1.7 Cross-Document Contradictions

**結果**: ✅ 矛盾なし

前回のレビューで指摘された Requirement 6.3/6.4/6.5 の矛盾は修正済み。現在の記述は以下の点で一貫しています：

- Requirements 6.3: `executeSpecPlan(description, useWorktree)` API維持を明記
- Requirements 6.4: `createBug(name, description)` API維持を明記
- Requirements 6.5: Requirements 6.3と同一（executeSpecPlan）
- Design: Requirements Traceability表でも「既存API維持」と記載
- Tasks: 7.3, 7.4, 7.5 が `[x]` マーク済み（変更不要）

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Details |
|-----|----------|---------|
| IpcApiClient.executeSpecCommand の実装詳細 | Warning | Design DD-002で「既存チャネルを再利用し、specIdをcommandに含める」とあるが、具体的なフォーマット例が未記載 |
| エラーレスポンス型の定義 | Info | `ERROR` レスポンスの payload 構造（エラー種別、メッセージ）が明示されていない |

### 2.2 Operational Considerations

| Gap | Severity | Details |
|-----|----------|---------|
| ログ出力 | Info | 新規ハンドラ追加時のログ出力仕様が未記載（steering/logging.md参照推奨） |

## 3. Ambiguities and Unknowns

1. **IpcApiClient.executeSpecCommand の実装フォーマット**（Warning）:
   - Requirement 7.2 で「既存の `EXECUTE_PROJECT_COMMAND` IPCチャネルを使用して（specIdをコマンドに含めて）」と記載
   - Design DD-002 でも同様の記述
   - しかし、具体的なコマンド文字列フォーマットの例が不足
   - 例: `cd /path/to/worktree && claude -p '/kiro:spec-ask "${prompt}"'` 形式？ または環境変数経由？

2. **EXECUTE_SPEC_COMMAND の Worktree 解決**（Warning）:
   - Design では「Spec-levelは `specId` と `featureName` を必須とする（Worktree解決に必要）」と記載
   - しかし、WorkflowController.executeSpecCommand がどのように Worktree パスを解決するかが Design に明記されていない
   - 既存の `specManagerService.startAgent()` がこれを処理する前提か？

3. **Remote UI Project Ask / Spec Ask の呼び出し元特定**（Info）:
   - Task 7.1, 7.2 で「呼び出しを更新」とあるが、具体的なファイル/コンポーネント名が未特定
   - 実装時に探索が必要

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果**: ✅ 良好

- `structure.md` のディレクトリパターンに準拠
  - `main/services/webSocketHandler.ts`
  - `main/ipc/remoteAccessHandlers.ts`
  - `shared/api/WebSocketApiClient.ts`
  - `shared/api/IpcApiClient.ts`
  - `shared/api/types.ts`
- IPC設計パターン（channels.ts, handlers.ts）に準拠
- Remote UIアーキテクチャ（ApiClient抽象化層）に準拠

### 4.2 Integration Concerns

| Concern | Status | Notes |
|---------|--------|-------|
| 既存 executeSpecPlan/createBug API の維持 | ✅ | 修正済み。Requirements/Design/Tasksで明記 |
| Remote UI状態管理 | ✅ | shared/stores を使用、SSOT原則に準拠 |
| IPC/WebSocket抽象化 | ✅ | ApiClient インターフェースで透過化 |
| Electron Process Boundary | ✅ | WorkflowControllerはMainプロセスで動作 |

### 4.3 Migration Requirements

**結果**: ✅ 不要

- 旧メッセージタイプ（`ASK_PROJECT`, `ASK_SPEC`）は既に動作していない（WorkflowController側にメソッドが欠落）
- Remote UIクライアントは同時リリース
- 後方互換性の考慮は前回レビューで「No Fix Needed」と判断済み

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **IpcApiClient.executeSpecCommand の実装フォーマット明確化**
   - Design に具体的なコマンド文字列フォーマット例を追記することを推奨
   - 例: 「`executeSpecCommand(specId, featureName, command, title)` は内部で `cd ${worktreePath} && ${command}` 形式に変換し、`EXECUTE_PROJECT_COMMAND` IPCチャネルに送信する」

2. **Worktree パス解決の明確化**
   - Design の `WorkflowController.executeSpecCommand` セクションに、Worktree パス解決の責務を明記
   - 「`specManagerService.startAgent()` が `specId` から Worktree パスを解決する」等

### Suggestions (Nice to Have)

1. **Remote UI呼び出し元の特定**
   - Task 7.1, 7.2 の説明に、対象ファイル/コンポーネント名を追記
   - 例: `ProjectAskDialog.tsx`, `SpecAskDialog.tsx` 等

2. **エラーレスポンス構造の明記**
   - Design に `ERROR` レスポンスの payload 構造を追記
   - 例: `{ errorType: 'INVALID_PAYLOAD' | 'AGENT_START_FAILED', message: string }`

3. **ログ出力仕様の参照**
   - Tasks に「steering/logging.md を参照してログ出力を追加」の注記を追加

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | IpcApiClient.executeSpecCommand フォーマット未明確 | Design DD-002 に具体的なコマンドフォーマット例を追記 | design.md |
| Warning | Worktree パス解決の責務未明確 | WorkflowController.executeSpecCommand の説明に Worktree 解決方式を追記 | design.md |
| Info | Remote UI呼び出し元未特定 | Task 7.1, 7.2 に対象ファイル名を追記（実装時に判明次第） | tasks.md |
| Info | エラーレスポンス構造未明記 | ERROR レスポンスの payload 構造を Design に追記 | design.md |
| Info | ログ出力仕様参照なし | steering/logging.md 参照の注記を追加 | tasks.md |

---

## Review Status Summary

| Review # | Date | Critical | Warning | Info | Status |
|----------|------|----------|---------|------|--------|
| 1 | 2026-02-02 | 1 | 3 | 2 | Fixed (reply applied) |
| 2 | 2026-02-02 | 0 | 2 | 3 | Current |

**前回からの改善**:
- Critical Issue（Req 6.3/6.4不整合）が解決
- Requirements/Design/Tasks間の一貫性が向上

**残存課題**:
- 2件のWarning（実装詳細の明確化）
- 3件のInfo（Nice to Have）

---

_This review was generated by the document-review command._
