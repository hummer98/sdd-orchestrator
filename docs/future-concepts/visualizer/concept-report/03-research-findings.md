# 3. 調査結果

## 3.1 SDDにおけるSteeringファイルの調査

### 3.1.1 Steeringの定義と目的

**定義**: Steering（ステアリング）は、プロジェクト全体に適用されるAIエージェントへのガイダンス・プロジェクトメモリ。

**保存場所**: `.kiro/steering/`

**基本コンセプト**:
- プロジェクト知識の単一情報源（SSOT）
- AIエージェント用メモリ（各エージェント実行時に読み込み）
- 人間とAIの共有言語

### 3.1.2 Steeringファイルの3層構造

```
Layer 0: CLAUDE.md (Pointer Only)
    │
    ├── Layer 1: Core Steering (4 files, 23KB)
    │   ├── product.md      - プロダクト概要
    │   ├── tech.md         - 技術スタック
    │   ├── design-principles.md - 設計原則
    │   └── structure.md    - ディレクトリ構造
    │
    └── Layer 2: Extended Steering (9 files, 91KB)
        ├── operations.md   - MCP操作マニュアル
        ├── debugging.md    - デバッグガイド
        ├── e2e-testing.md  - E2Eテスト
        └── ... (その他)
```

### 3.1.3 各ファイルの詳細

| ファイル | サイズ | 目的 | 更新頻度 |
|---------|--------|------|----------|
| product.md | 2KB | プロダクト概要、コア機能 | 低（半年ごと） |
| tech.md | 7KB | 技術スタック、検証コマンド | 中（機能追加時） |
| design-principles.md | 3KB | AI設計判断の原則 | 低（年ごと） |
| structure.md | 11KB | ディレクトリ構造、State管理 | 中（新パターン時） |
| operations.md | 10KB | MCP操作マニュアル | 中 |
| debugging.md | 12KB | トラブルシューティング | 中 |
| e2e-testing.md | 30KB | WebdriverIO設定 | 中 |

### 3.1.4 読み込みパターン

**常時読み込み（Core）**:
- すべてのエージェント実行時に必ず読み込み

**動的読み込み（Extended）**:
- タスク説明のキーワードに基づいて選択的に読み込み

| キーワード | 読み込まれるファイル |
|-----------|---------------------|
| 動作確認, UI確認, MCP | operations.md, debugging.md |
| デバッグ, ログ, エラー | debugging.md |
| E2Eテスト, wdio | e2e-testing.md |
| 用語, シンボル | symbol-semantic-map.md |

### 3.1.5 人間が把握すべき重要構造

1. **Steeringのライフサイクル**
   ```
   Bootstrap → Customization → Extended → Maintenance (Sync)
   ```

2. **CLAUDE.md と steering の役割分担**
   - CLAUDE.md: ポインタ（何を読むべきか）
   - steering: 詳細コンテンツ

3. **コンテキスト最適化の方向性**
   - 合計114KB ≈ 30,000トークン
   - ポインタ参照 + サブエージェント委譲で80%削減可能

---

## 3.2 認知科学・UXのビジュアライゼーション調査

### 3.2.1 認知負荷（Cognitive Load）の基本

**参照**: [NN/g - Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)

**原則**:
- 人間のワーキングメモリは限定的（4±1項目）
- 視覚的階層で注意を誘導
- 認識記憶（Recognition）は想起記憶（Recall）より容易

### 3.2.2 情報可視化のベストプラクティス

**参照**: [Data Visualization for Human Perception](https://www.interaction-design.org/literature/book/the-encyclopedia-of-human-computer-interaction-2nd-ed/data-visualization-for-human-perception)

| 手法 | 効果 | 適用場面 |
|------|------|----------|
| Progressive Disclosure | 情報過多を防止 | 初期表示 |
| Neighborhood Highlight | 関連要素の理解促進 | グラフ操作 |
| Animation | 時系列・因果関係の理解 | フロー図 |
| Color Coding | グループ識別の高速化 | カテゴリ分類 |
| Search/Filter | 目的の要素への到達 | 大規模データ |

### 3.2.3 色彩理論

**参照**: [Visual Perception and Colour](https://data-visualisation.stem.melbourne/visual-perception-and-colour)

**カラースキーム設計原則**:
- 意味的一貫性（同じ概念に同じ色）
- コントラスト確保（背景との区別）
- 色覚多様性対応（赤緑以外も使用）
- ダークモード対応

**採用したカラースキーム**:

| グループ | Light Mode | Dark Mode | 用途 |
|---------|------------|-----------|------|
| Entry | #9B59B6 (紫) | #BB8FCE | CLAUDE.md |
| Core | #2980B9 (青) | #5DADE2 | コアSteering |
| Extended | #27AE60 (緑) | #58D68D | 拡張Steering |
| Keyword | #F39C12 (橙) | #F5B041 | トリガー |
| Main Process | #E74C3C (赤) | #E74C3C | Electronメイン |
| Renderer | #3498DB (青) | #5DADE2 | Renderer |
| Remote UI | #1ABC9C (緑) | #58D68D | Remote UI |

### 3.2.4 インタラクティブ要素

**参照**: [Cytoscape.js Tutorials](https://blog.js.cytoscape.org/tutorials/)

**必須インタラクション**:

| 機能 | 認知効果 | 実装方法 |
|------|----------|----------|
| Drag & Pan | 空間的探索 | Cytoscape.js標準 |
| Zoom | 詳細度調整 | マウスホイール |
| Click to Highlight | 関連要素の分離 | closedNeighborhood() |
| Search | 目的指向のナビゲーション | フィルタ + focus() |
| Animation | 時間的プロセスの理解 | ステップ実行 |

### 3.2.5 アニメーションの設計原則

**参照**: [UX Visualization Techniques](https://www.nngroup.com/videos/ux-visualization-techniques/)

**効果的なアニメーション**:
- 1ステップ1.5秒（デフォルト）
- Play/Pause/Step の3操作
- 進行状況インジケータ
- 現在ステップのハイライト
- 速度調整可能

---

## 3.3 技術調査: グラフ可視化ライブラリ

### 3.3.1 比較検討

| ライブラリ | 物理演算 | アニメーション | 複合ノード | 学習コスト |
|-----------|---------|---------------|-----------|-----------|
| Vis.js | ✅ | △ | ✅ | 低 |
| Cytoscape.js | ✅ | ✅ | ✅ | 中 |
| D3.js | 手動実装 | ✅ | 手動実装 | 高 |
| Mermaid.js | ✅ | ❌ | ❌ | 最低 |

### 3.3.2 Cytoscape.js選定理由

1. **物理演算レイアウト**: `cose`レイアウトで自動配置
2. **アニメーションAPI**: `cy.animate()`, `addClass()`のトランジション
3. **複合ノード**: `parent`属性でプロセス境界を表現可能
4. **スタイル分離**: CSSライクな宣言的スタイル定義
5. **CDN利用可能**: Single File HTMLと相性良好

### 3.3.3 既存実装との整合性

`docs/future-concepts/visualization.md` との関係:

| 項目 | 既存（design.md用） | 新規（steering用） |
|------|-------------------|------------------|
| ライブラリ | Vis.js推奨 | Cytoscape.js採用 |
| 出力形式 | Single File HTML | 同じ |
| 配置場所 | specs/{feature}/artifacts/ | steering/artifacts/ |
| 必須機能 | Physics, Highlight, Search | 同じ + Animation |

**理由**: Cytoscape.jsはアニメーションと複合ノードで優位。Vis.jsも引き続きdesign.md用として有効。

---
_created_at: 2026-02-05_
