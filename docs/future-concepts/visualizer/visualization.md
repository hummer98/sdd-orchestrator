# 要件定義書: AI駆動型「使い捨て可視化アーティファクト」生成機能

**Project:** sdd-orchestrator Extension
**Date:** 2026-01-29
**Status:** Draft (Updated)

## 1. エグゼクティブサマリ

本機能は、AIによるコーディングプロセスにおいて、人間の認知負荷（Cognitive Load）を最小化するための新たな可視化手法を提供するものである。
従来の静的な図（Mermaid等）によるドキュメンテーションから脱却し、**「理解のためにその場限りで生成される、インタラクティブなHTMLアプリケーション（Disposable Software）」** を成果物として出力する。これにより、開発者は複雑な構造やロジックを「読む」のではなく「触って理解する」ことが可能となる。

---

## 2. Decision Log (意思決定の記録)

本要件に至るまでの検討経緯と決定事項を以下に示す。

| ID | 検討事項 | 決定内容 | 理由 (Rationale) |
| --- | --- | --- | --- |
| **D-01** | 可視化フォーマットの選定 | **Single File HTML** | MermaidなどのDSLは表現力とインタラクティブ性に限界がある。汎用的なHTML/JSであれば、物理演算、フィルタリング、アニメーションなど、AIの表現力を無制限に活用できるため。また、ブラウザさえあれば動作するポータビリティを重視した。 |
| **D-02** | 生成のアプローチ | **使い捨て (Disposable)** | 汎用的なビューワーを開発するのではなく、AIに対象コード専用の「ミニ観測アプリ」を都度生成させる。これにより、ツール開発コストを削減しつつ、その時の関心事（Concern）に最適化されたUIを提供できる。 |
| **D-03** | 統合方式 | **Artifact Link + ArtifactView表示** | Markdown内にHTMLソースを含めるのではなく、artifacts/に出力しリンクで参照。ArtifactViewで表示する。 |
| **D-04** | 推奨ライブラリ | **Vis.js / Cytoscape.js** | 物理演算（Physics）による自動レイアウトが強力であり、複雑な依存関係を人間が手で解きほぐす体験（Enactive Cognition）を提供できるため。 |
| **D-05** | 配置場所 | **Spec単位 (`.kiro/specs/{feature}/artifacts/`)** | グローバルartifactsではなく、Specに紐づくartifactsとして管理。 |
| **D-06** | 生成トリガー | **`/kiro:spec-design` 完了時に自動** | spec-design-agentからvisualization-agentをサブタスクとして呼び出すハイブリッド方式。 |
| **D-07** | 管理方式 | **Spec Artifactと同等** | 特別なライフサイクル管理は不要。ArtifactViewで表示可能。 |
| **D-08** | Remote UI考慮 | **スマートフォン版は対象外** | Desktop版Remote UIでのみ対応。 |
| **D-09** | Markdown埋め込み | **Phase 2以降** | 初期リリースではリンクからArtifactViewで表示。iframe埋め込みは後回し。 |

---

## 3. コンセプトモデル: "Visualization as a Query Result"

* **従来のパラダイム:**
  * ソースコード → 静的な図（クラス図、シーケンス図） → 人間が目で追う

* **本機能のパラダイム:**
  * 関心事（Query） → **動的な観測アプリ（Micro-App）** → 人間が操作・探索する

---

## 4. 機能要件 (Functional Requirements)

### 4.1. アーティファクト生成プロンプト (Prompt Engineering)

システムは、設計・実装フェーズにおいて、LLMに対して以下の制約を持ったHTML生成を指示できなければならない。

* **FR-01: 単一ファイル完結性**
  * CSS, JavaScript, データ定義をすべて1つのHTMLファイル内にインライン展開すること。
  * 外部ライブラリはCDN経由、または軽量なものはインラインで含めること。

* **FR-02: インタラクティブ要件の注入**
  * 単なる描画ではなく、以下の「認知支援機能」の実装を必須とする指示を含めること。
  * **Physics:** ドラッグ＆ドロップによるノード操作。
  * **Filtering:** クリック時のハイライト、および無関係な要素のグレーアウト。
  * **Search/Zoom:** テキスト検索による特定ノードへのフォーカス。

* **FR-03: 関心軸による切り出し**
  * 「全体図」だけでなく、「認証フロー」「特定データのライフサイクル」など、ユーザーの指定したコンテキストに絞ったアプリ生成が可能であること。

### 4.2. ビューワー統合 (sdd-orchestrator / Markdown Viewer)

Electronアプリ（Reactベース）としての統合要件。

* **FR-04: アーティファクトの保存とリンク**
  * 生成されたHTMLコードを `.kiro/specs/{feature}/artifacts/` ディレクトリに自動保存する。
  * メインのMarkdownドキュメント（design.md等）には、そのHTMLへの相対リンクを自動挿入する。

* **FR-05: ArtifactView表示**
  * Markdownプレビュー内のリンクをクリックすると、ArtifactViewでHTMLを表示する。
  * iframe sandboxで両環境（Electron/Remote UI）対応可能。

* **FR-06: ネイティブレンダリング (Phase 3 - Optional/Advanced)**
  * セキュリティまたはUX向上のため、Markdown内の特定のコードブロック（例: ````json-vis ````）を検知し、Reactコンポーネント（`react-force-graph` 等）としてインライン描画する機能を備えることが望ましい。

---

## 5. 非機能要件 (Non-Functional Requirements)

* **NFR-01: ポータビリティ (Portability)**
  * 生成されたHTMLファイルは、`sdd-orchestrator` がない環境でも、一般的なWebブラウザ（Chrome, Edge, Safari）へドラッグ＆ドロップするだけで動作しなければならない。

