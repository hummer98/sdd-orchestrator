# Requirements: Main Process Log Parser

## Decision Log

### パース責務の所在
- **Discussion**: LLM別のログパースをUI層（Renderer process）で行うか、Main processで行うか
- **Conclusion**: Main processで行う
- **Rationale**: データ正規化はMain processの責務。UIはLLM固有のフォーマットを意識すべきでない

### delta統合（ストリーミング断片結合）の責務
- **Discussion**: delta統合をUI層で行うか、Main processで行うか
- **Conclusion**: Main processで行う
- **Rationale**: delta統合もデータ正規化の一部。Main processで統一フォーマットに変換してからUIに渡すのが正しい設計

### ログファイルの形式
- **Discussion**: ログファイルにパース済みデータを保存するか、生データを保存するか
- **Conclusion**: 生データ保存を維持
- **Rationale**: 互換性、デバッグ、分析ツール対応のため。パースコストは問題にならない

### 設計判断の原則
- **Discussion**: 影響範囲が大きいことを理由に妥協案を選ぶべきか
- **Conclusion**: 技術的に最善の解決策を選ぶ
- **Rationale**: design-principles.mdに明記。「変更が大きい」「影響範囲が広い」は設計判断の制約にならない

## Introduction

LLMエンジン（Claude CLI / Gemini CLI）のログパース責務をUI層からMain processに移動する。現在、ログパースはRenderer process（`useIncrementalLogParser`フック）で行われているが、これはMain processの責務である「データ正規化」に該当する。また、`specManagerService.parseAndUpdateSessionId`や`logParserService.getLastAssistantMessage`がClaude専用の条件分岐を持っており、Gemini対応が不完全である問題も解決する。

## Requirements

### Requirement 1: Main processでのログパース

**Objective:** As a system, I want log parsing to be performed in the Main process, so that UI layer does not need to be aware of LLM-specific log formats.

#### Acceptance Criteria

1.1. When Agent outputs stream-json logs, the Main process shall parse them into unified `ParsedLogEntry` format before sending to UI

1.2. The Main process shall use the existing parser implementations (`claudeParser.ts`, `geminiParser.ts`) from `shared/utils/`

1.3. The Main process shall select the appropriate parser based on `engineId` stored in Agent metadata

1.4. If `engineId` is not available, the system shall default to Claude parser for backward compatibility

### Requirement 2: delta統合のMain process移行

**Objective:** As a user viewing agent logs, I want streaming message fragments to be consolidated in Main process, so that UI receives clean, unified entries.

#### Acceptance Criteria

2.1. When multiple log entries with `delta: true` belong to the same logical message, the Main process shall consolidate them into a single `ParsedLogEntry`

2.2. The consolidation logic shall support both Claude CLI and Gemini CLI delta formats

2.3. The Main process shall emit consolidated entries to UI via IPC/WebSocket

### Requirement 3: IPC/WebSocket APIの変更

**Objective:** As a system, I want IPC and WebSocket APIs to transmit `ParsedLogEntry` instead of raw `LogEntry`, so that all clients receive pre-parsed data.

#### Acceptance Criteria

3.1. The `onAgentLog` IPC channel shall transmit `ParsedLogEntry` instead of `LogEntry`

3.2. The WebSocket `agent-log` event shall transmit `ParsedLogEntry` instead of `LogEntry`

3.3. The API type definitions shall be updated to reflect the new data format

3.4. Backward compatibility is NOT required (breaking change is acceptable)

### Requirement 4: agentStoreの変更

**Objective:** As a system, I want agentStore to receive and store `ParsedLogEntry` directly, so that no additional parsing is needed in UI layer.

#### Acceptance Criteria

4.1. The `agentStore.logs` Map shall store `ParsedLogEntry[]` instead of `LogEntry[]`

4.2. The `addLog` action shall accept `ParsedLogEntry` as input

4.3. The store shall no longer perform any LLM-specific parsing logic

### Requirement 5: UIコンポーネントの簡略化

**Objective:** As a developer, I want UI components to consume pre-parsed log entries, so that LLM-specific parsing logic is removed from Renderer process.

#### Acceptance Criteria

5.1. The `useIncrementalLogParser` hook shall be deprecated or removed

5.2. The `AgentLogPanel` component shall directly render `ParsedLogEntry[]` without additional parsing

5.3. The `LogEntryBlock` component shall continue to work with `ParsedLogEntry` (no change needed)

### Requirement 6: 既存のClaude専用コードの修正

**Objective:** As a system, I want all Claude-specific log parsing code to use the unified parser, so that Gemini logs are correctly processed.

#### Acceptance Criteria

6.1. The `specManagerService.parseAndUpdateSessionId` shall use the unified parser to extract `session_id` for both Claude and Gemini

6.2. The `logParserService.getLastAssistantMessage` shall use the unified parser to detect assistant messages for both Claude and Gemini

6.3. Any other Claude-specific log parsing code shall be migrated to use the unified parser

### Requirement 7: ログファイル形式の維持

**Objective:** As a system, I want log files to remain in raw format, so that compatibility with existing tools and debugging workflows is preserved.

#### Acceptance Criteria

7.1. The `LogFileService` shall continue to write raw `LogEntry` (LLM-specific format) to log files

7.2. The log file format (JSONL) shall remain unchanged

7.3. When reading log files for analysis (e.g., `logParserService`), the system shall parse them using the unified parser

## Out of Scope

- 他のLLMエンジン（Claude/Gemini以外）の対応
- ログファイル形式の変更（パース済みデータ保存への移行）
- パフォーマンス最適化（現状で十分）
- 古いログファイルのマイグレーション

## Technical Notes

### Remote UI対応

本変更はRemote UIにも自動的に適用される。WebSocket APIが`ParsedLogEntry`を送信するようになるため、Remote UI側のパース処理も不要になる。

### 既存パーサーの再利用

`shared/utils/`に既にLLM別パーサー（`claudeParser.ts`, `geminiParser.ts`）が存在する。これらはNode.js/ブラウザ両方で動作するため、Main processでも利用可能。新規パーサー実装は不要。

## Open Questions

- delta統合のバッファリング戦略（タイムアウト、最大バッファサイズ）の詳細は設計フェーズで決定
