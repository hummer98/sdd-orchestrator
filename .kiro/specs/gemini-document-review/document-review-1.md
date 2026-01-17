# Specification Review Report #1

**Feature**: gemini-document-review
**Review Date**: 2026-01-17
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 2 |

全体として仕様書は適切に整備されており、Requirements → Design → Tasks の一貫性が保たれています。実装開始に問題はありませんが、いくつかの曖昧な点について実装時に確認が必要です。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

✅ **良好**: 全ての受け入れ基準（1.1〜8.3）がDesignのRequirements Traceabilityテーブルでカバーされています。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: Experimental Tools Installer拡張 | ExperimentalToolsInstallerService拡張 | ✅ |
| Req 2: TOMLテンプレートファイル | Template Files (document-review.toml, document-review-reply.toml) | ✅ |
| Req 3: spec.json schemeフィールド | documentReview.ts型拡張 | ✅ |
| Req 4: schemeタグ表示 | DocumentReviewPanel拡張 | ✅ |
| Req 5: scheme切り替え機能 | DocumentReviewPanel + IPC | ✅ |
| Req 6: schemeに基づくレビュー実行 | SpecManagerService拡張 | ✅ |
| Req 7: Remote UI対応 | SpecDetailView拡張 | ✅ |
| Req 8: 自動実行時の考慮 | AutoExecutionCoordinator | ✅ |

### 1.2 Design ↔ Tasks Alignment

✅ **良好**: Designで定義された全コンポーネントがTasksでカバーされています。

| Design Component | Task(s) | Status |
|------------------|---------|--------|
| ExperimentalToolsInstallerService | 2.1, 2.2, 2.3 | ✅ |
| SpecManagerService | 3.1, 3.2 | ✅ |
| DocumentReviewPanel | 4.1, 4.2 | ✅ |
| SpecDetailView (Remote UI) | 6.1, 6.2 | ✅ |
| documentReview.ts | 1.1 | ✅ |
| Template Files | 1.2, 1.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | DocumentReviewPanel, SpecDetailView | 4.1, 4.2, 6.1, 6.2 | ✅ |
| Services | ExperimentalToolsInstallerService, SpecManagerService | 2.1, 3.1, 3.2 | ✅ |
| Types/Models | ReviewerScheme, DocumentReviewState | 1.1 | ✅ |
| IPC Channels | UPDATE_SPEC_JSON (既存), INSTALL_EXPERIMENTAL_* | 2.2 | ✅ |
| Templates | document-review.toml, document-review-reply.toml | 1.2, 1.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 実験的ツールメニューにGemini項目追加 | 2.3 | Feature | ✅ |
| 1.2 | document-review.tomlインストール | 2.1 | Feature | ✅ |
| 1.3 | document-review-reply.tomlインストール | 2.1 | Feature | ✅ |
| 1.4 | ディレクトリ自動作成 | 2.1 | Infrastructure | ✅ |
| 1.5 | 上書き確認ダイアログ | 2.1, 2.2 | Feature | ✅ |
| 1.6 | Forceオプション | 2.1, 2.2 | Feature | ✅ |
| 1.7 | インストール成功通知 | 2.3 | Feature | ✅ |
| 1.8 | インストール失敗通知 | 2.3 | Feature | ✅ |
| 2.1 | document-review.tomlテンプレート存在 | 1.2 | Infrastructure | ✅ |
| 2.2 | document-review-reply.tomlテンプレート存在 | 1.3 | Infrastructure | ✅ |
| 2.3 | TOML形式準拠 | 1.2, 1.3 | Infrastructure | ✅ |
| 2.4 | {{args}}でフィーチャー名受け取り | 1.2 | Infrastructure | ✅ |
| 2.5 | document-review-reply.toml形式 | 1.3 | Infrastructure | ✅ |
| 2.6 | 既存document-review.mdと同等機能 | 1.2, 1.3 | Infrastructure | ✅ |
| 3.1 | spec.jsonにschemeフィールド追加 | 1.1 | Infrastructure | ✅ |
| 3.2 | scheme値は'claude-code'または'gemini-cli' | 1.1 | Infrastructure | ✅ |
| 3.3 | schemeデフォルト値'claude-code' | 1.1 | Infrastructure | ✅ |
| 3.4 | SpecsWatcherServiceでscheme読み込み | 5 | Feature | ✅ |
| 3.5 | scheme変更のUI反映 | 5 | Feature | ✅ |
| 4.1 | schemeタグ表示 | 4.1 | Feature | ✅ |
| 4.2 | Claude/Geminiラベル表示 | 4.1 | Feature | ✅ |
| 4.3 | タグ色のscheme別区別 | 4.1 | Feature | ✅ |
| 4.4 | デフォルトClaudeタグ表示 | 4.1 | Feature | ✅ |
| 5.1 | タグクリックでscheme切り替え | 4.2 | Feature | ✅ |
| 5.2 | 切り替え後spec.json即時更新 | 4.2 | Feature | ✅ |
| 5.3 | 切り替え後タグ表示即時更新 | 4.2 | Feature | ✅ |
| 5.4 | エラー時通知とUI復元 | 4.2 | Feature | ✅ |
| 5.5 | IPC経由でmainプロセスに依頼 | 4.2 | Feature | ✅ |
| 6.1 | scheme: claude-codeでClaude CLI実行 | 3.2 | Feature | ✅ |
| 6.2 | scheme: gemini-cliでGemini CLI実行 | 3.2 | Feature | ✅ |
| 6.3 | Gemini CLI --yoloフラグ付与 | 3.1 | Feature | ✅ |
| 6.4 | Gemini CLI --output-format stream-json | 3.1 | Feature | ✅ |
| 6.5 | Gemini CLI JSONL出力パース | 3.2 | Feature | ⚠️ |
| 6.6 | Gemini CLI未検出時エラー表示 | 3.2 | Feature | ✅ |
| 6.7 | scheme未設定時Claude Codeデフォルト | 3.2 | Feature | ✅ |
| 7.1 | Remote UIでschemeタグ表示 | 6.1 | Feature | ✅ |
| 7.2 | Remote UIでタグクリック切り替え | 6.2 | Feature | ✅ |
| 7.3 | API経由でメインプロセスに送信 | 6.2 | Feature | ✅ |
| 7.4 | 他クライアントへのリアルタイム同期 | 6.2 | Feature | ✅ |
| 8.1 | 自動実行時scheme設定尊重 | 7 | Feature | ✅ |
| 8.2 | 並列実行時各spec個別scheme尊重 | 7 | Feature | ✅ |
| 8.3 | scheme変更は他specに影響しない | 7 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks (user-facing criteria have Feature tasks)

