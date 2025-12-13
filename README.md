# SDD Manager

Spec-Driven Development (SDD) ワークフローを管理・実行するためのデスクトップアプリケーション。

AIエージェント（Claude Code等）と協調して、仕様駆動開発のライフサイクルを自動化・可視化します。

## 概要

SDD Managerは、ソフトウェア開発における仕様（Spec）のライフサイクルを管理するツールです。

- **Requirements（要件定義）**: 機能要件をEARS形式で定義
- **Design（設計）**: 技術設計ドキュメントの作成
- **Tasks（タスク）**: 実装タスクの生成と管理
- **Implementation（実装）**: TDD手法による実装実行

## 主な機能

- Specライフサイクルの可視化と管理
- AIエージェントによる自動実行
- 複数Spec間の依存関係管理
- 人間-AI協調ワークフロー
- Kiro形式（`.kiro/specs/`）準拠

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│           SDD Manager GUI               │
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

## セットアップ

### 必要環境

- Node.js 20+
- npm または pnpm

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/sdd-manager.git
cd sdd-manager

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

## プロジェクト構造

```
sdd-manager/
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

## ワークフロー

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

## ライセンス

[MIT License](LICENSE.md)

## 作者

Yuji Yamamoto
