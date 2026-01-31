# Specification Review Report #1

**Feature**: remove-redundant-agent-watchers
**Review Date**: 2026-01-31
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
| Critical | 0 |
| Warning | 2 |
| Info | 3 |

**総評**: 本スペックは「削除」を主目的としたリファクタリングであり、ドキュメント間の整合性は高い。Requirements と Design の対応関係が明確で、Tasks も適切に分解されている。いくつかの軽微な改善点はあるものの、実装に進める状態である。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 良好**

すべての Requirement が Design の Requirements Traceability テーブルで網羅されている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: specWatcher/bugWatcher 削除 | 1.1-1.14 で詳細にカバー | ✅ |
| Req 2: IPC チャネル削除 | 2.1-2.3 でカバー | ✅ |
| Req 3: ApiClient インターフェース削除 | 3.1-3.3 でカバー | ✅ |
| Req 4: 呼び出し箇所削除 | 4.1-4.3 でカバー | ✅ |
| Req 5: preload スクリプト削除 | 5.1 でカバー | ✅ |
| Req 6: テストコード削除・更新 | 6.1-6.4 でカバー | ✅ |
| Req 7: 古い実装コードの完全削除確認 | 7.1-7.5 でカバー | ✅ |
| Req 8: SpecList Agent 数表示の動作確認 | 8.1-8.4 でカバー | ✅ |

**特筆事項**: Design は Requirements の各 Acceptance Criteria を Criterion ID (1.1, 1.2, ... 8.4) に分解し、Requirements Traceability テーブルで明示的にマッピングしている。

### 1.2 Design ↔ Tasks Alignment

**結果: ✅ 良好**

Design の「変更が必要な既存ファイル」セクションと Tasks の対応が一致している。

| Design Section | Task(s) | Status |
|----------------|---------|--------|
| AgentRecordWatcherService | Task 1 (1.1-1.3) | ✅ |
| IPC ハンドラ/チャネル/preload | Task 2 (2.1-2.4) | ✅ |
| Store 呼び出し箇所 | Task 3 (3.1-3.2) | ✅ |
| ApiClient インターフェース | Task 4 (4.1-4.3) | ✅ |
| テストファイル更新 | Task 5 (5.1-5.5) | ✅ |
| 完全削除の検証 | Task 6 (6.1-6.2) | ✅ |
| ビルド/テスト実行 | Task 7 (7.1-7.3) | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | なし（UI 変更なし） | N/A | ✅ |
| Services | AgentRecordWatcherService | Task 1 | ✅ |
| Types/Models | ApiClient, IPC_CHANNELS | Task 4, Task 2 | ✅ |
| IPC | SWITCH_AGENT_WATCH_SCOPE | Task 2 | ✅ |
| Stores | specDetailStore, bugStore | Task 3 | ✅ |

