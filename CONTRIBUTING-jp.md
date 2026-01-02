# SDD Orchestrator への貢献

日本語 | [English](CONTRIBUTING.md)

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS 4
- **デスクトップ**: Electron 35
- **状態管理**: Zustand
- **テスト**: Vitest + WebdriverIO

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/hummer98/sdd-orchestrator.git
cd sdd-orchestrator

# Electron版のセットアップ
cd electron-sdd-manager
npm install
```

## 開発

```bash
# 開発サーバー起動
npm run dev

# Electronアプリ起動（別ターミナル）
npm run dev:electron
```

## テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

## ビルド

```bash
npm run build:electron
```

## プロジェクト構造

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
