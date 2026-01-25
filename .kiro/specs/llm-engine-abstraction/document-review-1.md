# Specification Review Report #1

**Feature**: llm-engine-abstraction
**Review Date**: 2026-01-26
**Documents Reviewed**:
- `.kiro/specs/llm-engine-abstraction/spec.json`
- `.kiro/specs/llm-engine-abstraction/requirements.md`
- `.kiro/specs/llm-engine-abstraction/design.md`
- `.kiro/specs/llm-engine-abstraction/tasks.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

**総評**: 仕様書は全体的に良く整備されており、Requirements → Design → Tasks の整合性が取れている。Requirements Traceability Matrix（設計書）と Coverage Matrix（タスク）が明示的に記載されており、トレーサビリティが確保されている。いくつかのWarningとInfoレベルの改善点を提案する。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果**: ✅ 良好

Design.mdの「Requirements Traceability」セクションで、すべてのAcceptance Criterion（1.1〜7.4）が明示的にコンポーネントにマッピングされている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1 (LLM Engine Registry) | LLMEngineRegistry | ✅ |
| Req 2 (コマンドラインオプションビルダー) | ClaudeEngine/GeminiEngine.buildArgs() | ✅ |
| Req 3 (レスポンスパーサー) | ClaudeEngine/GeminiEngine.parseOutput() | ✅ |
| Req 4 (プロジェクト設定) | engineConfigService, projectConfigService拡張 | ✅ |
| Req 5 (Spec単位オーバーライド) | engineConfigService.resolveEngine() | ✅ |
| Req 6 (設定UI) | EngineConfigSection | ✅ |
| Req 7 (specManagerService統合) | specManagerService修正 | ✅ |

**Coverage Validation Checklist (Design.md)**: ✅ 記載済み

### 1.2 Design ↔ Tasks Alignment

**結果**: ✅ 良好

Design.mdの各コンポーネントがtasks.mdに対応するタスクを持っている。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| LLMEngineRegistry | Task 1.1-1.5 | ✅ |
| ClaudeEngine | Task 1.2 | ✅ |
| GeminiEngine | Task 1.3 | ✅ |
| engineConfigService | Task 2.1-2.5 | ✅ |
| projectConfigService拡張 | Task 2.2 | ✅ |
| spec.json拡張 | Task 2.4 | ✅ |
| specManagerService統合 | Task 3.1-3.3 | ✅ |
| IPC Handlers | Task 4.1-4.3 | ✅ |
| EngineConfigSection | Task 5.1-5.6 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | EngineConfigSection | Task 5.1-5.6 | ✅ |
| Services | engineConfigService | Task 2.3 | ✅ |
| Services | specManagerService修正 | Task 3.1-3.2 | ✅ |
| Types/Models | EngineConfigSchema, LLMEngine | Task 1.1, 2.1 | ✅ |
| Registry | LLMEngineRegistry | Task 1.4 | ✅ |
| IPC | load/saveEngineConfig, getAvailableLLMEngines | Task 4.1-4.3 | ✅ |
| Tests | Unit/Integration Tests | Task 1.5, 2.5, 3.3, 5.6 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

tasks.mdには明示的な「Requirements Coverage Matrix」が含まれており、全Criterionがマッピングされている。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | LLMEngine インターフェース定義 | 1.1 | Infrastructure | ✅ |
| 1.2 | LLMEngineRegistry 実装 | 1.4 | Infrastructure | ✅ |
| 1.3 | エンジン追加時のバリデーション | 1.4, 1.5 | Infrastructure | ✅ |
| 1.4 | Claude/Gemini エンジン定義 | 1.2, 1.3, 1.4 | Infrastructure | ✅ |
| 2.1 | BuildArgsOptions 定義 | 1.1 | Infrastructure | ✅ |
| 2.2 | Claude skipPermissions フラグ | 1.2 | Feature | ✅ |
| 2.3 | Gemini --yolo フラグ | 1.3 | Feature | ✅ |
| 2.4 | output-format stream-json | 1.2, 1.3 | Feature | ✅ |
| 2.5 | 未サポートオプションの無視 | 1.2, 1.3 | Feature | ✅ |
| 3.1 | ParsedOutput 構造定義 | 1.1 | Infrastructure | ✅ |
| 3.2 | Claude JSONL パース | 1.2 | Feature | ✅ |
| 3.3 | Gemini stream-json パース | 1.3 | Feature | ✅ |
| 3.4 | 正規化レイヤー | 1.3 | Feature | ✅ |
| 3.5 | パースエラーハンドリング | 1.5 | Feature | ✅ |
| 4.1 | engineConfig 保存場所 | 2.2 | Infrastructure | ✅ |
| 4.2 | engineConfig 構造 | 2.1 | Infrastructure | ✅ |
| 4.3 | フェーズ未設定時のフォールバック | 2.3, 2.5 | Feature | ✅ |
| 4.4 | デフォルト claude | 2.3, 6.1 | Feature | ✅ |
| 5.1 | spec.json engineOverride 定義 | 2.4 | Infrastructure | ✅ |
| 5.2 | engineOverride 優先 | 2.3, 2.5, 6.1 | Feature | ✅ |
| 5.3 | オーバーライド未設定時のフォールバック | 2.3, 2.5, 6.1 | Feature | ✅ |
| 6.1 | 設定パネル UI | 4.1, 4.2, 4.3, 5.1, 5.5 | Feature | ✅ |
| 6.2 | 3セクション表示 | 5.1, 5.6 | Feature | ✅ |
| 6.3 | セクション別エンジン選択 | 5.3, 5.6 | Feature | ✅ |
| 6.4 | デフォルトドロップダウン | 5.2 | Feature | ✅ |
| 6.5 | デフォルトを使用オプション | 5.3 | Feature | ✅ |
| 6.6 | セクション変更時の自動更新 | 5.4, 5.6 | Feature | ✅ |
| 7.1 | startAgent エンジン解決 | 3.1, 3.3, 6.1 | Feature | ✅ |
| 7.2 | LLMEngineRegistry 使用 | 3.1, 3.3, 6.1 | Feature | ✅ |
| 7.3 | 後方互換性 | 3.2, 3.3, 6.1 | Feature | ✅ |
| 7.4 | エンジン使用ログ | 3.1, 6.2 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks (Coverage Validation Checklistで確認済み)

### 1.5 Integration Test Coverage

Design.mdの「Integration Test Strategy」セクションでテスト戦略が定義されている。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Engine Resolution Flow | "Engine Resolution Flow" シーケンス図 | Task 3.3 | ✅ |
| Settings UI Flow | "Settings UI Flow" シーケンス図 | Task 5.6 | ✅ |
| projectConfigService永続化 | "Data Flow" | Task 3.3 | ✅ |

**Validation Results**:
- [x] All sequence diagrams have corresponding integration tests
- [x] Engine resolution flow is covered by Task 3.3
- [x] UI state propagation is covered by Task 5.6

**注意**: IPC経由のMain↔Renderer通信のEnd-to-End検証はTask 6.1のマニュアル検証に依存している。自動化されたIPCテストは明示的に定義されていないが、Settings UI Flowのシーケンス図が示すIPC通信は、Vitestによるユニットテストとマニュアル検証の組み合わせでカバーされる設計となっている。

### 1.6 Cross-Document Contradictions

**検出された矛盾**: なし ✅

すべてのドキュメント間で以下の用語が一貫している:
- エンジンID: `claude`, `gemini`
- フェーズ名: `plan`, `requirements`, `design`, `tasks`, `document-review`, `document-review-reply`, `inspection`, `impl`
- セクション名: 生成(Generation), 検査(Inspection), 実装(Implementation)
- 設定ファイル: `.kiro/sdd-orchestrator.json`

## 2. Gap Analysis

### 2.1 Technical Considerations

**エラーハンドリング**: ✅ 設計書のError Handling Strategy表で定義済み

| Gap | Severity | Detail |
|-----|----------|--------|
| Gemini CLI未インストール時のエラーUX | Warning | Design.mdで「エラーダイアログ」と記載されているが、どのタイミングでチェックするか不明。起動時？設定変更時？エンジン解決時？ |

**セキュリティ**: ✅ 問題なし（機密情報を扱わない）

**パフォーマンス**: ✅ 問題なし（設定ファイル読み込みは軽量）

**ログ実装**: ✅ 設計書で`[engineConfigService]`プレフィックスとReq 7.4対応が明記

### 2.2 Operational Considerations

| Gap | Severity | Detail |
|-----|----------|--------|
| デプロイ手順 | Info | 既存のアプリアップデートフローに含まれる想定で、特別な手順は不要 |
| ロールバック | Info | 設定ファイルの後方互換性はフォールバックで対応済み |

## 3. Ambiguities and Unknowns

| Item | Severity | Detail | Recommendation |
|------|----------|--------|----------------|
| Gemini CLI stream-json出力形式 | Warning | Requirements Open Questionに記載。Design DD-004で「Claude CLIと同一フォーマットを想定」と記載されているが、実機検証が完了していない | 実装フェーズ開始前または並行して実機検証を実施し、差異がある場合はparseOutput()を修正 |
| Gemini CLI allowedTools対応 | Warning | Requirements Open Questionに記載。「-p モードで機能するか要検証」 | 実装フェーズで検証し、非対応の場合はsilent ignoreを実装（Req 2.5で対応済み） |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Electron Process Boundary Rules**: ✅ 準拠

- エンジン設定はMain Processの`projectConfigService`で管理
- Rendererはshared stores経由で設定を読み取り、変更はIPC経由でMainに依頼
- Settings UI FlowがRenderer → IPC → Main → ブロードキャスト → Rendererパターンに従っている

**State Management Rules**: ✅ 準拠

- `EngineConfigSection`はshared componentsまたはrenderer/componentsに配置
- 設定保存は`projectConfigService`（Main Process）が担当

**Component Organization Rules**: ✅ 準拠

- 新規ファイルの配置先が適切:
  - `shared/registry/llmEngineRegistry.ts`
  - `main/services/engineConfigService.ts`
  - `renderer/components/EngineConfigSection.tsx`

### 4.2 Integration Concerns

| Concern | Impact | Mitigation |
|---------|--------|------------|
| 既存buildClaudeArgs()への影響 | Low | 設計書で「廃止予定なし。互換性のため残し、CLAUDE_ENGINE.buildArgs()から呼び出す」と明記 |
| reviewEngineRegistryとの関係 | None | 明示的にレイヤー分離と記載。Document ReviewはreviewEngineRegistryを継続使用 |

### 4.3 Migration Requirements

- **データマイグレーション**: 不要（新規設定フィールドの追加のみ、既存設定はフォールバックでclaude使用）
- **段階的ロールアウト**: 不要（後方互換性あり）
- **後方互換性**: ✅ 確保済み（Req 7.3, Task 3.2）

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **W-001: Gemini CLI未インストール検出タイミング**
   - Design.mdのError Handling Strategyで「エージェント起動失敗」と記載されているが、ユーザーが設定UIでGeminiを選択した時点でコマンド存在チェックを行い、未インストールの場合は警告を表示する方が良いUX
   - 推奨: engineConfigService or UIでのバリデーション追加を検討

2. **W-002: Gemini CLI出力形式の実機検証**
   - Open Questionとして残っている。実装フェーズ開始時に検証し、差異があればparseOutput()の修正が必要
   - 推奨: Task 1.3のサブタスクとして「Gemini CLI stream-json出力の実機検証」を明示化

3. **W-003: Gemini CLI -pモードでのallowedTools対応状況**
   - Open Questionとして残っている
   - 推奨: 同様にTask 1.3で検証し、非対応ならsilent ignoreを確認

### Suggestions (Nice to Have)

1. **S-001: 将来のCodax CLI対応準備**
   - Out of Scopeとして明記されているが、LLMEngineIdを`'claude' | 'gemini'`のリテラル型ではなく、より拡張性のある設計（例: 文字列 + バリデーション）も検討価値あり
   - 現状の設計で問題なし。将来的な拡張時に型定義を更新すればよい

2. **S-002: セクション↔フェーズマッピングの設定可能化**
   - 現在ハードコード（SECTION_PHASES定数）だが、将来的にフェーズ単位設定が必要になった場合の拡張ポイント
   - 現状の設計で問題なし。YAGNIに従いハードコードで十分

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | W-001 | Gemini CLI未インストール時のUX検討（設定変更時の警告表示など） | design.md, tasks.md |
| Warning | W-002 | Gemini CLI stream-json出力の実機検証をTask 1.3の明示的サブタスクとして追加 | tasks.md |
| Warning | W-003 | Gemini CLI allowedTools対応検証をTask 1.3の明示的サブタスクとして追加 | tasks.md |
| Info | - | 実装フェーズ開始可能。上記Warningは並行して対応可 | - |

---

_This review was generated by the document-review command._
