# Specification Review Report #1

**Feature**: agent-error-notification
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

| Category | Count |
|----------|-------|
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

全体的に仕様は整合性が取れており、実装に進むことができます。いくつかの軽微な警告と情報レベルの課題があり、実装時に考慮が必要です。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ 整合性あり

Requirements.mdの全5要件（17受け入れ基準）が、Design.mdのRequirements Traceabilityセクションで明確にマッピングされています。

| 要件 | Design Coverage | Status |
|------|-----------------|--------|
| Req 1: ロガー統合 (1.1-1.5) | DD-001, Impact Analysis | ✅ |
| Req 2: エラー検出・分類 (2.1-2.6) | AgentStartErrorClassifier, Data Models | ✅ |
| Req 3: Renderer通知 (3.1-3.5) | IPC Layer, Event Contract | ✅ |
| Req 4: エラーログ出力 (4.1-4.2) | Monitoring section | ✅ |
| Req 5: 既存通知との整合性 (5.1-5.3) | DD-003 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**Status**: ✅ 整合性あり

Design.mdで定義された全コンポーネントがTasks.mdで適切にタスク化されています。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| AgentStartErrorClassifier | Task 3.1 | ✅ |
| agentStartErrorMessages | Task 1.2 | ✅ |
| channels.ts拡張 | Task 2.1 | ✅ |
| handlers.ts拡張 | Task 6.1 | ✅ |
| IpcApiClient拡張 | Task 7.1 | ✅ |
| logger.ts削除 | Task 4.1, 4.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**Status**: ✅ 完全

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Types | AgentStartError, AgentStartErrorType | Task 1.1 | ✅ |
| Messages | agentStartErrorMessages | Task 1.2 | ✅ |
| Services | AgentStartErrorClassifier | Task 3.1 | ✅ |
| IPC | AGENT_START_ERROR channel | Task 2.1, 6.1 | ✅ |
| API | IpcApiClient拡張 | Task 7.1 | ✅ |
| Renderer | main.tsx, Toast表示 | Task 7.2 | ✅ |
| Unit Tests | Classifier, Messages | Task 8.1, 8.2 | ✅ |
| Integration Tests | IPC通知検証 | Task 9.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**Status**: ✅ 全基準がカバー済み

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | logger.ts削除後もコンパイルエラーなし | 4.2 | Infrastructure | ✅ |
| 1.2 | specManagerServiceログ出力 | 4.1 | Infrastructure | ✅ |
| 1.3 | agentProcessログ出力 | 4.1 | Infrastructure | ✅ |
| 1.4 | プロジェクト未選択時はglobalログのみ | - | 既存動作 | ✅ |
| 1.5 | 全ファイルのimport更新 | 4.1 | Infrastructure | ✅ |
| 2.1 | ENOENT→COMMAND_NOT_FOUND | 3.1, 5.1, 8.1 | Feature | ✅ |
| 2.2 | 即時exit時のcode/stderr取得 | 3.1, 5.1, 5.2 | Feature | ✅ |
| 2.3 | "not logged in"→AUTH_REQUIRED | 3.1, 5.2, 8.1 | Feature | ✅ |
| 2.4 | "API key"→API_KEY_MISSING | 3.1, 5.2, 8.1 | Feature | ✅ |
| 2.5 | 未分類→UNKNOWN_ERROR | 3.1, 5.2, 8.1 | Feature | ✅ |
| 2.6 | AgentStartError型定義 | 1.1 | Infrastructure | ✅ |
| 3.1 | エラー情報をIPCで送信 | 6.1 | Feature | ✅ |
| 3.2 | AGENT_START_ERRORチャンネル | 2.1 | Infrastructure | ✅ |
| 3.3 | RendererでToast表示 | 7.1, 7.2 | Feature | ✅ |
| 3.4 | 日本語ローカライズ | 1.2, 8.2 | Feature | ✅ |
| 3.5 | 8秒auto-dismiss | 7.2 | Feature | ✅ |
| 4.1 | ERRORレベルで詳細ログ出力 | 5.3 | Feature | ✅ |
| 4.2 | global+projectログ両方に出力 | 5.3 | Feature | ✅ |
| 5.1 | statusCallbacksでfailed通知 | 6.1, 9.1 | Feature | ✅ |
| 5.2 | AGENT_START_ERROR追加通知 | 6.1, 9.1 | Feature | ✅ |
| 5.3 | Rendererで両通知ハンドリング | 7.2 | Feature | ✅ |

**Validation Results**:
- [x] 全criterion IDsがrequirements.mdからマッピング済み
- [x] ユーザー向け基準にFeature Implementationタスクあり
- [x] Infrastructure タスクのみに依存する基準なし

### 1.5 Integration Test Coverage

