# Bug Analysis: e2e-workflow-commands-template-sync

## Summary
e2e-workflow feature（v0.66.0）実装時に、`.claude/agents/kiro/spec-inspection.md` に E2E Pipeline（Phase 2.5: e2e-planner, e2e-creator, e2e-validator, e2e-runner）が追加されたが、`electron-sdd-manager/resources/templates/commands/` 配下のテンプレートファイルに同期されなかった。

## Root Cause
**e2e-workflow feature の tasks.md にテンプレート同期タスクが不足していた。**

tasks.md の Task 5（spec-inspection-agent Full Mode対応）では `.claude/agents/kiro/spec-inspection.md` の改修タスク（5.1〜5.4）のみが定義され、`electron-sdd-manager/resources/templates/commands/` 配下の対応するテンプレートへの同期タスクが含まれていなかった。

### Technical Details
- **Location**:
  - ソースファイル（最新版）: `.claude/agents/kiro/spec-inspection.md`（742行、E2E Pipeline あり）
  - 旧版テンプレート: `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`（472行、E2E Pipeline なし）
  - 旧版テンプレート: `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md`（467行、E2E Pipeline なし）
- **Component**: コマンドセットテンプレートの spec-inspection.md
- **Trigger**: コマンドセットインストール機能で cc-sdd または cc-sdd-agent プロファイルを選択

**差分の概要**:
| 項目 | agents版（最新） | templates版（旧） |
|------|-----------------|-----------------|
| Architecture | Distributed (Orchestrator + Sub-agents) | Single Agent |
| E2E Pipeline | あり（Phase 2.5） | なし |
| Mode オプション | `--skip-e2e` (Default: Full Mode) | なし |
| inspection-{n}.md Mode フィールド | Quick/Full | なし |
| サブエージェント呼び出し | e2e-planner, e2e-creator, e2e-validator, e2e-runner | なし |

## Impact Assessment
- **Severity**: Major
- **Scope**:
  - コマンドセットインストール機能を使用してプロジェクトにコマンドをインストールした全ユーザー
  - cc-sdd, cc-sdd-agent プロファイルを選択した場合
- **Risk**:
  - `/kiro:spec-inspection` 実行時に E2E Pipeline が動作しない
  - inspection-{n}.md に Mode フィールドが含まれない
  - User Journey に基づいた E2E テスト自動生成・実行が行われない

## Related Code

### 影響を受けるファイル（同期が必要）

1. `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md`
   - 現状: 472行、単一エージェント直接実行型
   - 期待: agents版の分散アーキテクチャ＋E2E Pipeline対応版に更新

2. `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-inspection.md`
   - 現状: 467行、単一エージェント直接実行型
   - 期待: agents版の分散アーキテクチャ＋E2E Pipeline対応版に更新

### 参照すべきソースファイル

- `.claude/agents/kiro/spec-inspection.md`（742行、最新版）

## Proposed Solution

### Option 1: テンプレートファイルを最新 agents 版に同期（推奨）

- **Description**: `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-inspection.md` と `cc-sdd-agent/spec-inspection.md` の内容を `.claude/agents/kiro/spec-inspection.md` と同期
- **Pros**:
  - 全プロファイルで E2E Pipeline が使用可能になる
  - DRY 原則に従い、単一のソースから派生
  - 今後の改善が全プロファイルに反映される
- **Cons**:
  - なし

### Option 2: spec-manager 方式に統一（サブエージェント委譲型）

- **Description**: cc-sdd, cc-sdd-agent の spec-inspection.md を spec-manager/inspection.md のような薄いラッパーに変更し、実行を spec-inspection-agent に委譲
- **Pros**:
  - コマンドファイルが簡素化される（84行）
  - agents/ の変更が自動的に反映される
- **Cons**:
  - プロファイル間のアーキテクチャの違い（cc-sdd: 直接実行型）を変更することになる

### Recommended Approach
**Option 1: テンプレートファイルを最新 agents 版に同期**

理由：
1. 既存の cc-sdd-spec-inspection-outdated バグで同様の問題が過去に報告されており、その時の修正方針と一致
2. 最小限の変更で問題を解決
3. プロファイルアーキテクチャの意図的な違いを維持

## Dependencies
- `.claude/agents/kiro/spec-inspection.md` - ソースファイル（最新版）
- E2E サブエージェント（e2e-planner, e2e-creator, e2e-validator, e2e-runner）- Task tool で呼び出し

## Testing Strategy
1. 修正前: 現在の templates 版で `/kiro:spec-inspection` を実行し、E2E Pipeline が動作しないことを確認
2. 修正後:
   - cc-sdd プロファイルでコマンドセットインストールを実行
   - `/kiro:spec-inspection {feature}` を実行
   - E2E Pipeline（e2e-planner → e2e-creator → e2e-validator → e2e-runner）が呼び出されることを確認
   - inspection-{n}.md に `Mode: Full` が記録されることを確認
   - e2e-report-{n}.md が生成されることを確認
