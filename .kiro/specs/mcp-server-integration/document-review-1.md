# Specification Review Report #1

**Feature**: mcp-server-integration
**Review Date**: 2026-01-25
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, product.md, tech.md, structure.md

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **Warning** | 3 |
| **Info** | 4 |

総合評価: **良好（実装可能）** - Critical Issuesはなく、仕様は十分に詳細化されています。いくつかのWarningは実装前に検討が望ましい事項です。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 良好**

すべてのRequirement（1.1-1.4, 2.1-2.6, 3.1-3.14, 4.1-4.13, 5.1-5.3, 6.1-6.10）がDesignのRequirements Traceability表に含まれており、対応するコンポーネントが明確に定義されています。

| Requirement Group | Design Coverage | Status |
|-------------------|-----------------|--------|
| Req 1 (MCPサーバー基盤) | McpServerService, McpToolRegistry | ✅ |
| Req 2 (project_*ツール) | ProjectToolHandlers | ✅ |
| Req 3 (spec_*ツール) | SpecToolHandlers | ✅ |
| Req 4 (bug_*ツール) | BugToolHandlers | ✅ |
| Req 5 (Remote UI共存) | McpServerService | ✅ |
| Req 6 (設定UI) | McpSettingsPanel, McpStatusIndicator, McpIpcHandlers | ✅ |

### 1.2 Design ↔ Tasks Alignment

**結果: ✅ 良好**

Designで定義された全コンポーネントに対応するタスクが存在します。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| McpServerService | Task 2.1 | ✅ |
| McpToolRegistry | Task 2.2 | ✅ |
| ProjectToolHandlers | Task 3.1-3.3 | ✅ |
| SpecToolHandlers | Task 4.1-4.4 | ✅ |
| BugToolHandlers | Task 5.1-5.4 | ✅ |
| McpIpcHandlers | Task 6.1-6.4 | ✅ |
| McpSettingsPanel | Task 7.2 | ✅ |
| McpStatusIndicator | Task 7.3 | ✅ |
| mcpStore | Task 7.1 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**結果: ✅ 良好**

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | McpSettingsPanel, McpStatusIndicator | 7.2, 7.3, 7.4, 7.5 | ✅ |
| Services | McpServerService, McpToolRegistry, *ToolHandlers | 2.1, 2.2, 3.*, 4.*, 5.* | ✅ |
| Types/Models | McpConfig, McpServerStatus, McpToolDefinition | 1.2（ConfigStore拡張） | ✅ |
| IPC Handlers | McpIpcHandlers | 6.1, 6.2, 6.3 | ✅ |
| Stores | mcpStore | 7.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**結果: ✅ 良好**

tasks.mdの末尾にRequirements Coverage Matrixが含まれており、全Criterion IDが具体的なFeatureタスクにマッピングされています。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | MCPサーバーがHTTP/SSE接続 | 1.1, 2.1, 8.1 | Infrastructure + Feature | ✅ |
| 1.2 | MCPハンドシェイク完了 | 2.1 | Feature | ✅ |
| 1.3 | プロトコルバージョン検証 | 2.1 | Feature | ✅ |
| 1.4 | プロジェクト未選択エラー | 2.2, 8.2 | Feature | ✅ |
| 2.1-2.6 | project_*ツール | 3.1-3.3, 8.2 | Feature | ✅ |
| 3.1-3.14 | spec_*ツール | 4.1-4.4, 8.2 | Feature | ✅ |
| 4.1-4.13 | bug_*ツール | 5.1-5.4, 8.2 | Feature | ✅ |
| 5.1-5.3 | Remote UI共存 | 2.1, 1.2, 8.1 | Feature | ✅ |
| 6.1-6.10 | 設定UI | 1.2, 6.*, 7.* | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

**結果: ✅ 矛盾なし**

- 用語の一貫性: MCP, HTTP/SSE, Tools, ConfigStore等の用語が全ドキュメントで統一
- 数値の一致: デフォルトポート3001がrequirements.mdのOpen Questionsとdesign.mdで一致
- 技術選択の一貫性: MCP SDK, Express, zodの使用が全体で整合

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ Warning: Open Questions未解決

**requirements.mdのOpen Questions**:
1. MCPサーバーのデフォルトポート番号（3001の確定が必要）
2. inspection-*のワイルドカード指定の実装方法

**影響**:
- ポート番号はdesign.mdでは3001で設計されているが、requirements.mdではまだOpen Question
- inspection-*の取り扱いがdesign.mdで明確化されていない（3.4のartifact種類に'inspection'として含まれているが詳細なし）

#### ℹ️ Info: エラーハンドリング設計

design.mdで定義されたエラーカテゴリ（User Errors, System Errors, Business Logic Errors）は適切です。MCPプロトコル準拠のレスポンス形式も明記されています。

