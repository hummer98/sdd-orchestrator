# Implementation Plan

## Task 1: 型定義とサービスインターフェース

- [x] 1.1 (P) VcsScheme型定義を追加
  - `VcsScheme`型（`'git' | 'jj'`）をshared/types/に定義
  - WorktreeConfig型にvcsSchemeオプショナルフィールドを追加
  - _Requirements: 3.1, 3.2_

- [x] 1.2 (P) SettingsFileManagerにVCSスキームメソッドを追加
  - `getVcsScheme(projectPath)`: 設定を読み取り、未設定時は"git"を返す
  - `setVcsScheme(projectPath, scheme)`: 設定を保存
  - sdd-orchestrator.jsonのsettingsセクションで管理
  - _Requirements: 1.1, 1.2_
  - _Method: SettingsFileManager.getVcsScheme, SettingsFileManager.setVcsScheme_
  - _Verify: Grep "getVcsScheme|setVcsScheme" in settingsFileManager.ts_

## Task 2: jjインストール検証

- [x] 2.1 ProjectCheckerのjjチェック機能を活用
  - 既存の`checkJjAvailability()`メソッドを再利用
  - jj設定変更時およびworktree作成時に呼び出し
  - 未インストール時は日本語エラーメッセージを返す
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: ProjectChecker.checkJjAvailability_
  - _Verify: Grep "checkJjAvailability" in channels.ts, handlers.ts_

## Task 3: IPCチャンネル追加

- [x] 3.1 (P) VCSスキーム用IPCチャンネルを定義
  - `VCS_SCHEME_GET`: 現在のスキーム取得
  - `VCS_SCHEME_SET`: スキーム設定（jjチェック付き）
  - channels.tsにチャンネル名を追加
  - _Requirements: 7.4_
  - _Method: VCS_SCHEME_GET, VCS_SCHEME_SET_
  - _Verify: Grep "VCS_SCHEME" in channels.ts_

- [x] 3.2 (P) preload APIにvcsSchemeメソッドを追加
  - `getVcsScheme()`: Promise<VcsScheme>
  - `setVcsScheme(scheme)`: Promise<void>（jjチェック失敗時はエラー）
  - _Requirements: 7.4_
  - _Verify: Grep "getVcsScheme|setVcsScheme" in preload/index.ts_

- [x] 3.3 IPCハンドラを実装
  - VCS_SCHEME_GETハンドラ: SettingsFileManager.getVcsScheme呼び出し
  - VCS_SCHEME_SETハンドラ: jjチェック → SettingsFileManager.setVcsScheme
  - jj未インストール時はエラーレスポンスを返す
  - _Requirements: 2.2, 7.3_
  - _Verify: Grep "VCS_SCHEME" in handlers.ts_

## Task 4: UI実装 - VcsSchemeSelector

- [x] 4.1 VcsSchemeSelectorコンポーネントを作成
  - ドロップダウンで「Git」「Jujutsu (jj)」を選択
  - jj選択時にIPCでインストールチェックを実行
  - 未インストール時はエラーメッセージ「jjがインストールされていません。インストール後に再度お試しください。」を表示
  - isDesktopフラグを受け取りRemote UIでは非表示
  - _Requirements: 1.3, 1.4, 2.2, 2.3, 7.1, 7.2, 7.3, 7.5_
  - _Method: VcsSchemeSelector, PlatformProvider.isDesktop_
  - _Verify: Grep "VcsSchemeSelector" in ProjectSettingsDialog.tsx_

- [x] 4.2 ProjectSettingsDialogにVcsSchemeSelectorを統合
  - 既存の設定セクションにVcsSchemeSelector追加
  - 保存時にsetVcsScheme IPCを呼び出し
  - 設定変更は即座に保存
  - _Requirements: 1.5, 7.1_
  - _Verify: Grep "VcsSchemeSelector" in ProjectSettingsDialog.tsx_

## Task 5: Worktree作成スクリプトのVCSスキーム対応

