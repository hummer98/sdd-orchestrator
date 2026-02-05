# 5. 実装内容

## 5.1 成果物一覧

### 5.1.1 プロンプト/ガイドライン

| ファイル | サイズ | 説明 |
|---------|-------|------|
| `.kiro/steering/steering-visualization-prompt.md` | 8KB | 可視化生成ガイドライン |
| `.claude/agents/kiro/steering-visualization.md` | 6KB | 専用エージェント定義 |

### 5.1.2 サンプル可視化アーティファクト

| ファイル | サイズ | 説明 |
|---------|-------|------|
| `.kiro/steering/artifacts/steering_overview.html` | 23KB | Steering階層構造 |
| `.kiro/steering/artifacts/architecture_diagram.html` | 22KB | システムアーキテクチャ |
| `.kiro/steering/artifacts/state_flow.html` | 20KB | 状態管理フロー（アニメーション付き） |

---

## 5.2 各可視化の詳細

### 5.2.1 steering_overview.html

**目的**: Steeringファイルの階層構造と参照関係を可視化

**データ構造**:
```javascript
// ノード: 17個
- Entry: CLAUDE.md (1)
- Core: product.md, tech.md, design-principles.md, structure.md (4)
- Extended: operations.md, debugging.md, ... (8)
- Keywords: 動作確認, デバッグ, E2E, ... (5)

// エッジ
- 常時参照（実線）: CLAUDE.md → Core files
- 条件付き読み込み（破線）: Keywords → Extended files
```

**実装した機能**:

| 機能 | 実装方法 |
|------|----------|
| Neighborhood Highlight | `closedNeighborhood()` + opacity制御 |
| 検索 | input + label/description フィルタ |
| フィルターチップ | グループ別表示/非表示トグル |
| レイアウト切替 | cose ↔ circle |
| ツールチップ | ホバーで詳細情報表示 |
| PNG出力 | `cy.png()` でエクスポート |

**カラースキーム**:
```css
--entry: #9B59B6 (紫)
--core: #2980B9 (青)
--extended: #27AE60 (緑)
--keyword: #F39C12 (橙)
```

### 5.2.2 architecture_diagram.html

**目的**: Electron Main/Renderer/Remote UIのアーキテクチャを可視化

**データ構造**:
```javascript
// プロセス境界（複合ノード）
- Main Process: Services, IPC Handlers, MCP Server, File Watcher, WS Server
- Renderer Process: React App, Preload Bridge, UI Stores
- Remote UI: React SPA, WebSocket Client
- Shared Code: ApiClient, Domain Stores (SSOT), UI Components

// 通信エッジ
- IPC (Renderer ↔ Main)
- WebSocket (Remote UI ↔ Main)
- Broadcast (Main → Renderer)
- Use (Apps → Shared)
```

**実装した機能**:

| 機能 | 実装方法 |
|------|----------|
| 複合ノード | Cytoscape.js `parent` 属性 |
| Progressive Disclosure | 「概要/詳細」ボタンで切替 |
| プロセス情報パネル | 境界クリックで責務・ステート表示 |
| 通信経路の色分け | IPC(青), WebSocket(緑), Broadcast(赤破線) |

**カラースキーム**:
```css
--main: #E74C3C (赤) - Mainプロセス
--renderer: #3498DB (青) - Renderer
--remote: #1ABC9C (緑) - Remote UI
--shared: #9B59B6 (紫) - 共有コード
```

### 5.2.3 state_flow.html

**目的**: 状態管理のデータフローをアニメーションで可視化

**シナリオ**:

**正しいパターン（7ステップ）**:
```
1. ユーザーアクション (Renderer)
2. IPC経由でMainに依頼
3. Main Handlerで受信
4. Main Stateを更新
5. ブロードキャスト準備
6. 全クライアントに同期
7. Rendererキャッシュ更新
```

**アンチパターン（4ステップ）**:
```
1. ユーザーアクション
2. Renderer内で直接更新 ← 問題
3. 後からIPCを呼ぶ ← 問題
4. Mainが正確な状態を知れない ← 結果
```

**実装した機能**:

| 機能 | 実装方法 |
|------|----------|
| ステップ実行 | AnimationController オブジェクト |
| Play/Pause | `setInterval` / `clearInterval` |
| Step Forward/Backward | currentStep ±1 |
| 速度調整 | range input (0.5s〜3.0s) |
| 進行インジケータ | ドット + ラベル |
| シナリオ切替 | 正しいパターン / アンチパターン |
| アンチパターン説明 | コード例付きパネル |

