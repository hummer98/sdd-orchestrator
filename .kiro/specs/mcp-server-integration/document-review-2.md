# Specification Review Report #2

**Feature**: mcp-server-integration
**Review Date**: 2026-01-25
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, product.md, tech.md, structure.md, document-review-1.md, document-review-1-reply.md

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **Warning** | 1 |
| **Info** | 3 |

総合評価: **良好（実装可能）** - Review #1で指摘された問題点は修正済み。新たな懸念事項は軽微であり、実装に支障なし。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 良好**

すべてのRequirement（1.1-1.4, 2.1-2.6, 3.1-3.14, 4.1-4.13, 5.1-5.3, 6.1-6.10）がDesignのRequirements Traceability表に含まれており、対応するコンポーネントが明確に定義されています。

Review #1で指摘されたOpen Questions（MCPサーバーのデフォルトポート、inspection-*の取り扱い）は、requirements.mdのDecision Logに正式決定として追記されています。

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

### 1.5 Refactoring Integrity Check

**結果: ✅ 該当なし**

本機能は純粋な追加機能であり、既存ファイルの置き換えや廃止は不要です。design.mdの「廃止・削除ファイル: 該当なし」の記載と一致しています。

### 1.6 Cross-Document Contradictions

**結果: ✅ 矛盾なし**

Review #1後の修正により、requirements.md, design.md, tasks.md間で以下が統一されました:

- デフォルトポート: 3001（Decision Logに正式記録）
- inspection-*: 最新のinspectionを返す（Decision Logに正式記録）
- Remote UI同期: design.mdにシーケンス図付きで詳細記載

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ℹ️ Info: MCP SDKバージョン固定の検討

design.mdでは`@modelcontextprotocol/sdk (latest)`と記載されていますが、本番環境では特定バージョンを固定することが推奨されます。実装時にpackage.jsonで適切なバージョンを指定してください。

#### ℹ️ Info: ポート競合時のリトライ戦略

design.mdのMcpServerError型に`NO_AVAILABLE_PORT`が定義されていますが、自動リトライやフォールバックポートの戦略は明示されていません。実装時に判断可能な範囲であり、仕様として問題ありません。

### 2.2 Operational Considerations

#### ⚠️ Warning: WebSocketハンドラ追加タスクの不明確さ

**問題**: design.mdにRemote UI同期フローが詳細に記載されましたが、tasks.mdには対応するWebSocketハンドラ追加の明示的なタスクがありません。

**影響**: Task 7.1（mcpStore実装）に暗黙的に含まれると解釈可能ですが、以下の作業が漏れる可能性があります:
- webSocketHandler.tsへのMCP状態ブロードキャスト機能追加
- WebSocketApiClientでのMCPメッセージハンドリング追加

**推奨**: Task 7.1の説明文に「WebSocket経由でのRemote UI同期」を含めるか、サブタスクとして明示することを推奨。ただし、design.mdの記載で十分カバーされているため、Critical ではありません。

---

## 3. Ambiguities and Unknowns

| ID | 項目 | 詳細 | 優先度 | Review #1からの変化 |
|----|------|------|--------|---------------------|
| A-01 | inspection-*ワイルドカード | **解決済み** - Decision Logで「最新を返す」と確定 | N/A | 解決 |
| A-02 | MCPサーバーポート | **解決済み** - Decision Logで3001を正式決定 | N/A | 解決 |
| A-03 | Remote UIでのMCP設定表示範囲 | Req 6.10で「ステータス表示のみ」と定義、McpStatusIndicatorの実装で対応 | Low | 変更なし |

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: ✅ 良好**

structure.mdの規則に完全準拠:

- **Main Process責務**: MCPサーバー（McpServerService）はMain Processで管理
- **Renderer/Main分離**: mcpStoreはshared/storesに配置し、SSoTパターンを維持
- **IPC Pattern**: 既存のchannels.ts + handlers.tsパターンを踏襲
- **Remote UI対応**: McpStatusIndicatorをshared/componentsに配置し、両環境で共有

### 4.2 Integration Concerns

#### ℹ️ Info: WebSocketハンドラ拡張

Review #1のW-03で指摘されたRemote UI同期フローは、design.mdのmcpStoreセクションに詳細なシーケンス図が追加されました。実装時はこのフローに従ってください。

### 4.3 Migration Requirements

**結果: N/A**

本機能は純粋な追加機能であり、既存機能の変更や移行は不要です。

---

## 5. Recommendations

### Critical Issues (Must Fix)

**なし**

### Warnings (Should Address)

| ID | Issue | Recommendation |
|----|-------|----------------|
| W-01 | WebSocketハンドラ追加タスクの不明確さ | Task 7.1の説明に「WebSocket経由でのRemote UI同期を含む」旨を追記するか、実装時に意識して対応してください。design.mdの記載が詳細なため、実装者が見落とす可能性は低いです。 |

### Suggestions (Nice to Have)

| ID | Suggestion |
|----|------------|
| S-01 | MCP SDKのバージョン固定（package.jsonで指定） |
| S-02 | ポート競合時のフォールバック戦略の検討（3002, 3003等への自動切り替え） |

---

## 6. Review #1 対応状況

| Issue ID | Issue Summary | Status | Evidence |
|----------|---------------|--------|----------|
| W-01 | Open Questions未解決 | ✅ 解決済み | Decision Logにポート3001、inspection-*の決定が追記 |
| W-02 | MCPサーバーロギング未定義 | ✅ 対応不要と判断 | 既存のProjectLoggerパターンに従う方針で妥当 |
| W-03 | Remote UI MCP同期フロー未詳細 | ✅ 解決済み | design.mdにシーケンス図付きの詳細記載が追加 |
| A-01 | inspection-*ワイルドカード | ✅ 解決済み | Decision Logに正式決定として記録 |
| A-02 | MCPサーバーポートの最終確定 | ✅ 解決済み | Decision Logに正式決定として記録 |

---

## 7. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Low | W-01 | Task 7.1に「WebSocket同期」の明示を検討（任意） | tasks.md (optional) |

---

## Conclusion

**Review #1からの改善点**:
- requirements.mdのOpen Questionsは全てDecision Logに正式記録
- design.mdにRemote UI同期フローの詳細が追加

**総合判断**: 仕様は実装に十分な品質に達しています。軽微なWarning（WebSocketハンドラタスクの明示）は実装時の意識付けで対応可能です。

**推奨アクション**: 実装を開始可能です。`/kiro:spec-impl mcp-server-integration` でタスクを実行してください。

---

_This review was generated by the document-review command._
