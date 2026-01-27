# Requirements: jj-merge-support

## Decision Log

### マージツールの選択
- **Discussion**: git squash mergeはコンフリクトで失敗しやすい。jujutsu (jj)はコンフリクトをファーストクラスとして扱い、操作が中断されない。jjがない環境でも動作すべきか？
- **Conclusion**: jj優先、gitフォールバック方式を採用
- **Rationale**: jjがある場合は優れたコンフリクト処理を活用し、ない場合は従来のgitで動作継続。段階的な移行が可能。

### マージコマンドの実装方式
- **Discussion**: spec-merge.md内で条件分岐してコマンドを直接実行するか、スクリプトファイルに切り出すか
- **Conclusion**: `.kiro/scripts/merge-spec.sh`スクリプトを作成し、spec-merge.mdから呼び出す
- **Rationale**: 条件分岐の直接実行は本質的に不安定でトークンを無駄に消費する。スクリプト化により安定性とメンテナンス性を向上。

### jjでのworktreeマージコマンド
- **Discussion**: jjはgit worktreeを直接サポートしていない。git worktreeで作成されたブランチをjjでマージする方法は？
- **Conclusion**: `jj squash --from <feature-branch> --into <main-branch>`を使用
- **Rationale**: jjはgit互換であり、gitブランチに対しても操作可能。squashコマンドで変更を統合できる。

### worktree削除処理
- **Discussion**: jjはworktree管理コマンドを持たない。削除は誰が担当するか？
- **Conclusion**: マージスクリプト内で`git worktree remove`を実行
- **Rationale**: jjとgitコマンドの混在は問題なし。worktree管理はgitの責務。

### コンフリクト解決戦略
- **Discussion**: jjはコンフリクトをファーストクラスとして扱うが、spec-mergeの既存のAI自動解決ループ（最大7回試行）は維持すべきか？
- **Conclusion**: 既存の自動解決ループを維持
- **Rationale**: 自動ループを除外する明確な理由がない。jjでもコンフリクトは発生するため、AI解決は有効。

### jjインストールチェックのタイミング
- **Discussion**: プロジェクト選択時か、spec-merge実行時か、両方か？
- **Conclusion**: プロジェクト選択時に実行（ProjectValidationPanelで表示）
- **Rationale**: 既存のcommandset/settings/permissionsチェックと同じタイミング。早期に問題を発見できる。

### 無視設定の保存場所
- **Discussion**: `.kiro/sdd-orchestrator.json`、新規ファイル、Electronデータベースのどれか？
- **Conclusion**: `.kiro/sdd-orchestrator.json`の`settings.jjInstallIgnored`フィールド
- **Rationale**: 既存のプロジェクト設定ファイルと統一。プロジェクトごとの設定として適切。

### インストールボタンの動作
- **Discussion**: UIから直接実行するか、クリップボードにコピーするか？
- **Conclusion**: UIから`brew install jj`を実行し、完了を待つ
- **Rationale**: 既存のPermissionsCheckSectionと同じUXパターン。ユーザーの操作を最小化。

### brewパッケージ名
- **Discussion**: `jj-cli`か`jj`か？
- **Conclusion**: `jj` (Homebrew公式パッケージ名)
- **Rationale**: Homebrewでは`brew install jj`が正式。`jj-cli`はCargoでのクレート名。

### jjバージョン互換性要件
- **Discussion**: jjの特定バージョン以上が必要か？
- **Conclusion**: バージョン制約は設けない。任意のjjバージョンで動作する想定
- **Rationale**: `jj squash`コマンドはjjの基本機能であり、古いバージョンでも動作する。バージョンチェックのオーバーヘッドを避ける。

### Linux対応方針
- **Discussion**: macOS以外のプラットフォーム（Linux）でのインストールガイダンスは必要か？
- **Conclusion**: Linuxbrew対応。`brew install jj`がLinuxでも動作する前提
- **Rationale**: Homebrewは現在Linux (Linuxbrew)もサポートしている。Windows非対応はHomebrew自体の制約。

### スクリプトログ出力先
- **Discussion**: merge-spec.shのログ出力先は？
- **Conclusion**: 正常ログはstdout、エラーメッセージはstderrに出力
- **Rationale**: bashスクリプトの標準的な慣習。spec-merge.mdがstdout/stderrを適切に処理できる。

