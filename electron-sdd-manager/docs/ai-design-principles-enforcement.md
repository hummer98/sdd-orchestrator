# AI設計原則の適用タイミング問題

## 概要

AI Agentが技術検討・調査を行う際に、設計原則（`.kiro/steering/design-principles.md`）が参照されない問題についての検討。

**作成日**: 2025-01-07
**ステータス**: 検討中

---

## 発生した問題

### 事象

Remote UI React化の技術検討レポート作成時、AIが「人間の開発体験」（HMR、ビルド待ち時間など）を判断基準に含めてしまった。

### 原因

`design-principles.md` に以下の原則が明記されていたが、参照されなかった：

> **AIは「人間が実装する場合のコスト」を判断基準にしてはならない。**

### なぜ参照されなかったか

AIは「設計・実装時」という条件を**コードを書く作業**に限定して解釈し、「技術検討・調査レポート作成」は該当しないと判断した。

しかし実際には、技術検討レポートで「推奨」「結論」を書く時点で**設計判断を行っていた**。

---

## 解決策の検討

### 方式比較

| アプローチ | 自動性 | 条件指定 | 対話中の適用 | 実装コスト |
|-----------|--------|---------|-------------|-----------|
| CLAUDE.md改修（トリガー条件追加） | △ | × | △ | 低 |
| Slash command | × | - | × | 中 |
| `.claude/rules/`（パス条件） | ◎ | ◎ | × | 低 |
| Hooks | ◎ | ◎ | × | 中〜高 |
| CLAUDE.mdへの原則直接埋め込み | ◎ | × | **◎** | 低 |

### `.claude/rules/` の限界

Claude Code v2.0.64以降で利用可能な `.claude/rules/` は、パスベースの条件付きルール注入が可能：

```yaml
# .claude/rules/design-review.md
---
paths:
  - "**/docs/**"
---
# 技術レポート作成時の原則
...
```

**問題**: ファイル操作時にのみトリガーされる

```
ユーザー: React化について検討して
↓
AI: (ファイル操作なし、ルール未適用のまま分析)
↓
ユーザー: docsに書いて
↓
AI: (ここでやっとルール適用、しかし結論は既に出ている)
```

技術検討は**ファイル操作を伴わない対話**で行われることが多く、パスベースのトリガーでは捕捉できない。

---

## 推奨アプローチ

### CLAUDE.mdへの原則直接埋め込み + 詳細は別ファイル参照

核心部分を常に読み込まれるCLAUDE.mdに配置し、詳細は必要時に参照する構造。

#### 現在のCLAUDE.md

```markdown
## Design Principles

設計・実装時は以下の原則を遵守：
- **DRY**, **SSOT**, **KISS**, **YAGNI**, **関心の分離**

**重要**: AI設計判断の詳細原則は `.kiro/steering/design-principles.md` を参照。
AIは「人間の実装コスト」を理由に設計判断を歪めてはならない。
```

#### 改善案

```markdown
## Design Principles

設計・実装・技術検討時は以下の原則を遵守：
- **DRY**, **SSOT**, **KISS**, **YAGNI**, **関心の分離**

### 技術検討・設計判断の原則（常時適用）

技術選択・比較・推奨を行う際は以下を遵守：

1. **「人間の実装コスト」を判断基準にしない**
   - 「変更が大きい」「HMRがない」「ビルド待ちが発生する」は判断基準にならない
   - AI Agentは無限の実装能力を持つ前提で最善の解決策を提案する

2. **評価基準（優先順）**
   - 技術的正しさ: 根本原因に対処しているか
   - 保守性: 技術的負債を生まないか
   - 一貫性: 既存アーキテクチャと整合するか
   - テスト容易性: 適切にテスト可能か

詳細は `.kiro/steering/design-principles.md` を参照。
```

### 変更のポイント

1. **適用範囲の明確化**: 「設計・実装時」→「設計・実装・技術検討時」
2. **核心原則の直接記述**: 別ファイル参照ではなく、CLAUDE.md自体に原則を記載
3. **具体例の追加**: 「HMRがない」「ビルド待ち」など、今回の問題で発生した具体的な判断ミスを例示
4. **詳細は別ファイル**: 完全な原則は `design-principles.md` に維持

---

## 他の補完策

### `.claude/rules/` との併用

ファイル操作時の追加リマインダーとして：

```yaml
# .claude/rules/docs-design-principles.md
---
paths:
  - "**/docs/**"
  - "**/*.md"
---

# リマインダー: 技術検討レポート

このドキュメントの内容が `.kiro/steering/design-principles.md` の原則に従っているか確認：
- 「人間の実装コスト」を理由に技術選択を歪めていないか
- 技術的正しさ・保守性・一貫性・テスト容易性で評価しているか
```

### Slash commandの提供（オプション）

明示的なトリガーが必要な場合のフォールバック：

```markdown
# .claude/commands/tech-review.md
---
description: 技術検討を設計原則に従って実施
---

技術検討・比較・推奨を行う。

以下の原則に従うこと：
$file:.kiro/steering/design-principles.md
```

---

## 結論

| 対策 | 効果 | 推奨度 |
|------|------|--------|
| CLAUDE.mdへの原則直接埋め込み | 対話中の全フェーズで適用 | **◎ 必須** |
| `.claude/rules/` 併用 | ファイル作成時のリマインダー | ○ 推奨 |
| Slash command | 明示的トリガー | △ オプション |

**最小限の対応**: CLAUDE.mdの改修のみ

**推奨対応**: CLAUDE.md改修 + `.claude/rules/` 併用

---

## 参考リンク

- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Claude Code Memory Management](https://code.claude.com/docs/en/memory)
- [Modular Rules in Claude Code](https://claude-blog.setec.rs/blog/claude-code-rules-directory)
- [Rules Directory Mechanics](https://claudefa.st/blog/guide/mechanics/rules-directory)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