#### ℹ️ Info: セキュリティ考慮

requirements.mdのOut of Scopeで「認証・認可機構（ローカル利用を想定）」と明記されており、設計意図は明確です。ただし、将来的にリモートアクセスを許可する場合は認証機能の追加が必要になります。

### 2.2 Operational Considerations

#### ⚠️ Warning: ロギング設計の欠如

**問題**: MCPサーバー固有のログ出力戦略がdesign.mdに記載されていません。

**steering/logging.md参照**: tech.mdにロギング設計（ProjectLogger, LogRotationManager）が記載されていますが、MCPサーバーのリクエスト/レスポンスログ、接続/切断ログの取り扱いが未定義です。

**推奨**: 実装時にMCPサーバー専用のログチャネルを検討してください。

#### ℹ️ Info: 監視・ヘルスチェック

MCPサーバーのヘルスチェックエンドポイントやメトリクス収集は定義されていませんが、Out of Scopeと解釈可能です。ローカル利用が前提のため、運用監視は当面不要と判断できます。

---

## 3. Ambiguities and Unknowns

| ID | 項目 | 詳細 | 優先度 |
|----|------|------|--------|
| A-01 | inspection-*ワイルドカード | 最新のみ返すか、一覧を返すか未定義 | Medium |
| A-02 | MCPサーバーポートの最終確定 | design.mdでは3001だが、requirements.mdはOpen Question | Low |
| A-03 | Remote UIでのMCP設定表示範囲 | 6.10で「ステータス表示のみ」とあるが、具体的なUI制限が未詳細 | Low |

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: ✅ 良好**

- **Main Process責務**: MCPサーバー（McpServerService）はMain Processで管理（structure.mdのElectron Process Boundary Rulesに準拠）
- **Renderer/Main分離**: mcpStoreはshared/storesに配置し、SSoTパターンを維持
- **IPC Pattern**: 既存のchannels.ts + handlers.tsパターンを踏襲
- **Remote UI対応**: McpStatusIndicatorをshared/componentsに配置し、両環境で共有

### 4.2 Integration Concerns

#### ⚠️ Warning: Remote UI WebSocketハンドラ追加

**tech.mdの「新規Spec作成時の確認事項」に基づく確認**:

requirements.md 6.10で「Remote UIではMCPサーバーのステータス表示のみ」と定義されていますが、design.mdとtasks.mdにはRemote UI側のWebSocket経由でのMCP状態同期の実装詳細が明記されていません。

**必要な作業（tasks.mdで暗黙的にカバー）**:
- mcpStore（shared/stores）がWebSocketApiClient経由でMCP状態を受信する仕組み
- Main ProcessからRemote UIへのMCP状態ブロードキャスト

design.mdのMcpStatusIndicator説明に「mcpStore (P0)」が依存関係として記載されているため、暗黙的にはカバーされていますが、明示的な同期フローがあるとより明確です。

### 4.3 Migration Requirements

**結果: N/A**

本機能は純粋な追加機能であり、既存機能の変更や移行は不要です。design.mdの「廃止・削除ファイル: 該当なし」の記載と一致しています。

---

## 5. Recommendations

### Critical Issues (Must Fix)

**なし**

### Warnings (Should Address)

| ID | Issue | Recommendation |
|----|-------|----------------|
| W-01 | Open Questions未解決 | requirements.mdのOpen Questionsを解決し、Decision Logに追記してください。特にinspection-*の取り扱いは実装前に確定が必要です。 |
| W-02 | MCPサーバーロギング未定義 | 実装時にMCPサーバーのログ出力方針を決定し、design.mdに追記するか、実装時の判断として進めてください。 |
| W-03 | Remote UI MCP同期フロー | mcpStoreがRemote UIでどのように同期されるか（WebSocket経由のブロードキャスト）をtasks.mdまたはdesign.mdに明示すると実装がスムーズです。 |

### Suggestions (Nice to Have)

| ID | Suggestion |
|----|------------|
| S-01 | MCPサーバーのヘルスチェックエンドポイント（/health）の追加検討 |
| S-02 | MCP接続クライアント数のステータス表示（将来拡張） |
| S-03 | MCPツール呼び出し統計のログ出力（デバッグ用） |

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Medium | A-01 | inspection-*の返却仕様を確定し、requirements.mdのOpen Questionsを更新 | requirements.md |
| Low | A-02 | MCPデフォルトポート3001をOpen QuestionsからDecision Logに移動 | requirements.md |
| Low | W-02 | MCPサーバーログ出力方針を実装時に決定（または事前にdesign.mdに追記） | design.md (optional) |
| Low | W-03 | Remote UI同期フローをtasks.mdに補足（7.1 mcpStoreに詳細追加） | tasks.md (optional) |

---

_This review was generated by the document-review command._
