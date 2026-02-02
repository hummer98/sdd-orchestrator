# E2Eテストワークフロー化 & Inspection分散構想レビュー

> **レビュー日**: 2026-02-02
> **レビュー対象**: docs/bootstrap/e2e-workflownize.md
> **ステータス**: 構想妥当、実装推奨

---

## 1. 構想の概要

### 1.1 E2Eテストのワークフロー化

| 課題 | 提案された解決策 |
|------|----------------|
| 課題1: E2Eテスト作成がsteering/プロンプト指示に左右される | e2e計画・作成サブエージェントによる形式化 |
| 課題2: 実行基準が曖昧（全体/作成分/関連部分） | e2e計画エージェントが実行スコープを判断 |

### 1.2 Inspection責務の分散

| 現状 | 提案 |
|------|------|
| spec-inspection 1エージェントが8カテゴリを検査 | 複数サブエージェントに分散し、spec-inspectionは統合・判定に専念 |

---

## 2. 妥当性評価

### 2.1 構想は妥当か

**結論: 妥当であり、実装価値が高い**

#### 根拠1: インシデント分析による裏付け

docs/incidents/ の分析結果:

| インシデント | 問題タイプ | Inspectionで検出? | E2Eで検出可能? |
|-------------|-----------|------------------|---------------|
| prompt-editor-integration-missing | コンポーネント統合漏れ | ❌ | ✅ |
| agent-log-json-display-issue | IPC連携漏れ | ❌ (誤記載) | ✅ |
| auto-execution-state-sync-bug | Main→Renderer同期漏れ | - | ✅ |
| agent-log-ui-not-updating-bug | 非同期処理の競合 | - | ✅ |

**これらはすべてE2Eテストで検出可能だった統合ミス。**

#### 根拠2: inspection-*.mdの分析

直近のinspectionレポート:
- bugs-view-unification inspection-3: 53 checks, 8カテゴリ
- spec-productivity-metrics inspection-3: 55 checks, 8カテゴリ

1エージェントが8カテゴリを順次検査すると、後半のカテゴリでattention劣化の可能性。

#### 根拠3: プロジェクト固有性の高さ

e2e-testing.md の内容:
- 290以上のテストケース、13のテストファイル
- プロジェクト固有のhelper関数多数
- `window.__STORES__` によるZustandストアアクセスパターン

**汎用プロンプトでは対応不可能 → generate-*パターンが必要**

---

## 3. サブエージェントの責務分担

### 3.1 推奨構造

```
spec-inspection (統合エージェント)
├── requirements-checker (サブエージェント)
├── design-checker (サブエージェント)
├── integration-checker (サブエージェント)
│   └── Task: e2e-planner → e2e-runner
├── code-quality-checker (サブエージェント)
│   - Design Principles (DRY, SSOT, KISS, YAGNI)
│   - Dead Code Detection
└── 結果統合・GO/NOGO判定・レポート生成
```

### 3.2 E2E関連エージェントの責務

| エージェント | 責務 |
|-------------|------|
| e2e-planner | 仕様から統合ポイント抽出、既存テストとのギャップ分析、実行スコープ決定 |
| e2e-creator | テストコード生成、fixture作成 |
| e2e-runner | テスト実行、結果収集、レポート生成 |

### 3.3 実装方式

**サブエージェント（Task tool）が適切**

| 方式 | ユースケース |
|------|-------------|
| skills/slash commands | ユーザーが直接呼び出す対話的操作 |
| サブエージェント | 他のエージェントから自動呼び出しされる非対話的処理 |

e2e実行はspec-inspectionの一部として自動実行されるため、サブエージェントが適切。

---

## 4. プロジェクト差への対応

### 4.1 推奨アプローチ

**generate-inspection-e2e.md コマンドでプロジェクト解析→steeringファイル生成**

generate-release.md の成功パターンを踏襲:
1. プロジェクトタイプ検出
2. 設定ファイル解析
3. テンプレートベース生成

