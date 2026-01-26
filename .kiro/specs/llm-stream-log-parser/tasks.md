# Implementation Plan

## Task 1: パーサー共通型定義

- [x] 1.1 (P) `ParsedLogEntry`型拡張と`LogStreamParser`インタフェース定義
  - `engineId?: LLMEngineId`フィールドを既存`ParsedLogEntry`型に追加
  - `LogStreamParser`インタフェースを定義（`parseLine`, `parseData`メソッド）
  - `DeltaAccumulator`型を定義（ストリーミング断片統合用）
  - 新規ファイル `src/shared/utils/parserTypes.ts` として作成
  - _Requirements: 1.3, 4.3_
  - _Method: LogStreamParser, DeltaAccumulator, ParsedLogEntry_
  - _Verify: Grep "interface LogStreamParser|interface DeltaAccumulator|engineId.*LLMEngineId" in parserTypes.ts_

## Task 2: Claude CLI パーサー実装

- [x] 2.1 (P) 既存パースロジックの分離とClaude専用パーサー作成
  - 現在の`logFormatter.ts`から`parseClaudeEvent`ロジックを抽出
  - `LogStreamParser`インタフェースを実装する`claudeParser`オブジェクトを作成
  - ネスト構造（`{"type":"assistant","message":{"content":[...]}}`）の処理を維持
  - 各エントリに`engineId: 'claude'`を付与
  - 新規ファイル `src/shared/utils/claudeParser.ts` として作成
  - _Requirements: 1.1, 1.4, 5.1_
  - _Method: claudeParser, parseLine, parseData_
  - _Verify: Grep "claudeParser.*LogStreamParser|engineId.*claude" in claudeParser.ts_

- [x] 2.2 Claude パーサーのdelta統合実装
  - 複数の`assistant`イベントが連続する場合の断片結合ロジック
  - `DeltaAccumulator`を使用したコンテンツ蓄積と出力
  - Task 2.1の完了後に実装（同一ファイル内での依存）
  - _Requirements: 3.1, 3.2_
  - _Method: DeltaAccumulator_
  - _Verify: Grep "DeltaAccumulator|accumulatedContent" in claudeParser.ts_

## Task 3: Gemini CLI パーサー実装

- [x] 3.1 (P) Gemini CLI専用パーサー新規作成
  - フラット構造（`{"type":"message","role":"assistant","content":"...","delta":true}`）の処理
  - イベントタイプマッピング: `init` → `system`, `message` → `assistant`/`input`
  - フィールドマッピング: `tool_name`→`name`, `tool_id`→`toolUseId`, `parameters`→`input`, `output`→`content`
  - `stats`フィールドから統計情報抽出（`result`イベント）
  - 各エントリに`engineId: 'gemini'`を付与
  - 新規ファイル `src/shared/utils/geminiParser.ts` として作成
  - _Requirements: 1.2, 1.4, 5.2, 5.3, 5.4, 5.5_
  - _Method: geminiParser, parseLine, parseData, GeminiEvent_
  - _Verify: Grep "geminiParser.*LogStreamParser|tool_name.*tool.name|engineId.*gemini" in geminiParser.ts_

- [x] 3.2 Gemini パーサーのdelta統合実装
  - `delta: true`フラグを持つ連続メッセージの結合ロジック
  - `DeltaAccumulator`を使用したコンテンツ蓄積と出力
  - Task 3.1の完了後に実装（同一ファイル内での依存）
  - _Requirements: 3.1, 3.2_
  - _Method: DeltaAccumulator_
  - _Verify: Grep "delta.*true|DeltaAccumulator" in geminiParser.ts_

## Task 4: パーサーファサード更新

- [x] 4.1 `logFormatter.ts`のファサード化
  - `parseLogData`関数に`engineId`引数を追加（オプショナル、デフォルト`'claude'`）
  - `engineId`に基づくパーサー選択ロジック（`'claude'` → `claudeParser`, `'gemini'` → `geminiParser`）
  - 未知の`engineId`はClaudeパーサーにフォールバック（後方互換性）
  - 既存の`getColorClass`等は変更なし
  - 新パーサーモジュールのインポートと委譲
  - Task 2.1, 3.1の完了後に実装
  - _Requirements: 2.2, 2.3_
  - _Method: parseLogData, getParser_
  - _Verify: Grep "parseLogData.*engineId|getParser|claudeParser|geminiParser" in logFormatter.ts_

- [x] 4.2 `parserTypes.ts`の再エクスポート設定
  - `logFormatter.ts`から`ParsedLogEntry`型を再エクスポート（後方互換性）
  - `src/shared/utils/index.ts`に新パーサーモジュールのエクスポートを追加
  - _Requirements: 1.3_

## Task 5: Hook層のengineId対応

- [x] 5.1 `useIncrementalLogParser`フックのengineId引数追加
  - フック引数に`engineId?: LLMEngineId`を追加
  - `parseLogData`呼び出し時に`engineId`を渡す
  - Task 4.1の完了後に実装
  - _Requirements: 2.2_
  - _Method: useIncrementalLogParser_
  - _Verify: Grep "useIncrementalLogParser.*engineId|parseLogData.*engineId" in useIncrementalLogParser.ts_

## Task 6: AgentRecord型拡張

- [x] 6.1 (P) `AgentRecord`型に`engineId`フィールド追加
  - `AgentRecord`インタフェースに`engineId?: LLMEngineId`を追加
  - `agentRecordService.ts`の書き込み処理で`engineId`を永続化
  - 読み取り時の`engineId`未設定レコードは`'claude'`としてデフォルト処理
  - _Requirements: 2.1_
  - _Method: AgentRecord_
  - _Verify: Grep "engineId.*LLMEngineId" in types.ts or agentRecordService.ts_

