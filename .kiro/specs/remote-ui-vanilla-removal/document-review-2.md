# Specification Review Report #2

**Feature**: remote-ui-vanilla-removal
**Review Date**: 2026-01-17
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- document-review-1.md
- document-review-1-reply.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/steering/logging.md

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 1 |
| Warning | 1 |
| Info | 2 |

**総合評価**: 前回レビュー（#1）で指摘されたW-001, W-002, S-001は対応済み。しかし、E2Eテストと現在のReact版コンポーネントの詳細な照合により、**data-testidの大幅な不足**が判明。実装前に対応方針の確認が必要。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果**: ✅ 整合（前回レビューから変更なし）

### 1.2 Design ↔ Tasks Alignment

**結果**: ✅ 整合（前回レビューで修正適用済み）

### 1.3 Design ↔ Tasks Completeness

**結果**: ✅ 整合

### 1.4 Acceptance Criteria → Tasks Coverage

**結果**: ✅ 整合（前回レビューで確認済み）

### 1.5 Cross-Document Contradictions

検出された矛盾はありません。

## 2. E2Eテスト実態調査結果（Critical）

### 2.1 E2Eテストで期待されるdata-testid

`e2e-wdio/remote-webserver.e2e.spec.ts`の実際のコードを調査した結果:

| E2E testid | 使用箇所 | 用途 |
|------------|----------|------|
| `remote-status-dot` | line 266 | 接続状態ドット |
| `remote-status-text` | line 161, 272, 518 | 接続状態テキスト |
| `remote-project-path` | line 277 | プロジェクトパス表示 |
| `remote-spec-list` | line 284, 427 | Spec一覧コンテナ |
| `remote-spec-item-*` | line 289, 433, 441, 543 | 各Specアイテム |
| `remote-spec-detail` | line 445, 545 | Spec詳細ビュー |
| `remote-spec-phase-tag` | line 453 | Specフェーズタグ |
| `remote-spec-next-action` | line 459 | Specアクションボタン |
| `remote-tab-specs` | line 418, 542 | Specsタブ |
| `remote-tab-bugs` | line 322 | Bugsタブ |
| `remote-bug-list` | line 337 | Bug一覧コンテナ |
| `remote-bug-item-*` | line 347, 358 (skip) | 各Bugアイテム |
| `remote-bug-detail` | line 361 (skip) | Bug詳細ビュー |
| `remote-bug-phase-tag` | line 369 (skip) | Bugフェーズタグ |
| `remote-bug-action` | line 379 (skip) | Bugアクションボタン |
| `remote-log-viewer` | line 553 | ログビューア |
| `remote-reconnect-overlay` | line 497, 505 | 再接続オーバーレイ |

### 2.2 現在のReact版コンポーネントのdata-testid

`src/remote-ui/`配下を調査した結果:

| 現在のtestid | コンポーネント | E2E互換 |
|--------------|----------------|---------|
| `specs-list` | SpecsView.tsx:248 | ❌ `remote-spec-list`必要 |
| `spec-detail-view` | SpecDetailView.tsx:311 | ❌ `remote-spec-detail`必要 |
| `bugs-list` | BugsView.tsx:182 | ❌ `remote-bug-list`必要 |
| `bug-detail-view` | BugDetailView.tsx:176 | ❌ `remote-bug-detail`必要 |
| `bug-phase-{action}` | BugDetailView.tsx:228 | ❌ `remote-bug-phase-tag`必要 |
| `bug-phase-{action}-button` | BugDetailView.tsx:259 | ❌ `remote-bug-action`必要 |
| `agent-log-panel` | AgentView.tsx:265 | ❌ `remote-log-viewer`必要 |
| `reconnect-overlay` | ReconnectOverlay.tsx:65 | ❌ `remote-reconnect-overlay`必要 |

### 2.3 完全に欠落しているdata-testid

以下のdata-testidは**React版に全く存在しない**:

| 欠落testid | 対応コンポーネント | 優先度 |
|------------|-------------------|--------|
| `remote-status-dot` | App.tsx/Header | 必須 |
| `remote-status-text` | App.tsx/Header | 必須 |
| `remote-project-path` | App.tsx/Header | 必須 |
| `remote-app-version` | App.tsx/Header | Design記載（E2E未使用） |
| `remote-spec-item-{name}` | SpecsView.tsx | 必須 |
| `remote-spec-phase-tag` | SpecDetailView.tsx | 必須 |
| `remote-spec-next-action` | SpecDetailView.tsx | 必須 |
| `remote-tab-specs` | MobileLayout.tsx | 必須 |
| `remote-tab-bugs` | MobileLayout.tsx | 必須 |
| `remote-bug-item-{name}` | BugsView.tsx | 必須 |

**発見**: Design文書のdata-testid一覧表（14項目）は正確だが、**すべてが新規追加または併存が必要**。既存の「リネーム」対象は実質的にない。

## 3. Gap Analysis

### 3.1 Technical Considerations

