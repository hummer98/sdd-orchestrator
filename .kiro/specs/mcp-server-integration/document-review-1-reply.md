# Response to Document Review #1

**Feature**: mcp-server-integration
**Review Date**: 2026-01-25
**Reply Date**: 2026-01-25

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Warnings

### W-01: Open Questions未解決

**Issue**: requirements.mdのOpen Questionsが未解決。特にMCPサーバーのデフォルトポート番号（3001）の確定と、inspection-*のワイルドカード指定の実装方法が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdではすでにポート3001で設計が進んでおり、Data ModelsセクションでもMcpConfig.portのデフォルト値として3001が定義されている。これは事実上の決定であり、requirements.mdのOpen QuestionsからDecision Logへの移動が妥当。

inspection-*については、design.mdの SpecArtifactTypeで `'inspection'` として定義されており、requirements.md 3.4にも「inspection-*」と記載がある。現在の設計では単一の最新inspectionを返す想定だが、将来的に一覧取得の需要が出た場合は別ツール（spec_list_inspections）で対応可能。

**Action Items**:
- requirements.mdのOpen Questionsを解決し、Decision Logに追記
- ポート番号3001を正式決定として記録
- inspection-*の取り扱い方針を明確化

---

### W-02: MCPサーバーロギング未定義

**Issue**: MCPサーバー固有のログ出力戦略がdesign.mdに記載されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- `.kiro/steering/logging.md` でプロジェクト全体のロギングガイドラインが定義済み
- 既存のRemote Access Server（remoteAccessServer.ts）も専用のロギング設計をdesign.mdに持っていない
- MCPサーバーは既存のProjectLoggerを使用し、同じログフォーマット・レベル・出力先を踏襲する
- 実装時にsteeringの`logging.md`に従えば十分であり、design.mdへの追記は過剰

既存のステアリングとパターンに従う範囲であり、design.md修正は不要。

---

### W-03: Remote UI MCP同期フロー

**Issue**: mcpStoreがRemote UIでどのように同期されるか（WebSocket経由のブロードキャスト）の明示的な記載がない。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コードを確認した結果：
- `bugAutoExecutionStore.ts` 等のshared/stores配下のストアはRemote UI/Electronで共有されている
- WebSocketApiClientが存在し、Remote UIとの通信に使用されている
- 現在のdesign.mdではmcpStoreの同期方法が暗黙的

明示的に同期フローを記載することで、実装者の混乱を防ぎ、既存パターンとの一貫性を確保できる。

**Action Items**:
- design.mdのmcpStoreセクションにRemote UI同期フローの説明を追加
- WebSocket経由でのMCP状態ブロードキャストについて明記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-01 | エラーハンドリング設計 | No Fix Needed | design.mdで適切に定義済み |
| I-02 | セキュリティ考慮 | No Fix Needed | Out of Scopeで明確化済み |
| I-03 | 監視・ヘルスチェック | No Fix Needed | ローカル利用前提でOut of Scope |
| I-04 | Ambiguities A-01/A-02/A-03 | No Fix Needed | A-01/A-02はW-01で対応、A-03は6.10で十分定義 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Open Questionsを解決しDecision Logに追記 |
| design.md | mcpStoreセクションにRemote UI同期フローの説明を追加 |

---

## Conclusion

3件のWarningのうち2件（W-01、W-03）が対応必要と判断されました。

- **W-01**: requirements.mdのOpen Questionsを正式決定に変更
- **W-02**: 既存のロギングガイドラインで十分であり、修正不要
- **W-03**: design.mdにRemote UI同期フローを追記

上記2件の修正を適用し、仕様の明確化を行います。

---

## Applied Fixes

**Applied Date**: 2026-01-25
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Open QuestionsをDecision Logに移動 |
| design.md | mcpStoreにRemote UI同期フローを追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: W-01

**Changes**:
- Decision Logに「MCPサーバーのデフォルトポート」項目を追加（ポート3001を正式決定）
- Decision Logに「inspection-*ワイルドカード指定の実装」項目を追加（最新を返す方針）
- Open Questionsセクションを「すべて解決済み」に更新

**Diff Summary**:
```diff
+ ### MCPサーバーのデフォルトポート
+ - **Discussion**: MCPサーバーのデフォルトポート番号をどうするか。Remote UI（3000）との競合を避ける必要がある。
+ - **Conclusion**: ポート3001をデフォルトとして採用
+ - **Rationale**: Remote UIのデフォルトポート（3000）の次番号であり、覚えやすく競合しない。設定で変更可能。
+
+ ### inspection-*ワイルドカード指定の実装
+ - **Discussion**: inspection-*の指定時に最新のみを返すか、一覧を返すか。
+ - **Conclusion**: 最新のinspectionを返す
+ - **Rationale**: ほとんどのユースケースでは最新のinspection結果が必要。一覧が必要な場合は将来的にspec_list_inspectionsツールで対応可能。

- ## Open Questions
- - MCPサーバーのデフォルトポート番号（Remote UIとは別ポート、例: 3001）
- - inspection-*のワイルドカード指定の具体的な実装方法（最新のみ返すか、一覧を返すか）
+ ## Open Questions
+ （すべて解決済み - Decision Logを参照）
```

#### design.md

**Issue(s) Addressed**: W-03

**Changes**:
- mcpStoreセクションに「Remote UI Synchronization Flow」サブセクションを追加
- Electron/Remote UI両環境での状態同期フローを明記
- シーケンス図を追加

**Diff Summary**:
```diff
+ ##### Remote UI Synchronization Flow
+
+ mcpStoreはshared/stores配下に配置され、Electron/Remote UI両環境で共有される。既存のbugAutoExecutionStoreと同様のパターンで状態同期を行う。
+
+ **Electron環境**:
+ - Main ProcessのMcpServerServiceが状態変更を検知
+ - IPC経由でRenderer Processに通知
+ - mcpStore.setStatus()で状態更新
+
+ **Remote UI環境**:
+ - Main ProcessがWebSocket経由でMCP状態変更をブロードキャスト
+ - WebSocketApiClientがメッセージを受信
+ - mcpStore.setStatus()で状態更新
+
+ [シーケンス図を追加]
```

---

_Fixes applied by document-review-reply command._