**アニメーション実装**:
```javascript
const AnimationController = {
  steps: [...],
  currentStep: 0,
  isPlaying: false,
  speed: 1500,

  play() {
    this.isPlaying = true;
    this.animate();
  },

  animate() {
    if (!this.isPlaying) return;
    this.stepForward();
    setTimeout(() => this.animate(), this.speed);
  },

  highlightStep(index) {
    cy.elements().removeClass('highlighted completed');
    // Mark previous steps as completed
    for (let i = 0; i < index; i++) {
      this.steps[i].highlight.forEach(id => {
        cy.getElementById(id).addClass('completed');
      });
    }
    // Highlight current step
    this.steps[index].highlight.forEach(id => {
      cy.getElementById(id).addClass('highlighted');
    });
  }
};
```

---

## 5.3 共通実装パターン

### 5.3.1 ダークモード対応

```css
:root {
  --bg: #ffffff;
  --fg: #333333;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --fg: #eaeaea;
  }
}
```

### 5.3.2 Neighborhood Highlight

```javascript
cy.on('tap', 'node', function(evt) {
  const node = evt.target;
  const neighborhood = node.closedNeighborhood();
  cy.elements().addClass('dimmed');
  neighborhood.removeClass('dimmed');
  node.addClass('highlighted');
});

cy.on('tap', function(evt) {
  if (evt.target === cy) {
    cy.elements().removeClass('dimmed highlighted');
  }
});
```

### 5.3.3 検索機能

```javascript
document.getElementById('search').addEventListener('input', function(e) {
  const query = e.target.value.toLowerCase();
  cy.nodes().forEach(node => {
    const label = (node.data('label') || '').toLowerCase();
    if (label.includes(query)) {
      node.removeClass('dimmed').addClass('highlighted');
    } else {
      node.addClass('dimmed').removeClass('highlighted');
    }
  });
});
```

### 5.3.4 PNG出力

```javascript
function exportPNG() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const png = cy.png({
    full: true,
    scale: 2,
    bg: isDark ? '#1a1a2e' : '#ffffff'
  });
  const link = document.createElement('a');
  link.download = 'diagram.png';
  link.href = png;
  link.click();
}
```

---

## 5.4 エージェント定義

### 5.4.1 steering-visualization-agent

**ファイル**: `.claude/agents/kiro/steering-visualization.md`

**メタデータ**:
```yaml
name: steering-visualization-agent
description: Generate interactive HTML visualizations from steering files
tools: Read, Write, Glob, Grep
model: inherit
color: magenta
permissionMode: bypassPermissions
```

**実行プロトコル**:
1. Load Steering Context（全steeringファイル読み込み）
2. Determine Visualization Targets（自動判定）
3. Generate HTML Artifacts（テンプレートベース）
4. Report Results（生成ファイル一覧）

---

## 5.5 ファイルサイズ分析

| ファイル | HTML | CSS | JS | データ |
|---------|------|-----|-----|--------|
| steering_overview.html | 2KB | 4KB | 8KB | 9KB |
| architecture_diagram.html | 2KB | 4KB | 7KB | 9KB |
| state_flow.html | 2KB | 4KB | 10KB | 4KB |

**合計**: 65KB（3ファイル）

**CDN依存**:
- Cytoscape.js: 310KB (minified, gzipped: 90KB)

---

## 5.6 テスト確認項目

### 5.6.1 機能テスト

| 項目 | steering_overview | architecture | state_flow |
|------|-------------------|--------------|------------|
| ページ読み込み | ✅ | ✅ | ✅ |
| ノード表示 | ✅ | ✅ | ✅ |
| エッジ表示 | ✅ | ✅ | ✅ |
| クリックハイライト | ✅ | ✅ | ✅ |
| 検索 | ✅ | ✅ | - |
| フィルター | ✅ | - | ✅ |
| ツールチップ | ✅ | ✅ | - |
| PNG出力 | ✅ | ✅ | - |
| アニメーション | - | - | ✅ |
| シナリオ切替 | - | - | ✅ |

### 5.6.2 ダークモード確認

- ✅ Light mode: 背景白、テキスト黒
- ✅ Dark mode: 背景濃紺、テキスト白
- ✅ 自動切替: `prefers-color-scheme` に追従

### 5.6.3 ブラウザ互換性

- ✅ Chrome (Chromium)
- ✅ Safari
- ✅ Firefox
- ✅ Edge

---

## 5.7 使用方法

```bash
# Steering階層構造を確認
open .kiro/steering/artifacts/steering_overview.html

# アーキテクチャ図を確認
open .kiro/steering/artifacts/architecture_diagram.html

# 状態管理フローをアニメーションで確認
open .kiro/steering/artifacts/state_flow.html
```

**操作方法**:
- **クリック**: 関連要素をハイライト
- **ホイール**: ズーム
- **ドラッグ**: パン
- **検索**: ノード名でフィルタ
- **再生ボタン** (state_flow): アニメーション開始

---
_created_at: 2026-02-05_
