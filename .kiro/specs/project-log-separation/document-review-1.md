# Specification Review Report #1

**Feature**: project-log-separation
**Review Date**: 2025-12-22
**Documents Reviewed**:
- `.kiro/specs/project-log-separation/spec.json`
- `.kiro/specs/project-log-separation/requirements.md`
- `.kiro/specs/project-log-separation/design.md`
- `.kiro/specs/project-log-separation/tasks.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/symbol-semantic-map.md`

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| **Critical** | 1 |
| **Warning** | 3 |
| **Info** | 2 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**適合している項目:**

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| 1.1-1.4 (プロジェクト別ログファイル) | ProjectLogger, ProjectLogStream | ✅ |
| 2.1-2.3 (格納場所) | ProjectLogStream | ✅ |
| 3.1-3.4 (グローバルログ維持) | GlobalLogStream, ProjectLogger | ✅ |
| 4.1-4.3 (プロジェクトコンテキスト付与) | LogEntry, formatMessage | ✅ |
| 5.1-5.4 (ライフサイクル管理) | LogRotationManager | ✅ |
| 6.1-6.3 (UIからのログアクセス) | IPC Handlers | ✅ |

**問題なし**: 全要件がDesignでカバーされている。

### 1.2 Design ↔ Tasks Alignment

**適合している項目:**

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| ProjectLogger | Task 1.1-1.4, 4.1-4.2 | ✅ |
| LogRotationManager | Task 2.1-2.3 | ✅ |
| IPC Log Handlers | Task 3.1-3.2 | ✅ |
| Unit/Integration Tests | Task 5.1-5.4 | ✅ |

**問題なし**: 全Design ComponentがTasksでカバーされている。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| **Core Services** | ProjectLogger, LogRotationManager | Tasks 1.x, 2.x | ✅ |
| **IPC Handlers** | GET_PROJECT_LOG_PATH, OPEN_LOG_IN_BROWSER | Tasks 3.1, 3.2 | ✅ |
| **Tests** | Unit, Integration, E2E | Tasks 5.1-5.4 | ✅ |
| **UI Components** | なし（IPCのみ） | N/A | ✅ |
| **Preload Script拡張** | 暗黙的（IPC経由） | **未明記** | ⚠️ |

**Warning**: Preload scriptへの追加（`getProjectLogPath`, `openLogInBrowser` のRenderer公開）がTasksに明示されていない。

### 1.4 Cross-Document Contradictions

1. **用語の不一致**:
   - Requirements: `[projectId]`フィールド
   - Design: `projectId: string`（LogEntry型）
   - → 一貫性あり。問題なし。

2. **ログ書き込み方式の曖昧さ**:
   - Design Sequence Diagram: プロジェクトログ書き込み後、グローバルログにも書き込み（二重書き込み）
   - Tasks 1.3: 「プロジェクト関連ログはプロジェクトログとグローバルログの両方に記録する」
   - → 意図通り。問題なし。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | 詳細 | 重要度 |
|-----|------|--------|
| **並行書き込み安全性** | 複数ウィンドウから同一プロジェクトへの書き込みが発生する場合の排他制御が未定義 | ⚠️ Warning |
| **ファイルロック** | ログローテーション中の書き込みブロックに関する記述がない | ℹ️ Info |
| **非同期ストリームエラー** | WriteStreamのエラーイベント処理の詳細が不足 | ℹ️ Info |

### 2.2 Operational Considerations

| Gap | 詳細 | 重要度 |
|-----|------|--------|
| **ディスク容量監視** | ディスク容量不足時の挙動が未定義（ローテーションで緩和されるが、明示がない） | ℹ️ Info |
| **ログレベル設定** | 環境変数やConfigによるログレベル変更の仕組みがない（既存logger.tsの仕様を継承） | ℹ️ Info |

## 3. Ambiguities and Unknowns

