# Requirements: VCS Scheme Switching

## Decision Log

### VCSスキームの選択単位
- **Discussion**: Spec単位で選択 vs プロジェクト単位で選択
- **Conclusion**: プロジェクト設定でデフォルトを設定し、worktree作成時にspec.jsonへ記録
- **Rationale**: worktree操作時のみ影響があるため、worktree化タイミングで確定すれば十分

### 設定の保存場所
- **Discussion**: 新規ファイル vs 既存設定ファイル vs アプリ内DB
- **Conclusion**: `.kiro/sdd-orchestrator.json`の`settings`セクションに追加
- **Rationale**: 既存の設定構造を活用、プロジェクト単位での管理

### jjでのbranch相当機能
- **Discussion**: jjではbranch概念が廃止されbookmarkにリネーム
- **Conclusion**: jjモードでもbookmarkを作成する
- **Rationale**: git pushとの互換性、操作のわかりやすさ

### jj未インストール時の挙動
- **Discussion**: フォールバック vs エラー vs 選択不可
- **Conclusion**: エラーを出して処理を中断
- **Rationale**: 意図しない動作を防ぐ、明示的な選択を尊重

### 既存worktreeの扱い
- **Discussion**: 設定変更時に既存worktreeをどう扱うか
- **Conclusion**: 既存worktreeはspec.jsonに記録されたスキームで処理継続
- **Rationale**: 途中でスキームが変わると不整合が発生する

### Remote UI対応
- **Discussion**: Remote UIから設定変更を許可するか
- **Conclusion**: 対応しない（Desktop専用）
- **Rationale**: 設定変更はDesktop UIから行う運用

## Introduction

現在のSDD Orchestratorはjj優先・gitフォールバック方式でworktree操作を行っているが、この挙動をプロジェクト設定で明示的に選択可能にする。spec.jsonにworktree作成時のVCSスキームを記録し、merge等の操作は記録されたスキームに従って実行する。

## Requirements

### Requirement 1: プロジェクト設定でのVCSスキーム選択

**Objective:** プロジェクト管理者として、プロジェクトで使用するVCSスキーム（git/jj）を設定画面から選択したい。新規worktreeは選択したスキームで作成される。

#### Acceptance Criteria

1.1. `.kiro/sdd-orchestrator.json`の`settings`セクションに`vcsScheme`フィールドが追加される
```json
"settings": {
  "vcsScheme": "git"  // "git" | "jj"
}
```

1.2. `vcsScheme`フィールドが存在しない場合、デフォルトで`"git"`として扱う

1.3. 既存のプロジェクト設定画面にVCSスキーム選択UIが追加される

1.4. 選択肢は「Git」と「Jujutsu (jj)」の2つ

1.5. 設定変更は即座に`.kiro/sdd-orchestrator.json`に保存される

### Requirement 2: jjインストール検証

**Objective:** システムとして、jjが選択された場合にjjがインストールされているかを検証し、未インストールならエラーを表示したい。

#### Acceptance Criteria

2.1. VCSスキームを「jj」に変更しようとした時、jjコマンドの存在を確認する

2.2. If jjがインストールされていない場合, then エラーメッセージを表示し設定変更を拒否する

2.3. エラーメッセージは「jjがインストールされていません。インストール後に再度お試しください。」とする

2.4. worktree作成時にも再度jjの存在を確認し、未インストールならエラーで中断する

### Requirement 3: spec.jsonへのVCSスキーム記録

**Objective:** システムとして、worktree作成時にspec.jsonへ使用するVCSスキームを記録し、以降の操作で参照したい。

#### Acceptance Criteria

3.1. worktree作成時、`spec.json`の`worktree`オブジェクトに`vcsScheme`フィールドを追加する
```json
"worktree": {
  "path": ".kiro/worktrees/specs/{feature-name}",
  "branch": "feature/{feature-name}",
  "vcsScheme": "git",  // 新規追加
  "created_at": "...",
  "enabled": true
}
```

