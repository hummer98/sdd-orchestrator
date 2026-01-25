# Requirements: LLM Engine Abstraction

## Decision Log

### 対象CLIの選定
- **Discussion**: Claude, Gemini, Codexなど複数のCLIツール対応を検討
- **Conclusion**: MVP では Claude と Gemini の2エンジンのみ対応
- **Rationale**: Codexは出力形式の調査が不十分。まずは実績のある2つで基盤を固める

### 設定粒度の決定
- **Discussion**: プロジェクト単位 / Spec単位 / Phase単位 の粒度を検討
- **Conclusion**: UIは3セクション（生成/検査/実装）、内部データは全Phase個別で保存
- **Rationale**: UIのシンプルさを保ちつつ、将来のPhase単位設定への拡張性を確保

### セクション分類
- **Discussion**: Phaseをどのようにグルーピングするか
- **Conclusion**:
  - 生成（Generation）: plan, requirements, design, tasks
  - 検査（Inspection）: document-review, document-review-reply, inspection
  - 実装（Implementation）: impl
- **Rationale**: ワークフローの性質に基づいた自然な分類

### skipPermissionsの扱い
- **Discussion**: エンジン別に個別設定 vs グローバル設定
- **Conclusion**: グローバル設定とし、各エンジンの対応オプションに自動変換
- **Rationale**: ユーザーは「自動承認したい」という意図を持っており、その実現方法はエンジン依存の実装詳細

### reviewEngineRegistryとの関係
- **Discussion**: 既存のreviewEngineRegistryを統合するか分離するか
- **Conclusion**: レイヤー分離。reviewEngineRegistryはそのまま残し、新しいEngine抽象化を下位レイヤーとして利用
- **Rationale**: Document Reviewはdebatex等の非LLMツールも含むため、LLM Engine抽象化とは別レイヤーで管理

### 設定保存場所
- **Discussion**: `.kiro/config.json`(新規) vs `layout-config.json` vs `.kiro/sdd-orchestrator.json`
- **Conclusion**: `.kiro/sdd-orchestrator.json` の `settings` セクション
- **Rationale**: 既存の `skipPermissions` と同じ場所で一貫性を保つ

## Introduction

現在、SDD OrchestratorはClaude CLIをハードコードして使用している。本機能は、Claude以外のLLM CLI（Gemini CLI等）を利用可能にするための抽象化レイヤーを提供する。コマンドラインオプションビルダーとレスポンスパーサーをセットで実装し、エンジン間の差異を吸収する。

## Requirements

### Requirement 1: LLM Engineレジストリ

**Objective:** 開発者として、複数のLLM CLIエンジンを統一的なインターフェースで管理したい。これにより、新しいエンジンの追加が容易になる。

#### Acceptance Criteria

1.1. The system shall define an `LLMEngine` interface with the following properties:
  - `id`: エンジン識別子（`claude` | `gemini`）
  - `label`: 表示名
  - `command`: 実行コマンド
  - `buildArgs(options)`: コマンドライン引数を構築する関数
  - `parseOutput(data)`: 出力をパースする関数

1.2. The system shall provide an `LLMEngineRegistry` that manages all registered engines.

1.3. When a new engine is added to the registry, the system shall validate that all required interface methods are implemented.

1.4. The system shall support the following engines in MVP:
  - `claude`: Claude Code CLI
  - `gemini`: Gemini CLI

### Requirement 2: コマンドラインオプションビルダー

**Objective:** 開発者として、エンジンごとに異なるコマンドラインオプションを統一的に生成したい。これにより、呼び出し側コードの変更なしにエンジンを切り替えられる。

#### Acceptance Criteria

2.1. The system shall accept a unified `BuildArgsOptions` object:
  - `prompt`: 実行するプロンプト文字列
  - `skipPermissions`: 自動承認モードの有効/無効
  - `outputFormat`: 出力形式（`stream-json` など）
  - `allowedTools`: 許可するツールのリスト（オプション）
  - `disallowedTools`: 禁止するツールのリスト（オプション）

2.2. When `skipPermissions` is true for Claude engine, the system shall include `--dangerously-skip-permissions` flag.

2.3. When `skipPermissions` is true for Gemini engine, the system shall include `--yolo` flag.

2.4. When output format is `stream-json`, the system shall:
  - For Claude: include `--output-format stream-json`
  - For Gemini: include `--output-format stream-json`

2.5. If an option is not supported by a specific engine, the system shall silently ignore it (passthrough behavior).

