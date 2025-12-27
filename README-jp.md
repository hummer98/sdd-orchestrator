# SDD Orchestrator

日本語 | [English](README.md)

Spec-Driven Development (SDD) ワークフローを管理・実行するためのデスクトップアプリケーション。

AIエージェント（Claude Code等）と協調して、仕様駆動開発のライフサイクルを自動化・可視化します。

## 概要

SDD Orchestratorは、**Claude Code**と連携してSpec-Driven Development（SDD）を実践するためのデスクトップアプリケーションです。

### Spec-Driven Development（SDD）とは

SDDは、AIエージェントと人間が協調してソフトウェアを開発する手法です。実装前に仕様（Spec）を明確に定義し、段階的にレビューを行うことで、AI生成コードの品質と一貫性を確保します。

```
要件定義 → 設計 → タスク分解 → 実装（TDD）
    ↑         ↑        ↑          ↑
  人間レビュー（各フェーズで承認）
```

### SDDの4つのフェーズ

| フェーズ | 内容 | 成果物 |
|---------|------|--------|
| **Requirements** | 機能要件をEARS形式で定義 | `requirements.md` |
| **Design** | 技術設計・アーキテクチャ決定 | `design.md` |
| **Tasks** | 実装タスクへの分解 | `tasks.md` |
| **Implementation** | TDD手法による実装 | ソースコード |

### ドキュメントレビュー

各フェーズの成果物は、AIによる自動レビュー（`document-review`）と人間によるレビューを経て承認されます。課題が発見された場合は、`document-review-reply`で対応を生成し、課題解決までのワークフローをGUIで管理できます。

## 主な機能

- **Claude Code連携**: スラッシュコマンドでSDDワークフローを実行
- **Specライフサイクル管理**: 各フェーズの進捗を可視化
- **ドキュメントレビュー**: 整合性・完全性の自動チェックと課題追跡
- **人間-AI協調ワークフロー**: 各フェーズで人間の承認を挟む品質管理
- **Kiro形式（`.kiro/specs/`）準拠**
- **リモートアクセス**: Cloudflare Tunnel対応でLAN外からもセキュアに操作可能

## クイックスタート

### 必要環境

- macOS（Apple Silicon）
- Claude Code（AIエージェント）

### 1. SDD Orchestratorのインストール