**結果**: 本スペックは削除のみのため、新規作成コンポーネントは存在しない。削除対象は全て Task でカバーされている。

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | _specWatcher インスタンス作成なし | 1.1 | Cleanup | ✅ |
| 1.2 | _bugWatcher インスタンス作成なし | 1.1 | Cleanup | ✅ |
| 1.3 | _projectAgentWatcher のみ依存 | 6.2 | Verification | ✅ |
| 1.4 | _specWatcher プロパティ削除 | 1.1 | Cleanup | ✅ |
| 1.5 | _bugWatcher プロパティ削除 | 1.1 | Cleanup | ✅ |
| 2.1 | SWITCH_AGENT_WATCH_SCOPE ハンドラ削除 | 2.1 | Cleanup | ✅ |
| 2.2 | IPC_CHANNELS 定数削除 | 2.2 | Cleanup | ✅ |
| 2.3 | window.electronAPI 型削除 | 2.4 | Cleanup | ✅ |
| 3.1 | ApiClient.switchAgentWatchScope 削除 | 4.1 | Cleanup | ✅ |
| 3.2 | IpcApiClient 実装削除 | 4.2 | Cleanup | ✅ |
| 3.3 | WebSocketApiClient 実装削除 | 4.3 | Cleanup | ✅ |
| 4.1 | specDetailStore.selectSpec() 呼び出し削除 | 3.1 | Cleanup | ✅ |
| 4.2 | specDetailStore.clearSelectedSpec() 呼び出し削除 | 3.1 | Cleanup | ✅ |
| 4.3 | bugStore.selectBug() 呼び出し削除 | 3.2 | Cleanup | ✅ |
| 5.1 | preload switchAgentWatchScope 削除 | 2.3 | Cleanup | ✅ |
| 6.1 | switchWatchScope テスト削除 | 5.1 | Test Update | ✅ |
| 6.2 | switchWatchScopeWithCategory テスト削除 | 5.1 | Test Update | ✅ |
| 6.3 | switchAgentWatchScope mock 削除 | 5.2-5.5 | Test Update | ✅ |
| 6.4 | E2E テスト通過 | 7.2, 7.3 | Verification | ✅ |
| 7.1 | specWatcher 残骸なし | 6.1 | Verification | ✅ |
| 7.2 | bugWatcher 残骸なし | 6.1 | Verification | ✅ |
| 7.3 | switchWatchScope 残骸なし | 6.1 | Verification | ✅ |
| 7.4 | SWITCH_AGENT_WATCH_SCOPE 残骸なし | 6.1 | Verification | ✅ |
| 7.5 | _projectAgentWatcher のみ残存 | 6.2 | Verification | ✅ |
| 8.1 | Agent 開始時バッジ更新 | 7.3 | Verification | ✅ |
| 8.2 | Agent 停止時バッジ更新 | 7.3 | Verification | ✅ |
| 8.3 | runningAgentCounts 正常動作 | 7.3 | Verification | ✅ |
| 8.4 | Agent 操作 E2E テスト通過 | 7.3 | Verification | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] All criteria have corresponding tasks (Cleanup or Verification)
- [x] No criterion relies solely on Infrastructure tasks without implementation

### 1.5 Integration Test Coverage

**結果**: ✅ 該当なし（新規クロスバウンダリ通信なし）

本スペックは「削除」のみであり、新しい IPC/WebSocket/Store 連携は追加されない。Design.md の「Integration Test Strategy」セクションで明示的に「本変更は削除のみであり、新しいクロスバウンダリ通信は発生しない」と記載されている。

既存の E2E テストで機能維持を確認する方針は適切である。

### 1.6 Refactoring Integrity Check

**結果**: ✅ 良好

| Check | Validation | Status |
|-------|------------|--------|
| Deletion Tasks | Task 1, 2, 3, 4 で明示的に削除を指定 | ✅ |
| Consumer Updates | Task 3 (Store), Task 5 (Test) で呼び出し元を更新 | ✅ |
| No Parallel Implementation | 新規作成タスクなし、削除のみ | ✅ |

**特筆事項**: Design の「削除が必要な既存ファイル (Cleanup)」セクションで「削除対象ファイルなし」と明記されているが、これはファイル全体の削除がないという意味で、コード片（メソッド、プロパティ等）の削除は Tasks で明確に指定されている。

### 1.7 Cross-Document Contradictions

**検出なし** ✅

用語、数値、依存関係の不整合は発見されなかった。

## 2. Gap Analysis

### 2.1 Technical Considerations

| 観点 | 評価 | 詳細 |
|------|------|------|
| エラーハンドリング | ✅ | 削除のみのため新規エラーハンドリング不要 |
| セキュリティ | ✅ | IPC チャネル削除でセキュリティ表面積が減少 |
| パフォーマンス | ✅ | Design で「Spec/Bug 選択時の IPC 往復が 1 回削減」と明記 |
| テスト戦略 | ✅ | Unit/Integration/E2E の各レベルで更新方針が記載 |
| ロギング | ✅ | 変更なし |

### 2.2 Operational Considerations

| 観点 | 評価 | 詳細 |
|------|------|------|
| デプロイ | ✅ | 通常のアプリ更新で対応可能 |
| ロールバック | ✅ | Git revert で対応可能（ステートマイグレーションなし） |
| モニタリング | ✅ | 変更なし |
| ドキュメント | ⚠️ (INFO) | 下記参照 |

**INFO**: API ドキュメントに `switchAgentWatchScope` の記載がある場合は更新が必要。ただし、現状の internal API なので影響は軽微。

## 3. Ambiguities and Unknowns