3.2. `worktree.vcsScheme`が存在しない既存spec.jsonは、`"git"`として扱う（後方互換性）

3.3. worktree作成後は、プロジェクト設定を変更しても当該specのVCSスキームは変わらない

### Requirement 4: create-spec-worktree.shのVCSスキーム対応

**Objective:** worktree作成スクリプトとして、指定されたVCSスキームに応じてgit worktreeまたはjj workspaceを使い分けたい。

#### Acceptance Criteria

4.1. スクリプトは引数または環境変数でVCSスキームを受け取る
```bash
create-spec-worktree.sh <feature-name> [git|jj]
# または
VCS_SCHEME=jj create-spec-worktree.sh <feature-name>
```

4.2. When VCSスキームが`git`の場合, the system shall `git worktree add`を使用する

4.3. When VCSスキームが`jj`の場合, the system shall `jj workspace add`と`jj bookmark create`を使用する

4.4. jjモードでの操作:
```bash
jj workspace add -r @- ".kiro/worktrees/specs/{feature-name}"
jj bookmark create "feature/{feature-name}"
```

4.5. パス構造はgit/jj共通: `.kiro/worktrees/specs/{feature-name}`

4.6. 同様に`create-bug-worktree.sh`も対応する

### Requirement 5: merge-spec.shのVCSスキーム対応

**Objective:** マージスクリプトとして、spec.jsonに記録されたVCSスキームを読み取り、適切なマージ操作を実行したい。

#### Acceptance Criteria

5.1. `merge-spec.sh`は`spec.json`から`worktree.vcsScheme`を読み取る

5.2. If `worktree.vcsScheme`が存在しないまたは`"git"`, then gitコマンドでマージを実行する

5.3. If `worktree.vcsScheme`が`"jj"`, then jjコマンドでマージを実行する

5.4. jjモードでのマージ操作:
```bash
jj squash --from "feature/{feature-name}" --into @
jj bookmark delete "feature/{feature-name}"
jj workspace forget ".kiro/worktrees/specs/{feature-name}"
```

5.5. 同様に`merge-bug.sh`も対応する

5.6. 現在の「jj優先・gitフォールバック」ロジックは削除し、spec.jsonの記録に従う

### Requirement 6: rebase-worktree.shのVCSスキーム対応

**Objective:** rebaseスクリプトとして、spec.jsonに記録されたVCSスキームに応じてrebase操作を実行したい。

#### Acceptance Criteria

6.1. `rebase-worktree.sh`は`spec.json`から`worktree.vcsScheme`を読み取る

6.2. If `worktree.vcsScheme`が`"git"`, then `git rebase`を使用する

6.3. If `worktree.vcsScheme`が`"jj"`, then `jj rebase`を使用する

6.4. jjモードでのrebase操作:
```bash
jj rebase -d main
```

### Requirement 7: Electron UI統合

**Objective:** UIとして、VCSスキーム設定を既存の設定画面に統合し、worktree操作時に適切なスクリプトを呼び出したい。

#### Acceptance Criteria

7.1. 既存のプロジェクト設定画面にVCSスキーム選択ドロップダウンを追加

7.2. 選択肢のラベル: 「Git」「Jujutsu (jj)」

7.3. 設定変更時にjjの存在チェックを行い、未インストールならエラー表示

7.4. worktree作成IPCハンドラは、プロジェクト設定からVCSスキームを取得しスクリプトに渡す

7.5. Remote UIからはVCSスキーム設定UIを非表示にする（Desktop専用）

## Out of Scope

- Spec個別でのVCSスキームオーバーライド（プロジェクト設定のみ）
- Remote UIからのVCSスキーム設定変更
- git/jj以外のVCS対応
- 既存worktreeのVCSスキーム変換機能
- jj colocatedモード（git + jj同時使用）への対応

## Open Questions

- jjのworkspace/bookmark操作でエラーが発生した場合のロールバック処理の詳細
- jj workspaceのパス指定で相対パス/絶対パスのどちらが適切か
