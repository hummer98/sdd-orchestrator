# Specification Review Report #1

**Feature**: unified-tool-path-resolver
**Review Date**: 2026-02-04
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md
- steering/product.md
- steering/tech.md
- steering/structure.md

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 0 |
| Warning | 2 |
| Info | 3 |

**総合評価**: 仕様書は高品質で、実装に進んで問題ありません。軽微な警告事項について実装時に考慮してください。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果**: ✅ 良好

全ての要件がDesign文書で適切にカバーされています。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| R1. 統一サービスの提供 | ToolPathResolverServiceコンポーネント定義 | ✅ |
| R2. ログインシェル経由のパス解決 | resolveTool()メソッド仕様 | ✅ |
| R3. セッションキャッシュ | resolvedCache状態管理仕様 | ✅ |
| R4. 起動時一括解決 | resolveAll()メソッドとシーケンス図 | ✅ |
| R5. ツール定義の管理 | TOOL_DEFINITIONS定数定義 | ✅ |
| R6. 解決結果のインターフェース | ToolResolutionResult/ToolStatus型定義 | ✅ |
| R7. 既存コードの削除 | 影響分析コントラクト（DELETE/UPDATE対象） | ✅ |
| R8. E2Eテストサポート | E2E_MOCK_{TOOL}_COMMAND仕様 | ✅ |

**トレーサビリティ**:
- Design文書に「要件トレーサビリティ」セクションがあり、全基準IDの対応が明確
- カバレッジ検証チェックリストで自己検証済み

### 1.2 Design ↔ Tasks Alignment

**結果**: ✅ 良好

全てのDesignコンポーネントがTasksで実装項目として定義されています。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| ToolDefinition型 | Task 1.1 | ✅ |
| ToolResolutionResult型 | Task 1.2 | ✅ |
| resolveTool()メソッド | Task 1.3 | ✅ |
| セッションキャッシュ | Task 1.4 | ✅ |
| resolveAll()と公開API | Task 1.5 | ✅ |
| ユニットテスト | Task 2.1 | ✅ |
| 呼び出し元更新 | Task 3.1-3.5 | ✅ |
| 既存コード削除 | Task 4.1-4.2 | ✅ |
| 統合テスト | Task 5.1-5.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**結果**: ✅ 良好

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Services | ToolPathResolverService | Task 1.1-1.5 | ✅ |
| Types | ToolDefinition, ToolResolutionResult, ToolStatus | Task 1.1, 1.2 | ✅ |
| Constants | TOOL_DEFINITIONS | Task 1.1 | ✅ |
| API Changes | 削除API・新API | Task 3.1-3.5, 4.1-4.2 | ✅ |
| IPC Changes | CHECK_JJ_AVAILABILITY変換 | Task 3.5 | ✅ |
| Tests | Unit/Integration | Task 2.1, 5.1-5.2 | ✅ |

**UI Components**: 本機能はUIコンポーネント変更を含まない（バックエンドサービス統合）

### 1.4 Acceptance Criteria → Tasks Coverage

