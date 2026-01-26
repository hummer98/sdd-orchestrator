# Requirements: LLM Stream Log Parser

## Decision Log

### スコープ: 対象LLMエンジン
- **Discussion**: 将来的な拡張性（他のLLM対応）をどの程度考慮すべきか
- **Conclusion**: Claude CLI と Gemini CLI の2エンジンのみ対応
- **Rationale**: 現時点で必要なもののみに絞り、YAGNIを適用。拡張可能な設計は維持するが、実装は2エンジンに限定

### 実装方針: 既存コードとの関係
- **Discussion**: 現在の `logFormatter.ts` をリファクタリングするか、新規モジュールを作成するか
- **Conclusion**: 設計フェーズで判断
- **Rationale**: 既存コードの依存関係と変更影響を設計時に詳細分析

### エンジン判別: パーサーへのエンジン情報伝達
- **Discussion**: (A) AgentRecordにengineId追加、(B) initイベントから自動判別、(C) 両方
- **Conclusion**: AgentRecord（または関連メタデータ）に `engineId` を追加し、明示的に指定
- **Rationale**: 明示的な指定が確実。ログの先頭を解析せずとも判別可能

### delta統合: ストリーミング断片の扱い
- **Discussion**: (A) 断片ごとに別エントリ、(B) 同一メッセージの断片を結合
- **Conclusion**: 断片を結合して1エントリに統一（Claude/Gemini両方）。実装が困難な場合は後回し可
- **Rationale**: UX向上。同一発言が複数行に分かれるのは読みにくい

### UI表示名: アシスタント表示
- **Discussion**: (A) エンジン名をそのまま表示、(B) 「アシスタント」に統一、(C) カスタマイズ可能
- **Conclusion**: エンジン名をそのまま表示（「Claude」「Gemini」）
- **Rationale**: どのエンジンで実行されたかをユーザーに明示

## Introduction

LLMエンジン（Claude CLI / Gemini CLI）ごとに異なるストリームログ出力を、AgentログUIで表示するための統一フォーマット（`ParsedLogEntry`）に変換するパーサーを実装する。現在の `logFormatter.ts` は Claude CLI の出力構造を前提としており、Gemini CLI の出力（フラット形式、`delta` フラグ、異なるフィールド名）を正しくパースできない問題を解決する。

## Requirements

### Requirement 1: LLMエンジン別ストリームログパーサー

**Objective:** As a developer, I want each LLM engine to have its own stream log parser, so that engine-specific output formats are correctly converted to the unified `ParsedLogEntry` format.

#### Acceptance Criteria

1.1. When Claude CLI outputs stream-json, the system shall parse it using Claude-specific logic and return `ParsedLogEntry[]`

1.2. When Gemini CLI outputs stream-json, the system shall parse it using Gemini-specific logic and return `ParsedLogEntry[]`

1.3. If a new LLM engine is added, the system shall provide an extension point (interface) for implementing a new parser

1.4. The system shall support the following event types for both engines:
- `init` / `system`: セッション開始情報（model, session_id, cwd, version）
- `message` / `assistant`: アシスタントのテキスト出力
- `tool_use`: ツール呼び出し
- `tool_result`: ツール実行結果
- `user` / `input`: ユーザー入力
- `result`: 実行終了結果

### Requirement 2: エンジン情報の伝達

**Objective:** As a system, I want to know which LLM engine produced the log output, so that the correct parser can be selected.

#### Acceptance Criteria

2.1. When an agent is started, the system shall record the `engineId` (LLMEngineId) in the agent metadata

2.2. When parsing logs, the system shall receive the `engineId` and select the appropriate parser

2.3. If `engineId` is not provided, the system shall default to Claude parser for backward compatibility

### Requirement 3: ストリーミング断片の統合

**Objective:** As a user viewing agent logs, I want streaming message fragments to be consolidated into single entries, so that the log display is clean and readable.

#### Acceptance Criteria

3.1. When multiple message events with `delta: true` belong to the same logical message, the system shall consolidate them into a single `ParsedLogEntry`

3.2. The consolidation shall apply to both Claude CLI and Gemini CLI output

3.3. If consolidation implementation proves difficult, the system may defer this requirement to a future iteration (the feature shall still work with fragment-per-entry display)

### Requirement 4: UI表示名の動的化

**Objective:** As a user, I want to see the actual LLM engine name in the log display, so that I know which engine produced the output.

#### Acceptance Criteria

4.1. When displaying assistant text entries, the system shall show the engine label (e.g., "Claude", "Gemini") instead of hardcoded "Claude"

4.2. The engine label shall be obtained from `ParsedLogEntry` or context (engineId → label mapping)

4.3. The `ParsedLogEntry` type shall include an optional `engineId` field for this purpose

### Requirement 5: 出力形式の差異吸収

**Objective:** As a developer, I want the parser to handle format differences between Claude CLI and Gemini CLI, so that both produce consistent `ParsedLogEntry` output.

#### Acceptance Criteria

5.1. The Claude parser shall handle the nested structure: `{"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}`

5.2. The Gemini parser shall handle the flat structure: `{"type":"message","role":"assistant","content":"...","delta":true}`

5.3. The Gemini parser shall map `tool_name` to `name`, `tool_id` to `id`, `parameters` to `input`, and `output` to `content` for tool events

5.4. The Gemini parser shall handle `{"type":"init",...}` as equivalent to Claude's `{"type":"system","subtype":"init",...}`

5.5. The Gemini parser shall extract `stats` from result events and map to the unified format

## Out of Scope

- 他のLLMエンジン（Claude/Gemini以外）の実装
- ログの永続化形式の変更
- リアルタイムストリーミング表示の最適化（パフォーマンス改善）
- 古いログファイル（engineId未記録）のマイグレーション

## Technical Notes

### Remote UI対応

本機能のパーサーは `src/shared/utils/` に配置予定のため、Remote UI（ブラウザベースUI）でも自動的に利用可能となる。`shared/` ディレクトリのコードはElectron版とRemote UI版で共有されるアーキテクチャのため、追加の対応作業は不要。

## Open Questions

- AgentRecord に `engineId` を追加する際、既存レコードとの互換性をどう扱うか（デフォルト値 `'claude'`？）
- delta 統合の実装が複雑な場合、どの程度の複雑さまで許容するか
