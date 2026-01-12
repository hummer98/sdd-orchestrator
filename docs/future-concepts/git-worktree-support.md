# Git Worktree対応構想

## 概要

SDD Orchestratorをgit worktreeに対応させ、mainブランチでの作業と並行して実装作業を行えるようにする。

## Git Worktreeとは

### 基本概念

```
git worktree add ../feature-branch feature-branch
```

1つのgitリポジトリから複数の作業ディレクトリを作成する機能。

```
main-repo/          ← メインworktree（.gitが実体）
├── .git/           ← 実際のgitデータ
├── .kiro/
└── src/

feature-branch/     ← 追加worktree（.gitがファイル）
├── .git           ← ファイル: "gitdir: ../main-repo/.git/worktrees/feature-branch"
├── .kiro/         ← ブランチに含まれていればworktreeにも存在
└── src/
```

---

## 想定する運用モデル

### 基本方針

- SDD Orchestratorは**常にmain-repoで開く**
- `.kiro/` はgit管理し、ブランチ機構で共有
- **impl/inspectionフェーズのみ**worktree側をデータソースとして参照
- 最終的にmainにマージして合流

### データソースの切り替え

```
┌─────────────────────────────────────────────────────────────┐
│ SDD Orchestrator (main-repoで開く)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Spec一覧: main-repo/.kiro/specs/ を参照（常に）            │
│                                                             │
│  フェーズ別データソース:                                    │
│    ┌──────────────┬─────────────────────────────────┐       │
│    │ フェーズ     │ データソース                    │       │
│    ├──────────────┼─────────────────────────────────┤       │
│    │ requirements │ main-repo（仕様策定はmainで）   │       │
│    │ design       │ main-repo（設計もmainで）       │       │
│    │ tasks        │ main-repo（タスク定義もmainで） │       │
│    │ impl         │ worktree（実装はworktreeで）    │       │
│    │ inspection   │ worktree（検証もworktreeで）    │       │
│    └──────────────┴─────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Spec設定

```json
// spec.json
{
  "id": "worktree-support",
  "status": "impl",
  "worktree": {
    "enabled": true
    // path, branchは自動生成
  }
}
```

| 項目 | 値 | 備考 |
|---|---|---|
| worktreePath | `../{repo-name}-{specId}` | 自動生成 |
| branch | `specs/{specId}` | 自動生成 |

---

## ワークフロー

### 全体フロー

```
[requirements] main-repo
    ↓
[design] main-repo
    ↓
[tasks] main-repo
    ↓ worktreeモード有効時
[impl開始]
    - specs/{specId} ブランチ作成
    - git worktree add {autoPath} specs/{specId}
    - データソースをworktreeに切り替え
    ↓
[impl] worktree
    - AgentのcwdはworktreePath
    - spec.json/tasks.mdの更新はworktree側
    - SDD OrchestratorはworktreeのT.kiro/specs/{specId}/を監視
    ↓
[inspection] worktree
    - 実装検証もworktree側で実行
    ↓
[deploy] (spec-merge スキル)
    - worktree内でcommit
    - mainにsquash merge
    - worktree削除
    - ブランチ削除
    - データソースをmainに戻す
```

### コマンド例

```bash
# Phase 1: mainブランチでSpec作成
git checkout main
# SDD OrchestratorでSpec作成（requirements → design → tasks）
# spec.jsonでworktree.enabled = true に設定
git add .kiro/specs/worktree-support/
git commit -m "spec: worktree対応の仕様を追加"

# Phase 2: impl開始（自動実行）
# - ブランチ作成: specs/worktree-support
# - worktree作成: ../sdd-orchestrator-worktree-support
# - Agent起動: cwd = worktreePath

