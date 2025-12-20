SDDのワークフローをSDD Orchestrator/Spec Managerを前提としたAI-アルゴリズムハイブリッドワークフローとして再定義する

## エスカレーション

- SDD各プロセスにおいて、トラブルや判断に困った場合に人間に質問あるいは対応を促したいケースをエスカレーションと呼ぶ。上位層に伝達し、UI上でユーザーにエスカレーションが発生していることがわかるようにする
  - たとえばOrchestratorのヘッダーに現在発生中のエスカレーション一覧が出て、タップすると該当のSpec ManagerやSDD Agentの詳細に飛ぶ

従来のcc-sddとの相違点

- タスクの管理、spec.jsonの更新などは別のランナーが行う
- requiremnt, design, tasks, implは眼の前のタスクに集中させる
  - これらの完了、進捗管理、エスカレーションは別のエージェント(spec-reviewer)が実施する

## spec-reviewerの責務

- requriement, desig, tasks, implの作業結果ログを参照して以下を実施
  - spec.jsonの更新
  - エスカレーションを通知
  - 次のアクションの提示

## SDDの全体的なワークフロー

◯ 初期化済: 要件/機能概要を元にspec-initが実行される（このアプリケーションの範囲外）
結果的に .kiro/specs/<feature-name> に新しくフォルダが作成され、spec.jsonが存在している状態になっている状態。
spec.json: ない
↓

1. 要件定義生成フェーズ:
   spec.json: approvals.requirements: { generate: false, approved: false }
   ↓
   ↓ spec-requirements (alias create-requirements)
   ↓
2. 要件定義検証フェーズ: 要件定義中 ⇔ validate-gap
   spec.json: approvals.requirements: { generate: true, approved: false }
   ↓
   ↓ spec-requirements -y (alias apply-requirements)
   ↓
3. 設計生成フェーズ: 設計を開始
   spec.json:
   approvals.requirements: { generate: true, approved: true }
   approvals.design: { generate: false, approved: false }
   ↓
   ↓ spec-design (alias create-design)
   ↓
4. 設計検証フェーズ: 設計確認 ⇔ validate-design
   approvals.design: { generate: true, approved: false }
   ↓
   ↓ spec-design -y (alias apply-design)
   ↓
5. タスク生成フェーズ
   approvals.design: { generate: true, approved: true }
   approvals.tasks: { generate: false, approved: false }
   ↓
   ↓ spec-tasks (alias create-tasks)
   ↓
6. タスク検証フェーズ
   approvals.tasks: { generate: true, approved: false }
   ↓
   ↓ spec-tasks -y (alias apply-tasks)
   ↓
7. 実装フェーズ
   approvals.tasks: { generate: true, approved: true }
   ↓
   ↓ spec-impl (alias impl)
   ↓
8. 完了判定フェーズ
   ↓
   ↓ validate-impl
   ↓
9. デプロイフェーズ
   ↓
   ↓ deployment
   ↓
   ● 完了！

# フェーズの判定

フェーズの状態は,init~requirements~desing~implの間は .kiro/specs/<feature-name>/spec.json の approvals フィールドで管理される
デプロイフェーズに関してのみ、spec.json に deploy_completed: ture が完了時に追加される

# ステートとUI、及びコマンド実行

## Spec ManagerのUI

Spec Managerの右ペインのUIには常にすべてのワークフローが表示されている
これを**ワークフロービュー**という。

```
要件定義
↓
設計
↓
タスク
↓
実装
↓
検査
↓
デプロイ

[自動実行]
[spec-status実行]
```

また、以下のボタンは常に常時されている
`[自動実行]`: すべてのワークフローを全自動で実行する。途中なら続きから。完了時はdisable。
`[spec-status実行]`: spec-statusを実行して結果を表示する。常にenable。

また全自動処理にあたり、どこで停止するか、あるいは自動で次のフェーズに行くかを指示できる。このUIを**自動実行許可**と呼ぶ
自動実行許可の切り替えは「要件定義」などのワークフローアイテム自体をクリックすることでトグル動作する。