- [x] 5.1 create-spec-worktree.shにVCSスキーム引数を追加
  - 第2引数または環境変数VCS_SCHEMEでスキーム指定
  - gitモード: `git worktree add -b feature/{name} {path}`
  - jjモード: `jj workspace add -r @- {path}` + `jj bookmark create feature/{name}`
  - パス構造は共通: `.kiro/worktrees/specs/{feature-name}`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Verify: Grep "VCS_SCHEME\|jj workspace" in create-spec-worktree.sh_

- [x] 5.2 create-bug-worktree.shにVCSスキーム引数を追加
  - create-spec-worktree.shと同様のロジック
  - bugfix/{bug-name}ブランチ/ブックマーク作成
  - _Requirements: 4.6_
  - _Verify: Grep "VCS_SCHEME\|jj workspace" in create-bug-worktree.sh_

- [x] 5.3 resources/templates/scriptsのテンプレートも更新
  - 上記スクリプトのテンプレート版を同様に更新
  - _Requirements: 4.1, 4.6_

## Task 6: Worktree作成IPC処理の更新

- [x] 6.1 worktreeHandlersを更新
  - worktree作成時にSettingsFileManagerからVCSスキームを取得
  - jjモード時はworktree作成前にjjインストールチェック
  - 未インストール時はエラーで中断
  - _Requirements: 2.4, 7.4_
  - _Verify: Grep "getVcsScheme" in worktreeHandlers_

- [x] 6.2 spec.json更新処理にvcsScheme記録を追加
  - worktree作成成功後、worktreeオブジェクトにvcsSchemeフィールドを追加
  - 既存のworktree作成フローを拡張
  - _Requirements: 3.1, 3.3_
  - _Verify: Grep "vcsScheme" in fileService.ts, worktreeService.ts_

- [x] 6.3 bugWorktreeHandlersも同様に更新
  - bug.jsonのworktreeオブジェクトにvcsScheme記録
  - _Requirements: 3.1_

## Task 7: Mergeスクリプトのスキーム記録参照対応

- [x] 7.1 merge-spec.shを更新
  - spec.jsonからworktree.vcsSchemeを読み取る（jq使用）
  - 存在しない場合は"git"として扱う（後方互換性）
  - gitモード: 既存のgit merge --squash処理
  - jjモード: `jj squash --from feature/{name} --into @` → `jj bookmark delete` → `jj workspace forget`
  - 「jj優先・gitフォールバック」ロジックを削除
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  - _Verify: Grep "worktree.vcsScheme\|jj squash" in merge-spec.sh_

- [x] 7.2 merge-bug.shを更新
  - merge-spec.shと同様のロジック
  - bug.jsonからvcsSchemeを読み取り
  - _Requirements: 5.5, 5.6_
  - _Verify: Grep "worktree.vcsScheme\|jj squash" in merge-bug.sh_

- [x] 7.3 resources/templates/scriptsのテンプレートも更新
  - 上記スクリプトのテンプレート版を同様に更新
  - _Requirements: 5.1, 5.5_

## Task 8: Rebaseスクリプトのスキーム記録参照対応

- [x] 8.1 rebase-worktree.shを更新
  - spec.json/bug.jsonからworktree.vcsSchemeを読み取る
  - 存在しない場合は"git"として扱う
  - gitモード: `git rebase main`
  - jjモード: `jj rebase -d main`
  - 「jj優先・gitフォールバック」ロジックを削除
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Verify: Grep "worktree.vcsScheme\|jj rebase" in rebase-worktree.sh_

- [x] 8.2 resources/templates/scriptsのテンプレートも更新
  - 上記スクリプトのテンプレート版を同様に更新
  - _Requirements: 6.1_

## Task 9: 後方互換性対応

- [x] 9.1 既存worktreeの処理を確認
  - vcsSchemeが存在しない既存spec.json/bug.jsonは"git"として動作することを確認
  - merge/rebaseスクリプトのフォールバック動作テスト
  - _Requirements: 3.2, 5.2_
  - _Verify: Grep "git" in merge-spec.sh for fallback logic_

## Task 10: テスト実装

