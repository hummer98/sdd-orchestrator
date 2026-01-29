# Visualization Artifact Generation Guidelines

design.mdからインタラクティブな可視化アーティファクトを生成する際のガイドライン。

## 概要

「読む」から「触って理解する」への転換を実現する、使い捨て可視化アーティファクトの生成ルール。

## 出力形式

### Single File HTML要件

- **自己完結**: CSS, JavaScript, データ定義をすべて1つのHTMLファイル内にインライン展開
- **外部依存**: CDN経由のみ許可（Vis.js, Cytoscape.js等）
- **ダークモード対応**: `prefers-color-scheme` media query必須
- **ポータビリティ**: ブラウザにドラッグ&ドロップで動作

### 必須インタラクティブ機能

| 機能 | 説明 | 実装方法 |
|------|------|----------|
| Physics | ドラッグ&ドロップによるノード操作 | barnesHut solver |
| Highlight | クリック時の隣接ノードハイライト | 非隣接ノードを透明度0.1に |
| Search | テキスト検索によるノードフォーカス | input + focus() |
| Zoom/Pan | マウスホイール/ドラッグ | Vis.js標準機能 |
| Color Coding | グループごとの色分け | groups オプション |

## 推奨ライブラリ

```javascript
// Vis.js (グラフ・ネットワーク図)
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>

// Cytoscape.js (複雑なグラフ)
<script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
```

## 可視化タイプと検出パターン

| design.mdパターン | 生成ファイル | 用途 |
|-------------------|--------------|------|
| `## アーキテクチャ` | `architecture_diagram.html` | システム構成図 |
| `## データフロー` | `data_flow.html` | フローチャート |
| `## 状態遷移` | `state_machine.html` | ステートマシン |
| 3+コンポーネント言及 | `dependency_graph.html` | 依存関係グラフ |
| API/Interface定義 | `sequence_diagram.html` | シーケンス図 |
| Mermaidブロック | 変換して対応 | 元図タイプに依存 |

## 配置ルール

```
.kiro/specs/{feature}/artifacts/
├── architecture_diagram.html
├── dependency_graph.html
└── data_flow.html
```

## HTMLテンプレート

```html
<!DOCTYPE html>
<html lang="ja" data-source="design.md">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Feature} - {DiagramType}</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    :root {
      --bg: #ffffff;
      --fg: #333333;
      --accent: #2B7CE9;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1e1e1e;
        --fg: #e0e0e0;
        --accent: #5dade2;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, sans-serif;
    }
    #network { width: 100vw; height: 100vh; }
    #search {
      position: fixed;
      top: 10px;
      left: 10px;
      padding: 8px 12px;
      border: 1px solid var(--accent);
      border-radius: 4px;
      background: var(--bg);
      color: var(--fg);
      z-index: 1000;
    }
    #legend {
      position: fixed;
      bottom: 10px;
      left: 10px;
      padding: 8px;
      background: var(--bg);
      border: 1px solid var(--accent);
      border-radius: 4px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <input type="text" id="search" placeholder="ノードを検索...">
  <div id="network"></div>
  <div id="legend">
    <!-- グループ凡例 -->
  </div>
  <script>
    // design.mdから抽出したデータ
    const nodes = new vis.DataSet([
      // { id: 1, label: 'Component', group: 'service' }
    ]);
    const edges = new vis.DataSet([
      // { from: 1, to: 2, label: 'uses', arrows: 'to' }
    ]);

    const container = document.getElementById('network');
    const options = {
      physics: {
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -2000,
          springLength: 150,
          springConstant: 0.04
        },
        stabilization: { iterations: 100 }
      },
      groups: {
        service: { color: { border: '#2B7CE9', background: '#97C2FC' } },
        store: { color: { border: '#41A906', background: '#7BE141' } },
        ui: { color: { border: '#FA9800', background: '#FFC04C' } },
        external: { color: { border: '#C5000B', background: '#FFA5A5' } }
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragView: true,
        tooltipDelay: 200
      },
      edges: {
        smooth: { type: 'continuous' }
      }
    };

    const network = new vis.Network(container, { nodes, edges }, options);

    // Neighborhood Highlight
    let highlighted = false;
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const selected = params.nodes[0];
        const connected = network.getConnectedNodes(selected);
        nodes.forEach(n => {
          const opacity = (n.id === selected || connected.includes(n.id)) ? 1 : 0.1;
          nodes.update({ id: n.id, opacity });
        });
        highlighted = true;
      } else if (highlighted) {
        nodes.forEach(n => nodes.update({ id: n.id, opacity: 1 }));
        highlighted = false;
      }
    });

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      if (q) {
        const found = nodes.get().find(n => n.label.toLowerCase().includes(q));
        if (found) {
          network.focus(found.id, { scale: 1.5, animation: true });
          network.selectNodes([found.id]);
        }
      }
    });
  </script>
</body>
</html>
```

## グループカラースキーム

| グループ | 用途 | Border | Background |
|----------|------|--------|------------|
| service | バックエンドサービス | #2B7CE9 | #97C2FC |
| store | 状態管理・ストア | #41A906 | #7BE141 |
| ui | UIコンポーネント | #FA9800 | #FFC04C |
| external | 外部サービス・API | #C5000B | #FFA5A5 |
| util | ユーティリティ | #6E6E6E | #C2C2C2 |

## 生成スキップ条件

以下の場合は可視化を生成しない:

- コンポーネント数が3未満
- CRUD/UI-onlyの単純な機能
- 複雑な関係性が存在しない
- design.mdにアーキテクチャセクションがない

---
_updated_at: 2026-01-29_