- [x] 6.2 Agent起動時の`engineId`設定
  - `specManagerService.ts`でAgent起動時に`engineId`を設定
  - 選択中のLLMエンジン情報をAgentRecordに記録
  - Task 6.1の完了後に実装
  - _Requirements: 2.1_
  - _Verify: Grep "engineId" in specManagerService.ts_

## Task 7: UI表示名の動的化

- [x] 7.1 `TextBlock`コンポーネントのengineId対応
  - `TextBlockProps`に`engineId?: LLMEngineId`を追加
  - アシスタント表示名を`getLLMEngine(engineId).label`から取得
  - `engineId`未指定時は"Claude"表示（後方互換性）
  - Task 1.1の完了後に実装
  - _Requirements: 4.1, 4.2_
  - _Method: TextBlockProps, getLLMEngine_
  - _Verify: Grep "engineId|getLLMEngine" in TextBlock.tsx_

- [x] 7.2 ログ表示コンポーネントでのengineId伝達
  - **伝達経路の実装**（以下の順序で修正）:
    1. `AgentLogInfo`インタフェース（AgentLogPanel.tsx）に`engineId?: LLMEngineId`フィールドを追加
    2. `AgentLogPanel`コンポーネントで`useIncrementalLogParser(logs, agent?.command, agent?.engineId)`のように`engineId`を渡す
    3. `useIncrementalLogParser`フックが受け取った`engineId`を`parseLogData(log.data, engineId)`に渡す
    4. `parseLogData`が返す`ParsedLogEntry`に`engineId`が設定される（Task 4.1で実装済み）
    5. `LogEntryBlock`コンポーネントで`<TextBlock text={entry.text} engineId={entry.engineId} />`のように`entry.engineId`を`TextBlock`に渡す
  - Task 5.1, 7.1の完了後に実装
  - _Requirements: 4.1, 4.2_
  - _Verify: Grep "engineId" in LogEntryBlock, AgentLogPanel, and useIncrementalLogParser_

## Task 8: ユニットテスト

- [x] 8.1 (P) Claude パーサーのユニットテスト
  - 各イベントタイプ（system, assistant, tool_use, tool_result, result, input）のパーステスト
  - ネスト構造の正しい解析を検証
  - `engineId: 'claude'`が各エントリに付与されることを検証
  - Task 2.1の完了後に実装可能
  - _Requirements: 1.1, 5.1_

- [x] 8.2 (P) Gemini パーサーのユニットテスト
  - フラット構造（init, message, tool_use, tool_result, error, result）のパーステスト
  - フィールドマッピング（tool_name → name等）の検証
  - `stats`フィールドの抽出検証
  - `engineId: 'gemini'`が各エントリに付与されることを検証
  - Task 3.1の完了後に実装可能
  - _Requirements: 1.2, 5.2, 5.3, 5.4, 5.5_

- [x] 8.3 (P) delta統合のユニットテスト
  - Claude/Gemini両パーサーでのストリーミング断片統合を検証
  - 複数の`delta: true`イベントが1エントリに結合されることを検証
  - Task 2.2, 3.2の完了後に実装可能
  - _Requirements: 3.1, 3.2_

- [x] 8.4 (P) ファサードのユニットテスト
  - `engineId`によるパーサー選択を検証
  - `engineId`未指定時のClaude フォールバックを検証
  - 未知の`engineId`のフォールバック動作を検証
  - Task 4.1の完了後に実装可能
  - _Requirements: 2.2, 2.3_

## Task 9: 統合確認

- [x] 9.1 エンドツーエンド動作確認
  - Gemini CLIの実際のストリームログ出力でパース結果を確認
  - Claude CLIの既存ログで後方互換性を確認
  - UIでのエンジン名表示（Claude/Gemini）を目視確認
  - 全Taskの完了後に実施
  - _Requirements: 4.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Claude CLIパーサー | 2.1, 8.1 | Feature, Test |
| 1.2 | Gemini CLIパーサー | 3.1, 8.2 | Feature, Test |
| 1.3 | 拡張ポイント（interface） | 1.1, 4.2 | Infrastructure |
| 1.4 | イベントタイプ対応 | 2.1, 3.1 | Feature |
| 2.1 | engineId記録 | 6.1, 6.2 | Feature |
| 2.2 | engineIdによるパーサー選択 | 4.1, 5.1, 8.4 | Feature, Test |
| 2.3 | engineId未指定時のデフォルト | 4.1, 8.4 | Feature, Test |
| 3.1 | delta統合 | 2.2, 3.2, 8.3 | Feature, Test |
| 3.2 | Claude/Gemini両対応 | 2.2, 3.2, 8.3 | Feature, Test |
| 3.3 | 実装困難時の段階的対応 | (設計で考慮済み) | - |
| 4.1 | エンジンラベル表示 | 7.1, 7.2, 9.1 | Feature |
| 4.2 | ラベルマッピング | 7.1, 7.2 | Feature |
| 4.3 | ParsedLogEntry.engineId | 1.1 | Infrastructure |
| 5.1 | Claudeネスト構造対応 | 2.1, 8.1 | Feature, Test |
| 5.2 | Geminiフラット構造対応 | 3.1, 8.2 | Feature, Test |
| 5.3 | Geminiフィールドマッピング | 3.1, 8.2 | Feature, Test |
| 5.4 | Gemini initイベント対応 | 3.1, 8.2 | Feature, Test |
| 5.5 | Gemini stats抽出 | 3.1, 8.2 | Feature, Test |

### Coverage Validation Checklist

- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 2.1), not container tasks (e.g., 2)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
