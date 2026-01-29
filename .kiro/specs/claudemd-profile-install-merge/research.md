# Research & Design Decisions: CLAUDE.md Profile Install Merge

## Summary
- **Feature**: `claudemd-profile-install-merge`
- **Discovery Scope**: Extension（既存システムへの機能追加）
- **Key Findings**:
  - 既存のCLAUDE.md処理コードは到達不可能な状態で放置されていた
  - Project Agent実行パターン（`steering-verification`等）が確立されており、これを踏襲
  - テンプレートのプレースホルダーは現状では固定値（`.kiro`）で問題ない

## Research Log

### 既存CLAUDE.md処理の調査

- **Context**: 現在のCLAUDE.md処理がどのように実装されているか
- **Sources Consulted**:
  - `commandInstallerService.ts`
  - `ccSddWorkflowInstaller.ts`
  - `ClaudeMdInstallDialog.tsx`
  - `installHandlers.ts`
  - `channels.ts`
- **Findings**:
  - `ClaudeMdInstallDialog.tsx`: UIダイアログが存在するが、どこからも呼び出されていない
  - `commandInstallerService.semanticMergeClaudeMd()`: `claude -p`を直接spawn
  - `ccSddWorkflowInstaller.mergeClaudeMdWithClaude()`: 同様に`claude -p`を直接spawn
  - IPCチャネル`CHECK_CLAUDE_MD_EXISTS`, `INSTALL_CLAUDE_MD`, `CHECK_CC_SDD_WORKFLOW_STATUS`, `INSTALL_CC_SDD_WORKFLOW`は登録されているが呼び出し元がない
- **Implications**: これらのコードは安全に削除可能。新しいAgent実行方式に置き換える

### Project Agent実行パターンの調査

- **Context**: CLAUDE.mdマージをどのように実行すべきか
- **Sources Consulted**:
  - `handlers.ts` (GENERATE_VERIFICATION_MD, GENERATE_RELEASE_MD)
  - `specManagerService.ts`
  - `steeringVerificationHandlers.test.ts`
- **Findings**:
  - `steering-verification`コマンドは以下のパターンで実行される:
    ```typescript
    service.startAgent({
      specId: '',  // Project-level agent
      phase: 'steering-verification',
      command: 'claude',
      args: ['/kiro:steering-verification'],
      group: 'doc'
    });
    ```
  - Agent定義は`resources/templates/agents/kiro/`に配置
  - 成功/失敗に関わらずResultを返す
- **Implications**: 同じパターンで`claudemd-merge`を実装すれば一貫性を保てる

### テンプレートプレースホルダーの調査

- **Context**: `{{KIRO_DIR}}`と`{{DEV_GUIDELINES}}`をどう処理すべきか
- **Sources Consulted**:
  - `resources/templates/CLAUDE.md`
  - 既存のテンプレート処理コード
- **Findings**:
  - `{{KIRO_DIR}}`: 全ての箇所で`.kiro`として使用されている
  - `{{DEV_GUIDELINES}}`: 動的に展開される想定だったが、現在は未使用
  - 他のテンプレート（コマンド、設定ファイル）にはプレースホルダーがない
- **Implications**: シンプルに`.kiro`に固定し、`{{DEV_GUIDELINES}}`は削除

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| claude -p直接spawn | 既存実装のパターン | 実装済み | Agentパターンと一貫性がない、管理が分散 | 現状維持は望ましくない |
| Project Agent経由 | steering-verificationと同じ | 一貫性、既存基盤活用、ログ管理 | Agent定義ファイル追加が必要 | 採用 |
| UnifiedCommandsetInstaller内 | インストール処理内で完結 | シンプル | 責務の混在 | 不採用 |

## Design Decisions

### Decision: Agent実行方式

- **Context**: CLAUDE.mdマージをどの方式で実行するか
- **Alternatives Considered**:
  1. `claude -p`直接spawn（現状維持）
  2. Project Agent経由（`steering-verification`パターン）
  3. UnifiedCommandsetInstaller内で実行
- **Selected Approach**: Project Agent経由
- **Rationale (Why)**:
  - 既存のAgent実行基盤を活用でき、一貫性がある
  - Agent実行状態の可視化、ログ管理が既存インフラで可能
  - 保守性が高い（Agent定義ファイルのみで動作変更可能）
- **Trade-offs**: Agent定義ファイルの追加が必要だが、実装コストは低い
- **Follow-up**: Agent定義ファイルのテスト（手動確認）

### Decision: Fire-and-Forget実行

- **Context**: Agent起動の結果を待つか、即座にインストール結果を返すか
- **Alternatives Considered**:
  1. await実行（結果を待つ）
  2. Fire-and-forget（結果を待たない）
  3. 結果をUIに通知
- **Selected Approach**: Fire-and-forget
- **Rationale (Why)**:
  - CLAUDE.mdマージはプロファイルインストールの付随処理
  - ユーザーはインストール完了を待っており、マージは非同期で実行されても問題ない
  - Agent一覧で進捗確認可能
- **Trade-offs**: マージ失敗を即座にユーザーに通知できない
- **Follow-up**: ドキュメント追加（マージ失敗時の確認方法）

### Decision: プレースホルダー処理

- **Context**: テンプレート内のプレースホルダーをどう処理するか
- **Alternatives Considered**:
  1. テンプレートを事前編集し固定値に置換
  2. Agent側で動的展開
  3. コードで事前展開（実行時）
- **Selected Approach**: テンプレートを事前編集
- **Rationale (Why)**:
  - 現状`.kiro`以外の設定は使われていない
  - 最もシンプルで保守しやすい
  - Agent側での動的展開は複雑化を招く
- **Trade-offs**: `.kiro`以外のディレクトリ名を使いたい場合は再検討が必要
- **Follow-up**: なし（現時点では不要）

## Risks & Mitigations
- **Agent起動失敗**: 警告ログのみで吸収し、プロファイルインストール自体は成功扱い
- **マージ失敗**: Agentログに記録され、ユーザーはAgent一覧から確認可能
- **テンプレート未存在**: Agentがエラーログを出力

## References
- `handlers.ts` GENERATE_VERIFICATION_MD実装: L710-718
- `specManagerService.ts` startAgent実装
- 既存テンプレート: `resources/templates/CLAUDE.md`
