# Requirements: Permission Control Refactoring

## Decision Log

### 決定事項1: 段階的vs一括切り替え

- **Discussion**: 段階的アプローチ（Phase 1から開始し動作確認）か、一括切り替え（全Agentとコマンドを同時改修）か
- **Conclusion**: 一括切り替えを採用
- **Rationale**: 一度に切り替えないと統合的なテストができない。部分的な移行では相互依存により問題の切り分けが困難になる

### 決定事項2: skipPermissionsフラグの扱い

- **Discussion**: Electronアプリの「Skip Permissions」チェックボックス（`--dangerously-skip-permissions`フラグ）を完全廃止、デバッグ用に残す、一時的に残す
- **Conclusion**: フラグ自体は残す
- **Rationale**: 現状はフラグを付けないとワークフロー全域がまともに動かない問題がある。この改修の目的は「フラグOFFがデフォルトで全ワークフローが正常動作すること」

### 決定事項3: settings.local.jsonへの依存

- **Discussion**: 現在222行のallowルールに依存している。完全削除、deny中心に書き換え、段階的削減のいずれか
- **Conclusion**: settings.local.jsonに影響を受けない設計とする
- **Rationale**: `dontAsk` + Agent定義の`tools`フィールドで制御することで、settings.local.jsonが空でも、大量のallowがあっても、どちらでも正常動作する設計を実現

### 決定事項4: Phase毎のツール制御方針

- **Discussion**: Agent定義のみで制御、CLIオプションも併用、disallowedToolsで補足のいずれか
- **Conclusion**: まずAgent定義のみで開始
- **Rationale**: シンプルな設計から始め、問題があればCLIオプション併用を検討。過剰な制御は保守性を下げる

### 決定事項5: Bash制限の実装方法

- **Discussion**: Agent定義で`tools: Bash`を許可してLLMに委ねる、settings.jsonのdenyで制限、AgentにBashを与えずSlash Commandsに委譲
- **Conclusion**: AgentにSkillツールを与え、Slash Commands経由で委譲
- **Rationale**:
  - 検証により、Agent定義で`tools: Skill`が使用可能であることを確認
  - Slash Commandsの`allowed-tools`では`Bash(git *)`のように細かく制限可能
  - Agent自体は安全（Bashアクセスなし）で、必要な操作は制御されたSlash Commands経由で実行

### 決定事項6: 検証結果の確認

- **Discussion**: Skillツール経由でSlash Commandsを呼び出す方式が実際に動作するか
- **Conclusion**: 実機検証により動作確認完了
- **Rationale**: テストAgentを作成し、`tools: Read, Glob, Skill` + `permissionMode: dontAsk`の構成で`/kiro:spec-status`が正常に実行されることを確認。Bashツールは自動denyされることも確認

## Introduction

Claude Codeの`--dangerously-skip-permissions`フラグを使用せずに、全ワークフロー（Requirements/Design/Tasks/Implementation/Inspection/Bug Fix）が正常動作するためのパーミッション制御システムの再設計。現状は全Agent（12個）が`bypassPermissions`モードを使用し、Electronアプリからも`--dangerously-skip-permissions`フラグを付けないと動作しない状態にある。これを`dontAsk` + `tools`フィールドによる明示的制御に移行し、セキュリティを向上させつつ、settings.local.jsonの状態に依存しない堅牢な設計を実現する。

## Requirements

### Requirement 1: Agent定義のパーミッションモード移行

**Objective:** システム管理者として、全Agentのパーミッションモードを`bypassPermissions`から`dontAsk`に変更したい。これにより、危険なツールへの無制限アクセスを防ぎ、明示的に許可されたツールのみを使用可能にする。

#### Acceptance Criteria

1. When Agent定義ファイル（`.claude/agents/kiro/*.md`）を読み込む際、システムは全12個のAgentについて`permissionMode: dontAsk`が設定されていることを確認しなければならない
2. While Agent実行中、システムは`tools`フィールドに明示されたツールのみを使用可能とし、それ以外のツール使用を自動的にdenyしなければならない
3. If Agentが`tools`フィールドに含まれないツールを使用しようとした場合、システムは権限エラーを返さなければならない
4. When 全Agent移行完了時、システムは12個全てのAgent定義で`permissionMode: bypassPermissions`が存在しないことを検証しなければならない

