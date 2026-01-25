# Specification Review Report #2

**Feature**: runtime-agents-restructure
**Review Date**: 2026-01-22
**Documents Reviewed**:
- `spec.json` - Spec configuration
- `requirements.md` - Requirements definition
- `design.md` - Technical design
- `tasks.md` - Implementation tasks
- `document-review-1.md` - Previous review
- `document-review-1-reply.md` - Previous review response
- `steering/product.md` - Product context
- `steering/tech.md` - Technology stack
- `steering/structure.md` - Project structure
- `steering/logging.md` - Logging guidelines

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 1 |
| Info | 2 |

前回レビュー（#1）で指摘されたW-1（Remote UI対応明記）とW-3（Concurrent migration対応）は適切に修正されている。本レビューでは修正後のドキュメントを再評価し、残存する軽微な問題と新たに検出された改善点を報告する。全体として仕様の整合性は高く、実装に進める状態である。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 整合**

前回レビューと同様、Requirementsで定義された7つの要件すべてがDesignに適切にマッピングされている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: ディレクトリ構造の再編成 | Architecture、Data Models | ✅ |
| Req 2: LogFileServiceの変更 | Components/LogFileService | ✅ |
| Req 3: AgentRecordServiceの変更 | Components/AgentRecordService | ✅ |
| Req 4: AgentRecordWatcherServiceの拡張 | Components/AgentRecordWatcherService | ✅ |
| Req 5: Lazy Migration | Components/MigrationService、MigrationDialog | ✅ |
| Req 6: 旧パスからの読み取り互換性 | LogFileService.readLogWithFallback | ✅ |
| Req 7: specs/*/logs/ の廃止 | Design内で明記 | ✅ |

**修正確認（W-1）**: requirements.mdに「Remote UI対応: 不要（Desktop UIのみ）」が追記され、design.mdのNon-Goalsにも反映されている。

### 1.2 Design ↔ Tasks Alignment

**結果: ✅ 整合**

| Component | Task Coverage | Status |
|-----------|---------------|--------|
| AgentRecordService | Task 2.1-2.3 | ✅ |
| LogFileService | Task 3.1-3.4 | ✅ |
| AgentRecordWatcherService | Task 4.1-4.3 | ✅ |
| MigrationService | Task 5.1-5.4 | ✅ |
| MigrationDialog | Task 6.1-6.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | MigrationDialog | Task 6.1, 6.2 | ✅ |
| Services | AgentRecordService, LogFileService, AgentRecordWatcherService, MigrationService | Task 2-5 | ✅ |
| Types/Models | AgentCategory型、MigrationInfo、MigrationResult | Task 1.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**注**: 前回レビューで全基準の網羅性を確認済み。tasks.mdのAppendixに明確なRequirements Coverage Matrixが含まれている。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1-1.7 | ディレクトリ構造関連 | 1.1, 1.2, 2.2, 3.2 | Infrastructure | ✅ |
| 2.1-2.3 | LogFileService関連 | 3.1, 3.2, 3.3 | Infrastructure | ✅ |
| 3.1-3.4 | AgentRecordService関連 | 2.1, 2.2, 2.3, 7.1 | Infrastructure | ✅ |
| 4.1-4.5 | Watcher関連 | 4.1, 4.2, 4.3 | Infrastructure | ✅ |
| 5.1-5.6 | Migration関連 | 5.1-5.4, 6.1, 6.2 | Feature/Infrastructure | ✅ |
| 6.1-6.3 | 後方互換性関連 | 3.3, 7.2 | Infrastructure/Feature | ✅ |
| 7.1-7.3 | 廃止・ドキュメント関連 | 3.1, 7.3, 9.1 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDがrequirements.mdからマッピングされている
- [x] ユーザー向け基準にFeature Implementationタスクがある
- [x] Infrastructureタスクのみに依存する基準がない

### 1.5 Cross-Document Contradictions

**検出された矛盾: なし**

用語の一貫性:
- `AgentCategory` 型: Requirements(Decision Log)、Design、Tasksで一貫
- `runtime/agents/` パス: 全ドキュメントで統一
- `Remote UI対応: 不要`: requirements.md IntroductionとDesign Non-Goalsで整合

**修正確認（W-3）**: design.mdのError Handling表に「Concurrent migration request」が追加され、mutex排他制御が明記されている。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| Migration進捗ログ出力 | ⚠️ Warning | design.mdのMonitoring sectionで「Migration処理: 成功/失敗をlogger.info/errorで記録」と記載されているが、大量ファイル移行時の**進捗ログ**（例: 10/100 files migrated）の仕様が明記されていない。前回レビューのS-2提案が未対応。 |
| IPCチャンネル定義 | ℹ️ Info | MigrationService用のIPCチャンネル名（checkMigrationNeeded, migrateSpec, declineMigration等）がdesign.mdに明示されていない。実装時に定義すれば問題ないが、明記があると望ましい。 |

### 2.2 Operational Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| テストデータのセットアップ | ℹ️ Info | tasks.mdのテストセクション（8.1-8.5）でlegacy構造のテストデータセットアップ方法が明記されていない。実装時に定義すれば問題ないが、テストの再現性向上のため明記が望ましい。 |

## 3. Ambiguities and Unknowns

### Open Questions (Requirements由来)

前回レビューから変更なし。以下のOpen Questionsは低優先度として記録されている:

| Question | Impact | Recommendation |
|----------|--------|----------------|
| マイグレーションダイアログの「今後表示しない」オプション | Low | 現在のセッション単位非表示で十分 |
| ProjectAgentの将来廃止可能性 | Low | 3カテゴリ維持が適切、データ収集後に再検討 |

### Pending Design Decisions

| Item | Description | Status |
|------|-------------|--------|
| MigrationDialog表示タイミング | 「選択直後は煩わしい可能性」 | Implementation phaseで検討 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: ✅ 整合**

- **Electron Process Boundary**: MigrationServiceはMain Processに配置（steering/structure.md準拠）
- **State Management**: MigrationDialogStateはUI State層に適切に分離
- **IPC Pattern**: channels.ts/handlers.tsパターンに従う設計
- **Logging**: steering/logging.mdに準拠（ログレベル、フォーマットの指針あり）

### 4.2 Integration Concerns

| Concern | Assessment |
|---------|------------|
| Remote UI影響 | ✅ 解決済み。requirements.mdとdesign.mdに「Desktop UIのみ」と明記 |
| 既存サービスへの変更 | ✅ 後方互換性を維持（deprecateメソッド維持） |
| ログ出力 | ✅ design.mdのMonitoring sectionでlogger使用が明記 |

### 4.3 Migration Requirements

**結果: ✅ 適切に対応**

- Lazy Migration方式でリスク回避
- 後方互換読み取り（readLogWithFallback）でログアクセス保証
- Concurrent migration対応がError Handling sectionに追記済み

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| # | Issue | Affected Documents | Recommended Action |
|---|-------|-------------------|-------------------|
| W-1 | Migration進捗ログの仕様未定義 | design.md | Monitoring sectionに大量ファイル移行時の進捗ログ仕様を追記（例: 10ファイルごと、または1秒ごとに進捗をlogger.infoで出力） |

### Suggestions (Nice to Have)

| # | Issue | Affected Documents | Recommended Action |
|---|-------|-------------------|-------------------|
| S-1 | IPCチャンネル名の明記 | design.md | MigrationService用のIPCチャンネル定義をComponents sectionに追記（オプション） |
| S-2 | テストデータセットアップ | tasks.md | Integration/E2Eテストでのlegacy構造セットアップヘルパー作成を検討（オプション） |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Low | W-1 Migration進捗ログ | Monitoring sectionに進捗ログ仕様を追記 | design.md |
| Optional | S-1 IPCチャンネル名 | 実装時に定義（事前明記はオプション） | design.md |
| Optional | S-2 テストデータ | 実装時に定義（事前明記はオプション） | tasks.md |

## 7. Previous Review Status

### Review #1 Issues Resolution

| Issue | Status | Notes |
|-------|--------|-------|
| W-1 Remote UI対応の明記 | ✅ Fixed | requirements.md, design.mdに追記済み |
| W-2 Worktree整合性 | ✅ No Fix Needed | シンボリックリンク共有で問題なし |
| W-3 Concurrent migration | ✅ Fixed | Error Handling表に追記済み |
| S-1 Dialog UX | Deferred | 実装フェーズで検討 |
| S-2 Migration logging | **Open** | 本レビューのW-1として継続 |

---

## Conclusion

前回レビュー（#1）の主要な指摘事項（W-1, W-3）は適切に修正されている。本レビューで検出された新しい問題は軽微（Warning 1件）であり、実装を進めるうえでの障害はない。

**推奨アクション**:
- **Option A**: W-1（Migration進捗ログ）を修正してから実装開始
- **Option B**: 実装を開始し、MigrationService実装時に進捗ログ仕様を確定（推奨）

仕様は実装可能な状態にある。

---

_This review was generated by the document-review command._
