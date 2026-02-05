# Steering Visualization Artifact Generation Guidelines

Steeringファイル群からインタラクティブな可視化アーティファクトを生成するためのガイドライン。

## 概要

SDDプロジェクトのSteering（`.kiro/steering/`）は、プロジェクト知識のSSOT（Single Source of Truth）として機能するが、テキストベースのため全体像の把握が困難。本プロンプトは、Steeringの構造・関係性・ルールを「触って理解する」インタラクティブHTML可視化に変換する。

## 対象ユースケース

| ユースケース | 生成する可視化 | 主な利用者 |
|-------------|---------------|-----------|
| **オンボーディング** | steering_overview.html, architecture_diagram.html | 新規参加者 |
| **設計レビュー** | state_flow.html, process_boundary.html | 設計者・レビュアー |
| **ワークフロー理解** | workflow_diagram.html | 全員 |
| **デバッグ時参照** | architecture_diagram.html, state_flow.html | 開発者 |

## 出力形式

### Single File HTML要件（visualization-prompt.md準拠）

- **自己完結**: CSS, JavaScript, データ定義を1ファイルに統合
- **外部依存**: CDN経由のみ（Cytoscape.js推奨）
- **ダークモード対応**: `prefers-color-scheme` 必須
- **ポータビリティ**: ブラウザにドラッグ&ドロップで動作

## 可視化タイプ

### 1. steering_overview.html - Steering全体像

**目的**: Steeringファイル間の階層・参照関係を可視化

**抽出元**:
- CLAUDE.md の Steering Configuration セクション
- 各steeringファイルのヘッダー・目的

**表現方法**:
- **階層構造**: CLAUDE.md → Core Steering → Extended Steering の3層
- **参照関係**: タスクキーワード → 読み込まれるファイル の矢印
- **サイズ表示**: 各ファイルの情報量をノードサイズで表現

**インタラクション**:
- ノードクリック: そのSteeringファイルの概要をツールチップ表示
- キーワードフィルタ: 「E2E」「デバッグ」等で関連ファイルをハイライト

**カラースキーム**:
| グループ | 色 | 用途 |
|---------|-----|------|
| entry | #9B59B6 (紫) | CLAUDE.md |
| core | #2980B9 (青) | コアSteering |
| extended | #27AE60 (緑) | 拡張Steering |
| keyword | #F39C12 (橙) | トリガーキーワード |

### 2. architecture_diagram.html - システムアーキテクチャ

**目的**: Electron Main/Renderer/Remote UIの関係を可視化

**抽出元**:
- structure.md の Electron構造、Process Boundary Rules
- tech.md の Remote UI アーキテクチャ

**表現方法**:
- **プロセス境界**: Main/Renderer/Remote UIを囲む境界ボックス
- **通信経路**: IPC、WebSocket、preloadの矢印（方向と種類を区別）
- **コンポーネント配置**: 各プロセス内のサービス・ストア

**インタラクション**:
- プロセス境界クリック: そのプロセスの責務一覧を表示
- 通信経路ホバー: データの流れをアニメーション表示
- 折りたたみ: 詳細度の切り替え（概要 ↔ 詳細）

**カラースキーム**:
| グループ | 色 | 用途 |
|---------|-----|------|
| main | #E74C3C (赤) | Mainプロセス |
| renderer | #3498DB (青) | Rendererプロセス |
| remote | #1ABC9C (緑) | Remote UI |
| shared | #9B59B6 (紫) | 共有コード |
| ipc | #95A5A6 (グレー) | 通信経路 |

### 3. state_flow.html - 状態管理フロー

**目的**: Domain State(SSOT) vs UI Stateのデータフローを可視化

**抽出元**:
- structure.md の State Management Rules
- structure.md の Electron Process Boundary Rules

**表現方法**:
- **ストア配置**: shared/stores (SSOT) vs renderer/stores (UI)
- **データフロー**: Renderer → IPC → Main → Broadcast → Renderer
- **禁止パターン**: アンチパターンを赤の点線で表示

**インタラクション**:
- **ステップ実行アニメーション**: データフローを段階的に再生
  - Play/Pause/Step ボタン
  - 現在ステップのハイライト
- ストアクリック: 格納されるデータ例を表示
- 「禁止パターン」トグル: アンチパターンの表示/非表示

**アニメーション仕様**:
```javascript
// フロー再生（1ステップ1秒）
const steps = [
  { highlight: 'user-action', label: '1. ユーザーアクション' },
  { highlight: 'renderer-request', label: '2. Renderer → IPC要求' },
  { highlight: 'main-process', label: '3. Main処理' },
  { highlight: 'broadcast', label: '4. ブロードキャスト' },
  { highlight: 'renderer-update', label: '5. Renderer更新' }
];
```