### Requirement 2: 読み取り専用Agent（Validation系）

**Objective:** 検証担当者として、Validation系Agent（validate-design, validate-gap, validate-impl）が読み取り専用ツールのみを使用することを保証したい。これにより、検証プロセスが既存コードを変更するリスクを排除する。

#### Acceptance Criteria

1. When validate-design-agentを起動する際、システムは`tools: Read, Grep, Glob`のみが許可されていることを確認しなければならない
2. When validate-gap-agentを起動する際、システムは`tools: Read, Grep, Glob, WebSearch, WebFetch`のみが許可されていることを確認しなければならない
3. When validate-impl-agentを起動する際、システムは`tools: Read, Grep, Glob, Bash`のみが許可されていることを確認しなければならない（Bashはテスト実行に必要）
4. If これらのAgentがWrite/Editツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 3: 仕様生成Agent（Bashなし）

**Objective:** 仕様作成者として、Requirements/Design/Tasks生成Agent（spec-requirements, spec-design, spec-tasks）がBashツールなしで動作することを保証したい。これにより、ドキュメント生成プロセスでシステムコマンド実行のリスクを排除する。

#### Acceptance Criteria

1. When spec-requirements-agentを起動する際、システムは`tools: Read, Write, Edit, Glob, WebSearch, WebFetch`のみが許可され、Bashが含まれないことを確認しなければならない
2. When spec-design-agentを起動する際、システムは`tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch`のみが許可され、Bashが含まれないことを確認しなければならない
3. When spec-tasks-agentを起動する際、システムは`tools: Read, Write, Edit, Glob, Grep`のみが許可され、Bashが含まれないことを確認しなければならない
4. If これらのAgentがBashツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 4: 実装Agent（Skillツール委譲）

**Objective:** 実装担当者として、Implementation Agent（spec-tdd-impl）がBashツールに直接アクセスせず、Skillツール経由でSlash Commandsを呼び出すことで安全にgit操作やテスト実行を行えるようにしたい。

#### Acceptance Criteria

1. When spec-tdd-impl-agentを起動する際、システムは`tools: Read, Write, Edit, MultiEdit, Glob, Grep, Skill`が許可され、Bashが含まれないことを確認しなければならない
2. When Agentがgit操作を必要とする場合、システムはSkillツール経由で`/commit`コマンドを呼び出し可能でなければならない
3. When Agentがテスト実行を必要とする場合、システムはSkillツール経由で`/test-fix`コマンドを呼び出し可能でなければならない
4. If Agentが直接Bashツールを使用しようとした場合、システムは権限エラーを返さなければならない
5. When Skillツール経由でSlash Commandを呼び出した場合、システムは呼び出されたコマンドの`allowed-tools`設定に従ってツール使用を制限しなければならない

### Requirement 5: 検査Agent（Bash必要・Skillツール委譲）

**Objective:** 検査担当者として、Inspection Agent（spec-inspection）がビルドとテスト実行のためにBash操作が必要だが、これをSkillツール経由で制御されたSlash Commands経由で実行したい。

#### Acceptance Criteria

1. When spec-inspection-agentを起動する際、システムは`tools: Read, Grep, Glob, Write, Skill, Task`が許可され、Bashが含まれないことを確認しなければならない（Writeはレポート出力に必要）
2. When Agentがビルド実行を必要とする場合、システムはSkillツール経由で適切なコマンドを呼び出し可能でなければならない
3. When Agentがテスト実行を必要とする場合、システムはSkillツール経由で適切なコマンドを呼び出し可能でなければならない
4. If Agentが直接Bashツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 6: Steering Agent（Bashなし）

**Objective:** プロジェクト管理者として、Steering管理Agent（steering, steering-custom）がBashなしで動作することを保証したい。ドキュメント管理にシステムコマンド実行は不要。