- [x] 10.1 (P) SettingsFileManagerのユニットテスト
  - getVcsScheme: デフォルト値、保存値の読み取りをテスト
  - setVcsScheme: 有効値、無効値の処理をテスト
  - _Requirements: 1.1, 1.2_

- [x] 10.2 (P) VcsSchemeSelectorのユニットテスト
  - ドロップダウンの選択肢表示
  - jj選択時のエラー表示
  - isDesktop=falseで非表示
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 10.3 VCSスキーム設定の統合テスト
  - VcsSchemeSelector → IPC → SettingsFileManager の設定保存フロー
  - jjインストールチェック → 設定変更拒否フロー
  - _Requirements: 2.1, 2.2, 7.3_

- [x] 10.4 シェルスクリプトの動作確認テスト
  - create-spec-worktree.sh: git/jj両モードでの正常動作
  - merge-spec.sh: vcsScheme読み取りと適切なコマンド選択
  - rebase-worktree.sh: vcsSchemeに応じたrebase実行
  - _Requirements: 4.1-4.6, 5.1-5.6, 6.1-6.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | settings.vcsSchemeフィールド追加 | 1.2 | Infrastructure |
| 1.2 | デフォルト"git"として扱う | 1.2 | Infrastructure |
| 1.3 | 設定画面にVCSスキーム選択UI追加 | 4.1 | Feature |
| 1.4 | 選択肢「Git」「Jujutsu (jj)」 | 4.1 | Feature |
| 1.5 | 即座に保存 | 4.2 | Feature |
| 2.1 | jj変更時に存在確認 | 2.1 | Infrastructure |
| 2.2 | 未インストールならエラー表示・拒否 | 2.1, 3.3, 4.1 | Feature |
| 2.3 | エラーメッセージ日本語 | 2.1, 4.1 | Feature |
| 2.4 | worktree作成時にも再確認 | 2.1, 6.1 | Feature |
| 3.1 | spec.json worktree.vcsScheme追加 | 1.1, 6.2, 6.3 | Infrastructure |
| 3.2 | 存在しない場合"git"として扱う | 1.1, 9.1 | Infrastructure |
| 3.3 | 設定変更しても既存specは変わらない | 6.2 | Infrastructure |
| 4.1 | スクリプト引数でスキーム受け取り | 5.1, 5.3 | Infrastructure |
| 4.2 | git時はgit worktree add | 5.1 | Infrastructure |
| 4.3 | jj時はjj workspace add + bookmark create | 5.1 | Infrastructure |
| 4.4 | jjモード操作コマンド | 5.1 | Infrastructure |
| 4.5 | パス構造はgit/jj共通 | 5.1 | Infrastructure |
| 4.6 | create-bug-worktree.shも対応 | 5.2, 5.3 | Infrastructure |
| 5.1 | merge-spec.shがvcsScheme読み取り | 7.1, 7.3 | Infrastructure |
| 5.2 | 存在しない/"git"ならgitマージ | 7.1, 9.1 | Infrastructure |
| 5.3 | "jj"ならjjマージ | 7.1 | Infrastructure |
| 5.4 | jjモードマージ操作 | 7.1 | Infrastructure |
| 5.5 | merge-bug.shも対応 | 7.2, 7.3 | Infrastructure |
| 5.6 | jj優先・gitフォールバック削除 | 7.1, 7.2 | Infrastructure |
| 6.1 | rebase-worktree.shがvcsScheme読み取り | 8.1, 8.2 | Infrastructure |
| 6.2 | "git"ならgit rebase | 8.1 | Infrastructure |
| 6.3 | "jj"ならjj rebase | 8.1 | Infrastructure |
| 6.4 | jjモードrebase操作 | 8.1 | Infrastructure |
| 7.1 | ドロップダウン追加 | 4.1 | Feature |
| 7.2 | ラベル「Git」「Jujutsu (jj)」 | 4.1 | Feature |
| 7.3 | 変更時jjチェック・エラー表示 | 3.3, 4.1 | Feature |
| 7.4 | IPC経由でスキーム取得・スクリプトに渡す | 3.1, 3.2, 6.1 | Infrastructure |
| 7.5 | Remote UIから非表示 | 4.1 | Feature |