```
▶️要件定義
↓
▶️設計
↓
▶️タスク
↓
🚫実装
↓
🚫検査
↓
🚫デプロイ
```

また、各フェーズ間でvaidateを実施するかを指示するUIも表示されている。これは全自動時に実行するか

```
▶️要件定義
↓  ✅️validate-gap
▶️設計
↓  ⬜validate-design
▶️タスク
↓
🚫実装
↓　⬜validate-impl
🚫検査
↓
🚫デプロイ
```

## 各フェーズ毎のUIの変化

0. 初期化済: specsが存在しない状態は本システムでは感知しない, 新規生成は別のアプリケーションで行われる。したがって、本アプリケーションではspecs/<feature-name> が存在するところからスタートする

### 1. 要件定義生成フェーズ

初期表示では要件定義の横に実行ボタンが表示されアクティブになっている。ボタンを押すと、手動でspec-requirementsを実行する。
この場合

```
要件定義 [実行]
↓
設計
↓
タスク
↓
実装
↓
検査
↓
デプロイ
```

実行ボタンを押すとボタンラベルがローディングサークル+実行中となりdisableとなる。

claudeのプロセスが完了したら、spec.jsonのapprovals.requirements.generatedをtrueにして 処理完了

### 2. 要件定義検証フェーズ: 要件定義中 ⇔ validate-gap

- spec.json: approvals.requirements: { generate: true, approved: false } の状態
- 要件定義は完了色になる。横の*生成完了*リンクを押すと、このプロセスを実行したときのAgentログが表示される。
- [承認]を押した場合 spec-requirements -y をプロセスで実行。次のフェーズに移行
- メインウィンドウのエディタにはrequirements.mdが表示されている
- 設計の右に[承認して実行]ボタンが表示される。これを押した場合は要件定義は承認済みとするので、spec.jsonのapprovals.requirements.approvalを true にしてから spec-designを実行。フェーズ4に移行するはず。
- validate-gapの実行が押されたらプロセスを実行する

```
*要件定義* _生成完了_ [承認]
↓ validate-gap [実行]
設計 [承認して実行]
↓
タスク
↓
実装
↓
検査
↓
デプロイ
```

### 3. 設計生成フェーズ

- spec.json: approvals.requirements: { generate: true, approved: true }, approvals.design: { generate: false, approved: false }
- 要件定義は承認済み色になる
- 設計の横に[実行]ボタンが表示される
- [実行]を押すとspec-designを実行

```
✅要件定義 _承認済_
↓ validate-gap [実行]
設計 [実行]
↓
タスク
↓
実装
↓
検査
↓
デプロイ
```

### 4. 設計検証フェーズ

- spec.json: approvals.design: { generate: true, approved: false }
- 設計は完了色になる。横の*生成完了*リンクを押すと、このプロセスを実行したときのAgentログが表示される
- [承認]を押した場合、spec.jsonのapprovals.design.approvedをtrueにする
- メインウィンドウのエディタにはdesign.mdが表示されている
- タスクの右に[承認して実行]ボタンが表示される
- validate-designの実行が押されたらプロセスを実行する

```
✅要件定義 _承認済_
↓
*設計* _生成完了_ [承認]
↓ validate-design [実行]
タスク [承認して実行]
↓
実装
↓
検査
↓
デプロイ
```

### 5. タスク生成フェーズ

- spec.json: approvals.design: { generate: true, approved: true }, approvals.tasks: { generate: false, approved: false }
- 設計は承認済み色になる
- タスクの横に[実行]ボタンが表示される
- [実行]を押すとspec-tasksを実行

```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
タスク [実行]
↓
実装
↓
検査
↓
デプロイ
```

### 6. タスク検証フェーズ

- spec.json: approvals.tasks: { generate: true, approved: false }
- タスクは完了色になる。横の*生成完了*リンクを押すと、このプロセスを実行したときのAgentログが表示される
- [承認]を押した場合、spec.jsonのapprovals.tasks.approvedをtrueにする
- メインウィンドウのエディタにはtasks.mdが表示されている
- 実装の右に[承認して実行]ボタンが表示される

