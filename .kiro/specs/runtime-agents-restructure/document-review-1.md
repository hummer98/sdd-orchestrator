# Specification Review Report #1

**Feature**: runtime-agents-restructure
**Review Date**: 2026-01-22
**Documents Reviewed**:
- `spec.json` - Spec configuration
- `requirements.md` - Requirements definition
- `design.md` - Technical design
- `tasks.md` - Implementation tasks
- `steering/product.md` - Product context
- `steering/tech.md` - Technology stack
- `steering/structure.md` - Project structure
- `steering/design-principles.md` - Design principles

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

本仕様は全体的に整合性が高く、Requirements → Design → Tasks のトレーサビリティが適切に維持されている。SSOT原則に基づいたログ統合という目的が明確で、技術的決定も合理的根拠に基づいている。いくつかの軽微な問題と改善提案があるが、実装を進めるうえでの重大な障害はない。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: ✅ 整合**

Requirementsで定義された7つの要件すべてがDesignのRequirements Traceability表にマッピングされている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: ディレクトリ構造の再編成 | Architecture、Data Models | ✅ |
| Req 2: LogFileServiceの変更 | Components/LogFileService | ✅ |
| Req 3: AgentRecordServiceの変更 | Components/AgentRecordService | ✅ |
| Req 4: AgentRecordWatcherServiceの拡張 | Components/AgentRecordWatcherService | ✅ |
| Req 5: Lazy Migration | Components/MigrationService、MigrationDialog | ✅ |
| Req 6: 旧パスからの読み取り互換性 | LogFileService.readLogWithFallback | ✅ |
| Req 7: specs/*/logs/ の廃止 | Design内で明記 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**結果: ✅ 整合**

Designで定義された全コンポーネントに対応するタスクが存在する。

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

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | spec-bound agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure | ✅ |
| 1.2 | spec-bound agentログ保存先 | 1.2, 3.2 | Infrastructure | ✅ |
| 1.3 | bug-bound agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure | ✅ |
| 1.4 | bug-bound agentログ保存先 | 1.2, 3.2 | Infrastructure | ✅ |
| 1.5 | project-level agentメタデータ保存先 | 1.1, 1.2, 2.2 | Infrastructure | ✅ |
| 1.6 | project-level agentログ保存先 | 1.2, 3.2 | Infrastructure | ✅ |
| 1.7 | logs/サブディレクトリ自動作成 | 3.2 | Infrastructure | ✅ |
| 2.1 | LogFileService新パス書き込み | 3.1 | Infrastructure | ✅ |
| 2.2 | LogFileServiceフォールバック読み取り | 3.3 | Infrastructure | ✅ |
| 2.3 | LogFileService category引数追加 | 3.2 | Infrastructure | ✅ |
| 3.1 | AgentRecordService新パス書き込み | 2.1, 2.2 | Infrastructure | ✅ |
| 3.2 | AgentRecordService spec読み取り | 2.3, 7.1 | Infrastructure | ✅ |
| 3.3 | AgentRecordService bug読み取り | 2.3, 7.1 | Infrastructure | ✅ |
| 3.4 | AgentRecordService project読み取り | 2.3, 7.1 | Infrastructure | ✅ |
| 4.1 | 3 watcher categories | 4.1 | Infrastructure | ✅ |
| 4.2 | spec watcher監視パス | 4.1, 4.2 | Infrastructure | ✅ |
| 4.3 | bug watcher監視パス | 4.1, 4.2 | Infrastructure | ✅ |
| 4.4 | project watcher深度 | 4.1 | Infrastructure | ✅ |
| 4.5 | switchWatchScope bugId対応 | 4.2, 4.3 | Infrastructure | ✅ |
| 5.1 | legacy logs検出時ダイアログ表示 | 5.2, 5.4, 6.1, 6.2 | Feature | ✅ |
| 5.2 | bug legacy logs検出 | 5.2, 5.4 | Infrastructure | ✅ |
| 5.3 | migrationダイアログ情報表示 | 6.1, 6.2 | Feature | ✅ |
| 5.4 | migration実行 | 5.3, 6.2 | Feature | ✅ |
| 5.5 | migration辞退時セッション記憶 | 5.1, 6.2 | Infrastructure | ✅ |
| 5.6 | migration後legacy削除 | 5.3 | Infrastructure | ✅ |
| 6.1 | 両パス確認 | 3.3, 7.2 | Infrastructure | ✅ |
| 6.2 | legacyパスからの読み取り | 3.3, 7.2 | Infrastructure | ✅ |
| 6.3 | legacy表示ヒント | 7.2 | Feature | ✅ |
| 7.1 | 新規ログ作成禁止 | 3.1 | Infrastructure | ✅ |
| 7.2 | .gitignore更新 | 7.3 | Infrastructure | ✅ |
| 7.3 | ドキュメント更新 | 9.1 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDがrequirements.mdからマッピングされている
- [x] ユーザー向け基準にFeature Implementationタスクがある
- [x] Infrastructureタスクのみに依存する基準がない

### 1.5 Cross-Document Contradictions

**検出された矛盾: なし**

用語の一貫性:
- `AgentCategory` 型: Requirements(Decision Log)、Design、Tasksで一貫して使用
- `runtime/agents/` パス: 全ドキュメントで統一

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| Remote UI同期 | ⚠️ Warning | MigrationDialogがRemote UIでも表示されるべきか明記されていない。steering/tech.mdでは新機能のRemote UI影響を明記すべきとしている。 |
| エラーハンドリング詳細 | ℹ️ Info | Design内のError Handling sectionは包括的だが、concurrent migration（同じspecを複数ウィンドウで選択）のシナリオが未考慮。 |
| ログローテーション | ℹ️ Info | 新構造でもログローテーションはLogRotationManagerが処理する前提だが、パス変更による影響の検証が必要。 |

### 2.2 Operational Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| Worktree間の移行整合性 | ⚠️ Warning | worktree内でspec選択→migration実行後、mainブランチのspecsディレクトリとの整合性確認が必要。worktree削除後もruntime/agents/のログが残ることは確認済みだが、移行ダイアログがworktreeコンテキストを正しく認識するか未確認。 |

## 3. Ambiguities and Unknowns

### Open Questions (Requirements由来)

| Question | Impact | Recommendation |
|----------|--------|----------------|
| マイグレーションダイアログの「今後表示しない」オプションは必要か？ | Low | 現在のセッション単位非表示で十分。永続化は将来課題として延期可。 |
| ProjectAgentの使用頻度が低い場合、`project/` ディレクトリは将来廃止可能か？ | Low | 現時点では3カテゴリ維持が適切。使用頻度データ収集後に再検討。 |

### Pending Design Decisions

| Item | Description | Status |
|------|-------------|--------|
| MigrationDialog表示タイミング | Designで「選択直後は煩わしい可能性」と記載されているが、具体的な代替案は未決定 | Deferred to implementation |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: ✅ 整合**

- **Electron Process Boundary**: MigrationServiceはMain Processに配置され、steering/structure.mdのルールに準拠
- **State Management**: MigrationDialogStateはUI Stateとして適切に分離（shared/storesではなくUI層）
- **IPC Pattern**: migration関連のIPCハンドラ追加はchannels.ts/handlers.tsパターンに従う設計

### 4.2 Integration Concerns

| Concern | Assessment |
|---------|------------|
| Remote UI影響 | ⚠️ tech.mdのチェックリスト「Remote UIへの影響有無」が未記載。MigrationDialogはRemote UIでも必要な可能性が高い。 |
| 既存サービスへの変更 | AgentRecordService、LogFileService、AgentRecordWatcherServiceへの変更は後方互換性を維持する設計（deprecateメソッド維持） |

### 4.3 Migration Requirements

**結果: ✅ 適切に対応**

- Lazy Migration方式により、一括移行のリスクを回避
- 後方互換読み取り（readLogWithFallback）により、移行前後のログアクセスを保証
- Design Decision DD-004、DD-005で根拠が明確化されている

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| # | Issue | Affected Documents | Recommended Action |
|---|-------|-------------------|-------------------|
| W-1 | Remote UI対応の明記がない | requirements.md, design.md | requirements.mdにRemote UI対応方針（要/不要）を追記。不要の場合もその理由を明記。 |
| W-2 | Worktree内での移行整合性 | design.md | MigrationServiceがworktreeコンテキストを考慮するか、設計ノートに追記。 |
| W-3 | Concurrent migration未考慮 | design.md | 同じspecを複数ウィンドウで選択した場合のシナリオをError Handlingに追記。 |

### Suggestions (Nice to Have)

| # | Issue | Affected Documents | Recommended Action |
|---|-------|-------------------|-------------------|
| S-1 | MigrationDialog表示タイミングのUX | design.md | 具体的な代替案（例: 遅延表示、通知バッジ）を検討。 |
| S-2 | 移行進捗のログ出力 | design.md | 大量ファイル移行時の進捗をlogger.infoで出力する仕様を明記。 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Medium | W-1 Remote UI対応の明記 | requirements.mdに「Remote UI対応: 不要（Desktop UIのみ）」または対応方針を追記 | requirements.md |
| Low | W-2 Worktree整合性 | MigrationServiceのpathResolution時にworktree考慮の設計ノート追記 | design.md |
| Low | W-3 Concurrent migration | Error Handling sectionにrace condition対応を追記 | design.md |
| Low | S-1 Dialog UX | Implementation Notesに詳細検討を延期する旨を明記 | design.md |
| Low | S-2 Migration logging | Monitoring sectionに進捗ログの仕様を追記 | design.md |

---

_This review was generated by the document-review command._
