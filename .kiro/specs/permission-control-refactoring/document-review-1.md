# Specification Review Report #1

**Feature**: permission-control-refactoring
**Review Date**: 2026-01-27
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- Steering: product.md, tech.md, structure.md, design-principles.md

## Executive Summary

本レビューでは、3つのCRITICAL問題、2つのWARNING、3つのINFO項目を検出しました。

**Critical Issues**: 3件
- Acceptance Criteria → Tasks Coverage: ユーザー要件に対応する具体的な実装タスクの不足
- Integration Test Coverage: IPC/プロセス境界の統合テストタスクの不在
- Refactoring Integrity: Agent定義ファイルの物理削除タスクの不在

**Warnings**: 2件
- 設計原則との部分的な乖離
- Remote UI影響の未評価

**Info**: 3件
- ドキュメント間の軽微な不整合
- テスト戦略の詳細化推奨
- Out of Scope項目の明確化推奨

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

✅ **整合性良好**: 全12要件がDesignでカバーされ、トレーサビリティテーブル（Requirements Traceability）で明確に追跡可能。

| Requirement | Design Component | Status |
|-------------|------------------|--------|
| Req 1: Agent定義移行 | Agent Layer (12 files) | ✅ Covered |
| Req 2-7: Agent種別制御 | Agent Type Classification | ✅ Covered |
| Req 8: Slash Commands | Command Layer | ✅ Covered |
| Req 9: Electron App | Electron Layer | ✅ Covered |
| Req 10: settings.json | Settings Layer | ✅ Covered |
| Req 11-12: 統合テスト | Integration Test Strategy | ✅ Covered |

### 1.2 Design ↔ Tasks Alignment

✅ **整合性良好**: Design定義のコンポーネントが全てTasksに反映されている。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| Agent Definitions (12 files) | Task 1-5 (各Agent定義変更) | ✅ |
| settings.json | Task 6.1 | ✅ |
| projectStore.ts | Task 7.1 | ✅ |
| AgentListPanel.tsx | Task 7.2 | ✅ |
| specManagerService.ts | Task 7.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

❌ **CRITICAL**: 統合テストタスクの不足

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| Agent定義変更 | 12 Agent files | Task 1-5, 8 | ✅ |
| Electron層変更 | 3 files | Task 7.1-7.3 | ✅ |
| 検証タスク | Unit/Integration/E2E | Task 8-13 | ⚠️ 部分的 |
| **統合テスト（IPC境界）** | **Design.md "Permission Control Flow"** | **(不在)** | ❌ |
| **統合テスト（Skill委譲）** | **Design.md "Skill Tool Delegation Flow"** | **Task 10.4-10.5（不完全）** | ⚠️ |

**問題詳細**:
- Design.mdの"Permission Control Flow"（Electron→IPC→Claude CLI→Agent→Permission Controller）の統合テストタスクが存在しない
- Task 10.4-10.5はE2E的な動作確認であり、IPC境界での権限制御の統合テストを含まない
- Skill Tool Delegation Flowの詳細な統合テストタスク（/commit, /test-fix呼び出し検証）が不足

### 1.4 Acceptance Criteria → Tasks Coverage

