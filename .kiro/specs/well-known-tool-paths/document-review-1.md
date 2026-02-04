# Specification Review Report #1

**Feature**: well-known-tool-paths
**Review Date**: 2026-02-04
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
| Warning | 3 |
| Info | 2 |

仕様ドキュメントは全体的に高品質で、Requirements → Design → Tasksの整合性が確保されている。いくつかの軽微な改善点が検出された。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 整合性あり**

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| 1.1-1.4 Well Knownパス探索 | ToolPathResolverService、WELL_KNOWN_PATHS定数 | ✅ |
| 2.1 ConfigStore拡張 | ConfigStore (拡張)セクション、toolPathsSchema | ✅ |
| 2.2-2.3 ToolSettingsPanel | ToolSettingsPanelコンポーネント定義 | ✅ |
| 2.4 手動設定優先 | ToolPathResolverService手動設定パス優先ロジック | ✅ |
| 3.1-3.3 ツール未検出時の自動誘導 | Design Decisions DD-003 | ✅ |
| 4.1-4.4 既存コードのリファクタリング | Impact Analysis Contract | ✅ |

### 1.2 Design ↔ Tasks Alignment

**結果: ✅ 整合性あり**

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| ToolPathResolverService書き換え | Task 2.1-2.5 | ✅ |
| ConfigStore拡張 | Task 1.1-1.3 | ✅ |
| toolPathHandlers (IPC) | Task 3.1-3.3 | ✅ |
| ToolSettingsPanel (UI) | Task 5.1-5.2 | ✅ |
| toolPathStore (Zustand) | Task 4.1-4.2 | ✅ |
| RemoteAccessDialog統合 | Task 6.1 | ✅ |
| 起動時自動誘導 | Task 6.2-6.3 | ✅ |
| 統合テスト | Task 7.1 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | ToolSettingsPanel | 5.1, 5.2 | ✅ |
| Services | ToolPathResolverService | 2.1-2.5 | ✅ |
| Stores | toolPathStore | 4.1-4.2 | ✅ |
| Types/Models | ToolResolutionResult, ToolStatus, ToolPathsConfig | (型は実装時に定義) | ✅ |
| IPC Handlers | toolPathHandlers | 3.1-3.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | Well Knownパス順次チェック | 2.1 | Implementation | ✅ |
| 1.2 | 最初に見つかったパスを使用 | 2.1 | Implementation | ✅ |
| 1.3 | シェル起動禁止（fs.existsSync使用） | 2.1, 2.3 | Implementation | ✅ |
| 1.4 | 対象ツールはclaude, jj, jq | 2.1 | Implementation | ✅ |
| 2.1 | ConfigStoreにtoolPaths追加 | 1.1, 1.2, 1.3 | Implementation | ✅ |
| 2.2 | ToolSettingsPanel追加 | 5.1, 6.1 | Feature | ✅ |
| 2.3 | ツール情報表示 | 5.1 | Feature | ✅ |
| 2.4 | 手動設定パス優先 | 2.2 | Implementation | ✅ |
| 3.1 | claude未検出時の設定画面自動表示 | 6.2, 6.3 | Feature | ✅ |
| 3.2 | 未検出ツールハイライト表示 | 5.1 | Feature | ✅ |
| 3.3 | トースト通知廃止 | 6.3 | Cleanup | ✅ |
| 4.1 | ToolPathResolverService書き換え | 2.1-2.4 | Implementation | ✅ |
| 4.2 | シェル起動ロジック削除 | 2.3 | Cleanup | ✅ |
| 4.3 | ワークアラウンド削除 | 2.3 | Cleanup | ✅ |
| 4.4 | API後方互換性維持 | 2.4 | Implementation | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC経由のツールパス設定 | 設定画面での手動指定フロー | 7.1 | ✅ |
| ConfigStore永続化 | ConfigStore拡張 | 1.3 (Unit), 7.1 (Integration) | ✅ |
| toolPathStore ↔ IPC同期 | toolPathStore定義 | 4.2, 7.1 | ✅ |

**Validation Results**:
- [x] IPC通信の統合テストあり（Task 7.1）
- [x] 永続化の検証テストあり

### 1.6 Cross-Document Contradictions

**検出された矛盾: なし**

---

## 2. Gap Analysis

### 2.1 Technical Considerations

| Item | Status | Notes |
|------|--------|-------|
| エラーハンドリング | ✅ | Design.mdのError Strategyで定義済み |
| セキュリティ | ✅ | パス検証はMain Processで実施（Design DD-002参照） |
| パフォーマンス | ✅ | `fs.existsSync`は高速、問題なし |
| スケーラビリティ | N/A | 3ツールのみで拡張の必要性は低い |
| テスト戦略 | ✅ | Unit/Integration/E2E全てカバー |
| ロギング | ⚠️ | **WARNING**: ログ出力の詳細が未定義（下記参照） |

