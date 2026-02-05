# Steering Visualization Feature

Steeringファイル群をインタラクティブに可視化する機能の設計・実装レポート。

## 目次

1. [初期要求](./01-initial-requirements.md)
2. [議論と決定](./02-discussion-decisions.md)
3. [調査結果](./03-research-findings.md)
4. [設計決断](./04-design-decisions.md)
5. [実装内容](./05-implementation.md)

## クイックスタート

生成されたサンプル可視化を確認:

```bash
# Steering階層構造
open .kiro/steering/artifacts/steering_overview.html

# アーキテクチャ図
open .kiro/steering/artifacts/architecture_diagram.html

# 状態管理フロー（アニメーション付き）
open .kiro/steering/artifacts/state_flow.html
```

## 成果物

| ファイル | 種別 | 説明 |
|---------|------|------|
| `.kiro/steering/steering-visualization-prompt.md` | プロンプト | 可視化生成ガイドライン |
| `.claude/agents/kiro/steering-visualization.md` | エージェント | 専用エージェント定義 |
| `.kiro/steering/artifacts/*.html` | アーティファクト | サンプル可視化3種 |

---
_created_at: 2026-02-05_