### 4.2 生成されるsteering

```
.kiro/steering/inspection-e2e.md

内容:
- E2Eフレームワーク情報（WebdriverIO, Playwright等）
- fixture構造
- helper関数一覧
- data-testidセレクタリファレンス
- 実行コマンド
- 排他制御の必要性
```

---

## 5. E2E実行スコープの判断

### 5.1 判断責務

e2e-plannerエージェントが以下を判断:

1. **仕様書から「統合ポイント」を抽出**
   - 新規コンポーネントの使用箇所
   - IPC/APIの連携箇所
   - 状態同期フロー

2. **既存E2Eテストとのギャップ分析**
   - steering/inspection-e2e.md のカバレッジ表と照合
   - 未カバーの統合ポイントを特定

3. **実行スコープの決定**
   - a) 新規E2Eテスト作成が必要 → 作成してspec内で実行
   - b) 既存E2Eテストで十分 → 関連テストのみ実行
   - c) マージ後のプロジェクトE2Eに委譲 → inspection時はスキップ

### 5.2 判断基準マトリクス

| 変更タイプ | Spec内E2E | マージ後E2E | 備考 |
|-----------|----------|------------|------|
| 新UIコンポーネント＋統合 | ✅ 必須 | - | CRUD操作フロー |
| IPC/API新規追加 | ✅ 必須 | - | Main↔Renderer通信 |
| 状態管理変更 | ✅ 必須 | - | 同期フロー |
| 既存機能のリファクタ | △ 判断 | ✅ | 既存テストで十分な場合あり |
| ドキュメントのみ | - | - | E2E不要 |

---

## 6. レポート配置

### 6.1 ファイル構造

```
.kiro/specs/<spec-name>/
├── spec.json
├── requirements.md
├── design.md
├── tasks.md
├── inspection-1.md          # 「E2Eテスト結果: e2e-report-1.md 参照」と記載
├── inspection-2.md
├── e2e-report-1.md          # 独立ファイル
└── e2e-report-2.md
```

### 6.2 e2e-report-{n}.md フォーマット

```markdown
# E2E Test Report - {feature} (Round {n})

## Summary
- **Date**: {timestamp}
- **Scope**: spec-scoped / project-wide
- **Result**: PASS / FAIL

## Executed Tests
| Test File | Test Case | Status | Duration |
|-----------|-----------|--------|----------|
| workflow-integration.e2e.spec.ts | should create task with prompt | PASS | 2.3s |

## New Tests Created
- `e2e-wdio/specs/schedule-task-creation.e2e.spec.ts` (3 cases)

## Coverage Analysis
| Integration Point | Covered? | Details |
|-------------------|----------|---------|
| PromptListEditor → ScheduleTaskEditPage | ✅ | New test created |

## Deferred to Project E2E
- Full regression suite (reason: time constraint)
```

---

## 7. 懸念事項と対策

### 7.1 サブエージェント間のコンテキスト爆発

**懸念**: 5+サブエージェントが同じコンテキストを読む → トークン使用量増大

**対策**: コンテキスト階層化
```
spec-inspection (親)
├── 共通コンテキスト読み込み（1回）
├── コンテキストサマリー作成
└── サブエージェントに「サマリー + 担当カテゴリの詳細」を渡す
```

### 7.2 E2E実行時間とフィードバックループ

**懸念**: inspection数分 → E2E追加後数十分〜1時間

**対策**: 2段階inspection

| Mode | 内容 | 所要時間 |
|------|------|---------|
| Quick (デフォルト) | 静的検査のみ、E2Eは計画のみ | 数分 |
| Full (--full) | Quick + E2E実行 | 数十分 |
| E2E Only (--e2e-only) | E2E計画・実行のみ | 可変 |

### 7.3 E2Eテスト作成の品質保証

**懸念**: AI生成テストの品質・フレイキー

**対策**: 検証プロセス追加
```
e2e-planner → e2e-creator → e2e-validator → e2e-runner
                              ↑
                        3回実行して安定性確認
                        フレイキー検出時は修正または除外
```