❌ **CRITICAL**: ユーザー要件に対応する具体的な実装タスクが不足

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | Agent定義でpermissionMode確認 | 1.1-5.1, 8.2 | Infrastructure | ✅ |
| 1.2 | toolsフィールドのみ使用可能 | 1.1-5.1, 8.3 | Infrastructure | ✅ |
| 1.3 | tools外ツール使用時に権限エラー | 10.4 | Integration Test | ✅ |
| 1.4 | 全Agent移行完了の検証 | 8.1 | Integration Test | ✅ |
| 2.1-2.3 | Validation Agent定義 | 1.1-1.3 | Infrastructure | ✅ |
| 2.4 | Write/Edit使用時に権限エラー | 10.1-10.3 | Integration Test | ⚠️ 間接的 |
| 3.1-3.3 | Spec生成Agent定義 | 2.1-2.3 | Infrastructure | ✅ |
| 3.4 | Bash使用時に権限エラー | 10.1-10.3 | Integration Test | ⚠️ 間接的 |
| 4.1 | spec-tdd-impl定義（Skill） | 3.1 | Infrastructure | ✅ |
| **4.2** | **git操作Skill経由実行可能** | **10.4** | **Integration Test** | **❌ 不完全** |
| **4.3** | **テスト実行Skill経由実行可能** | **10.4** | **Integration Test** | **❌ 不完全** |
| 4.4 | 直接Bash使用時に権限エラー | 10.4 | Integration Test | ✅ |
| 4.5 | allowed-toolsに従う | 10.4 | Integration Test | ⚠️ 間接的 |
| 5.1 | spec-inspection定義（Skill） | 3.2 | Infrastructure | ✅ |
| 5.2-5.3 | ビルド・テスト実行Skill経由 | 10.5 | Integration Test | ⚠️ 間接的 |
| 5.4 | 直接Bash使用時に権限エラー | 10.5 | Integration Test | ✅ |
| 6.1-6.2 | Steering Agent定義 | 4.1-4.2 | Infrastructure | ✅ |
| 6.3 | Bash使用時に権限エラー | 10.1-10.3 | Integration Test | ⚠️ 間接的 |
| 7.1 | Debug Agent定義（MCP） | 5.1 | Infrastructure | ✅ |
| 7.2-7.3 | 許可ツール制御 | 11.1 | Integration Test | ✅ |
| 8.1-8.5 | Slash Commands維持 | （既存維持） | Feature | ✅ |
| 9.1 | skipPermissions=false（デフォルト） | 7.1, 7.2, 9.1 | Infrastructure | ✅ |
| 9.2 | フラグ不使用 | 7.3, 9.1 | Infrastructure | ✅ |
| 9.3 | 全Phase正常動作 | 10.1-10.5 | Integration Test | ✅ |
| 9.4 | フラグ付与（後方互換） | 7.3, 9.2 | Infrastructure | ✅ |
| 10.1 | denyルール設定 | 6.1 | Infrastructure | ✅ |
| 10.2-10.3 | deny動作 | 11.1 | Integration Test | ✅ |
| 11.1-11.4 | settings.local.json非依存 | 12.1-12.2 | Integration Test | ✅ |
| 12.1-12.5 | 全Phase動作確認 | 10.1-10.5 | Integration Test | ✅ |
| 12.6 | エラーログ記録 | 10.4-10.5, 11.1 | Integration Test | ⚠️ 間接的 |

**Validation Results**:
- [ ] All criterion IDs from requirements.md are mapped
- [ ] User-facing criteria have Feature Implementation tasks ← **CRITICAL: 4.2, 4.3, 5.2, 5.3はIntegration Testのみ**
- [ ] No criterion relies solely on Infrastructure tasks

**Critical Issues**:

1. **Criterion 4.2, 4.3 (Skill Tool Delegation)**:
   - 要件: "git操作はSkill経由で/commit実行可能"、"テスト実行はSkill経由で/test-fix実行可能"
   - 現状: Task 10.4がE2Eテストとして記載されているが、具体的な検証手順が不明瞭
   - 問題: `/commit`、`/test-fix`が**実際に呼び出され、正常に実行される**ことを検証するFeature Taskが存在しない
   - 影響: Implementation Agent実行時にSkill toolが機能しない場合、ワークフロー全体が停止する

2. **Criterion 5.2, 5.3 (Inspection Skill Delegation)**:
   - 要件: "ビルド実行はSkill経由"、"テスト実行はSkill経由"
   - 現状: Task 10.5に記載されているが、どのSlash Commandを使用するか不明
   - 問題: Inspection AgentがどのSkill経由でビルド・テストを実行するかが設計・タスクで明確でない
   - 影響: Inspection実行時に適切なコマンドを呼び出せず、検査が失敗する

3. **間接的なIntegration Testの問題**:
   - Criterion 2.4, 3.4, 4.5, 5.2-5.3, 6.3, 12.6は、Integration Testタスク内で「間接的に」確認されることを期待
   - 問題: テストタスクに具体的な検証項目として列挙されていない
   - 影響: テスト実行時に検証漏れが発生する可能性

### 1.5 Integration Test Coverage

