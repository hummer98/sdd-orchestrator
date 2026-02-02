# 協調動作するソフトウェア開発用AIエージェント群 - 設計ドキュメント

## 概要

Spec-Driven Development (SDD) に基づいて、複数のAIエージェントが協調してソフトウェア開発を進めるシステムの設計。

## 基本方針

- **状態管理**: Trelloをメインの状態管理UIとして使用（オンメモリでクエリ）
- **Spec文書**: `.kiro/specs/[feature]/` に準拠（cc-sdd）
- **実装言語**: 不定（モノレポ対応）
- **ブランチ戦略**: spec毎に専用ブランチ
- **自動マージ**: AIが判断可能な場合は自動マージ

---

## システムアーキテクチャ

### 4層構造

```
┌─────────────────────────────────────────────────────────┐
│ Layer 0: Human Interface                                 │
│ - Trello (可視化・手動介入)                              │
│ - Notification (Slack/Email)                             │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Orchestrator (常駐プロセス)                     │
│ 役割: 交通整理・ヘルスチェック                             │
│ - 新規spec検出                                           │
│ - 停滞spec検出                                           │
│ - pending解除チェック                                     │
│ - Spec Manager管理（subprocess）                         │
│ - Webhook受信（optional）                                │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Dependency Coordinator (依存関係管理)           │
│ 役割: Spec間の依存関係分析・実行順序の決定                │
│ - design完了時に呼び出される                             │
│ - 実行中specとのコンフリクトチェック                      │
│ - pending判定                                           │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Spec Manager (spec単位のライフサイクル)         │
│ 役割: 単一specの進行管理                                 │
│ - SDD Agentの起動・監視                                  │
│ - 自動マージ判断                                         │
│ - エスカレーション処理                                    │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│ Layer 4: SDD Agent (実行層)                              │
│ 役割: cc-sddワークフローの実行                            │
│ - requirement/design/tasks/implementation                │
│ - テスト実行                                             │
│ - PR作成                                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 主要コンポーネント

### 1. Orchestrator（常駐プロセス）

#### 責務

- Trelloボードの監視（全カードをオンメモリで管理）
- Spec Managerの起動・停止
- ゾンビプロセス検出
- pending解除判定

#### 実行モデル

```
Main Loop（30秒毎）:
1. Webhook eventキューをチェック（優先処理）
2. Trelloから全カード取得（5-15分毎）
3. PIDファイルから実行中spec確認
4. 必要なアクションを実行
   - 新規spec起動
   - pending解除
   - ゾンビ検出・再起動
```

#### Webhook統合

```
Webhook Server（同一プロセス内）:
- Trelloからのイベントを受信
- ローカルキューに追加
- .kiro/runtime/webhook_queue/ に保存
- Main Loopが処理
```

#### プロセス管理

```
状態管理:
- メモリ内: running_specs = {spec_id: process}
- ディスク: .kiro/runtime/spec_managers/{spec_id}.pid

PIDファイル内容:
{
  "pid": 12345,
  "spec_id": "user-auth",
  "phase": "implementation",
  "started_at": "2025-11-19T10:30:00Z",
  "last_heartbeat": "2025-11-19T10:35:00Z",
  "status": "running"
}
```

#### シングルトン保証

- 単一プロセス内でメモリ管理
- 起動前にrunning_specsをチェック
- 二重起動を防止

---

### 2. Dependency Coordinator

#### 責務（最小化）

- **唯一の責務**: design完了時のコンフリクトチェック

#### 実行タイミング

- Spec Managerがdesign完了時に呼び出し
- その他のタイミングでは実行しない

#### 処理フロー

```
Coordinator.check_conflicts(spec_id):
1. 対象specのdesignから影響ファイル/モジュールを抽出（AI使用）

2. Trelloから実行中の他specを取得:
   - current_phase IN ('tasks', 'implementation', 'testing')
   - status = 'active'

3. 各実行中specと比較:
   - design_files_affected の重複チェック
   - モジュールレベルのコンフリクトチェック

4. コンフリクトがあれば:
   - spec.status = "pending"
   - spec.blocked_by = [blocking_spec_ids]
   - Trelloラベル: "⏸ Pending: [理由]"

5. コンフリクトなければ:
   - 次フェーズ（tasks）へ進行
