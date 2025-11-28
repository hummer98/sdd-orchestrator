# Product Overview

SDD Manager (Spec-Driven Development Manager) は、AIエージェントが協調してSpec-Driven Development (SDD) ワークフローを実行するためのオーケストレーション・管理ツール。

## Core Capabilities

1. **Spec ライフサイクル管理**: requirement -> design -> tasks -> implementation の各フェーズを管理
2. **AIエージェント協調**: Claude Code等のAIエージェントをサブプロセスとして起動・監視・制御
3. **依存関係管理**: 複数Spec間のコンフリクト検出とpending制御
4. **エスカレーション処理**: AIが判断できない状況を人間に通知
5. **自動マージ判断**: テスト結果とリスク評価に基づく自動/手動マージの判断

## Target Use Cases

- **単一Spec実行**: 1つの機能仕様に対してcc-sddワークフローを自動実行
- **複数Spec並列処理**: 依存関係を考慮した複数機能の並列開発
- **人間-AI協調**: エスカレーション時の人間レビューとフィードバック
- **品質保証**: テスト・CI/CD結果に基づく安全なマージ判断

## Value Proposition

- **ワークフロー可視化**: Specの進行状況をGUIでリアルタイム確認
- **自動化と安全性の両立**: AIが判断可能な範囲は自動化、リスクがある場合は人間判断
- **Kiro互換**: `.kiro/specs/` 構造に準拠したSpec文書管理

## Key Concepts

### 4層アーキテクチャ

```
Layer 0: Human Interface (Trello/GUI)
Layer 1: Orchestrator (常駐プロセス、交通整理)
Layer 2: Dependency Coordinator (依存関係分析)
Layer 3: Spec Manager (単一Specのライフサイクル)
Layer 4: SDD Agent (cc-sdd実行)
```

### フェーズ遷移

```
ready -> requirement -> design -> [Coordinator] -> tasks -> implementation -> testing -> done
                                        |
                                     pending (コンフリクト時)
```

---
_Focus on patterns and purpose, not exhaustive feature lists_