❌ **CRITICAL**: IPC境界とSkill委譲の統合テストが不足

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Electron→IPC→Main | "Permission Control Flow" | (不在) | ❌ CRITICAL |
| Main→Claude CLI引数構築 | buildClaudeArgs | Task 9.1, 9.2 | ✅ |
| Agent→Permission Controller | dontAsk + tools | Task 10.1-10.5 | ⚠️ 間接的 |
| Agent→Skill→Slash Command | "Skill Tool Delegation Flow" | Task 10.4, 10.5 | ⚠️ 不完全 |
| settings.json deny適用 | Permission Controller | Task 11.1 | ✅ |

**Validation Results**:
- [ ] All sequence diagrams have corresponding integration tests ← **CRITICAL: "Permission Control Flow"の統合テスト不在**
- [ ] All IPC channels have delivery verification tests ← **CRITICAL: Agent起動IPC呼び出しの検証不在**
- [x] All store sync flows have state propagation tests ← N/A (本機能はstore変更なし)

**Missing Integration Tests**:

1. **Electron App → IPC → Main Process**:
   - Design.md "Permission Control Flow"のシーケンス図に対応する統合テストタスクが存在しない
   - 検証すべき項目:
     - `executeProjectAgent` IPC呼び出しが正しく`buildClaudeArgs`に到達するか
     - `skipPermissions`値がIPCを経由して正しく伝播するか
     - Agent起動後、`--dangerously-skip-permissions`フラグの有無がログで確認できるか
   - 現状: Task 9.1, 9.2はCLI引数確認のみで、IPC境界の統合テストではない

2. **Agent → Skill Tool → Slash Command**:
   - Design.md "Skill Tool Delegation Flow"の詳細な統合テストタスクが不足
   - 検証すべき項目:
     - Implementation Agent実行中に`Skill("/commit")`が呼び出されるか
     - `/commit`コマンドが`allowed-tools: Bash(git *)`に従って実行されるか
     - `/commit`コマンドが正常完了し、結果がAgentに返されるか
     - 同様に`/test-fix`コマンドも検証
   - 現状: Task 10.4は「Skill経由で/commit、/test-fixが正常に実行されることを確認」と記載されているが、検証手順が不明瞭

**Safety Check**:
- Integration testが理論的に不可能か？ → **No**: Electronアプリを起動してAgent実行ログを監視すれば検証可能
- Fallback Strategy（E2Eテスト、詳細な手動検証ログタスク）が存在するか？ → **Yes**: Task 10（E2Eテスト）が存在
- 判定: **WARNING** （E2Eテストで一部カバーされるが、統合テストの明示的なタスクが推奨される）

### 1.6 Refactoring Integrity Check

⚠️ **INFO**: 本機能はファイル削除を伴わないため、Refactoring Integrity Checkは該当しない。

Design.mdの「Integration & Deprecation Strategy」セクションで以下を確認:
- **削除対象ファイル: なし**
- **置き換え方式**: 既存ファイルを直接編集
- **並行作成: なし**

判定: **OK** （既存ファイルの編集のみで、削除・置き換えは不要）

### 1.7 Cross-Document Contradictions

✅ **軽微な不整合あり（INFO）**:

1. **用語の揺れ**:
   - requirements.md: "bypassPermissions"
   - design.md: "`bypassPermissions`"（バッククォート付き）
   - 影響: なし（意味は同じ）

2. **Agent数の記載**:
   - requirements.md: "全Agent（12個）"
   - design.md "Agent Type Classification": 12個のAgent名を明確に列挙
   - tasks.md "Appendix": 12個のAgent定義変更タスク
   - 整合性: ✅ 一致

3. **設計判断の一貫性**:
   - requirements.md Decision Log: 決定事項1-6で設計方針を明確化
   - design.md Design Decisions: DD-001～DD-005で同じ決定を詳細化
   - 整合性: ✅ 一致

判定: **INFO** （軽微な不整合のみ、実装への影響なし）

## 2. Gap Analysis

### 2.1 Technical Considerations

⚠️ **WARNING**: 以下の技術的考慮事項が不足

1. **エラーハンドリングの詳細化**:
   - Design.md "Error Handling"セクションは存在するが、以下が不足:
     - Agent実行中に権限エラーが発生した場合の**リトライ戦略**（リトライすべきか、即座に失敗すべきか）
     - Electronアプリでのエラー表示方法（ユーザーへの通知方法）
     - ログファイルへの記録フォーマット（既存のJSONLフォーマットに準拠するか）
   - 推奨: Error Strategyに「Recovery Strategy」と「User Notification」を追加