```

#### モノレポ対応

```
影響分析でAIが判断する項目:
- 変更するファイル/モジュール
- 言語（Python, TypeScript等）
- API契約の変更（OpenAPI等）
- 共有型定義の変更
- データベーススキーマ変更
```

---

### 3. Spec Manager（subprocess）

#### 責務

- 単一specのライフサイクル管理
- cc-sddワークフローの実行
- エスカレーション判断
- 自動マージ判断

#### フェーズ遷移

```
ready → requirement → design → [Coordinator] → tasks → implementation → testing → done
                                     ↓
                                  pending（コンフリクト時）
```

#### design完了時の特別処理

```
design完了:
1. Coordinatorを呼び出し
2. result = Coordinator.check_conflicts(spec_id)
3. if result.status == "pending":
     - Trelloにpendingラベル追加
     - blocked_byに理由記録
     - 処理を停止（待機）
4. else:
     - tasksフェーズへ進行
```

#### 実装

```
サブプロセスとしてClaude Codeを起動:
- claude --print /cc-sdd/requirement
- claude --print /cc-sdd/design
- claude --print /cc-sdd/tasks
- claude --print /cc-sdd/implementation

各フェーズで:
- 成果物を.kiro/に保存
- next_actionを判定（continue/escalate）
- エスカレーション時は人間に通知
```

#### 自動マージ判断

```
implementation完了時:
1. 自動テスト実行
2. PR作成
3. AIにマージ判断させる:
   - テスト結果
   - 変更内容
   - リスク評価
4. 自動マージ可能なら即マージ
5. 不可能なら人間レビュー依頼
```

---

### 4. SDD Agent

#### 責務

- cc-sddワークフローの実行のみ
- ステートレス（.kiro/のSpec文書がコンテキスト）

#### 実装

Claude Code (–printモード) を使用して:

- /cc-sdd/requirement
- /cc-sdd/design
- /cc-sdd/tasks
- /cc-sdd/implementation

各コマンドが成果物を生成

#### next_action判定

```
各フェーズ完了時に返す:
{
  "next_action": "continue" | "escalate",
  "phase_output": "...",
  "reason": "...",  // escalateの場合必須
  "confidence": 0.0-1.0
}

escalateの条件例:
- 要件の曖昧性
- 技術的判断が必要
- リスクがある
- エラー解決不能
- 仕様外の発見
```

---

## データ構造

### Trello構造

#### ボード列

```
Ready → Requirement → Design → Tasks → Implementation → Testing → Done
                                ↓
                            Pending（別列または同じ列でラベル管理）
```

#### カード構造

```
タイトル: Spec名（例: "ユーザー認証機能"）

説明欄:
- spec_id: user-auth
- GitHub branch: feature/user-auth
- .kiro/パス: specs/user-auth/

ラベル:
- フェーズ: requirement/design/tasks/implementation/testing
- 状態: active/pending/blocked
- 実行状態: 🔄 Running

カスタムフィールド:
- blocked_by: spec_id1,spec_id2
- last_updated: timestamp
- executor_pid: 12345
- last_heartbeat: timestamp

添付ファイル:
- GitHub PR URL
- .kiro/specs/user-auth/ へのリンク

コメント:
- エージェント実行ログのサマリー
- エスカレーション理由
- 人間のレビューコメント
```

### ファイルシステム構造

```
project/
├── .kiro/
│   ├── specs/
│   │   └── [feature]/
│   │       ├── spec.json            # cc-sddメタデータ
│   │       ├── requirements.md
│   │       ├── design.md
│   │       ├── tasks.md
│   │       └── implementation.md
│   ├── steering/
│   │   ├── product.md              # プロダクトガイドライン
│   │   ├── tech.md                 # 技術標準
│   │   └── structure.md            # プロジェクト構造
│   └── runtime/
│       ├── webhook_queue/          # Webhookイベント
│       │   └── 2025-11-19-*.json
│       ├── spec_managers/          # PIDファイル
│       │   └── {spec_id}.pid
│       └── orchestrator.pid
│
├── .claude/commands/kiro/          # Claude Codeコマンド
├── CLAUDE.md                        # cc-sdd設定
└── [実際のコード]
```

---

## 実装の優先順位

### Phase 1: 基礎構築（Week 1-2）

```
目標: 単一specを手動で実行できる

実装:
1. Spec Manager基本実装
   - Claude Code（--print）のサブプロセス起動
   - 出力パース
   - .kiro/への書き込み確認