**結果**: ✅ 良好

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | ToolPathResolverServiceクラス存在 | 1.5 | Feature | ✅ |
| 1.2 | claude, jj, jqサポート | 1.1 | Feature | ✅ |
| 1.3 | 将来のツール追加容易性 | 1.1 | Feature | ✅ |
| 2.1 | ログインシェル経由解決 | 1.3 | Feature | ✅ |
| 2.2 | .zshrc/.zprofile反映 | 1.3 | Feature | ✅ |
| 2.3 | シェル未設定時フォールバック | 1.3 | Feature | ✅ |
| 2.4 | タイムアウト5秒 | 1.3 | Feature | ✅ |
| 3.1 | セッションキャッシュ | 1.4 | Feature | ✅ |
| 3.2 | getPath即座取得 | 1.4 | Feature | ✅ |
| 3.3 | 解決状態キャッシュ | 1.4 | Feature | ✅ |
| 4.1 | 起動時一括解決 | 1.5, 3.1, 5.1 | Feature | ✅ |
| 4.2 | 並列解決 | 1.5 | Feature | ✅ |
| 4.3 | 完了通知 | 1.5, 5.1 | Feature | ✅ |
| 5.1 | 定数オブジェクト管理 | 1.1 | Feature | ✅ |
| 5.2 | ツール定義情報 | 1.1 | Feature | ✅ |
| 5.3 | エントリ追加のみ対応 | 1.1 | Feature | ✅ |
| 6.1 | 解決結果インターフェース | 1.2 | Feature | ✅ |
| 6.2 | ツール定義情報取得 | 1.2, 1.5 | Feature | ✅ |
| 7.1 | ClaudePathResolverService削除 | 4.1 | Cleanup | ✅ |
| 7.2 | checkJjAvailability削除 | 4.2 | Cleanup | ✅ |
| 7.3 | checkJqAvailability削除 | 4.2 | Cleanup | ✅ |
| 7.4 | 呼び出し元移行 | 3.1-3.5, 5.2 | Integration | ✅ |
| 8.1 | E2Eモック環境変数対応 | 1.3, 2.1 | Feature | ✅ |
| 8.2 | claude用E2Eモック | 1.3 | Feature | ✅ |

**Validation Results**:
- [x] 全criterion IDがrequirements.mdに存在し、tasksにマッピングされている
- [x] ユーザー向け基準にFeature Implementation taskがある
- [x] Infrastructure taskのみに依存している基準はない

### 1.5 Integration Test Coverage

**結果**: ✅ 良好

本機能はMain Process内のサービス統合であり、IPC境界を越えるが、既存E2Eテストでカバーされる領域が大きい。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| 起動時resolveAll() | システムフロー | 5.1 | ✅ |
| IPC: CHECK_JJ_AVAILABILITY | IPC互換性 | 5.2 | ✅ |
| agentProcess → getPath | 呼び出し元 | 既存E2E | ✅ |
| engineCommandResolver → getPath | 呼び出し元 | Unit Test | ✅ |

**Validation Results**:
- [x] IPCチャンネルの動作検証タスクが存在
- [x] 起動フローの検証タスクが存在
- [x] 既存E2Eテストでのカバレッジが明記されている

### 1.6 Cross-Document Contradictions

**結果**: ✅ 矛盾なし

ドキュメント間で用語・仕様の不整合は検出されませんでした。

| 検証項目 | 結果 |
|----------|------|
| ToolPathResolverServiceの命名 | 一貫 |
| E2E環境変数名（E2E_MOCK_{TOOL}_COMMAND） | 一貫 |
| タイムアウト値（5秒） | 一貫 |
| シェルフォールバック（/bin/sh） | 一貫 |

## 2. Gap Analysis

### 2.1 Technical Considerations

| 項目 | 状態 | 詳細 |
|------|------|------|
| エラーハンドリング | ✅ カバー | Design「エラー戦略」セクションで定義 |
| セキュリティ | ✅ 問題なし | シェルコマンドは固定形式（インジェクションリスクなし） |
| パフォーマンス | ✅ 考慮済み | 並列実行、キャッシュ戦略が明記 |
| スケーラビリティ | ✅ 問題なし | ツール追加は定数配列への追加のみ |
| テスト戦略 | ✅ 定義済み | Unit/統合テスト戦略が明記 |
| ロギング | ✅ 定義済み | projectLogger使用、ログフォーマット変更を明記 |

### 2.2 Operational Considerations

| 項目 | 状態 | 詳細 |
|------|------|------|
| デプロイメント | ✅ 問題なし | アプリ内コード変更のみ、外部依存なし |
| ロールバック戦略 | ⚠️ 暗黙的 | git revertで対応可能（明示的記載なし） |
| モニタリング | ✅ 定義済み | projectLoggerによるログ出力 |
| ドキュメント更新 | ℹ️ 推奨 | README等の外部ドキュメント更新が必要になる可能性 |

## 3. Ambiguities and Unknowns

### 3.1 明示的に未定義の事項