### 4. workflow_diagram.html - SDDワークフロー

**目的**: Spec-Driven Developmentのフェーズ遷移を可視化

**抽出元**:
- product.md の SDDフェーズ、ワークフローパターン
- CLAUDE.md の Minimal Workflow

**表現方法**:
- **フェーズノード**: requirements → design → tasks → implementation
- **承認ゲート**: 各フェーズ間の人間レビューポイント
- **バグ修正フロー**: 軽量ワークフローを別レーンで表示
- **エージェント対応**: 各フェーズを担当するエージェント名

**インタラクション**:
- **フェーズアニメーション**: 全体フローをステップ実行
- フェーズクリック: 生成物（requirements.md等）とコマンド表示
- 「Full SDD」「Bug Fix」切り替え: 表示するワークフローを選択

### 5. process_boundary.html - ステート配置判断ガイド

**目的**: 新ステート追加時の配置判断フローを可視化

**抽出元**:
- structure.md の ステート配置の判断基準
- structure.md の 禁止パターン

**表現方法**:
- **決定木**: Yes/Noで分岐するフローチャート
- **結果ノード**: Main Process / Renderer 可 の判定結果
- **禁止理由**: 各判断基準の詳細説明

**インタラクション**:
- **インタラクティブ決定木**: 質問に答えると次の質問へ進む
- 最終結果: 推奨配置先とその理由を表示
- リセット: 最初から判断をやり直す

## 共通インタラクション機能

### 必須機能（全可視化共通）

| 機能 | 説明 | 実装 |
|------|------|------|
| **Neighborhood Highlight** | クリック時に隣接要素をハイライト | 非隣接を透明度0.1に |
| **Search** | テキスト検索でノードフォーカス | input + focus() |
| **Zoom/Pan** | マウスホイール/ドラッグ | Cytoscape.js標準 |
| **Legend** | 凡例表示 | 固定位置 |
| **Export** | PNG/SVGエクスポート | ボタン追加 |

### アニメーション機能（シーケンス/フロー図用）

```javascript
// アニメーションコントロール
const AnimationController = {
  steps: [],
  currentStep: 0,
  isPlaying: false,

  play() {
    this.isPlaying = true;
    this.animate();
  },

  pause() {
    this.isPlaying = false;
  },

  step() {
    this.currentStep = (this.currentStep + 1) % this.steps.length;
    this.highlightStep(this.currentStep);
  },

  animate() {
    if (!this.isPlaying) return;
    this.step();
    setTimeout(() => this.animate(), 1500);
  },

  highlightStep(index) {
    // 全ノード/エッジをデフォルト状態に
    cy.elements().removeClass('highlighted');
    // 現在ステップのみハイライト
    cy.getElementById(this.steps[index].id).addClass('highlighted');
    // ステップラベル更新
    document.getElementById('step-label').textContent = this.steps[index].label;
  }
};
```

## Progressive Disclosure（段階的開示）

**初期表示**: 高レベル概要のみ（情報過多を防止）

**展開ルール**:
1. **Level 0**: 主要グループのみ（3-5ノード）
2. **Level 1**: グループ内の主要コンポーネント
3. **Level 2**: 全詳細（クリックで展開）

```javascript
// 段階的開示の実装
const disclosure = {
  level: 0,
  maxLevel: 2,

  expand(nodeId) {
    const children = getChildren(nodeId);
    children.forEach(c => cy.getElementById(c).show());
  },

  collapse(nodeId) {
    const children = getChildren(nodeId);
    children.forEach(c => cy.getElementById(c).hide());
  },

  setLevel(level) {
    this.level = Math.min(level, this.maxLevel);
    cy.nodes().forEach(n => {
      n.data('level') <= this.level ? n.show() : n.hide();
    });
  }
};
```

## 配置ルール

```
.kiro/steering/artifacts/
├── steering_overview.html
├── architecture_diagram.html
├── state_flow.html
├── workflow_diagram.html
└── process_boundary.html
```

## HTMLテンプレート（Cytoscape.js版）