# Phase 3: deploy（spec-mergeスキル）
/kiro:spec-merge worktree-support
# - squash merge to main
# - cleanup (worktree, branch削除)
```

---

## 技術設計

### パーミッションの考慮

Agentはworktree内で起動するため、`settings.local.json` のパーミッションはworktree基準となる。

```
worktree/
├── .claude/settings.local.json   ← Agentはこれを参照
├── .kiro/specs/{specId}/         ← Agentがアクセス可能
└── src/                          ← Agentがアクセス可能

main-repo/
└── .kiro/specs/{specId}/         ← Agentからはアクセス困難（親ディレクトリ）
```

**解決策**: impl/inspectionフェーズではworktree側の `.kiro/specs/` を直接参照・更新する。SDD Orchestratorもworktree側を監視する。

### 監視パスの切り替え

```typescript
// specManagerService.ts
getSpecDataPath(specId: string): string {
  const spec = this.getSpec(specId);

  // worktreeモードかつimpl/inspectionフェーズの場合
  if (spec.worktree?.enabled && ['impl', 'inspection'].includes(spec.status)) {
    const worktreePath = this.getWorktreePath(specId);
    return path.join(worktreePath, '.kiro', 'specs', specId);
  }

  // 通常時
  return path.join(this.projectPath, '.kiro', 'specs', specId);
}