```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
*タスク* _生成完了_ [承認]
↓
実装 [承認して実行]
↓
検査
↓
デプロイ
```

### 7. 実装フェーズ

- spec.json: approvals.tasks: { generate: true, approved: true }
- タスクは承認済み色になる
- 実装の横に[実行]ボタンが表示される
- [実行]を押すとspec-implを実行
- 実装中はタスク毎の進捗がサブアイテムとして表示される

```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
✅タスク _承認済_
↓
実装 [実行]
  ├ Task 1: ⏳実行中
  ├ Task 2: ⬜未着手
  ├ Task 3: ⬜未着手
  └ Task 4: ⬜未着手
↓
検査
↓
デプロイ
```

実装完了後:
```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
✅タスク _承認済_
↓
*実装* _完了_
  ├ Task 1: ✅完了
  ├ Task 2: ✅完了
  ├ Task 3: ✅完了
  └ Task 4: ✅完了
↓ validate-impl [実行]
検査 [実行]
↓
デプロイ
```

### 8. 検査フェーズ

- spec.json: implementation_completed: true（全タスク完了時に追加）
- 検査の横に[実行]ボタンが表示される
- [実行]を押すとvalidate-implスラッシュコマンドをAgentプロセスに投げる
- 検査結果はAgentログとして表示される

```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
✅タスク _承認済_
↓
✅実装 _完了_
↓
検査 [実行]
↓
デプロイ
```

検査完了後:
```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
✅タスク _承認済_
↓
✅実装 _完了_
↓
✅検査 _完了_
↓
デプロイ [実行]
```

### 9. デプロイフェーズ

- spec.json: inspection_completed: true（検査完了時に追加）
- デプロイの横に[実行]ボタンが表示される
- [実行]を押すとdeploymentスラッシュコマンドをAgentプロセスに投げる
- 完了後、spec.jsonにdeploy_completed: trueが追加される

```
✅要件定義 _承認済_
↓
✅設計 _承認済_
↓
✅タスク _承認済_
↓
✅実装 _完了_
↓
✅検査 _完了_
↓
✅デプロイ _完了_

● 全工程完了！
```

---

# spec-reviewerの詳細仕様

## 役割

spec-reviewerは、各SDDエージェント（requirements, design, tasks, impl）の作業完了を監視し、以下を実行する軽量なレビュー専門エージェント：

1. **spec.jsonの状態更新**: 各フェーズの完了状態を反映
2. **エスカレーション検出と通知**: 問題発生時に上位層へ通知
3. **次アクションの提示**: UIに次に実行可能なアクションを伝達

## 起動タイミング

spec-reviewerは**常駐プロセスではない**。以下のタイミングでオンデマンドに起動される：

1. **spec.jsonが書き換えられたとき**: ファイル監視により検出
2. **SDDエージェントプロセスが完了したとき**: プロセス終了をトリガーとして起動
3. **validate-*コマンドが完了したとき**: 検証結果をレビュー

## 入力

- `specs/<feature-name>/spec.json`: 現在の状態
- `specs/<feature-name>/logs/`: 各エージェントの実行ログ
- 直前に完了したプロセスの終了コードと出力

## 出力

1. **spec.jsonの更新**
   - approvals.*.generated, approvals.*.approved の更新
   - escalations フィールドへのエスカレーション追加
   - next_action フィールドの更新

2. **イベント発火**
   - `spec-updated`: spec.json更新完了イベント（UIが購読）
   - `escalation-created`: エスカレーション発生イベント

## spec.json拡張フィールド

```json
{
  "approvals": {
    "requirements": { "generated": true, "approved": true },
    "design": { "generated": true, "approved": false },
    "tasks": { "generated": false, "approved": false }
  },
  "escalations": [
    {
      "id": "esc-001",
      "phase": "design",
      "type": "decision_required",
      "message": "データベーススキーマの選択について判断が必要です",
      "created_at": "2024-01-15T10:30:00Z",
      "resolved": false,
      "context": {
        "options": ["Option A: PostgreSQL", "Option B: MongoDB"],
        "agent_recommendation": "Option A"
      }
    }
  ],
  "next_action": {
    "command": "spec-design",
    "phase": "design",
    "ready": true,
    "blocked_by": null
  },
  "implementation_completed": false,
  "inspection_completed": false,
  "deploy_completed": false
}
```