| 項目 | 詳細 | 影響 |
|------|------|------|
| **プロジェクト識別子の形式** | Requirements 4.1「プロジェクトパスまたは識別子」、Design「プロジェクトパス」→ どちらを採用するか | 低 |
| **グローバルログへの二重書き込み** | プロジェクトログに書いた内容を全てグローバルログにも書くのか、それとも特定イベントのみか | 中 |
| **ログファイル名のタイムゾーン** | ローテーション時のファイル名 `main.YYYY-MM-DD.N.log` のタイムゾーン（UTC or ローカル）が未定義 | 低 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**適合状況:**

| 項目 | Steering定義 | 本仕様 | 状態 |
|------|-------------|--------|------|
| Electronメインプロセス | `main/services/` | ProjectLogger, LogRotationManager | ✅ |
| IPCパターン | `channels.ts`, `handlers.ts` | 新チャンネル追加 | ✅ |
| TypeScript strict | 必須 | 型定義あり | ✅ |

**問題なし**: 既存アーキテクチャに準拠。

### 4.2 Integration Concerns

| 懸念 | 詳細 | 重要度 |
|------|------|--------|
| **既存logger.tsの互換性** | `logger` シングルトンのAPIは維持されるが、内部実装が大幅に変わる。既存呼び出し箇所への影響確認が必要 | ⚠️ Warning |
| **handlers.tsのcurrentProjectPath** | 既にプロジェクトパス追跡が存在。二重管理を避けるべき | 🔴 Critical |

**Critical Issue**:
- `handlers.ts` に既存の `currentProjectPath` 変数がある（Steering参照）
- 本仕様の `ProjectLogger` も `currentProjectPath` を内部状態として持つ
- **SSOT原則違反**: 同じ情報を2箇所で管理することになり、同期ずれのリスクがある

### 4.3 Migration Requirements

| 要件 | 詳細 |
|------|------|
| **既存logger.ts置換** | Tasks 4.1で対応予定 |
| **下位互換性** | 既存のlogger.info/debug/warn/error APIを維持 |
| **データ移行** | 不要（新規ログファイル生成） |

## 5. Recommendations

### Critical Issues (Must Fix)

| # | Issue | 推奨対応 |
|---|-------|----------|
| C1 | **currentProjectPathの二重管理** | `handlers.ts` の `currentProjectPath` を `ProjectLogger` から参照するか、`ProjectLogger.setCurrentProject` を唯一の更新元とし、handlers.ts側はProjectLoggerから取得するように設計変更する |

### Warnings (Should Address)

| # | Issue | 推奨対応 |
|---|-------|----------|
| W1 | Preload script拡張がTasksに未記載 | Task 3.1または3.2に「preload/index.tsにAPI追加」を明記する |
| W2 | 並行書き込み安全性 | Design「Risks」セクションに並行書き込みシナリオを追記、または「マルチウィンドウは非対応」と明記する |
| W3 | 既存logger.ts呼び出し箇所の確認 | 実装前に既存のlogger呼び出し箇所を洗い出し、互換性を確認するタスクを追加する |

### Suggestions (Nice to Have)

| # | Issue | 推奨対応 |
|---|-------|----------|
| S1 | ファイルロックとローテーション競合 | 将来的にはログ書き込みをキューイングする仕組みを検討 |
| S2 | ログレベル設定 | 環境変数 `LOG_LEVEL` による制御を将来バージョンで検討 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| 🔴 Critical | C1: currentProjectPath二重管理 | Designで状態管理の責務を明確化（handlers.ts vs ProjectLogger） | `design.md` |
| ⚠️ Warning | W1: Preload拡張未記載 | Task 3.1に「preload/index.tsへのAPI追加」を追記 | `tasks.md` |
| ⚠️ Warning | W2: 並行書き込み | Designに並行書き込みの考慮を追記 | `design.md` |
| ⚠️ Warning | W3: 既存呼び出し確認 | 実装前確認タスクを追加 | `tasks.md` |
| ℹ️ Info | S1: ファイルロック | Non-Goalsに明記するか、将来課題として記録 | `design.md` |

---

_This review was generated by the document-review command._