| 項目 | 状態 | 詳細 |
|------|------|------|
| 削除対象の特定 | ✅ 解決済み | Requirements と Design で具体的なプロパティ・メソッド名が列挙されている |
| テストファイル一覧 | ⚠️ (INFO) | Design で列挙されているテストファイルが実際に存在するか、実装時に確認が必要 |
| 外部依存 | ✅ 解決済み | 外部 API への依存なし（internal 変更のみ） |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果**: ✅ 完全準拠

| Steering 原則 | 本スペックの対応 |
|---------------|-----------------|
| Main/Renderer プロセス境界 | Main Process のサービス（AgentRecordWatcherService）を変更、IPC チャネルを削除 |
| State Management Rules | 共有 Store (specDetailStore, bugStore) からの呼び出し削除は structure.md の SSOT 原則に従う |
| ApiClient 抽象化 | IpcApiClient と WebSocketApiClient の両方から統一的に削除 |

### 4.2 Integration Concerns

| 観点 | 評価 | 詳細 |
|------|------|------|
| 既存機能への影響 | ⚠️ (WARNING) | 下記参照 |
| 共有リソース | ✅ | 共有リソースへの影響なし |
| API 互換性 | ✅ | Internal API のみ（外部公開なし） |

**WARNING-1**: Requirements.md の「SpecList の Agent 数表示への影響」セクションで「影響なし。既存の E2E テストで確認可能」と結論しているが、**具体的にどの E2E テストで確認するかが明記されていない**。Tasks 7.3 で「Agent 開始時に SpecList バッジが更新されることを確認」とあるが、該当テストの名前が不明。

### 4.3 Migration Requirements

| 観点 | 評価 | 詳細 |
|------|------|------|
| データマイグレーション | ✅ | 不要（永続データ変更なし） |
| 段階的ロールアウト | ✅ | 不要（一括適用可能） |
| 後方互換性 | ⚠️ (WARNING) | 下記参照 |

**WARNING-2**: Remote UI が WebSocketApiClient 経由で `switchAgentWatchScope` を呼び出している場合、削除後にエラーが発生する可能性がある。Design では「Remote UI も完全に削除して統一する」と記載されているが、**Remote UI 側のコード削除タスク (3.2 bugStore) が WebSocketApiClient 経由の呼び出しをカバーしているか確認が必要**。

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | 問題 | 推奨アクション |
|----|------|---------------|
| W1 | E2E テスト名の不明確さ | Tasks 7.3 に具体的な E2E テスト名（例: `agent-badge.e2e.ts`）を追記するか、または「既存の E2E テストスイート全体を実行」と明記 |
| W2 | Remote UI 呼び出し箇所の確認 | 実装時に `switchAgentWatchScope` の呼び出し箇所を grep で網羅的に確認し、漏れがないことを検証 |

### Suggestions (Nice to Have)

| ID | 提案 | 理由 |
|----|------|------|
| S1 | Requirements.md の Decision Log セクションが優れている | 今後のスペックでも「事前調査で解決した疑問と結論」を Decision Log 形式で記載することを推奨 |
| S2 | Tasks に並列実行可能なタスクのマーキング | (P) マークが付いているタスクがあるが、すべての並列可能タスクに付与するとより明確 |
| S3 | Design の Requirements Traceability テーブルが詳細 | 全 28 Criteria をマッピングしており、トレーサビリティが高い |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Medium | W1: E2E テスト名不明 | Tasks 7.3 に具体的なテスト名を追記 | tasks.md |
| Low | W2: Remote UI 呼び出し確認 | 実装時に grep 検証（6.1 タスクでカバー済み） | - |
| Info | テストファイル存在確認 | 実装時に Design 記載のテストファイルを確認 | - |

---

## Review Conclusion

**Overall Assessment**: ✅ **実装可能**

- Critical Issues: 0
- Warnings: 2（軽微、実装時に対応可能）
- Info: 3

本スペックは「冗長なコードの削除」という明確な目的を持ち、Requirements → Design → Tasks の一貫性が高い。Decision Log による事前調査の記録も優れており、Open Questions が「なし」で解決済みである点は高く評価できる。

Warnings は実装時の確認事項であり、ドキュメント修正は必須ではない。

---

_This review was generated by the document-review command._