---

# エスカレーションシステム

## エスカレーションの種類

| タイプ | 説明 | 発生例 |
|--------|------|--------|
| `decision_required` | 人間の判断が必要 | 複数の設計選択肢があり、トレードオフの判断が必要 |
| `clarification_needed` | 要件の明確化が必要 | 曖昧な要件があり、意図の確認が必要 |
| `validation_failed` | 検証に失敗 | validate-*で問題が検出された |
| `resource_unavailable` | リソースにアクセスできない | 外部API、ファイル、依存関係の問題 |
| `conflict_detected` | 競合が検出された | 既存コードとの競合、要件間の矛盾 |
| `error` | 予期しないエラー | プロセスクラッシュ、タイムアウト |

## エスカレーションのライフサイクル

```
発生 → 通知 → 表示 → 対応 → 解決 → 再開
```

### 1. 発生（Detection）
SDDエージェントが以下を検出した場合にエスカレーションを発生させる：
- 判断が必要な分岐点
- 検証失敗
- エラー発生

エージェントは標準出力に特定のフォーマットでエスカレーションを出力：
```
[ESCALATION] type=decision_required message="..." context={...}
```

### 2. 通知（Notification）
spec-reviewerがエスカレーションを検出すると：
1. spec.jsonのescalationsフィールドに追加
2. `escalation-created`イベントを発火
3. UIが通知を受け取り表示を更新

### 3. 表示（Display）
Orchestratorヘッダーにエスカレーションバッジを表示：
```
🔔 2件のエスカレーション
├ [feature-a] 設計: 判断が必要
└ [feature-b] 実装: 検証失敗
```

タップすると該当のSpec Managerに遷移し、エスカレーション詳細を表示。

### 4. 対応（Resolution）
ユーザーがエスカレーションに対応：

**decision_required / clarification_needed の場合:**
- エスカレーション詳細画面で選択肢を選ぶ or コメントを入力
- [解決]ボタンを押す

**validation_failed の場合:**
- 問題を修正（手動 or 再実行）
- [再検証]ボタンを押す

**error の場合:**
- ログを確認
- [再試行] or [スキップ] or [中止]を選択

### 5. 解決（Resolved）
- spec.jsonのescalations[].resolved = true に更新
- resolution フィールドに解決内容を記録

```json
{
  "id": "esc-001",
  "resolved": true,
  "resolved_at": "2024-01-15T11:00:00Z",
  "resolution": {
    "action": "selected_option",
    "value": "Option A: PostgreSQL",
    "comment": "既存システムとの整合性を優先"
  }
}
```

### 6. 再開（Resume）
エスカレーション解決後、自動実行が有効な場合は処理を再開：
1. spec-reviewerがresolved状態を検出
2. next_actionを更新
3. 自動実行モードであれば次のコマンドを実行

## エスカレーションUI詳細

### Spec Manager内のエスカレーション表示

ワークフロービューの該当フェーズに警告アイコンとメッセージを表示：

```
✅要件定義 _承認済_
↓
⚠️設計 _要対応_
│ └ 🔔 判断が必要: データベーススキーマの選択
│     Option A: PostgreSQL [選択]
│     Option B: MongoDB [選択]
│     [詳細を見る] [スキップ]
↓
タスク
↓
実装
```

### エスカレーション詳細モーダル

[詳細を見る]をタップすると表示：

```
┌─────────────────────────────────────┐
│ エスカレーション詳細                  │
├─────────────────────────────────────┤
│ フェーズ: 設計                        │
│ 種類: 判断が必要                      │
│ 発生日時: 2024/01/15 10:30           │
├─────────────────────────────────────┤
│ メッセージ:                          │
│ データベーススキーマの選択について     │
│ 判断が必要です。                      │
├─────────────────────────────────────┤
│ 選択肢:                              │
│ ○ Option A: PostgreSQL              │
│   - RDBMSの信頼性                    │
│   - 既存システムとの整合性            │
│                                     │
│ ○ Option B: MongoDB                 │
│   - スキーマレスの柔軟性              │
│   - スケーラビリティ                  │
├─────────────────────────────────────┤
│ エージェント推奨: Option A            │
├─────────────────────────────────────┤
│ コメント:                            │
│ [                                   ]│
├─────────────────────────────────────┤
│        [キャンセル]  [解決]           │
└─────────────────────────────────────┘
```