2. 手動実行での検証
   $ python spec_manager.py --spec user-auth --phase requirement

3. エスカレーション検出
   - next_action判定
   - 出力フォーマット定義
```

### Phase 2: Trello連携（Week 3）

```
目標: Trelloと連携した状態管理

実装:
1. Trello API統合
   - カード作成・更新
   - ラベル管理
   - コメント投稿

2. Spec Manager完了時の自動更新
   - フェーズ移動
   - ステータス更新
```

### Phase 3: Coordinator追加（Week 4）

```
目標: コンフリクト検出とpending管理

実装:
1. Dependency Coordinator
   - design解析（AIで影響ファイル予測）
   - 実行中specとの重複チェック
   - pending判定

2. pending解除ロジック
   - blocking specの完了検知
   - 自動再開
```

### Phase 4: Orchestrator完成（Week 5-6）

```
目標: 自動化・常時実行

実装:
1. 常駐プロセス化
   - Main Loop実装
   - PIDファイル管理
   - プロセス監視

2. Webhook受信（optional）
   - Flask/FastAPI統合
   - イベントキュー
   - ngrok設定

3. ヘルスチェック
   - ゾンビ検出
   - 停滞検出
   - 自動再起動
```

### Phase 5: 洗練（Week 7+）

```
1. 自動マージロジック
   - テスト統合
   - マージ判断精度向上

2. モニタリング
   - ダッシュボード
   - 統計データ収集
   - 性能最適化

3. エラーハンドリング強化
   - リトライロジック
   - フォールバック処理
```

---

## 技術的決定事項

### 状態管理: Trelloのみ、DBなし

**理由:**

- 進行中spec数は10-30程度
- 全カードをオンメモリで処理可能（数KB × 30 = 100KB程度）
- Trelloが真実の源泉として機能
- DB同期の複雑さを回避

**実装:**

```python
# Orchestrator Main Loop
active_specs = trello.get_cards(exclude_list="Done")  # 10-30枚
pending_specs = [s for s in active_specs if "pending" in s.labels]
# メモリ上で自由に操作
```

### アーキテクチャ: 常駐Orchestrator

**理由:**

- シングルトン保証が自然
- プロセス管理が単純
- キューイング不要
- デバッグ容易
- spec数10-30なら十分な性能

**FaaS化しない理由:**

- 初期は過剰設計
- シングルトン保証が複雑化（分散ロック必要）
- 必要になったら（spec数 > 50）検討

### プロセス管理: PIDファイル + メモリ

**実装:**

```
Orchestrator（メモリ内）:
  running_specs = {
    "user-auth": SubprocessHandle,
    "payment-api": SubprocessHandle
  }

ディスク（永続化）:
  .kiro/runtime/spec_managers/{spec_id}.pid

二重起動チェック:
  if spec_id in running_specs:
    return "already_running"
```

### Coordinator: design完了時のみ実行

**理由:**

- 責務を最小化
- designでファイル/モジュールへの影響が確定
- それ以前は予測不要
- それ以降は変更されない（はず）

**実装:**

```python
# Spec Manager内
if current_phase == "design" and result.success:
    conflict_result = Coordinator.check_conflicts(spec_id)
    if conflict_result.has_conflict:
        set_pending(spec_id, conflict_result.blocked_by)
        return  # 待機
    else:
        move_to_phase("tasks")
```

### モノレポ対応

**前提:**

- バックエンド・フロントエンドで異なる言語
- spec毎にGitHubブランチ
- APIスキーマ（OpenAPI等）の共有

**Coordinatorの影響分析:**

```
AIに依頼する分析:
1. どのファイル/モジュールに影響するか
2. どの言語か（Python, TypeScript等）
3. API契約の変更があるか
4. 共有型定義の変更があるか
5. 他のspecとファイルレベルで重複するか
```

---

## エスカレーション戦略

### エスカレーションの定義

AIが自力で判断・実装できない状況を人間に通知すること

### トリガー条件

SDD Agentのプロンプトに明示:

```
"escalate"を返すケース:
1. 要件の曖昧性: 「○○機能のユーザー体験について判断が必要」
2. 技術的判断: 「アーキテクチャ選択：方式AとB、どちらが適切か」
3. リスク: 「パフォーマンスに影響する可能性：○○の確認が必要」
4. エラー解決不能: 「3回試行後もエラー解決できず」
5. 仕様外の発見: 「要件にない○○が必要と判明」
```

### 処理フロー

```
SDD Agent:
  return {
    "next_action": "escalate",
    "reason": "具体的な理由"
  }
  ↓