### update-spec-for-deploy.sh統合
- **Discussion**: 既存の`update-spec-for-deploy.sh`との統合または呼び出しは必要か？
- **Conclusion**: merge-spec.sh内で統合は不要。update-spec-for-deploy.shが事前に実行済みであることを前提とする
- **Rationale**: spec-merge.mdのフローで既にupdate-spec-for-deploy.shが呼ばれている。merge-spec.shは純粋にマージ処理のみを担当。

## Introduction

git squash mergeはしばしばコンフリクトを起こし、操作が中断される問題がある。jujutsu (jj)はコンフリクトをファーストクラスとして扱い、操作が失敗せずコンフリクト解消を後回しにできる。この機能は、spec-mergeコマンドでjjを優先的に使用し、git worktreeからmainブランチへのマージを安定化させる。

## Requirements

### Requirement 1: マージスクリプトのjj対応

**Objective:** As a developer, I want to merge worktree branches using jj when available, so that merge conflicts are handled more gracefully.

#### Acceptance Criteria
1. When `.kiro/scripts/merge-spec.sh`スクリプトが作成される場合、システムは jjコマンドの存在を確認する
2. If jjが存在する場合、システムは `jj squash --from <feature-branch> --into <main-branch>` でマージを実行する
3. If jjが存在しない場合、システムは従来の `git merge --squash <feature-branch>` を実行する
4. When マージが完了した場合、システムは `git worktree remove` でworktreeディレクトリを削除する
5. When マージが完了した場合、システムは `git branch -D <feature-branch>` でfeatureブランチを削除する

### Requirement 2: spec-merge.mdからのスクリプト呼び出し

**Objective:** As a spec-merge command, I want to delegate merge operations to a stable script, so that token usage is reduced and behavior is consistent.

#### Acceptance Criteria
1. When spec-merge.mdのStep 3 (Perform Merge)が実行される場合、システムは `.kiro/scripts/merge-spec.sh <feature-name>` を呼び出す
2. When スクリプトが成功した場合、システムは Step 6 (Report Success) に進む
3. When スクリプトがコンフリクトを報告した場合、システムは Step 4 (Conflict Resolution) に進む
4. When スクリプトがエラーで失敗した場合、システムは適切なエラーメッセージを表示する

### Requirement 3: jjインストールチェックのバリデータ統合

**Objective:** As a project validator, I want to check if jj is installed and prompt installation if missing, so that users can benefit from improved merge workflow.

#### Acceptance Criteria
1. When プロジェクトが選択される場合、システムは jjコマンドの存在を確認する
2. If jjが存在しない場合、システムは ProjectValidationPanelに警告セクションを表示する
3. When 警告セクションが表示される場合、システムは「インストール」ボタンと「無視」ボタンを提供する
4. When `.kiro/sdd-orchestrator.json`の`settings.jjInstallIgnored`がtrueの場合、システムは警告を表示しない
5. When ユーザーがインストール成功またはエラー後にプロジェクトを再読み込みした場合、システムは jjチェックを再実行する

### Requirement 4: jjインストール処理

**Objective:** As a user, I want to install jj with one click, so that I can quickly set up the improved merge workflow.

#### Acceptance Criteria
1. When ユーザーが「インストール」ボタンをクリックした場合、システムは `brew install jj` を実行する
2. While インストールが実行中の場合、システムは「インストール中...」とスピナーを表示する
3. When インストールが成功した場合、システムは自動的にjjチェックを再実行する
4. When インストールが失敗した場合、システムはエラーメッセージを表示する
5. When インストール中にユーザーが他の操作を実行した場合、システムはインストールをキャンセルしない

### Requirement 5: jjインストール無視設定

**Objective:** As a user, I want to ignore jj installation warnings for a project, so that I can continue using git without repeated prompts.

#### Acceptance Criteria
1. When ユーザーが「無視」ボタンをクリックした場合、システムは `.kiro/sdd-orchestrator.json` の `settings.jjInstallIgnored` を true に設定する
2. When `jjInstallIgnored` が true の場合、システムは jj警告セクションを表示しない
3. When ユーザーが手動で `jjInstallIgnored` を false に変更した場合、システムは次回のプロジェクト読み込み時に警告を再表示する

### Requirement 6: マージスクリプトのエラーハンドリング

**Objective:** As a merge script, I want to handle errors gracefully and provide clear messages, so that users can understand what went wrong.

