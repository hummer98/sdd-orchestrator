# Specification Review Report #1

**Feature**: execute-method-unification
**Review Date**: 2026-01-17
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 4 |
| Info | 3 |

全体的に良質な仕様書セットです。Requirements→Design→Tasksの一貫性は高く、Discriminated Union型を使った統一APIの設計は技術的に妥当です。ただし、いくつかの考慮漏れとOpen Questionsの未解決事項があります。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: Union型による引数定義 | ExecuteOptions Union Type詳細定義あり | ✅ |
| Req 2: executeメソッドの統一 | SpecManagerService.execute詳細設計あり | ✅ |
| Req 3: startAgentでのworktreeCwd自動解決 | startAgent拡張の詳細設計あり | ✅ |
| Req 4: IPCチャンネルの統一 | EXECUTE IPC Channel詳細設計あり | ✅ |
| Req 5: Renderer側の更新 | Requirements Traceabilityで5.1-5.4カバー | ✅ |
| Req 6: WebSocket/Remote UI対応 | WebSocketHandler Update設計あり | ✅ |
| Req 7: テストの更新 | Testing Strategy記載あり | ✅ |

**結果**: 全Requirementsがdesign.mdでカバーされています。

### 1.2 Design ↔ Tasks Alignment

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| ExecuteOptions Union Type | Task 1.1, 1.2, 1.3 | ✅ |
| SpecManagerService.execute | Task 2.1, 2.2 | ✅ |
| startAgent拡張 | Task 3.1 | ✅ |
| EXECUTE IPC Channel | Task 4.1, 4.2, 4.3, 4.4 | ✅ |
| WebSocketHandler Update | Task 6.1, 6.2, 6.3 | ✅ |

**結果**: 全Design ComponentsがTasksでカバーされています。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Types | ExecuteOptions Union (11 interface types) | Task 1.1-1.3 | ✅ |
| Services | execute(), startAgent拡張 | Task 2.1-2.2, 3.1 | ✅ |
| IPC | EXECUTE channel, handler | Task 4.1-4.4 | ✅ |
| Renderer | specStoreFacade, WorkflowView, electron.d.ts | Task 5.1-5.4 | ✅ |
| Remote UI | webSocketHandler, WebSocketApiClient | Task 6.1-6.3 | ✅ |
| Tests | Unit, Integration, E2E | Task 7.1-7.4 | ✅ |

**結果**: UI連携、サービス、型定義全てにTaskが存在します。

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 各フェーズの引数を個別interfaceで定義 | 1.2 | Infrastructure | ✅ |
| 1.2 | 共通フィールドをExecutePhaseBaseとして抽出 | 1.1 | Infrastructure | ✅ |
| 1.3 | typeフィールドでフェーズ区別 | 1.2 | Infrastructure | ✅ |
| 1.4 | 全interfaceをExecuteOptionsとしてUnion化 | 1.3 | Infrastructure | ✅ |
| 1.5 | 型定義はtypes/ディレクトリ配置 | 1.1 | Infrastructure | ✅ |
| 2.1 | execute(options)メソッド実装 | 2.1 | Feature | ✅ |
| 2.2 | options.typeで分岐 | 2.1 | Feature | ✅ |
| 2.3 | document-reviewのscheme切り替え | 2.1 | Feature | ✅ |
| 2.4 | 既存execute*メソッド削除 | 2.2 | Feature | ✅ |
| 2.5 | executeはstartAgent呼び出し | 2.1 | Feature | ✅ |
| 3.1 | group === 'impl'時のworktreeCwd自動解決 | 3.1 | Feature | ✅ |
| 3.2 | 明示的worktreeCwd優先 | 3.1 | Feature | ✅ |
| 3.3 | docグループはスキップ | 3.1 | Feature | ✅ |
| 3.4 | 自動解決ログ出力 | 3.1 | Feature | ✅ |
| 4.1 | EXECUTE IPCチャンネル定義 | 4.1 | Infrastructure | ✅ |
| 4.2 | EXECUTEハンドラ実装 | 4.2 | Feature | ✅ |
| 4.3 | EXECUTE_PHASE, EXECUTE_TASK_IMPL削除 | 4.4 | Feature | ✅ |
| 4.4 | electronAPI.execute公開 | 4.3 | Feature | ✅ |
| 4.5 | 既存API削除 | 4.4 | Feature | ✅ |
| 5.1 | specStoreFacade更新 | 5.2 | Feature | ✅ |
| 5.2 | WorkflowView更新 | 5.3 | Feature | ✅ |
| 5.3 | electron.d.ts更新 | 5.1 | Infrastructure | ✅ |
| 5.4 | 既存呼び出し置き換え | 5.4 | Feature | ✅ |
| 6.1 | WebSocketハンドラ更新 | 6.1 | Feature | ✅ |
| 6.2 | WebSocketApiClient更新 | 6.2 | Feature | ✅ |
| 6.3 | Remote UI動作確認 | 6.3 | Feature | ✅ |
| 7.1 | テスト統合 | 7.1 | Feature | ✅ |
| 7.2 | 各フェーズタイプテスト | 7.1 | Feature | ✅ |
| 7.3 | worktreeCwd自動解決テスト | 7.2 | Feature | ✅ |
| 7.4 | IPCハンドラテスト更新 | 7.3 | Feature | ✅ |
| 7.5 | Rendererテスト更新 | 7.4 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

特に矛盾は検出されませんでした。

## 2. Gap Analysis

### 2.1 Technical Considerations