getWorktreePath(specId: string): string {
  const repoName = path.basename(this.projectPath);
  return path.join(path.dirname(this.projectPath), `${repoName}-${specId}`);
}
```

### spec-merge スキル

```bash
/kiro:spec-merge {specId}
```

処理内容:
1. worktree内で未コミットの変更をcommit
2. `git checkout main`
3. `git merge --squash specs/{specId}`
4. `git commit -m "feat({specId}): 実装完了"`
5. `git worktree remove {worktreePath}`
6. `git branch -d specs/{specId}`

コンフリクト発生時:
- コンフリクト箇所を表示
- 解決を支援（Agentによる自動解決または手動解決の案内）

---

## UI設計

### Implementationパネル

```
┌─────────────────────────────────────────┐
│ Implementation                          │
├─────────────────────────────────────────┤
│ Mode: 🌿 Worktree                       │
│                                         │
│ Tasks:                                  │
│   ✓ Task 1: 基本構造の実装             │
│   → Task 2: 監視パス切り替え           │
│   ○ Task 3: UIの更新                   │
│                                         │
│ [Continue] [Deploy]                     │
└─────────────────────────────────────────┘
```

- worktreeモード時は「🌿 Worktree」と表示
- Path/Branch名は表示不要（specIdから自明）
- Deployボタンで `spec-merge` スキル実行

---

## 影響範囲

### 高影響（必須変更）

| ファイル | 変更内容 |
|---|---|
| `specManagerService.ts` | worktreePath計算、データソース切り替え |
| `agentProcess.ts` | cwd指定の分離 |
| `specsWatcher.ts` | 監視パスの動的切り替え |

### 中影響

| ファイル | 変更内容 |
|---|---|
| `spec.json` スキーマ | `worktree` フィールド追加 |
| UI (WorkflowView等) | worktreeモード表示、Deployボタン |
| IPC handlers | worktree関連コマンド |

### 新規追加

| ファイル | 内容 |
|---|---|
| `spec-merge` スキル | マージ・クリーンアップ処理 |
| `worktreeService.ts` | worktree操作のラッパー |

---

## 検討事項

### Q1: spec.jsonの分離は必要か

**結論**: 分離しない

worktreeモードでは、main側とworktree側でspec.jsonが別々に存在する。分離（spec.json + impl.json）を検討したが、以下の理由で不採用：

**spec.jsonのフィールド分析**:

| フィールド | 更新タイミング | impl中にmainで更新？ |
|---|---|---|
| `feature_name` | 初期化時のみ | なし |
| `created_at` | 初期化時のみ | なし |
| `language` | 初期化時のみ | なし |
| `phase` | フェーズ遷移時 | impl中は変更なし |
| `approvals` | 承認時 | impl前に確定済み |
| `autoExecution` | 設定変更時 | 稀（impl中に変更するユースケースがない） |
| `documentReview` | レビュー実行時 | impl/inspection中のみ |
| `updated_at` | 各操作時 | 競合の可能性あるが実害なし |

**判断**:
- impl中にmain側でspec.jsonを意図的に更新するユースケースは実質ない
- `updated_at` の競合は無視できる（参考情報のため）
- `spec-merge` 時はworktree側のspec.jsonを正として採用

### Q2: .kiroをgit管理すべきか

**推奨**: git管理する。ただし以下は `.gitignore` で除外：

```gitignore
.kiro/runtime/
.kiro/specs/*/logs/
```

### Q2: マージ戦略

**採用**: squash merge

- 実装中の細かいコミットを1つにまとめる
- mainの履歴がクリーンに保たれる

### Q3: コンフリクト時の対応

**採用**: `spec-merge` スキルで対応

- rebase試行
- コンフリクトあれば解決支援
- 自動解決できない場合は手動解決を案内

### Q4: worktreeモードの変更可否

**結論**: worktreeディレクトリが存在したら変更不可

**状態遷移**:

```
[tasks完了]
  worktree.enabled = true (設定のみ)
  worktreeディレクトリ = 存在しない
  → トグル変更可能
    ↓
[impl開始]
  ブランチ作成 + worktree作成
  worktreeディレクトリ = 存在する
  → トグル変更不可
    ↓
[deploy完了]
  マージ + worktree削除
  worktreeディレクトリ = 存在しない
```

**判定ロジック**:

```typescript
function canToggleWorktreeMode(spec: Spec): boolean {
  // worktreeディレクトリが存在しなければ変更可能
  return !worktreeExists(spec);
}

function worktreeExists(spec: Spec): boolean {
  if (!spec.worktree?.enabled) return false;
  const worktreePath = getWorktreePath(spec.id);
  return fs.existsSync(worktreePath);
}
```

**UI表示**:

| 状態 | worktreeトグル |
|---|---|
| `worktree.enabled = false` | 変更可能 |
| `worktree.enabled = true` かつ worktree未作成 | 変更可能 |
| `worktree.enabled = true` かつ worktree存在 | 変更不可（disabled表示） |

**やり直したい場合**: `spec-merge --abort` でworktree破棄 → 最初からやり直し

---

## 開発方針

worktree対応機能の開発自体はSelf-Dogfoodingできない（worktree機能がないとworktreeで開発できない）。

### 開発フロー

```
[Phase 1] 通常モードで実装
  - mainブランチで直接実装
  - または手動でworktree作成してClaude Code CLIで作業
  - SDD Orchestratorのworktree機能は使わない

[Phase 2] 機能完成後にSelf-Test
  - 別のspec（テスト用）でworktreeモードを試す
  - 動作確認・バグ修正
```

---

## 次のステップ

1. **本ドキュメントをコミット**（mainブランチ）
2. **Spec作成**（requirements → design → tasks）
3. **worktree作成して実装開始**
4. **実装中に発見した課題をドキュメントに追記**

---

## 参考資料

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [.git file format in worktrees](https://git-scm.com/docs/gitrepository-layout)

---

## 付録: 現在のパス依存一覧

```
projectPath/
├── .git/                          # git root detection
├── .kiro/
│   ├── sdd-orchestrator.json      # layoutConfigService
│   ├── steering/                  # fileService
│   ├── specs/
│   │   └── {specId}/
│   │       ├── spec.json          # specManagerService
│   │       ├── requirements.md    # specManagerService
│   │       ├── design.md          # specManagerService
│   │       ├── tasks.md           # specManagerService
│   │       └── logs/
│   │           └── {agentId}.log  # logFileService（git除外推奨）
│   ├── bugs/
│   │   └── {bugId}/
│   │       └── report.md          # bugService
│   └── runtime/
│       └── agents/
│           └── {agentId}.pid      # agentRecordService（git除外推奨）
└── .claude/
    └── settings.local.json        # permissionsService
```