[Releases](https://github.com/hummer98/sdd-orchestrator/releases)から最新版の `.zip` または `.dmg` をダウンロードし、アプリケーションを起動します。

### 2. プロジェクトを開く

SDD Orchestratorを起動し、開発対象のプロジェクトディレクトリを選択します。

### 3. コマンドセットのインストール

GUIの「Install Commands」ボタンをクリックして、プロジェクトに `/kiro:*` スラッシュコマンドをインストールします。

インストールされるもの：
- **スラッシュコマンド**: `.claude/commands/kiro/` 配下に配置
- **エージェント**: `.claude/agents/` 配下に配置
- **設定ファイル**: `.claude/settings.json` にマージ

### 4. 最初のSpecを作成

Claude Codeで以下を実行：

```
/kiro:spec-init "機能の説明"
```

## ワークフロー

### 新規プロジェクトのセットアップ

1. **SDD Orchestratorを起動**してプロジェクトディレクトリを選択
2. **コマンドをインストール**: GUIの「Install Commands」ボタンをクリック
3. **最初のSpecを作成**: Claude Codeで `/kiro:spec-init "機能の説明"` を実行
4. **開発開始**: 以下のSDDフェーズに従って進める

### SDDフェーズ

1. **spec-init**: 新規仕様の初期化
2. **spec-requirements**: 要件定義の生成
3. **spec-design**: 技術設計の作成
4. **spec-tasks**: 実装タスクの生成
5. **spec-impl**: TDDによる実装

### バリデーション

- **validate-gap**: 既存コードベースとのギャップ分析
- **validate-design**: 設計レビュー
- **validate-impl**: 実装検証

### ドキュメントレビュー

- **document-review**: Specドキュメントの整合性・完全性をレビュー
- **document-review-reply**: レビュー課題への対応を生成
- GUIに統合された課題追跡・解決ワークフロー

### バグ修正（軽量ワークフロー）

フルSDDプロセスを必要としない小規模なバグ修正向け：

1. **bug-create**: バグレポート作成
2. **bug-analyze**: 根本原因の調査
3. **bug-fix**: 修正の実装
4. **bug-verify**: 修正の検証
5. **bug-status**: 進捗確認

**使い分け：**
- **小規模バグ**: Bug Fixワークフロー（軽量・高速）
- **設計変更を伴う複雑なバグ**: フルSDDワークフロー

## Cloudflare Tunnelによるリモートアクセス

SDD OrchestratorはCloudflare Tunnelを使用して、LAN外からもセキュアにリモートアクセス機能を利用できます。

### 機能概要

- **Named Tunnel接続**: Cloudflare Named Tunnelを使用したセキュアな接続
- **デュアルアクセス**: LAN内アクセスとTunnel経由アクセスの両方に対応
- **アクセストークン認証**: アプリ生成のトークンによる認証でセキュリティを確保
- **QRコード対応**: URL+トークン埋め込みQRコードでスマートフォンから簡単接続

### 前提条件

Cloudflare Tunnel機能を使用するには、`cloudflared`バイナリのインストールが必要です。

#### macOS

```bash
# Homebrew
brew install cloudflared

# MacPorts
sudo port install cloudflared
```

#### その他のプラットフォーム

[Cloudflare公式ダウンロードページ](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)からダウンロードしてください。

### 基本的な使用方法

1. **Tunnel Tokenの設定**
   - アプリの設定画面でCloudflare Tunnel Tokenを入力
   - または環境変数`CLOUDFLARE_TUNNEL_TOKEN`を設定

2. **リモートサーバーの起動**
   - Remote Access Panelで「Cloudflareに公開」にチェック
   - サーバー開始ボタンをクリック

3. **接続**
   - 表示されたTunnel URLまたはQRコードを使用して接続
   - アクセストークンは自動的に認証されます

詳細な設定手順は[Cloudflare Tunnel設定ガイド](docs/guides/cloudflare-tunnel-setup.md)を参照してください。

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│         SDD Orchestrator GUI            │
├─────────────────────────────────────────┤
│  Spec List │ Editor │ Workflow Status   │
├─────────────────────────────────────────┤
│         Agent Orchestration             │
├─────────────────────────────────────────┤
│  Claude Code / AI Agent Integration     │
└─────────────────────────────────────────┘
```

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS 4
- **デスクトップ**: Electron 35
- **状態管理**: Zustand
- **テスト**: Vitest + WebdriverIO

## 開発者向け

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/hummer98/sdd-orchestrator.git
cd sdd-orchestrator

# Electron版のセットアップ
cd electron-sdd-manager
npm install
```

### 開発

```bash
# 開発サーバー起動
npm run dev

# Electronアプリ起動（別ターミナル）
npm run dev:electron
```

### テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

### ビルド

```bash
npm run build:electron
```

### プロジェクト構造

```
sdd-orchestrator/
├── .kiro/
│   ├── steering/     # プロジェクト設定（product.md, tech.md）
│   └── specs/        # 仕様ドキュメント
├── electron-sdd-manager/  # Electronアプリ
│   ├── src/
│   │   ├── renderer/     # Reactフロントエンド
│   │   └── main/         # Electronメインプロセス
│   └── test/
├── docs/             # ドキュメント
└── scripts/          # ユーティリティスクリプト
```

## ToDo

- **エスカレーション機能**: エージェントが処理できない問題を人間にエスカレーションする仕組みの実装

## ライセンス

[MIT License](LICENSE.md)

## 作者

Yuji Yamamoto (rr.yamamoto@gmail.com)

GitHub: [@hummer98](https://github.com/hummer98)