2. **パフォーマンス要件**:
   - Design.mdに明示的なパフォーマンス要件の記載なし
   - 考慮すべき項目:
     - Agent起動時のオーバーヘッド（`dontAsk` + `tools`指定によるオーバーヘッドは無視できるか）
     - Skill tool経由の呼び出しのレイテンシ（直接Bash実行と比較して許容範囲か）
   - 現状: Design Decisions DD-002で「パフォーマンス影響は軽微」と記載
   - 判定: **INFO** （明示的な検証タスクがあると望ましい）

3. **ロールバック戦略**:
   - Out of Scopeに「既存settings.local.jsonの削除・書き換え」が含まれるが、改修後に問題が発生した場合のロールバック手順が不明
   - 考慮すべき項目:
     - Agent定義を元に戻す手順
     - settings.jsonのdenyルールを削除する手順
     - Electronアプリのデフォルト値を戻す手順（projectStore.ts）
   - 推奨: Design.mdに「Rollback Strategy」セクションを追加

4. **セキュリティ監査**:
   - Design.md "Design Decisions" DD-003で「denyルールを最小限に限定」と記載
   - 推奨: セキュリティ専門家によるdenyルール一覧のレビュー（`.env`操作、`rm -rf`以外に追加すべきルールがあるか）
   - 判定: **INFO** （現状のdenyルールは妥当だが、外部レビューがあると望ましい）

### 2.2 Operational Considerations

✅ **十分にカバーされている**:

1. **デプロイ手順**:
   - 本機能はElectronアプリのコード変更のみで、デプロイは通常のビルド・配布プロセスで実施可能
   - tech.md "Verification Commands"に記載: `cd electron-sdd-manager && npm run build && npm run typecheck`

2. **ロールバック戦略**:
   - Section 2.1で指摘した通り、詳細化が推奨されるが、緊急時はgit revertで対応可能

3. **モニタリング・ログ**:
   - Design.md "Error Handling" → "Monitoring"に記載:
     - Agent実行ログ（`.kiro/runtime/agents/*/logs/agent-*.log`）
     - Electronアプリログ（`logs/electron-dev.log`）
   - ログ記録は既存のロギング機構を活用（steering/logging.md参照）

4. **ドキュメント更新**:
   - Task 13.1でsettings.local.jsonへのコメント追加を記載（オプション）
   - 推奨: `.claude/README.md`やElectronアプリのヘルプドキュメントに、新しいパーミッション制御の説明を追加

## 3. Ambiguities and Unknowns

⚠️ **以下の曖昧性・未定義項目あり**:

1. **Skill tool経由でどのSlash Commandを使用するか**:
   - Implementation Agent: `/commit`, `/test-fix`は明確
   - **Inspection Agent**: ビルド実行にどのコマンドを使用するか不明
     - requirements.md Req 5.2: "ビルド実行を必要とする場合、システムはSkillツール経由で適切なコマンドを呼び出し可能"
     - design.md 5.1: "ビルド実行はSkill経由（新規Slash Command不要、既存で対応可）"
     - 問題: 「既存で対応可」とあるが、既存のどのコマンドを使用するか不明
     - 推奨: ビルド実行用のSlash Commandを新規作成、または既存コマンドを明示

2. **Agent実行中の権限エラー時の挙動**:
   - requirements.md Req 12.6: "権限エラー時にログ記録と失敗報告"
   - 問題: 「失敗報告」の具体的な方法が不明
     - Electronアプリに通知表示？
     - Agent実行ログに記録のみ？
     - ユーザーに再実行を促す？
   - 推奨: Design.md "Error Handling"に「User Notification Strategy」を追加