---

# 自動実行モード

## 概要

自動実行モードは、人間の介入を最小限にしてSDDワークフロー全体を実行するモード。
各フェーズの「自動実行許可」設定に従い、許可されたフェーズは自動で次に進む。

## 自動実行の制御

### 自動実行許可の状態

各フェーズは以下の3つの状態を持つ：

| 状態 | アイコン | 動作 |
|------|---------|------|
| 許可 | ▶️ | 自動で実行・承認して次へ進む |
| 停止 | 🚫 | このフェーズで停止し、人間の操作を待つ |
| 完了 | ✅ | 既に完了済み |

### デフォルト設定

初期状態では安全側に倒す：
```
▶️要件定義  ← 自動許可
↓
🚫設計      ← 停止（設計は人間確認推奨）
↓
🚫タスク    ← 停止
↓
🚫実装      ← 停止（実装は人間確認推奨）
↓
🚫検査      ← 停止
↓
🚫デプロイ  ← 停止（デプロイは必ず人間確認）
```

### 自動実行時の挙動

[自動実行]ボタンを押すと：

1. 現在のフェーズを判定
2. 自動実行許可がある場合、該当コマンドを実行
3. 完了後、spec-reviewerがspec.jsonを更新
4. 次フェーズの自動実行許可を確認
5. 許可があれば続行、なければ停止

### 自動実行の停止条件

以下の場合、自動実行は停止する：

1. **自動実行許可が🚫のフェーズに到達**
2. **エスカレーション発生**
3. **validate-*の失敗**
4. **エージェントプロセスのエラー終了**

停止時はUIに通知を表示し、人間の操作を待つ。

## validate-*失敗時の挙動

### 失敗の種類と対応

| 失敗種類 | 自動実行時の挙動 | 手動実行時の挙動 |
|----------|-----------------|-----------------|
| 軽微な警告 | 続行（ログに記録） | 警告表示、続行可能 |
| 中程度の問題 | 停止、エスカレーション | 問題表示、修正 or 続行選択 |
| 重大な問題 | 停止、エスカレーション | 問題表示、修正必須 |

### 失敗時のspec.json更新

```json
{
  "validation_results": {
    "gap": {
      "executed_at": "2024-01-15T10:00:00Z",
      "status": "passed",
      "warnings": []
    },
    "design": {
      "executed_at": "2024-01-15T11:00:00Z",
      "status": "failed",
      "errors": [
        {
          "severity": "high",
          "message": "設計がREQ-003を満たしていません",
          "suggestion": "認証フローの追加が必要です"
        }
      ],
      "warnings": [
        {
          "severity": "medium",
          "message": "パフォーマンス考慮が不足しています"
        }
      ]
    }
  }
}
```

### リトライ機能

validate失敗後の選択肢：

1. **[修正して再検証]**: 前のフェーズに戻り、修正後に再度validateを実行
2. **[警告を無視して続行]**: 軽微な警告の場合のみ選択可能
3. **[エスカレーション]**: 人間の判断を仰ぐ

---

# イベントフロー

## システム全体のイベントフロー図

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     UI       │     │ Orchestrator │     │ Spec Manager │
│  (Frontend)  │     │  (Backend)   │     │   (Backend)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ [実行]ボタン押下    │                    │
       │───────────────────>│                    │
       │                    │ start-phase        │
       │                    │───────────────────>│
       │                    │                    │
       │                    │      ┌─────────────┴─────────────┐
       │                    │      │  SDDエージェント実行        │
       │                    │      │  (requirements/design/     │
       │                    │      │   tasks/impl)              │
       │                    │      └─────────────┬─────────────┘
       │                    │                    │
       │                    │                    │ プロセス完了
       │                    │                    ▼
       │                    │      ┌─────────────────────────┐
       │                    │      │    spec-reviewer起動     │
       │                    │      │    - spec.json更新       │
       │                    │      │    - エスカレーション検出  │
       │                    │      └─────────────┬───────────┘
       │                    │                    │
       │                    │ spec-updated       │
       │                    │<───────────────────│
       │ state-changed      │                    │
       │<───────────────────│                    │
       │                    │                    │
       ▼                    ▼                    ▼
   UI更新              次アクション判定      待機
