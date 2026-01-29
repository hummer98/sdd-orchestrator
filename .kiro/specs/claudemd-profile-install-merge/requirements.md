# Requirements: CLAUDE.md Profile Install Merge

## Decision Log

### Agent実行方式
- **Discussion**: プロファイルインストール時のCLAUDE.md処理をどこで実行するか。既存の`commandInstallerService.semanticMergeClaudeMd()`は`claude -p`を直接spawn、verification-commands.mdはProject Agent経由で実行。
- **Conclusion**: Project Agent経由で実行（verification-commands.mdと同じパターン）
- **Rationale**: 既存のAgent実行基盤を使う方が一貫性があり、保守性が高い

### マージ条件
- **Discussion**: 常にセマンティックマージを実行するか、条件付きで実行するか
- **Conclusion**: CLAUDE.md存在時のみセマンティックマージ、存在しない場合はテンプレートをコピー
- **Rationale**: AIを呼ぶ必要がないケースでは効率的にテンプレートをそのまま使用

### プレースホルダー処理
- **Discussion**: テンプレート内の`{{KIRO_DIR}}`と`{{DEV_GUIDELINES}}`をどう扱うか。A) `.kiro`に固定して削除、B) Agent側で展開、C) コードで事前展開
- **Conclusion**: A) `.kiro`に固定して削除
- **Rationale**: 現状`.kiro`以外の設定は使われておらず、最もシンプル

### マージ失敗時の挙動
- **Discussion**: CLAUDE.mdマージが失敗した場合の挙動
- **Conclusion**: エラーログのみ、プロファイルインストール自体は成功扱い
- **Rationale**: プロファイルインストールの主責務はコマンドセットのインストール。CLAUDE.mdマージは付随的な処理

### 対象プロファイル
- **Discussion**: どのプロファイルでCLAUDE.mdマージを実行するか
- **Conclusion**: cc-sdd / cc-sdd-agent のみ（spec-managerは対象外）
- **Rationale**: 段階的な対応。spec-managerは一旦スコープ外

## Introduction

プロファイルインストール時にCLAUDE.mdのセマンティックマージをProject Agent経由で自動実行する機能を実装する。現在はプロファイルインストール時にCLAUDE.mdに対して何も処理が行われておらず、セマンティックマージ機能は実装されているがUIから到達不可能な状態になっている。本機能により、コマンドセットインストールと同時にCLAUDE.mdが適切に設定される。また、未使用となっているコードを削除してコードベースを整理する。

## Requirements

### Requirement 1: CLAUDE.mdマージAgent定義

**Objective:** 開発者として、CLAUDE.mdのセマンティックマージを実行するAgentを定義したい。これにより、既存のAgent実行基盤を活用した一貫性のある実装が可能になる。

#### Acceptance Criteria
1. `resources/templates/agents/kiro/claudemd-merge.md`にAgent定義ファイルが存在すること
2. AgentはCLAUDE.mdの存在確認を行うこと
3. CLAUDE.mdが存在しない場合、Agentはテンプレートをそのままコピーすること
4. CLAUDE.mdが存在する場合、Agentは既存内容とテンプレートをセマンティックマージすること
5. マージルールとして、テンプレートの構造を基本としつつユーザーのカスタマイズ内容を保持すること

### Requirement 2: プロファイルインストール時のAgent呼び出し

**Objective:** 開発者として、cc-sdd/cc-sdd-agentプロファイルのインストール成功後にCLAUDE.mdマージAgentを自動起動したい。これにより、コマンドセットインストールと同時にCLAUDE.mdが適切に設定される。

#### Acceptance Criteria
1. `INSTALL_COMMANDSET_BY_PROFILE`ハンドラーがプロファイルインストール成功後にAgentを起動すること
2. 対象プロファイルはcc-sddおよびcc-sdd-agentであること
3. spec-managerプロファイルではAgentを起動しないこと
4. Agentはバックグラウンドで実行され、インストール結果は即座に返されること
5. Agent起動に失敗した場合でも、プロファイルインストール自体は成功扱いとすること
6. Agent起動失敗時はログに警告を出力すること

### Requirement 3: テンプレートのプレースホルダー削除

**Objective:** 開発者として、CLAUDE.mdテンプレートから未使用のプレースホルダーを削除したい。これにより、テンプレートがそのまま使用可能な状態になる。

#### Acceptance Criteria
1. `resources/templates/CLAUDE.md`から`{{KIRO_DIR}}`を`.kiro`に置換すること
2. `resources/templates/CLAUDE.md`から`{{DEV_GUIDELINES}}`を削除すること
3. テンプレートがプレースホルダーなしで有効なMarkdownであること

### Requirement 4: 未使用コードの削除

**Objective:** 開発者として、CLAUDE.mdインストールに関連する未使用のコードを削除したい。これにより、コードベースが整理され保守性が向上する。

#### Acceptance Criteria

##### 4.1 UIコンポーネント削除
1. `ClaudeMdInstallDialog.tsx`を削除すること
2. `components/index.ts`からClaudeMdInstallDialogのexportを削除すること

##### 4.2 IPCチャネル削除
1. `CHECK_CLAUDE_MD_EXISTS`チャネルを削除すること
2. `INSTALL_CLAUDE_MD`チャネルを削除すること
3. `CHECK_CC_SDD_WORKFLOW_STATUS`チャネルを削除すること
4. `INSTALL_CC_SDD_WORKFLOW`チャネルを削除すること

##### 4.3 IPCハンドラー削除
1. `CHECK_CLAUDE_MD_EXISTS`ハンドラーを削除すること
2. `INSTALL_CLAUDE_MD`ハンドラーを削除すること
3. `CHECK_CC_SDD_WORKFLOW_STATUS`ハンドラーを削除すること
4. `INSTALL_CC_SDD_WORKFLOW`ハンドラーを削除すること

##### 4.4 Preload API削除
1. `checkClaudeMdExists`を削除すること
2. `installClaudeMd`を削除すること
3. `checkCcSddWorkflowStatus`を削除すること
4. `installCcSddWorkflow`を削除すること

##### 4.5 型定義削除
1. 上記Preload APIに対応する型定義を`electron.d.ts`から削除すること

##### 4.6 サービスメソッド削除
1. `commandInstallerService.ts`から以下を削除すること:
   - `claudeMdExists()`
   - `installClaudeMd()`
   - `semanticMergeClaudeMd()`
   - `ClaudeMdInstallMode`型
   - `ClaudeMdInstallResult`型
2. `ccSddWorkflowInstaller.ts`から以下を削除すること:
   - `updateClaudeMd()`
   - `mergeClaudeMdWithClaude()`
   - `hasCcSddWorkflowSection()`
   - `mergeCcSddSection()`
   - `isClaudeAvailable()`
   - `CC_SDD_WORKFLOW_CLAUDE_MD_SECTION`定数
   - `ClaudeMdUpdateResult`型

##### 4.7 テスト更新
1. 削除したコードに関連するテストを更新または削除すること

## Out of Scope

- spec-managerプロファイルでのCLAUDE.mdマージ対応
- CLAUDE.mdマージの進捗表示UI
- マージ結果の確認UI
- マージ失敗時のリトライ機能

## Open Questions

- なし（設計フェーズで詳細を決定）