Spec Manager:
  Trelloにコメント投稿
  Trelloラベル: "👤 Review Needed"
  人間をアサイン
  処理を一時停止
  ↓
人間:
  Trelloで判断・指示をコメント
  ラベル削除
  ↓
Orchestrator:
  レビュー完了を検知（ラベル削除）
  Spec Manager再起動
```

---

## 自動マージ戦略

### 基本方針

AI判断で安全なら自動マージ、リスクがあれば人間レビュー

### 判断基準

```
必須条件（全て満たす）:
✓ すべてのテストがパス
✓ CI/CDがグリーン
✓ コードカバレッジが低下していない

リスク評価（全て低リスク）:
✓ API breaking changesがない
✓ データベーススキーマ変更がない（またはマイグレーション完璧）
✓ 共有ユーティリティの変更が限定的
✓ セキュリティ関連の変更がない
```

### 実装

```python
# Spec Manager内
async def handle_implementation_complete(spec_id):
    # 1. テスト実行
    test_result = run_tests(spec_id)
    if not test_result.passed:
        return request_fix(spec_id)

    # 2. PR作成
    pr = create_pull_request(spec_id)

    # 3. AIにマージ判断させる
    merge_decision = evaluate_auto_merge(spec_id, pr)

    if merge_decision.should_auto_merge:
        auto_merge(pr)
        move_to_done(spec_id)
    else:
        request_human_review(spec_id, merge_decision.reason)
```

---

## 運用シナリオ

### シナリオ1: 新規spec追加

```
1. 人間がTrelloの"Ready"列にカードを作成
   - タイトル: "ユーザー認証機能"
   - 説明: spec_id, 基本的な要件

2. Orchestrator検知（Webhook or 定期チェック）
   - 新規カードを発見
   - Spec Managerを起動

3. Spec Manager実行
   - requirement → design → [Coordinator] → tasks → implementation

4. 完了
   - PRマージ
   - Trelloカードを"Done"に移動
```

### シナリオ2: コンフリクト発生

```
1. Spec A: "ユーザー認証" が implementation中
   - 影響ファイル: backend/auth/

2. Spec B: "認証トークン更新" がdesign完了
   - 影響ファイル: backend/auth/token.py

3. Coordinator判定
   - ファイル重複を検出
   - Spec Bをpendingに設定
   - blocked_by: [Spec A]

4. Spec A完了・マージ
   - Orchestratorがpending解除を検知
   - Spec Bを再起動
```

### シナリオ3: エスカレーション

```
1. Spec Managerがdesignフェーズ実行中

2. SDD Agent判断
   - "認証方式の選択について人間の判断が必要"
   - next_action: "escalate"

3. Spec Manager処理
   - Trelloにコメント投稿
   - ラベル: "👤 Review Needed"
   - 人間にSlack通知

4. 人間が判断
   - Trelloで「OAuth 2.0を使用」とコメント
   - ラベル削除

5. Orchestrator検知
   - レビュー完了を検出
   - Spec Manager再起動
   - designフェーズから継続
```

---

## 将来的な拡張

### スケールアウトが必要になったら

**トリガー:**

- spec数 > 50
- 複数マシンでの並列実行が必要
- 高可用性が必要

**対応策:**

```
1. Redis等の外部状態管理導入
2. FaaS化（Cloud Functions等）
3. 分散ロック実装
4. Orchestratorの冗長化
```

### 高度な機能

```
- マルチプロジェクト対応（複数リポジトリ）
- AI学習ループ（過去の判断から学習）
- コスト最適化（モデル選択の自動化）
- ダッシュボード（可視化・統計）
```

---

## 参考資料

- cc-sdd: https://deepwiki.com/gotalab/cc-sdd
- Trello API: https://developer.atlassian.com/cloud/trello/
- Claude API: https://docs.anthropic.com/

---

## 付録: コード見積もり

```
orchestrator.py:        ~300行
spec_manager.py:        ~200行
coordinator.py:         ~150行
utils/trello.py:        ~100行
utils/pid.py:           ~50行
utils/github.py:        ~80行
utils/claude_code.py:   ~100行

合計: ~980行

実装期間: 6-8週間（1人で）
```

---

最終更新: 2025-11-24
バージョン: 1.0