3. **settings.local.jsonの取り扱い**:
   - requirements.md Req 11.1-11.4で「非依存の動作保証」を要件としているが、既存のsettings.local.jsonを削除するか、残すかが曖昧
   - Decision Log 3: "settings.local.jsonに影響を受けない設計とする"
   - Out of Scope: "既存settings.local.jsonの削除・書き換えは変更しない"
   - Task 13.1: "settings.local.jsonのコメント追加（オプション）"
   - 問題: 削除しないが、コメント追加は任意という扱い
   - 推奨: 既存ユーザーへの影響を考慮し、settings.local.jsonの取り扱いを明確化（削除推奨、コメント追加必須、そのまま残す、のいずれか）

4. **後方互換性の期限**:
   - Design.md DD-004: "skipPermissionsフラグ自体は残し、デフォルトをOFFに変更"
   - 問題: フラグを残す期間が不明（将来的に廃止予定か、永続的に残すか）
   - 推奨: フラグの廃止スケジュールを明確化（例: 「次のメジャーバージョンで廃止予定」）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **整合性良好**:

1. **Electronアーキテクチャパターン**:
   - steering/structure.md "Electron Process Boundary Rules"と整合
   - skipPermissions設定はMain Processで保持（projectStore.ts）
   - IPCハンドラーパターン（specManagerService.ts）を維持

2. **State Management Rules**:
   - projectStore.tsはUI State（`skipPermissions`はUI設定として妥当）
   - steering/structure.md "State Management Rules"に準拠

3. **IPC設計パターン**:
   - `buildClaudeArgs`関数の変更は既存のIPCパターンを維持
   - steering/tech.md "IPC設計パターン"に準拠

### 4.2 Integration Concerns

⚠️ **WARNING**: Remote UI影響の未評価

1. **Remote UI対応の検討不足**:
   - steering/tech.md "新規Spec作成時の確認事項" → "Remote UI影響チェック"に以下を明記:
     > 新しい機能を設計する際は、Remote UIへの影響有無を明確にすること
   - 本機能の影響:
     - skipPermissions設定はprojectStoreで管理（Remote UIからも操作可能）
     - Agent起動時のCLI引数構築（specManagerService.ts）はMain Processで実施（Remote UIに影響なし）
   - 問題: requirements.mdにRemote UI対応の記載なし
   - 推奨: Remote UIからのskipPermissions設定変更を許可するか、明確化

2. **既存機能への影響**:
   - 本機能は既存のAgent実行ワークフローに影響を与えるが、既存Specへの影響は軽微
   - Agent定義の変更により、既存の実行中Agentは影響を受けない（新規起動Agentのみ適用）

3. **共有リソース競合**:
   - Agent定義ファイル（`.claude/agents/kiro/*.md`）を複数のElectronアプリインスタンスが同時に読み込む可能性
   - 問題: 編集中のAgent定義を別インスタンスが読み込む場合の挙動が不明
   - 判定: **INFO** （実運用では問題にならないが、複数インスタンス起動時の注意事項として記載推奨）

### 4.3 Migration Requirements

✅ **移行要件は適切に考慮されている**:

1. **データ移行**:
   - 本機能はデータモデル変更を伴わないため、データ移行不要
   - Agent定義ファイルの変更は、既存ファイルの編集のみ（新規ファイル作成なし）

2. **段階的ロールアウト**:
   - requirements.md Decision Log 1: "一括切り替えを採用"
   - 理由: "一度に切り替えないと統合的なテストができない"
   - 判定: ✅ 妥当（段階的移行は不要）

3. **後方互換性**:
   - skipPermissionsフラグは残す（Design.md DD-004）
   - settings.local.jsonは変更しない（非依存設計）
   - 判定: ✅ 後方互換性を維持

## 5. Recommendations

### Critical Issues (Must Fix)

1. **[CRITICAL] Acceptance Criteria 4.2, 4.3のFeature Implementation Taskを追加**:
   - 問題: git操作とテスト実行のSkill委譲が「Integration Testで間接的に確認」となっている
   - 推奨:
     - Task 10.4を詳細化: `/commit`呼び出しの検証手順を明記
     - Task 10.4を詳細化: `/test-fix`呼び出しの検証手順を明記
     - 検証項目: Agentログに`Skill("/commit")`の記録があること、`/commit`コマンドが正常完了していること
   - 影響: **高** （Implementation Agentの主要機能が正しく動作しない場合、ワークフロー全体が停止）

