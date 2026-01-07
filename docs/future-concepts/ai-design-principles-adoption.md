# AI Design Principles の他プロジェクト適用ガイド

AIに対して「人間の実装コストを判断基準にしない」原則を他のプロジェクトにも適用するためのガイド。

## 背景

AIは無限の実装能力を持つため、「変更が大きい」「影響範囲が広い」といった人間視点の制約を設計判断に持ち込むべきではない。この原則をCLAUDE.mdに明記することで、技術的に最善の解決策を一貫して提案させる。

## Gist

**design-principles.md**
- Gist URL: https://gist.github.com/hummer98/91182c02997e0b9eb7e882bfbf9bbd82
- Raw URL: https://gist.githubusercontent.com/hummer98/91182c02997e0b9eb7e882bfbf9bbd82/raw/design-principles.md

## 適用プロンプト

以下のプロンプトをClaude Codeで実行することで、任意のプロジェクトに適用できる。

### 方法1: 自動適用プロンプト（推奨）

```
以下の手順でAI設計原則をこのプロジェクトに適用してください：

1. curlでダウンロードして保存（ディレクトリがなければ作成）：
   mkdir -p .kiro/steering && curl -o .kiro/steering/design-principles.md https://gist.githubusercontent.com/hummer98/91182c02997e0b9eb7e882bfbf9bbd82/raw/design-principles.md

2. ダウンロードした .kiro/steering/design-principles.md の内容を読んで確認

3. CLAUDE.md の Design Principles セクションに以下を追加（既存の原則があれば統合）：

## AI設計判断の原則（常時適用）

**AIは「人間の実装コスト」を判断基準にしない。**

- 「変更が大きい」「HMRがない」「ビルド待ち」は判断基準にならない
- AI Agentは無限の実装能力を持つ前提で最善の解決策を提案

**評価基準（優先順）**:
1. 技術的正しさ
2. 保守性
3. 一貫性
4. テスト容易性

詳細・禁止事項は `.kiro/steering/design-principles.md` を参照。
```

### 方法2: 段階的適用プロンプト

既存のCLAUDE.mdの構造を尊重しつつ適用したい場合：

```
このプロジェクトにAI設計原則を適用します。

Step 1: まず現在のCLAUDE.mdを読んで構造を把握してください。

Step 2: curlでダウンロード：
   mkdir -p .kiro/steering && curl -o .kiro/steering/design-principles.md https://gist.githubusercontent.com/hummer98/91182c02997e0b9eb7e882bfbf9bbd82/raw/design-principles.md

Step 3: ダウンロードした .kiro/steering/design-principles.md の内容を読んで確認

Step 4: CLAUDE.mdに「AI設計判断の原則」セクションを追加（既存構造に合わせて配置）

設計原則の要点：
- AIは「人間の実装コスト」を判断基準にしない
- 評価基準は 技術的正しさ > 保守性 > 一貫性 > テスト容易性
- 「変更が大きい」を理由に場当たり的解決を選ばない
```

### 方法3: 最小限の適用（CLAUDE.mdのみ）

steering構造を導入せず、CLAUDE.mdのみで完結させる場合：

```
CLAUDE.mdに以下のセクションを追加してください：

## AI設計判断の原則

**AIは「人間が実装する場合のコスト」を判断基準にしてはならない。**

AIは無限の実装能力を持つ前提で、技術的に最善の解決策を提案すべきである。

**判断基準（優先順）**:
1. 技術的正しさ - 根本原因に対処しているか
2. 保守性 - 技術的負債を生まないか
3. 一貫性 - 既存パターンと整合するか
4. テスト容易性 - 適切にテスト可能か

**禁止事項**:
- 「変更が大きい」を理由に場当たり的な解決を選ぶ
- 「影響範囲が広い」を理由に根本解決を避ける
- 「コストが高い」を理由に設計の妥協を提案する
```

## 効果

この原則を適用することで、AIは以下の行動を取るようになる：

| Before | After |
|--------|-------|
| 「変更が大きいのでworkaroundを提案」 | 「根本的な解決策を提案」 |
| 「影響範囲が広いので段階的に」 | 「一括で正しく修正」 |
| 「HMRが効かないので一旦この方法で」 | 「技術的に正しい方法を採用」 |

## 備考

- Gistは公開設定のため、URLを共有すれば誰でも利用可能
- 原則の更新はGistを編集することで反映可能（Raw URLは固定）
- プロジェクト固有の調整が必要な場合は、ローカルのdesign-principles.mdを編集

---
_created_at: 2025-01-07_
