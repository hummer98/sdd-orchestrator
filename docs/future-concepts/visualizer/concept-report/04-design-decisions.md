# 4. 設計決断

## 4.1 調査結果に基づく設計方針

### 4.1.1 可視化タイプの選定

調査結果から、Steeringの理解に最も重要な5つの視点を特定:

| 優先度 | 可視化タイプ | 根拠 |
|--------|-------------|------|
| 1 | Steering Overview | 3層構造の理解がすべての前提 |
| 2 | Architecture Diagram | Electron構造は技術的意思決定の基盤 |
| 3 | State Flow | 最頻出の設計ルール、アニメーションが効果的 |
| 4 | Workflow Diagram | SDDプロセス理解に必須 |
| 5 | Process Boundary | 新機能設計時の判断ガイド |

### 4.1.2 認知科学に基づくUI設計

**Progressive Disclosure の適用**:

```
Level 0: 主要グループのみ（3-5ノード）
    ↓ クリックで展開
Level 1: グループ内の主要コンポーネント
    ↓ クリックで展開
Level 2: 全詳細
```

**実装**: `architecture_diagram.html` の「概要/詳細」切り替えボタン

**Neighborhood Highlight の適用**:

```javascript
cy.on('tap', 'node', function(evt) {
  const neighborhood = evt.target.closedNeighborhood();
  cy.elements().addClass('dimmed');
  neighborhood.removeClass('dimmed');
});
```

**実装**: 全可視化で共通採用

### 4.1.3 アニメーション設計

**対象**: `state_flow.html`（正しいパターン vs アンチパターン）

**設計原則**:
- デフォルト速度: 1.5秒/ステップ
- 速度調整: 0.5秒〜3.0秒
- コントロール: Play/Pause/Step Forward/Step Backward/Reset
- 進行表示: ドットインジケータ + ステップラベル

**シナリオ切り替え**:
- 「正しいパターン」: Renderer → IPC → Main → Broadcast → Sync
- 「アンチパターン」: Renderer内直接更新の問題を可視化

---

## 4.2 アーキテクチャ決定記録（ADR）

### ADR-01: Cytoscape.js の採用

**状況**: グラフ可視化ライブラリの選定が必要

**決定**: Cytoscape.js を採用

**理由**:
- アニメーションAPIが充実（`state_flow.html`に必須）
- 複合ノード（compound nodes）でプロセス境界を表現可能
- CDN経由で単一ファイルHTMLと相性良好
- 既存のVis.js（design.md用）と併用可能

**影響**:
- steering用とdesign用でライブラリが異なる（許容範囲）
- 学習コストは中程度だが、テンプレートで吸収

### ADR-02: Single File HTML の維持

**状況**: 出力形式の選定

**決定**: 既存の`visualization.md`に準拠し、Single File HTMLを維持

**理由**:
- ポータビリティ（ブラウザにD&Dで動作）
- ビルドプロセス不要
- SDDアーティファクトとしての独立性

**影響**:
- ファイルサイズが大きくなる（20-25KB/ファイル）
- 複雑なインタラクションは1ファイルに収める必要

### ADR-03: 5種類の可視化タイプ

**状況**: 何をどの粒度で可視化するか

**決定**: 以下の5種類を定義

| ファイル | 入力 | 目的 |
|---------|------|------|
| steering_overview.html | CLAUDE.md, 全steering | 全体構造 |
| architecture_diagram.html | structure.md, tech.md | システム構成 |
| state_flow.html | structure.md | データフロー |
| workflow_diagram.html | product.md | SDDプロセス |
| process_boundary.html | structure.md | 設計判断ガイド |

**理由**:
- ユースケース（オンボーディング、レビュー、参照）を網羅
- 各可視化は独立して意味を持つ
- 調査で特定した重要構造をカバー

**影響**:
- 初期実装コストは高いが、テンプレート化で軽減
- 今回は3種類（overview, architecture, state_flow）を先行実装

### ADR-04: アニメーション機能の限定適用

**状況**: どの可視化にアニメーションを実装するか

**決定**: `state_flow.html` のみに実装

**理由**:
- 状態管理フローは時系列の理解が重要
- 「正しいパターン」と「アンチパターン」の対比に効果的
- 他の可視化は静的グラフで十分

**影響**:
- `workflow_diagram.html` にも将来的に追加可能
- アニメーションコントローラーは再利用可能な設計

### ADR-05: カラースキームの標準化

**状況**: 複数の可視化で一貫した色使いが必要

**決定**: 以下の標準カラースキームを定義

```javascript
// Steering階層用
entry: '#9B59B6'     // 紫 - エントリーポイント
core: '#2980B9'      // 青 - コアSteering
extended: '#27AE60'  // 緑 - 拡張Steering
keyword: '#F39C12'   // 橙 - トリガーキーワード

// アーキテクチャ用
main: '#E74C3C'      // 赤 - Mainプロセス
renderer: '#3498DB'  // 青 - Renderer
remote: '#1ABC9C'    // 緑 - Remote UI
shared: '#9B59B6'    // 紫 - 共有コード
```

**理由**:
- 色の意味的一貫性（同じ概念に同じ色）
- コントラスト確保
- ダークモード対応

**影響**:
- 全可視化で統一感
- 新しい可視化を追加する際のガイドライン

---

## 4.3 プロンプト設計

### 4.3.1 プロンプト構造

`.kiro/steering/steering-visualization-prompt.md`:

```
1. 概要
2. 対象ユースケース
3. 出力形式（Single File HTML要件）
4. 可視化タイプ（5種類の詳細仕様）
5. 共通インタラクション機能
6. アニメーション機能
7. Progressive Disclosure
8. 配置ルール
9. HTMLテンプレート
10. 生成スキップ条件
11. エージェント統合
```

### 4.3.2 エージェント設計

`.claude/agents/kiro/steering-visualization.md`:

**責務**:
- steeringファイルの読み込み
- 可視化タイプの自動判定
- HTML生成と配置
- 結果レポート

**ツール**:
- Read: steeringファイル読み込み
- Glob: ファイル探索
- Grep: パターン検索
- Write: HTML出力

---

## 4.4 未実装・将来検討事項

### 4.4.1 今回実装しなかったもの

| 項目 | 理由 | 将来計画 |
|------|------|----------|
| workflow_diagram.html | 時間制約 | Phase 2で実装 |
| process_boundary.html | 時間制約 | Phase 2で実装 |
| design.mdへのリンク自動挿入 | 優先度低 | Phase 3 |
| /kiro:steering-visualize コマンド | エージェント統合は後回し | Phase 2 |

### 4.4.2 将来の拡張可能性

1. **Electron統合**: ArtifactViewでの表示
2. **リアルタイム更新**: steeringファイル変更時の自動再生成
3. **カスタム可視化**: ユーザー定義の可視化タイプ追加
4. **Mermaid変換**: 既存のMermaid図を自動変換

---
_created_at: 2026-02-05_