### Requirement 3: レスポンスパーサー

**Objective:** 開発者として、エンジンごとに異なる出力形式を統一的にパースしたい。これにより、UI側のコードを変更せずにエンジンを切り替えられる。

#### Acceptance Criteria

3.1. The system shall define a unified `ParsedOutput` structure that normalizes engine-specific outputs.

3.2. The system shall parse Claude CLI's JSONL output format into `ParsedOutput`.

3.3. The system shall investigate Gemini CLI's `stream-json` output format and implement appropriate parsing.

3.4. If the output formats differ significantly, the system shall implement a normalization layer to provide consistent data to consumers.

3.5. The system shall handle parsing errors gracefully and provide meaningful error messages.

### Requirement 4: プロジェクト設定

**Objective:** ユーザーとして、プロジェクト単位でデフォルトのLLMエンジンを設定したい。これにより、毎回エンジンを選択する手間が省ける。

#### Acceptance Criteria

4.1. The system shall store engine configuration in `.kiro/sdd-orchestrator.json` under `settings.engineConfig`.

4.2. The system shall support the following configuration structure:
```json
{
  "settings": {
    "engineConfig": {
      "default": "claude",
      "plan": "claude",
      "requirements": "claude",
      "design": "claude",
      "tasks": "claude",
      "document-review": "claude",
      "document-review-reply": "claude",
      "inspection": "claude",
      "impl": "claude"
    }
  }
}
```

4.3. When a phase-specific engine is not configured, the system shall fall back to the `default` engine.

4.4. When no configuration exists, the system shall default to `claude` for all phases.

### Requirement 5: Spec単位オーバーライド

**Objective:** ユーザーとして、特定のSpecだけ異なるエンジンを使用したい。これにより、新しいエンジンを試したり、用途に応じて使い分けられる。

#### Acceptance Criteria

5.1. The system shall support `engineOverride` field in `spec.json`:
```json
{
  "engineOverride": {
    "plan": "gemini",
    "requirements": "gemini",
    "design": "gemini",
    "tasks": "gemini"
  }
}
```

5.2. When `engineOverride` is specified for a phase, the system shall use that engine instead of the project default.

5.3. When `engineOverride` is not specified, the system shall use the project default configuration.

### Requirement 6: 設定UI

**Objective:** ユーザーとして、GUIでエンジン設定を変更したい。これにより、JSONファイルを直接編集せずに設定できる。

#### Acceptance Criteria

6.1. The system shall provide an engine configuration section in the settings panel.

6.2. The UI shall display three logical sections:
  - 生成（Generation）: plan, requirements, design, tasks
  - 検査（Inspection）: document-review, document-review-reply, inspection
  - 実装（Implementation）: impl

6.3. Each section shall have a dropdown to select the engine (`Claude`, `Gemini`, or `デフォルトを使用`).

6.4. The UI shall display a "デフォルト" dropdown at the top to set the fallback engine.

6.5. When a section is set to "デフォルトを使用", the system shall use the `default` engine for all phases in that section.

6.6. When a section is changed, the system shall update all corresponding phases in the internal configuration.

### Requirement 7: specManagerService統合

**Objective:** システムとして、既存のワークフロー実行を新しいエンジン抽象化で動作させたい。これにより、既存機能を壊さずに新機能を追加できる。

#### Acceptance Criteria

7.1. The system shall modify `specManagerService.startAgent()` to resolve the appropriate engine based on:
  1. `spec.json` の `engineOverride`（最優先）
  2. `.kiro/sdd-orchestrator.json` の `settings.engineConfig`
  3. デフォルト（`claude`）

7.2. The system shall use `LLMEngineRegistry` to get the command and build arguments.

7.3. The system shall maintain backward compatibility: existing code using hardcoded `claude` shall continue to work.

7.4. The system shall log which engine is being used for each agent execution.

## Out of Scope

- Codex CLI対応（将来の拡張として検討）
- Phase単位のUI設定（内部データはPhase単位だが、UIは3セクションのみ）
- allowedTools / disallowedTools のUI設定
- debatex等の非LLMツールのこの抽象化への統合（reviewEngineRegistryで管理）
- Remote UI対応（本機能はDesktop UIのみ）

## Open Questions

- Gemini CLIの `--output-format stream-json` 出力形式がClaude CLIと同一か要検証（設計フェーズで実機テスト）
- Gemini CLIに `--allowed-tools` 相当のオプションが `-p` モードで機能するか要検証