#### Acceptance Criteria

1. When steering-agentを起動する際、システムは`tools: Read, Write, Edit, Glob, Grep`のみが許可され、Bashが含まれないことを確認しなければならない
2. When steering-custom-agentを起動する際、システムは`tools: Read, Write, Edit, Glob, Grep`のみが許可され、Bashが含まれないことを確認しなければならない
3. If これらのAgentがBashツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 7: Debug Agent（Bash必要・MCP含む）

**Objective:** デバッグ担当者として、Debug AgentがBashツールとMCPツールを使用できるようにしたい。ただし、`dontAsk`モードで明示的に許可されたツールのみに制限する。

#### Acceptance Criteria

1. When debug agentを起動する際、システムは`tools: Read, Glob, Grep, Bash, mcp__electron__get_electron_window_info, mcp__electron__take_screenshot, mcp__electron__send_command_to_electron, mcp__electron__read_electron_logs`が許可されていることを確認しなければならない
2. When Agentがデバッグ操作を実行する際、システムは上記ツールのみを使用可能とし、それ以外のツール使用を自動denyしなければならない
3. If Agentが許可されていないツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 8: Slash Commandsのallowed-tools設定維持

**Objective:** コマンド実行者として、既存のSlash Commands（33個）の`allowed-tools`設定を維持し、各コマンドが必要最小限のツールのみを使用することを保証したい。

#### Acceptance Criteria

1. When Slash Commandを実行する際、システムはfrontmatterの`allowed-tools`設定に従ってツール使用を制限しなければならない
2. When `/commit`コマンドを実行する際、システムは`Bash(git *), Read, Glob`のみを許可しなければならない
3. When `/test-fix`コマンドを実行する際、システムは`Bash(npm test:*), Bash(npx vitest:*), Bash(task:*), Read, Edit, Glob, Grep, AskUserQuestion`のみを許可しなければならない
4. When `/kiro:spec-init`コマンドを実行する際、システムは`Bash(git status), Bash(date:*), Bash(mkdir:*), Read, Write, Glob`のみを許可しなければならない
5. If コマンドが`allowed-tools`に含まれないツールを使用しようとした場合、システムは権限エラーを返さなければならない

### Requirement 9: ElectronアプリのskipPermissionsデフォルト変更

**Objective:** Electronアプリ利用者として、Skip PermissionsチェックボックスがデフォルトでOFFの状態で全ワークフローが正常動作することを保証したい。

#### Acceptance Criteria

1. When Electronアプリを起動する際、システムはSkip Permissionsチェックボックスがデフォルトでfalse（OFF）であることを確認しなければならない
2. When skipPermissions=falseの状態でAgent実行を開始する際、システムは`--dangerously-skip-permissions`フラグを含めずにclaudeコマンドを実行しなければならない
3. When skipPermissions=falseの状態で各Phase（Requirements/Design/Tasks/Implementation/Inspection）を実行した場合、システムは権限エラーなく正常に完了しなければならない
4. When skipPermissions=trueに設定した場合、システムは`--dangerously-skip-permissions`フラグを付与してclaudeコマンドを実行しなければならない（後方互換性）

### Requirement 10: settings.jsonの最終防衛線設定

**Objective:** セキュリティ管理者として、`.claude/settings.json`に最終防衛線としてのdenyルールを設定し、絶対に実行してはいけないコマンドをブロックしたい。

#### Acceptance Criteria

1. When `.claude/settings.json`を読み込む際、システムは`permissions.deny`配列に以下のルールが含まれていることを確認しなければならない:
   - `Bash(rm -rf /)`
   - `Bash(rm -rf /*)`
   - `Bash(sudo rm:*)`
   - `Read(.env)`
   - `Read(.env.*)`
   - `Write(.env)`
   - `Edit(.env)`
2. If いずれかのAgent/CommandがdenyルールにマッチするBash操作を試みた場合、システムは`dontAsk`やAgent定義の設定に関わらず実行をブロックしなければならない
3. When settings.jsonにdenyルールが存在する場合、システムは設定の優先順位（deny > ask > allow）に従ってdenyを最優先しなければならない