| ID | Gap | Severity | Detail |
|----|-----|----------|--------|
| T-1 | Type Export Strategy | Warning | `types/executeOptions.ts`の型を`types/index.ts`に集約するか、直接exportするかが不明確。tech.mdによると「型定義は`types/index.ts`に集約」がパターン。 |
| T-2 | Logging Format | Info | requirement 3.4「自動解決ログ出力」のフォーマットが未定義。logging.mdのガイドラインに準拠すべき。 |
| T-3 | Error Handling for Missing Worktree | Warning | `group === 'impl'`で`getSpecWorktreeCwd(specId)`がnullを返す場合のエラーハンドリングが設計で明記されていない。 |

### 2.2 Operational Considerations

| ID | Gap | Severity | Detail |
|----|-----|----------|--------|
| O-1 | Migration Path | Info | 後方互換性を考慮しない決定は妥当だが、変更時のビルドエラー対応手順が未記載。全ファイル一括更新が必要。 |
| O-2 | Rollback Strategy | Info | 変更量が大きいため、問題発生時のロールバック戦略についての言及がない。Git revertで対応可能だが明記されていない。 |

## 3. Ambiguities and Unknowns

### Open Questions (requirements.mdより)

| ID | Question | Impact | Recommendation |
|----|----------|--------|----------------|
| OQ-1 | `executeSpecManagerPhase`（Remote UI向け）も統一するか | Medium | requirements.mdのOut of Scopeに記載されているが、design.mdのWebSocketHandler部分と整合が取れていない可能性。Remote UIからの実行は新`EXECUTE`メッセージを使用するので、`executeSpecManagerPhase`は不要になる可能性が高い。明確化推奨。 |
| OQ-2 | `retryWithContinue`はsessionIdベースの再開なので、統一execute APIに含めるか | Low | Non-Goalsに記載されているので現時点では問題なし。将来的な統一を検討する際に再訪。 |

### 未定義事項

| ID | Item | Impact | Detail |
|----|------|--------|--------|
| A-1 | scheme未指定時のデフォルト値 | Low | `ExecuteDocumentReview`の`scheme?: ReviewerScheme`がオプショナルだが、未指定時のデフォルト値が不明。既存実装に依存する可能性。 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

| Aspect | Alignment | Status |
|--------|-----------|--------|
| Discriminated Union Pattern | TypeScript標準パターン、tech.mdと整合 | ✅ |
| IPC Pattern | channels.ts + handlers.ts構成、structure.mdと整合 | ✅ |
| Service Pattern | specManagerServiceの拡張、structure.mdと整合 | ✅ |
| State Management | ドメインデータはshared/stores、変更なし | ✅ |

**結果**: 既存アーキテクチャと完全に整合しています。

### 4.2 Integration Concerns

| Concern | Assessment | Status |
|---------|------------|--------|
| Remote UI影響 | tech.mdの「新規Spec作成時の確認事項」に準拠し、Remote UI対応が明記されている | ✅ |
| Logging | logging.mdガイドラインへの準拠は設計で明記されていないが、深刻ではない | ⚠️ |
| Design Principles | DRY, SSOT, KISSに準拠した設計判断（DD-001〜DD-005） | ✅ |

### 4.3 Migration Requirements

| Item | Status | Detail |
|------|--------|--------|
| Data Migration | N/A | 永続データの変更なし |
| Phased Rollout | N/A | 後方互換なしの一括変更（DD-003で決定） |
| Backward Compatibility | 意図的に非対応 | Decision Log + DD-003で文書化済み |

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Recommendation |
|----|-------|----------------|
| W-1 | T-1: Type Export Strategy | `types/executeOptions.ts`を作成後、`types/index.ts`でre-exportするパターンを明記（Task 1.1の詳細に追記） |
| W-2 | T-3: Missing Worktree Error | `getSpecWorktreeCwd`がnullの場合のエラーハンドリングをdesign.mdのstartAgent拡張部分に追記 |
| W-3 | OQ-1: executeSpecManagerPhase | Remote UIの統一APIにより`executeSpecManagerPhase`が不要になるか、design.mdで明確化 |
| W-4 | A-1: scheme Default Value | `ExecuteDocumentReview`のscheme未指定時のデフォルト動作を明記（既存と同じなら「既存実装を踏襲」と記載） |

### Suggestions (Nice to Have)

| ID | Suggestion | Benefit |
|----|------------|---------|
| S-1 | T-2: Logging Format | 自動解決ログのフォーマット例を設計に追記（`[INFO] [specManager] worktreeCwd auto-resolved: /path/to/worktree`） |
| S-2 | O-1: Migration Guide | 実装時に全呼び出し元の更新リストを作成しておく（Task 5.4の参考情報として） |
| S-3 | O-2: Rollback Note | 問題発生時のロールバック手順をtasks.mdのAppendixに追記 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-1 | Task 1.1に「types/index.tsでre-export」を追記 | tasks.md |
| Warning | W-2 | startAgent拡張にworktreeCwd nullケースのエラーハンドリングを追記 | design.md |
| Warning | W-3 | Out of Scopeの`executeSpecManagerPhase`と新設計の関係を明確化 | requirements.md or design.md |
| Warning | W-4 | scheme未指定時のデフォルト動作を明記 | design.md |
| Info | S-1 | ログフォーマット例を追記 | design.md |
| Info | S-2 | 呼び出し元ファイルリスト作成をTask 5.4に追記 | tasks.md |
| Info | S-3 | ロールバック手順をAppendixに追記 | tasks.md |

---

_This review was generated by the document-review command._