**Status**: ⚠️ WARNING - 一部検証ポイント不足

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| spawn error → IPC | "Agent Start Error Flow" | 9.1 | ✅ |
| AGENT_STATUS_CHANGE + AGENT_START_ERROR両方送信 | DD-003 | 9.1 | ✅ |
| notificationStore.notifications追加 | "Integration Test Strategy" | - | ⚠️ |

**Issue W-001**: Design.mdの"Integration Test Strategy"で「notificationStore.notifications配列にエラー追加確認」が検証ポイントとして挙げられているが、Tasks.mdに対応するテストタスクが明示的にない。Task 9.1の範囲を拡張するか、別途タスク追加が望ましい。

### 1.6 Cross-Document Contradictions

**Status**: ⚠️ WARNING - 軽微な不整合

**Issue W-002**: Requirements 3.5では「auto-dismiss after 8 seconds」と明記されているが、Design.mdのRequirements Traceability (3.5行)では「notify.error()既存動作」と記載。既存のnotify.error()が8秒auto-dismissを実装しているか確認が必要。

## 2. Gap Analysis

### 2.1 Technical Considerations

| 観点 | Status | Notes |
|------|--------|-------|
| エラーハンドリング | ✅ 詳細定義 | Error Strategy, Error Categories and Responses |
| セキュリティ | ℹ️ 軽微 | stderrにセンシティブ情報が含まれる可能性への考慮なし |
| パフォーマンス | N/A | パフォーマンスクリティカルではない |
| テスト戦略 | ✅ 定義済み | Unit, Integration, User Journey |
| ロギング | ✅ 定義済み | projectLogger経由 |

### 2.2 Operational Considerations

| 観点 | Status | Notes |
|------|--------|-------|
| デプロイ手順 | N/A | 標準Electronビルド |
| ロールバック戦略 | ℹ️ 考慮なし | logger.ts削除は破壊的だがロールバック可能 |
| モニタリング | ✅ 定義済み | projectLogger.error() |
| ドキュメント更新 | ℹ️ 考慮なし | ユーザー向けドキュメント更新不要と思われるが明記なし |

## 3. Ambiguities and Unknowns

### Open Questions (requirements.mdに記載済み)

1. **Claude CLI認証エラーパターン**: exit codeとstderr出力パターンは実機確認が必要
2. **APIキー未設定時の挙動**: Claude CLIの挙動は実機確認が必要

### Additional Ambiguities

**Issue W-003**: Task 5.2で「起動直後（一定時間内）のexit eventを検出」と記載あるが、「一定時間」の具体的な秒数が未定義。実装時にしきい値を決定する必要がある。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 準拠

| 観点 | Steering Reference | Status |
|------|-------------------|--------|
| IPC設計パターン | tech.md | ✅ channels.ts, handlers.tsパターンに準拠 |
| Zustand storeパターン | structure.md | ✅ shared/stores配置 |
| ロギング設計 | tech.md | ✅ projectLogger使用 |
| 型定義配置 | structure.md | ✅ shared/types配置 |

### 4.2 Integration Concerns

| 観点 | Notes |
|------|-------|
| 既存パターンとの整合性 | ✅ AGENT_EXIT_ERRORに類似したAGENT_START_ERRORを追加 |
| Remote UI影響 | ℹ️ Out of Scopeとして明記済み。将来WebSocketApiClientへの対応が必要（Design.md Implementation Notesに記載あり） |
| 共有リソース衝突 | ✅ なし |

### 4.3 Migration Requirements

| 観点 | Status | Notes |
|------|--------|-------|
| データマイグレーション | N/A | 不要 |
| コード変更 | ✅ 計画済み | 約60ファイルのimport変更（一括置換で対応可能） |
| 後方互換性 | N/A | 内部APIのみの変更 |

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| W-001 | notificationStore統合テストの明示的タスク欠如 | Task 9.1の説明を拡張するか、新タスク9.2を追加 |
| W-002 | Toast auto-dismiss時間の実装確認不足 | 実装前にnotify.error()の既存動作を確認、必要に応じてduration引数追加 |
| W-003 | 「即時exit」のしきい値未定義 | 実装時に5秒程度のしきい値を定義し、Task 5.2に追記 |

### Suggestions (Nice to Have)

| ID | Suggestion |
|----|------------|
| S-001 | stderrログ出力時にセンシティブ情報（パス、認証情報等）をサニタイズする考慮を追加 |
| S-002 | agentStartErrorMessages.tsの配置をshared/messagesまたはshared/constantsに変更検討（現状shared/typesは許容範囲） |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-001 | Task 9.1の検証範囲拡張または9.2タスク追加 | tasks.md |
| Warning | W-002 | notify.error()の既存動作確認、必要に応じてdesign.md/tasks.md更新 | design.md, tasks.md |
| Warning | W-003 | 即時exitのしきい値を定義（推奨: 5秒） | tasks.md (Task 5.2) |
| Info | S-001 | stderrサニタイズの検討 | design.md (optional) |

---

_This review was generated by the document-review command._