### 1.5 Cross-Document Contradictions

✅ **良好**: 重大な矛盾は検出されませんでした。

**確認済み項目**:
- Gemini CLI フラグ: requirements (6.3, 6.4) と design (buildGeminiArgs) で一致
- scheme デフォルト値: requirements (3.3), design (DEFAULT_REVIEWER_SCHEME), tasks (1.1) で一致
- TOMLパス: requirements (2.1), design (Template Files), tasks (1.2) で一致

## 2. Gap Analysis

### 2.1 Technical Considerations

#### 2.1.1 Gemini CLI JSONL出力パース [WARNING]

**Issue ID**: GAP-001
**Severity**: Warning

**Description**:
Designでは「既存のLogParserServiceを活用し、必要に応じてイベントタイプの正規化層を追加する」（DD-005）と記載されていますが、Task 3.2では具体的な実装ステップが明示されていません。

**Research.mdの知見**:
> Gemini CLI のイベントタイプ: `init`, `message`, `tool_use`, `tool_result`, `error`, `result`

Claude CLIとのイベントタイプの差異への具体的な対処方法が不明確です。

**Recommendation**:
Task 3.2に「Gemini CLI出力形式の差異調査」または「イベントタイプ正規化アダプタ実装」を明示的なサブタスクとして追加することを検討してください。

#### 2.1.2 Rate Limit対応 [INFO]

**Issue ID**: GAP-002
**Severity**: Info

**Description**:
Open Questionsに「Gemini CLI の rate limit（60 req/min, 1000 req/day）が自動実行ワークフローに与える制約の検討」と記載されていますが、具体的な対策（リトライ、バックオフ、ユーザー警告等）がDesignに明示されていません。

