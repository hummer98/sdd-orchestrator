# Requirements: Bug Create Dialog Unification

## Decision Log

### Worktree作成タイミング
- **Discussion**: BugのWorktreeモードは現在bug-fix時に作成される設計だが、Specではspec-plan時に早期作成される。UIを統一するにあたり、どちらの方式を採用するか検討。
- **Conclusion**: bug-create時にWorktreeを作成する（Specと同様の早期作成方式）
- **Rationale**: UIの一貫性を保ち、ユーザーがスイッチをONにした時点でWorktreeが作成される期待に応える。

### UIデザイン統一
- **Discussion**: CreateBugDialogとCreateSpecDialogの差異（サイズ、Worktreeスイッチ、ボタンアイコン、ボタン色）をどこまで統一するか。
- **Conclusion**: 全ての要素をCreateSpecDialogに合わせて統一する
- **Rationale**: 同じアプリ内で類似機能のダイアログは一貫したUXを提供すべき。

## Introduction

CreateBugDialogをCreateSpecDialogと同等のUIに統一し、Worktreeモードでのバグ作成をサポートする。これにより、SpecとBugの作成体験が一貫したものになり、Worktreeによる分離開発をbug-create時点から選択可能になる。

## Requirements

### Requirement 1: ダイアログサイズの統一

**Objective:** ユーザーとして、バグ作成ダイアログがSpec作成ダイアログと同等のサイズで表示されることで、一貫したUI体験を得たい。

#### Acceptance Criteria
1. CreateBugDialogの幅は `max-w-xl` とする（現行: `max-w-md`）
2. テキストエリアの行数は5行とする（現行: 4行）

### Requirement 2: Worktreeモードスイッチの追加

**Objective:** ユーザーとして、バグ作成時にWorktreeモードを選択できることで、分離された環境でバグ修正を開始したい。

#### Acceptance Criteria
1. CreateSpecDialogと同様のWorktreeモードスイッチUIを追加する
   - GitBranchアイコン
   - トグルスイッチ（role="switch"）
   - 「Worktreeモードで作成」ラベル
2. スイッチON時、紫色のハイライト表示となる
3. スイッチON時、説明文「ブランチとWorktreeを作成し、分離された環境で開発を行います。mainブランチで実行する必要があります。」を表示する
4. data-testid="worktree-mode-switch" を付与する

### Requirement 3: ボタンデザインの統一

**Objective:** ユーザーとして、バグ作成ボタンがSpec作成ボタンと一貫したデザインであることで、操作の予測可能性を高めたい。

#### Acceptance Criteria
1. ボタンアイコンを `Plus` から `AgentIcon`/`AgentBranchIcon` に変更する
   - Worktreeモード OFF: `AgentIcon`
   - Worktreeモード ON: `AgentBranchIcon`
2. ボタン色をWorktreeモードに応じて変更する
   - Worktreeモード OFF: `bg-blue-500 hover:bg-blue-600`
   - Worktreeモード ON: `bg-violet-500 hover:bg-violet-600`
3. ボタンラベルは「作成」のまま維持する

### Requirement 4: bug-createコマンドのWorktreeサポート

**Objective:** システムとして、bug-createコマンドが--worktreeフラグを受け取り、Worktreeを早期作成できるようにしたい。

#### Acceptance Criteria
1. bug-createコマンドが `--worktree` フラグを受け付ける
2. `--worktree` フラグ指定時、以下の処理を行う:
   - mainまたはmasterブランチであることを確認する
   - `git branch bugfix/{bug-name}` でブランチを作成する
   - `git worktree add .kiro/worktrees/bugs/{bug-name} bugfix/{bug-name}` でWorktreeを作成する
3. bug.jsonにworktreeフィールドを追加する:
   ```json
   {
     "worktree": {
       "enabled": true,
       "path": ".kiro/worktrees/bugs/{bug-name}",
       "branch": "bugfix/{bug-name}",
       "created_at": "{timestamp}"
     }
   }
   ```
4. Worktree作成失敗時はブランチをロールバックする

### Requirement 5: IPC層のWorktreeモード対応

**Objective:** システムとして、RendererからMainへWorktreeモードを伝達できるようにしたい。

#### Acceptance Criteria
1. `executeBugCreate`のシグネチャに`worktreeMode: boolean`パラメータを追加する
2. preload/index.tsで`worktreeMode`をIPCに渡す
3. handlers.tsで`worktreeMode`がtrueの場合、コマンドに`--worktree`フラグを付与する
4. electron.d.tsの型定義を更新する

### Requirement 6: テストの更新

**Objective:** 開発者として、変更箇所が適切にテストされていることで、品質を担保したい。

#### Acceptance Criteria
1. CreateBugDialog.test.tsxにWorktreeモードスイッチのテストを追加する
   - スイッチの表示確認
   - スイッチのトグル動作確認
   - Worktreeモード時のボタンスタイル確認
2. `executeBugCreate`呼び出し時にworktreeModeが渡されることを確認するテストを追加する

## Out of Scope

- bug-fixコマンドのWorktree作成ロジックの変更（既存のまま維持）
- CreateBugDialogRemote（Remote UI版）の変更
- ヘッダーアイコン（Bugアイコン）の変更

## Open Questions

- なし（全ての懸念事項は対話で解決済み）