* **NFR-02: 低認知負荷 (Low Cognitive Load)**
  * 生成される可視化は、初期表示で情報過多にならないよう、適切なズームレベルまたは折りたたみ（Collapse）状態で開始されること。

* **NFR-03: セキュリティ (Security)**
  * 生成されたHTMLを実行する際、ローカルファイルへのアクセス権限などのサンドボックス制約を遵守すること（Electronの `webview` タグや `iframe` のサンドボックス属性の活用）。

---

## 6. 生成トリガー・統合方式

### 6.1. ハイブリッド方式（採用）

```
spec-design-agent
├── design.md生成
└── visualization-agentをサブタスクとして呼び出し
    └── artifacts/*.html生成
```

| 評価軸 | 評価 |
|--------|------|
| 責務の分離 | ✅ 各エージェントは単一責務 |
| ワークフロー統合 | ✅ `/kiro:spec-design`で完結 |
| 柔軟性 | ✅ 単独実行も可能（`/kiro:visualize`） |
| 実装コスト | ○ 既存パターン（Task tool）で実現可能 |

### 6.2. 生成対象の自動検出

design.mdの内容から可視化対象を自動検出:

| 検出パターン | 生成する可視化 |
|--------------|----------------|
| `## アーキテクチャ`セクション存在 | システム構成図 (`architecture_diagram.html`) |
| `## データフロー`セクション存在 | フローチャート (`data_flow.html`) |
| `## 状態遷移`セクション存在 | ステートマシン図 (`state_machine.html`) |
| 3つ以上のコンポーネント言及 | 依存関係グラフ (`dependency_graph.html`) |
| API設計セクション | シーケンス図 (`sequence_diagram.html`) |

---

## 7. ユースケースシナリオ

### シナリオ: 複雑なマイクロサービス設計のレビュー

1. **Generate:**
   ユーザーは `/kiro:spec-design {feature}` を実行する。
2. **Output:**
   AIは `design.md` と共に、`artifacts/dependency_graph.html` を生成する。
3. **Review:**
   ユーザーはMarkdown内のリンクをクリック（またはArtifactViewで表示）する。
4. **Explore:**
   画面いっぱいに物理演算で漂うノード群が表示される。
   「OrderService」を検索してズームインし、そこから伸びる線をドラッグして、「PaymentGateway」との接続を確認する。
   クリックしてハイライトし、不要なノードが薄くなった状態でスクリーンショットを撮り、共有する。
5. **Discard/Iterate:**
   理解が完了したら、そのファイルは閉じられる。設計変更があった場合、再度新しいHTMLが生成される。

---

## 8. 実装フェーズ

### Phase 1 (MVP)

- [ ] `visualization-agent` の定義を追加（`.claude/agents/kiro/visualization.md`）
- [ ] `spec-design-agent` にvisualization-agent呼び出しを追加
- [ ] Prompt Templateを`.kiro/steering/visualization-prompt.md`として作成
- [ ] ArtifactViewでHTMLレンダリング対応を確認

### Phase 2

- [ ] `/kiro:visualize {feature}` スタンドアロンコマンドの実装
- [ ] design.mdへのリンク自動挿入

### Phase 3

- [ ] FR-06のネイティブレンダリング（`react-force-graph`統合）
- [ ] Markdown内iframe埋め込み

---

## 9. エージェント定義

### visualization-agent

```yaml
name: visualization-agent
description: Generate interactive HTML visualization artifacts from design documents
tools: Read, Write, Glob
model: inherit
```

**責務:**
- design.mdを解析し、可視化に適した要素を抽出
- Single File HTMLを生成し、artifacts/に配置
- design.mdにリンクを挿入（オプション）

---

## 10. Prompt Template案（Vis.js用）

```markdown
# Visualization Artifact Instruction

あなたはdesign.mdの内容を可視化するHTMLアーティファクトを生成します。

## 入力
- design.mdの全文

## 出力形式
- Single File HTML（外部依存なし、CDN参照可）
- Vis.js (https://unpkg.com/vis-network/standalone/umd/vis-network.min.js) を使用
- ダークモード対応（prefers-color-scheme）
- viewport meta設定済み

## 生成ルール
1. design.mdの構造を解析し、可視化に適した要素を抽出
2. 複数の図が必要な場合は複数HTMLを生成
3. ファイル名: `{diagram_type}.html`
4. 各HTMLにdata-source="design.md"属性を付与

## 必須機能
- 物理演算レイアウト (barnesHut solver推奨)
- ノードクリック時の "Neighborhood Highlight" (隣接ノード以外を透明度0.1にする)
- マウスホイールによるズーム、ドラッグによるパン
- ノードの色分け (Groupごとに色を変える)
- テキスト検索によるノードフォーカス

## 可視化タイプ
- architecture_diagram.html: システム構成
- data_flow.html: データフロー
- state_machine.html: 状態遷移
- dependency_graph.html: 依存関係
- sequence_diagram.html: APIシーケンス

このHTMLは、ドキュメントを読む人間が「構造を触って理解する」ために使われます。
静的な図ではなく、動的な探索ツールとして実装してください。
```

---

## 11. ディレクトリ構造

```
.kiro/specs/{feature}/
├── requirements.md
├── design.md          # artifacts/へのリンクを含む
├── tasks.md
├── research.md
├── spec.json
└── artifacts/         # 新規追加
    ├── architecture_diagram.html
    ├── dependency_graph.html
    └── data_flow.html
```

---

_updated_at: 2026-01-29_