| 観点 | 状態 | 詳細 |
|------|------|------|
| data-testid不足 | ❌ | E2Eテストに必要な17種のdata-testidのうち、14種が欠落または命名不一致 |
| エラーハンドリング | ✅ | 既存StaticFileServerのエラーハンドリング活用 |
| セキュリティ | ✅ | 変更なし |
| ロギング | ✅ | logger.debug出力明記 |

### 3.2 Operational Considerations

| 観点 | 状態 | 詳細 |
|------|------|------|
| デプロイメント | ✅ | buildスクリプト統合済み |
| ロールバック | ✅ | Gitヒストリーで復元可能 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果**: ✅ 整合

### 4.2 Integration Concerns

tech.mdで定義されているRemote UIアーキテクチャとの整合性:
- ApiClient抽象化層: 影響なし
- 共有コンポーネント: `src/shared/`との関係確認要
- WebSocket通信: 変更なし

### 4.3 Migration Requirements

なし（データ移行不要）

## 5. Recommendations

### Critical Issues (Must Fix)

#### C-001: E2Eテスト用data-testidの大幅不足

**詳細**: E2Eテスト（`remote-webserver.e2e.spec.ts`）で使用される17種のdata-testidのうち、14種が現在のReact版コンポーネントに存在しないか命名が異なる。

**影響**:
- Task 5.1「E2Eテストを実行し、全テストがPASSすることを確認」が失敗する可能性が高い
- 実装工数が想定以上になる可能性

**現状整理**:
| 種別 | 件数 | 例 |
|------|------|-----|
| 完全欠落 | 10 | `remote-status-dot`, `remote-spec-item-*`, `remote-tab-specs` |
| 命名不一致（併存必要） | 8 | `specs-list` → `remote-spec-list`併存 |
| そのまま使用可能 | 0 | - |

**推奨対応**:
1. Task 3.1-3.5の作業量が想定より大きいことを認識
2. 実装順序を「data-testid追加 → E2Eテスト実行 → 追加修正」のイテレーションに変更することを検討
3. Design文書のdata-testid一覧表は正確なため、そのまま実装ガイドとして使用可能

**影響ドキュメント**: tasks.md（作業量の再見積もり検討）

### Warnings (Should Address)

#### W-001: MobileLayout.tsxのタブdata-testid

**詳細**: E2Eテストは`remote-tab-specs`と`remote-tab-bugs`を使用してタブ切り替えを行っているが、現在のMobileLayout.tsxにはdata-testidが設定されていない可能性がある。

**推奨対応**: MobileLayout.tsxのタブ要素にdata-testidを追加するタスクを明確化。

### Suggestions (Nice to Have)

#### S-001: Specアイテムの動的data-testid

**詳細**: `remote-spec-item-{name}`の`{name}`部分の生成ルールをDesign文書に明記することを推奨。

**推奨対応**: spec.feature_nameをそのまま使用するか、slugify処理をするか明確化。

#### S-002: Skip済みBugsテストの扱い

**詳細**: E2Eテストの一部（Bugs一覧表示等）は`it.skip`でスキップされている。これらのテストが将来有効化された際に備え、対応するdata-testidは追加しておくべき。

**推奨対応**: 現在のTask 3.4はskipテストも想定した設計になっており、そのまま実装して問題なし。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-001 | data-testid追加作業の工数認識、Design文書を実装ガイドとして活用 | tasks.md（認識のみ、変更不要） |
| Warning | W-001 | MobileLayout.tsxへのdata-testid追加確認 | - |
| Suggestion | S-001 | spec-item命名ルールの確認 | design.md（任意） |
| Suggestion | S-002 | skip済みテスト用data-testidも実装 | - |

## 7. 前回レビュー（#1）対応状況

| Issue | Status | Details |
|-------|--------|---------|
| W-001: 開発時のbuild:remote周知 | ✅ 対応済み | Task 2.1にREADME追記を追加 |
| W-002: data-testid併存戦略統一 | ✅ 対応済み | tasks.mdで「併存」に統一 |
| S-001: Unit Test更新明示 | ✅ 対応済み | Task 2.1に追加 |
| S-002: electron-builder検証 | ✅ 対応不要 | Task 6.1でカバー |
| S-003: CI/CD確認 | ✅ 対応不要 | 運用確認 |

## Conclusion

前回レビューの指摘事項は全て対応済み。今回のレビューで判明した**Critical Issue C-001（data-testidの大幅不足）**は、Design文書が正確な実装ガイドを提供しているため、仕様変更ではなく**実装時の認識事項**として扱う。

**実装開始可能**: はい（Critical Issueは認識事項であり、仕様修正不要）

**次のステップ**:
1. `/kiro:spec-impl remote-ui-vanilla-removal` で実装開始
2. Task 3.1-3.5でDesign文書のdata-testid一覧表に従って実装
3. Task 5.1でE2Eテスト実行・検証

---

_This review was generated by the document-review command._