### Requirement 11: settings.local.json非依存の動作保証

**Objective:** 開発者として、`.claude/settings.local.json`の状態（空、大量のallow、存在しない）に関わらず、全ワークフローが正常動作することを保証したい。

#### Acceptance Criteria

1. When settings.local.jsonが空の状態でAgent実行を開始した場合、システムは`dontAsk` + Agent定義の`tools`による制御で正常動作しなければならない
2. When settings.local.jsonに222行のallowルールが存在する状態でAgent実行を開始した場合、システムはAgent定義の`tools`フィールドを優先し、allowルールを無視して正常動作しなければならない
3. When settings.local.jsonが存在しない状態でAgent実行を開始した場合、システムはAgent定義とsettings.jsonのみを参照して正常動作しなければならない
4. If settings.local.jsonにdenyルールが存在する場合、システムはsettings.jsonのdenyルールとマージして適用しなければならない

### Requirement 12: 統合テストによる動作確認

**Objective:** QA担当者として、全フェーズのワークフロー（Requirements→Design→Tasks→Implementation→Inspection）がskipPermissions=falseの状態で正常動作することを確認したい。

#### Acceptance Criteria

1. When テスト用Specを作成し、Requirements生成を実行した場合、システムはskipPermissions=falseの状態で正常に`requirements.md`を生成しなければならない
2. When Design生成を実行した場合、システムはskipPermissions=falseの状態で正常に`design.md`を生成しなければならない
3. When Tasks生成を実行した場合、システムはskipPermissions=falseの状態で正常に`tasks.md`を生成しなければならない
4. When Implementation実行を実行した場合、システムはskipPermissions=falseの状態でSkillツール経由でgit操作とテスト実行を行い、正常に実装を完了しなければならない
5. When Inspection実行を実行した場合、システムはskipPermissions=falseの状態でビルドとテスト検証を行い、正常に検査レポートを生成しなければならない
6. If いずれかのフェーズで権限エラーが発生した場合、システムはエラー詳細をログに記録し、失敗を報告しなければならない

### Requirement 13: Remote UI対応

**Objective:** セキュリティ管理者として、Remote UIからのAgent実行時にskipPermissions設定を制御し、セキュリティリスクを最小化したい。

#### Acceptance Criteria

1. When Remote UIからAgent実行リクエストを受信した場合、システムは常に`skipPermissions=false`で動作しなければならない
2. If Remote UIからskipPermissions設定変更リクエストを受信した場合、システムはリクエストを拒否しなければならない
3. When Remote UIでAgent実行を開始する際、システムはskipPermissionsチェックボックスを非表示または無効化しなければならない
4. **Rationale**: Remote環境でパーミッションバイパスを許可すると、セキュリティリスクが増大するため、Remote UIでは常に安全な設定（skipPermissions=false）で動作させる

## Out of Scope

- **既存settings.local.jsonの削除・書き換え**: 既存の222行のallowルールは変更しない（非依存設計により影響を受けないため）
- **CLI起動オプションの追加**: まずAgent定義のみで制御し、問題があれば別途検討
- **Slash Commandsの大幅な再設計**: 既存の`allowed-tools`設定を維持し、必要最小限の調整のみ実施
- **Built-in Agent（Explore, Plan等）のカスタマイズ**: カスタムAgentのみが対象
- **MCP Serverモードでの動作保証**: CLI直接起動のみが対象（MCP Server Modeには既知の権限継承バグあり）

## Open Questions

- Bash操作を必要とするSlash Commandsをどこまで作成すべきか？（現在: `/commit`, `/test-fix`。今後: ビルド実行、デプロイ操作など）
- Debug Agent以外でBashを直接使用する必要があるAgentは存在するか？
- 移行後のskipPermissionsチェックボックスのUI表示を「非推奨」としてマークすべきか？
- settings.jsonのdenyルールをより細かく設定すべきか？（現在: 最小限の危険コマンドのみ）