```

## イベント一覧

| イベント名 | 発火元 | 購読者 | ペイロード |
|-----------|--------|--------|-----------|
| `phase-start` | Orchestrator | UI, Spec Manager | { feature, phase, command } |
| `phase-complete` | Spec Manager | Orchestrator, UI | { feature, phase, status, duration } |
| `spec-updated` | spec-reviewer | Orchestrator, UI | { feature, changes } |
| `escalation-created` | spec-reviewer | Orchestrator, UI | { feature, escalation } |
| `escalation-resolved` | UI | Orchestrator, spec-reviewer | { feature, escalationId, resolution } |
| `auto-run-start` | UI | Orchestrator | { feature, fromPhase } |
| `auto-run-stop` | Orchestrator | UI | { feature, atPhase, reason } |
| `validation-complete` | Spec Manager | Orchestrator, UI | { feature, type, result } |

---

# 状態遷移図

## フェーズ状態

```
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │ [実行]
                         ▼
                    ┌─────────┐
          ┌────────│ running │────────┐
          │        └────┬────┘        │
          │             │             │
     エラー発生      正常完了      エスカレーション
          │             │             │
          ▼             ▼             ▼
     ┌────────┐   ┌───────────┐  ┌────────────┐
     │ failed │   │ generated │  │ escalated  │
     └────┬───┘   └─────┬─────┘  └──────┬─────┘
          │             │               │
          │             │ [承認]        │ 解決
          │             ▼               │
          │       ┌──────────┐          │
          └──────>│ approved │<─────────┘
                  └──────────┘
```

## 自動実行状態

```
     ┌────────┐
     │  idle  │ ← 自動実行停止中
     └────┬───┘
          │ [自動実行]
          ▼
     ┌─────────┐
     │ running │ ← 自動実行中
     └────┬────┘
          │
    ┌─────┴─────┬──────────────┐
    │           │              │
    ▼           ▼              ▼
┌───────┐  ┌─────────┐  ┌───────────┐
│paused │  │completed│  │ escalated │
└───┬───┘  └─────────┘  └─────┬─────┘
    │                         │
    │ [再開]                   │ 解決後[再開]
    └─────────────────────────┘
              │
              ▼
         ┌─────────┐
         │ running │
         └─────────┘
```

---

# API設計（概要）

## Orchestrator API

```typescript
// フェーズ実行
POST /api/specs/:feature/phases/:phase/execute
Body: { autoApprove?: boolean }

// 自動実行開始
POST /api/specs/:feature/auto-run/start
Body: { fromPhase?: string }

// 自動実行停止
POST /api/specs/:feature/auto-run/stop

// エスカレーション解決
POST /api/specs/:feature/escalations/:id/resolve
Body: { action: string, value?: any, comment?: string }

// 自動実行許可設定
PUT /api/specs/:feature/auto-run/permissions
Body: { requirements: boolean, design: boolean, ... }
```

## WebSocket イベント

```typescript
// 購読
ws.subscribe('spec:feature-name')

// 受信イベント
{ event: 'phase-complete', data: { phase, status } }
{ event: 'escalation-created', data: { escalation } }
{ event: 'spec-updated', data: { changes } }
```

---

# 今後の検討事項

1. **並列実行**: 複数の機能を同時にSDD実行する場合のリソース管理
2. **ロールバック**: フェーズを戻す機能の要否
3. **履歴管理**: 過去の実行履歴の保存と参照
4. **テンプレート**: 自動実行許可設定のプリセット
5. **通知設定**: エスカレーション通知のカスタマイズ（Slack連携等）