#### Acceptance Criteria
1. When jqコマンドが存在しない場合、スクリプトはエラーメッセージを表示して終了する
2. When spec.jsonが存在しない場合、スクリプトはエラーメッセージを表示して終了する
3. When マージがコンフリクトで失敗した場合、スクリプトは終了コード1を返す
4. When worktree削除が失敗した場合、スクリプトは警告を表示して続行する
5. When ブランチ削除が失敗した場合、スクリプトは警告を表示して続行する

### Requirement 7: ProjectCheckerへのjjチェック統合

**Objective:** As a ProjectChecker service, I want to check jj availability like other tools, so that validation is consistent.

#### Acceptance Criteria
1. When ProjectCheckerが jjチェックを実行する場合、システムは `jj --version` の実行結果を確認する
2. If jjが存在する場合、システムは ToolCheck オブジェクトを `{ name: 'jj', available: true, version: '<version>' }` として返す
3. If jjが存在しない場合、システムは ToolCheck オブジェクトを `{ name: 'jj', available: false, installGuidance: 'brew install jj' }` として返す
4. When jjチェックが呼び出される場合、システムは既存の checkJqAvailability() と同様の実装パターンを使用する

### Requirement 8: IPC handlerの追加

**Objective:** As a renderer process, I want to communicate with main process for jj operations, so that UI can trigger jj checks and installation.

#### Acceptance Criteria
1. When レンダラーが jjチェックをリクエストした場合、mainプロセスは ProjectChecker.checkJjAvailability() を呼び出す
2. When レンダラーが jjインストールをリクエストした場合、mainプロセスは `brew install jj` を実行する
3. When レンダラーが jj無視設定をリクエストした場合、mainプロセスは `.kiro/sdd-orchestrator.json` を更新する
4. When IPCハンドラが追加される場合、システムは既存のpermissions関連ハンドラと同様の命名規則を使用する

### Requirement 9: ProjectStoreへのjjチェック統合

**Objective:** As a project store, I want to manage jj check state like other validations, so that UI can reactively display warnings.

#### Acceptance Criteria
1. When プロジェクトが選択される場合、storeは jjチェック結果を取得してstateに保存する
2. When jjチェック結果が更新される場合、storeは `jjCheck: ToolCheck | null` フィールドを更新する
3. When jjインストールが実行される場合、storeは `jjInstallLoading: boolean` フィールドを true に設定する
4. When `.kiro/sdd-orchestrator.json`の`jjInstallIgnored`がtrueの場合、storeは jjチェックをスキップする

### Requirement 10: ProjectValidationPanelへのjjセクション追加

**Objective:** As a UI component, I want to display jj installation warnings and actions, so that users can easily set up jj.

#### Acceptance Criteria
1. When jjチェック結果が available: false で jjInstallIgnored が false の場合、パネルは jjセクションを表示する
2. When jjセクションが表示される場合、システムは「jjがインストールされていません」というメッセージを表示する
3. When jjセクションが表示される場合、システムは「インストール (brew)」ボタンと「無視」ボタンを表示する
4. When jjチェック結果が available: true の場合、パネルは jjセクションを表示しない
5. When jjInstallIgnored が true の場合、パネルは jjセクションを表示しない

### Requirement 11: スクリプトテンプレートの配置

**Objective:** As a commandset installer, I want to install merge-spec.sh script when commands are installed, so that the script is available for spec-merge.

#### Acceptance Criteria
1. When commandsetがインストールされる場合、システムは `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` を `.kiro/scripts/merge-spec.sh` にコピーする
2. When スクリプトがコピーされる場合、システムは実行権限 (chmod +x) を付与する
3. When `.kiro/scripts/` ディレクトリが存在しない場合、システムは自動的に作成する
4. When スクリプトが既に存在する場合、システムは上書きする

## Out of Scope

- jj自体のビルドやカスタムインストール方法のサポート（brewのみ対応）
- Windows環境でのjjインストール（Homebrewが前提）
- jjの設定ファイル（~/.jjconfig.toml）の自動生成
- jj特有のワークフロー（megamerge等）の統合
- jjとgit以外のバージョン管理システムのサポート
- Remote UIからのjjインストール機能（Desktop UIのみ）

## Open Questions

- jjのバージョン互換性要件はあるか？（特定のバージョン以上が必要など）
- jjインストール失敗時のフォールバック動作は適切か？（gitに戻る）
- macOS以外のプラットフォーム（Linux）でのインストールガイダンスは必要か？
- スクリプトのログ出力先は？（stdout? ファイル?）
- 既存の`update-spec-for-deploy.sh`との統合または呼び出しは必要か？
