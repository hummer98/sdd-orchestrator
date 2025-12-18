# Product Overview

SDD Orchestrator (Spec-Driven Development Orchestrator) は、Spec-Driven Development (SDD) ワークフローを管理・実行するためのデスクトップアプリケーション。AIエージェント（Claude Code等）と連携し、ソフトウェア開発ライフサイクルを自動化・可視化する。

## Core Capabilities

1. **Spec ライフサイクル管理**: requirements -> design -> tasks -> implementation の各フェーズを管理
2. **AIエージェント連携**: Claude Code等のAIエージェントをサブプロセスとして起動・監視・制御
3. **ドキュメントレビュー**: Spec文書の整合性チェックと課題追跡・解決ワークフロー
4. **バグ修正ワークフロー**: 軽量なバグ修正フロー（create -> analyze -> fix -> verify）
5. **リモートアクセス**: SSH経由でのリモートプロジェクト操作

## Target Use Cases

- **Spec実行**: 機能仕様に対してSDDワークフローを実行
- **進捗可視化**: Specの進行状況をGUIでリアルタイム確認
- **ドキュメント品質管理**: レビューと課題解決の追跡
- **軽量バグ修正**: フルSDDプロセス不要な小規模修正

## Value Proposition

- **ワークフロー可視化**: Specの進行状況をGUIでリアルタイム確認
- **Claude Code統合**: `/kiro:*` スラッシュコマンドによるシームレスな連携
- **Kiro互換**: `.kiro/specs/` 構造に準拠したSpec文書管理

## Key Concepts

### SDDフェーズ

```
spec-init -> requirements -> design -> tasks -> implementation
```

各フェーズで生成・承認のステップがあり、人間のレビューを挟む。

### ワークフローパターン

**フル SDD**: 新機能開発向け
```
requirements -> design -> tasks -> implementation (TDD)
```

**バグ修正**: 軽量ワークフロー
```
create -> analyze -> fix -> verify
```

### コマンドセット

Claude Codeと連携するスラッシュコマンド群を `.claude/commands/kiro/` にインストール。

---
_Focus on patterns and purpose, not exhaustive feature lists_
_updated_at: 2025-12-19_