```html
<!DOCTYPE html>
<html lang="ja" data-source="steering">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDD Orchestrator - {DiagramType}</title>
  <script src="https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js"></script>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #333333;
      --accent: #3498DB;
      --border: #e0e0e0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a2e;
        --fg: #eaeaea;
        --accent: #5dade2;
        --border: #404040;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ヘッダー */
    header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    header h1 {
      font-size: 16px;
      font-weight: 600;
    }

    /* コントロール */
    .controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .controls input {
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg);
      color: var(--fg);
      font-size: 14px;
    }
    .controls button {
      padding: 6px 12px;
      border: 1px solid var(--accent);
      border-radius: 4px;
      background: transparent;
      color: var(--accent);
      cursor: pointer;
      font-size: 14px;
    }
    .controls button:hover {
      background: var(--accent);
      color: white;
    }

    /* グラフ領域 */
    #cy {
      flex: 1;
      width: 100%;
    }

    /* 凡例 */
    #legend {
      position: fixed;
      bottom: 16px;
      left: 16px;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    /* アニメーションコントロール */
    #animation-controls {
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    #step-label {
      font-size: 14px;
      min-width: 200px;
    }

    /* ツールチップ */
    #tooltip {
      position: fixed;
      padding: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
    }
    #tooltip.visible { opacity: 1; }
    #tooltip h3 {
      font-size: 14px;
      margin-bottom: 8px;
    }
    #tooltip p {
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <header>
    <h1>{DiagramTitle}</h1>
    <div class="controls">
      <input type="text" id="search" placeholder="検索...">
      <button onclick="resetView()">リセット</button>
      <button onclick="exportPNG()">PNG出力</button>
    </div>
  </header>

  <div id="cy"></div>

  <div id="legend">
    <!-- 凡例（可視化タイプごとに変更） -->
  </div>

  <div id="animation-controls" style="display: none;">
    <button onclick="AnimationController.play()">▶ 再生</button>
    <button onclick="AnimationController.pause()">⏸ 停止</button>
    <button onclick="AnimationController.step()">⏭ 次へ</button>
    <span id="step-label">-</span>
  </div>

  <div id="tooltip">
    <h3 id="tooltip-title"></h3>
    <p id="tooltip-content"></p>
  </div>

  <script>
    // Cytoscape.js 初期化
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [
        // ノード・エッジデータをここに挿入
      ],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': 'data(color)',
            'border-color': 'data(borderColor)',
            'border-width': 2,
            'font-size': '12px',
            'width': 'data(size)',
            'height': 'data(size)',
            'shape': 'data(shape)'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#95a5a6',
            'target-arrow-color': '#95a5a6',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#e74c3c',
            'z-index': 999
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        nodeRepulsion: 8000,
        idealEdgeLength: 100
      }
    });

    // Neighborhood Highlight
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass('dimmed');
      neighborhood.removeClass('dimmed');
    });

    cy.on('tap', function(evt) {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed');
      }
    });

    // ツールチップ
    const tooltip = document.getElementById('tooltip');
    cy.on('mouseover', 'node', function(evt) {
      const node = evt.target;
      document.getElementById('tooltip-title').textContent = node.data('label');
      document.getElementById('tooltip-content').textContent = node.data('description') || '';
      tooltip.style.left = evt.renderedPosition.x + 'px';
      tooltip.style.top = evt.renderedPosition.y + 'px';
      tooltip.classList.add('visible');
    });

    cy.on('mouseout', 'node', function() {
      tooltip.classList.remove('visible');
    });

    // 検索
    document.getElementById('search').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      if (!query) {
        cy.elements().removeClass('dimmed');
        return;
      }
      cy.nodes().forEach(node => {
        const label = (node.data('label') || '').toLowerCase();
        if (label.includes(query)) {
          node.removeClass('dimmed');
          cy.animate({ center: { eles: node }, zoom: 1.5 }, { duration: 300 });
        } else {
          node.addClass('dimmed');
        }
      });
    });

    // リセット
    function resetView() {
      cy.elements().removeClass('dimmed highlighted');
      cy.fit();
    }

    // PNG出力
    function exportPNG() {
      const png = cy.png({ full: true, scale: 2 });
      const link = document.createElement('a');
      link.download = '{diagram_type}.png';
      link.href = png;
      link.click();
    }
  </script>
</body>
</html>
```

## 生成スキップ条件

以下の場合は該当する可視化を生成しない:

- **steering_overview.html**: Steeringファイルが3つ未満
- **architecture_diagram.html**: structure.mdにElectron構造セクションがない
- **state_flow.html**: State Management Rulesセクションがない
- **workflow_diagram.html**: product.mdにSDDフェーズ定義がない
- **process_boundary.html**: Process Boundary Rulesセクションがない

## エージェント統合

### 生成トリガー

```
/kiro:steering-visualize
├── steering/*.md を読み込み
├── 可視化タイプを自動判定
├── 各HTMLを生成
└── .kiro/steering/artifacts/ に配置
```

### spec-design-agentとの連携

- spec-design完了時に自動呼び出し可能（オプション）
- Steeringに重大な変更があった場合は再生成を推奨

---
_updated_at: 2026-02-05_