**WARNING: ロギング設計の詳細化が推奨される**
- Design.mdでは「ログ出力」の記載があるが、具体的なログフォーマットやレベルが未定義
- steering/logging.mdを参照して、ツールパス解決時のログ出力仕様を明確化することを推奨

### 2.2 Operational Considerations

| Item | Status | Notes |
|------|--------|-------|
| デプロイメント | ✅ | 既存のElectronビルドプロセスに統合 |
| ロールバック戦略 | ✅ | ConfigStore設定のクリアで初期状態に復帰可能 |
| モニタリング | ⚠️ | **WARNING**: ツールパス解決失敗時のメトリクス収集なし |
| ドキュメント更新 | ✅ | requirements.mdで十分 |

**WARNING: 運用メトリクスの収集**
- ツールパス解決失敗の頻度を追跡する仕組みがない
- 今後のWell Knownパス追加検討のためにデータ収集が有用

---

## 3. Ambiguities and Unknowns

### 3.1 Vague Descriptions

| Location | Description | Concern | Severity |
|----------|-------------|---------|----------|
| Design.md DD-004 | 「RemoteAccessDialogのタイトルや構成の見直しが必要になる可能性」 | 具体的な変更内容が未定義 | Info |
| requirements.md 2.2 | 「既存の設定UIに追加」 | RemoteAccessDialogへの統合で解決済み | N/A |

### 3.2 Undefined Dependencies

**検出された未定義依存: なし**

### 3.3 Pending Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| RemoteAccessDialogのタイトル変更 | Pending | 実装時に決定可能 |

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: ✅ 整合性あり**

| Steering Principle | Implementation | Status |
|-------------------|----------------|--------|
| Main/Renderer分離 | ToolPathResolverServiceはMain、UIはRenderer | ✅ |
| IPC経由通信 | toolPathHandlersでIPC定義 | ✅ |
| Zustand状態管理 | toolPathStore使用 | ✅ |
| shared/stores配置 | toolPathStoreをshared/storesに配置 | ✅ |

### 4.2 Integration Concerns

| Concern | Analysis | Mitigation |
|---------|----------|------------|
| RemoteAccessDialogの肥大化 | 新しいセクション追加による複雑度増加 | タブ分離またはセクション分離で対応 |
| Remote UI影響 | ⚠️ **WARNING**: Remote UIへの影響が明記されていない | 下記参照 |

**WARNING: Remote UI影響の明確化が必要**
- requirements.mdに「Remote UI対応: 要/不要」の記載がない（tech.md記載の確認事項）
- ToolSettingsPanelはグローバル設定であり、Remote UIでの操作は制限すべき可能性あり
- **推奨**: requirements.mdまたはdesign.mdに「Remote UIからはToolSettingsPanelは非表示」等の方針を追記

### 4.3 Migration Requirements

**移行要件: なし**

既存の`ToolPathResolverService`を書き換えるが、APIの後方互換性を維持するため、呼び出し側の変更は不要。

---

## 5. Recommendations

### Critical Issues (Must Fix)

**なし**

### Warnings (Should Address)

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| W1 | Remote UI影響が未記載 | requirements.md | 「Remote UI対応: 不要（グローバル設定のためデスクトップ専用）」を追記 |
| W2 | ロギング仕様が詳細化されていない | design.md | ツールパス解決成功/失敗時のログ出力仕様を追加 |
| W3 | 運用メトリクスの収集なし | design.md | 将来的な改善として、解決失敗回数の記録を検討 |

### Suggestions (Nice to Have)

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| S1 | RemoteAccessDialogタイトル変更 | design.md DD-004 | 実装時に「リモートアクセス & ツール設定」などへ変更を検討 |
| S2 | E2Eテストの詳細化 | tasks.md | User Journey UJ-001〜003に対応するE2Eテストタスクを明示化 |

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Medium | Remote UI影響の明確化 | 「Remote UI対応: 不要」をrequirements.mdのOut of Scopeまたは新セクションに追記 | requirements.md |
| Low | ロギング仕様の追加 | 「Logging Strategy」セクションをdesign.mdに追加、またはtasks.mdにログ実装タスクを追加 | design.md or tasks.md |
| Low | E2Eテストタスクの追加 | User Journey UJ-001〜003に対応するE2Eテストをtasks.mdに追加 | tasks.md |

---

_This review was generated by the document-review command._