**Recommendation**:
Rate Limitエラー発生時の振る舞い（UIへの警告表示、自動実行の一時停止等）を実装時に具体化することを推奨します。Design のError Handling セクションに簡易的な記載はありますが、詳細は実装フェーズで判断可能です。

### 2.2 Operational Considerations

✅ **良好**: デプロイ・ロールバック等の考慮は不要（デスクトップアプリのため）

## 3. Ambiguities and Unknowns

### 3.1 Task 5 の粒度 [WARNING]

**Issue ID**: AMB-001
**Severity**: Warning

**Description**:
Task 5は単一タスクとして「SpecsWatcherServiceでscheme変更を検出しUIに反映する」と定義されていますが、以下の複数のサブタスクを含む可能性があります:
- spec.json監視ロジックでdocumentReview.scheme変更を検出
- workflowStoreまたはspecStore経由でUIにscheme値を通知
- 複数クライアント間でのリアルタイム同期を維持

**Recommendation**:
実装時に必要に応じてサブタスク分割を検討してください。現状のタスク粒度でも実装可能ですが、進捗追跡の観点から分割が有効な場合があります。

### 3.2 document-review-reply.toml のワイルドカード構文 [INFO]

**Issue ID**: AMB-002
**Severity**: Info

**Description**:
Design記載のテンプレート内容では `@{.kiro/specs/{{args}}/document-review-*.md}` でワイルドカード展開が示唆されていますが、Gemini CLI がこの構文をサポートするかの確認が必要です。

**Research.mdの知見**:
> `@{path}`: ファイル内容を埋め込み

ワイルドカードサポートについては明示的な記載がありません。

**Recommendation**:
テンプレート実装時（Task 1.3）にGemini CLI のワイルドカードサポートを確認し、サポートされない場合は最新のレビューファイルのみを指定する形式に修正してください。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **良好**: 既存アーキテクチャに準拠しています。

| Steering Document | Alignment | Notes |
|-------------------|-----------|-------|
| product.md | ✅ | 「AIエージェント連携」のコア機能に合致 |
| tech.md | ✅ | Remote UIアーキテクチャ（WebSocketApiClient）に準拠 |
| structure.md | ✅ | 既存ディレクトリパターン（services/, ipc/, shared/）に従う |

### 4.2 Integration Concerns

✅ **良好**: 既存機能への影響は限定的です。

- **ExperimentalToolsInstallerService**: 既存メソッド（installDebugAgent等）に影響なし、新規メソッド追加のみ
- **SpecManagerService**: executeDocumentReviewの拡張、既存フローへの影響は分岐追加のみ
- **DocumentReviewPanel**: UIへの機能追加、既存レイアウトへの影響は軽微

### 4.3 Migration Requirements

✅ **良好**: 後方互換性が考慮されています。

- scheme未指定時は `'claude-code'` がデフォルト（Design Data Models セクション）
- 既存spec.jsonは変更なしで動作継続

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Impact | Recommendation |
|----|-------|--------|----------------|
| GAP-001 | Gemini CLI JSONL出力パース詳細不明 | 実装時の手戻りリスク | Task 3.2にサブタスク追加を検討 |
| AMB-001 | Task 5の粒度が大きい | 進捗追跡の困難 | 実装時にサブタスク分割を検討 |

### Suggestions (Nice to Have)

| ID | Issue | Impact | Recommendation |
|----|-------|--------|----------------|
| GAP-002 | Rate Limit対応詳細不明 | 自動実行時のUX | 実装時に詳細化 |
| AMB-002 | ワイルドカード構文のサポート確認 | テンプレート動作 | Task 1.3実装時に確認 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Medium | GAP-001 | Task 3.2に「Gemini CLIイベント形式への対応」をサブタスクとして明示 | tasks.md |
| Low | AMB-001 | Task 5のサブタスク分割を検討（任意） | tasks.md |
| Low | AMB-002 | Task 1.3実装時にワイルドカードサポートを確認 | (実装時) |
| Low | GAP-002 | Rate Limit対応の詳細を実装時に具体化 | (実装時) |

---

_This review was generated by the document-review command._