| 項目 | 状態 | 影響度 |
|------|------|--------|
| Windows/Linuxサポート | Out of Scope明記 | 低（将来課題） |
| ツール自動インストール | Out of Scope明記 | 低（将来課題） |
| バージョン互換性チェック | Out of Scope明記 | 低（将来課題） |

### 3.2 Open Questions

| 質問 | 状態 | 備考 |
|------|------|------|
| Windows対応時のログインシェル相当 | 未解決 | 設計フェーズで明示的に将来課題として記載済み |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果**: ✅ 完全に適合

| Steering原則 | 本仕様の適合性 |
|--------------|----------------|
| Main Process保持ステート | ✅ ToolPathResolverServiceはMain Processに配置 |
| サービスパターン | ✅ シングルトンサービスとして実装 |
| IPC設計パターン | ✅ 既存パターン（channels.ts + handlers.ts）に準拠 |
| ファイル配置 | ✅ `src/main/services/`に配置 |

### 4.2 Integration Concerns

| 懸念事項 | 評価 | 対策 |
|----------|------|------|
| 既存機能への影響 | ⚠️ 低リスク | IPC互換性維持（ToolStatus→ToolCheck変換） |
| Remote UIへの影響 | ✅ なし | IPC層で吸収、Renderer/Remote UI変更不要 |
| 共有リソース競合 | ✅ なし | 新規サービス作成、既存サービス削除 |

### 4.3 Migration Requirements

| 項目 | 必要性 | 詳細 |
|------|--------|------|
| データ移行 | 不要 | 永続化データなし（セッションキャッシュのみ） |
| 段階的ロールアウト | 不要 | 一括リリース可能 |
| 後方互換性 | ✅ 維持 | IPC層でAPI互換を維持 |

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

#### W-001: バージョン取得の追加シェル実行

**概要**: Design/Research文書でバージョン取得にパス解決と別のシェル実行を行う設計が示されているが、シェル実行が2回になることのオーバーヘッドへの対策が「将来検討」となっている。

**影響**: 起動時に6回のシェル実行（3ツール × 2回）が発生する可能性

**推奨**: 実装時にパフォーマンスを計測し、問題があれば`which {tool} && {tool} --version`の1コマンド化を検討

#### W-002: research.mdの呼び出し元分析の行番号

**概要**: research.mdに記載されている行番号（agentProcess.ts line 21、engineCommandResolverService.ts line 42等）は時点情報であり、既存コード変更により実際の行番号と乖離している可能性がある。

**影響**: 実装時の参照ミスのリスク

**推奨**: 実装時は行番号ではなくGrepで呼び出し元を再確認する

### Suggestions (Nice to Have)

#### S-001: 将来のツール追加ガイドライン

**概要**: 新ツール追加手順のドキュメント化（CONTRIBUTING.md等）を検討

**理由**: 要件5.3「エントリ追加のみで対応」の意図を将来の開発者に伝えるため

#### S-002: ログレベルの明確化

**概要**: パス解決成功/失敗時のログレベル（info/warn/error）の明確化

**理由**: モニタリング時のノイズ低減

#### S-003: キャッシュ無効化API

**概要**: 将来的にツールの再検出が必要になった場合のキャッシュクリアAPI

**理由**: ユーザーがツールをセッション中にインストールした場合の対応

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | W-001 | パフォーマンス計測とワンライナー化の検討 | design.md (実装ノート追記) |
| Warning | W-002 | 実装時にGrep検索で呼び出し元を確認 | research.md (注記追加不要) |
| Info | S-001 | 将来課題として記録 | - |
| Info | S-002 | 実装時にログレベルを設計 | - |
| Info | S-003 | 将来課題として記録 | - |

---

## Conclusion

本仕様は高品質で、以下の点が優れています:

1. **完全な要件トレーサビリティ**: 全基準IDがDesign→Tasksまで追跡可能
2. **明確なDecision Log**: 設計判断の理由が文書化されている
3. **IPC互換性の考慮**: Renderer側への影響を最小化する設計
4. **既存パターンへの準拠**: Steeringドキュメントの原則に沿った設計

**Recommendation**: 実装を進めて問題ありません。Warningの2点は実装時に留意してください。

---

_This review was generated by the document-review command._