2. **[CRITICAL] IPC境界の統合テストタスクを追加**:
   - 問題: "Permission Control Flow"の統合テストタスクが存在しない
   - 推奨:
     - 新規Task追加: "9.3 IPC境界の統合テスト"
       - Electronアプリから`executeProjectAgent` IPC呼び出し
       - Main Processの`buildClaudeArgs`が正しく呼び出されることを確認
       - `skipPermissions`値がIPCを経由して正しく伝播することを確認
       - Agent起動ログで`--dangerously-skip-permissions`フラグの有無を確認
   - 影響: **高** （IPC境界で権限設定が正しく伝播しない場合、全ワークフローが失敗）

3. **[CRITICAL] Inspection Agent用のビルド実行コマンドを明確化**:
   - 問題: requirements.md Req 5.2で"ビルド実行はSkill経由"とあるが、どのSlash Commandを使用するか不明
   - 推奨:
     - Design.mdに「ビルド実行用のSlash Command」を明記（既存コマンドを使用、または新規作成）
     - Tasksにビルド実行コマンドの検証タスクを追加
   - 影響: **中** （Inspection実行時にビルドが失敗する可能性）

### Warnings (Should Address)

4. **[WARNING] エラーハンドリング戦略の詳細化**:
   - 問題: 権限エラー時のリトライ戦略、ユーザー通知方法が不明
   - 推奨:
     - Design.md "Error Handling"に以下を追加:
       - Recovery Strategy（リトライすべきか、即座に失敗すべきか）
       - User Notification Strategy（Electronアプリでの通知方法）
       - Log Format（権限エラーのログフォーマット）
   - 影響: **中** （エラー発生時のユーザー体験に影響）

5. **[WARNING] Remote UI影響の評価**:
   - 問題: steering/tech.md "新規Spec作成時の確認事項"に従って、Remote UI影響を明確にすべき
   - 推奨:
     - requirements.mdに「Remote UI対応: 不要」または「対応」を明記
     - Remote UIからのskipPermissions設定変更を許可するか決定
   - 影響: **低** （Remote UIからの操作が必要な場合のみ影響）

### Suggestions (Nice to Have)

6. **[INFO] テスト戦略の詳細化**:
   - 推奨:
     - Design.md "Testing Strategy"に以下を追加:
       - 各テストタスクの具体的な検証項目（チェックリスト形式）
       - テスト失敗時の対処手順
   - 影響: **低** （テスト実行時の明確性向上）

7. **[INFO] ロールバック手順の明確化**:
   - 推奨:
     - Design.mdに「Rollback Strategy」セクションを追加
     - Agent定義、settings.json、projectStore.tsを元に戻す手順を記載
   - 影響: **低** （問題発生時の対応時間短縮）

8. **[INFO] settings.local.jsonの取り扱い明確化**:
   - 推奨:
     - 既存ユーザーへの影響を考慮し、settings.local.jsonの取り扱いを明確化
     - Task 13.1を「オプション」から「必須」に変更、またはOut of Scopeに「削除しない」と明記
   - 影響: **低** （既存ユーザーの混乱を防止）

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | Criterion 4.2, 4.3のFeature Task不足 | Task 10.4を詳細化: `/commit`, `/test-fix`呼び出しの検証手順を明記 | tasks.md |
| CRITICAL | IPC境界の統合テスト不在 | 新規Task追加: "9.3 IPC境界の統合テスト" | tasks.md |
| CRITICAL | Inspection Agent用ビルドコマンド不明 | Design.mdにビルド実行コマンドを明記、Tasksに検証タスク追加 | design.md, tasks.md |
| WARNING | エラーハンドリング戦略不足 | Design.md "Error Handling"に Recovery/User Notification/Log Format を追加 | design.md |
| WARNING | Remote UI影響未評価 | requirements.mdに「Remote UI対応」を明記 | requirements.md |
| INFO | テスト戦略の詳細化不足 | Design.md "Testing Strategy"に検証項目チェックリストを追加 | design.md |
| INFO | ロールバック手順不明 | Design.mdに「Rollback Strategy」セクション追加 | design.md |
| INFO | settings.local.json取り扱い曖昧 | Out of Scopeに「削除しない」明記、またはTask 13.1を必須化 | requirements.md, tasks.md |

---

_This review was generated by the document-review command._