または生成テストは「候補」としてマーク:
```
e2e-wdio/
├── specs/           # 正式テスト
└── generated/       # AI生成テスト（レビュー待ち）
```

### 7.4 E2E失敗時のリカバリーパス

**対策**: 失敗タイプによる分類

| 失敗タイプ | 判定 | 理由 |
|-----------|------|------|
| テストロジック失敗 | NOGO (Critical) | 統合ミスの可能性 |
| 環境起因（タイムアウト等） | Warning | 再実行推奨 |
| 新規テストのフレイキー | Info | テスト修正推奨 |

### 7.5 マージ後E2Eとの責務境界

**対策**: 明示的な責務分担

| レベル | 責務 | 実行タイミング |
|--------|------|---------------|
| Spec E2E | 単一Spec内の統合 | inspection時 |
| Project E2E | 全機能の統合・回帰 | マージ後・リリース前 |
| Smoke E2E | クリティカルパスのみ | CI（毎コミット） |

### 7.6 サブエージェント間の情報共有

**懸念**: 分散によりサブエージェント間で情報共有不足 → 統合レポートの品質低下

**対策案**:

1. **共有コンテキストファイル**
   - spec-inspectionが最初にcontext.jsonを作成
   - 各サブエージェントがcontext.jsonを読み込み、結果を追記
   - 最後にspec-inspectionがcontext.jsonを読み込んで統合

2. **サブエージェントの戻り値を構造化**
   - 各サブエージェントがJSON形式で結果を返却
   - spec-inspectionがマージしてレポート生成

---

## 8. 実装優先度

### 8.1 推奨フェーズ

```
Phase 1: 基盤整備（1-2日）
├── generate-inspection-e2e コマンド作成
├── steering/inspection-e2e.md テンプレート定義
└── e2e-report-{n}.md フォーマット定義

Phase 2: サブエージェント定義（2-3日）
├── e2e-planner-agent.md
├── e2e-runner-agent.md
├── integration-checker-agent.md
└── （他のchecker-agentは後回し可）

Phase 3: spec-inspection改修（1-2日）
├── サブエージェント呼び出し追加
├── Quick/Full モード分岐
└── 結果統合ロジック

Phase 4: 検証・調整（1-2日）
├── 実際のSpecで試行
├── フィードバック収集
└── 調整
```

---

## 9. 結論

### 9.1 総合評価

| 観点 | 評価 |
|------|------|
| 構想の妥当性 | ✅ 妥当 |
| 実装価値 | ✅ 高い |
| 技術的実現性 | ✅ 可能 |
| リスク | △ 中程度（対策あり） |

### 9.2 主な強み

1. **インシデント駆動の設計** - 実際の問題から逆算
2. **責務の適切な分離** - inspection分散、プロジェクト差対応、判断委譲
3. **段階的な導入が可能** - 既存を壊さず拡張可能

### 9.3 主な注意点

1. コンテキスト使用量の監視
2. Quick/Fullモードによるフィードバックループ維持
3. 生成テストの品質保証プロセス

### 9.4 推奨アクション

**実装を推奨。** 同時実装（inspection分散 + e2eワークフロー化）により相乗効果が期待できる。

---

## 10. 参考資料

### 10.1 分析対象インシデント

- `docs/incidents/2026-01-30-schedule-task-prompt-editor-integration-missing.md`
- `docs/incidents/2026-01-29-agent-log-json-display-issue.md`
- `docs/incidents/auto-execution-state-sync-bug.md`
- `docs/incidents/agent-log-ui-not-updating-bug.md`

### 10.2 参照した既存ファイル

- `.kiro/steering/e2e-testing.md`
- `.kiro/specs/bugs-view-unification/inspection-3.md`
- `.kiro/specs/spec-productivity-metrics/inspection-3.md`
- `.claude/agents/kiro/spec-inspection.md`
- `.claude/agents/kiro/generate-release.md`
