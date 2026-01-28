# Research & Design Decisions: Main Process Log Parser

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.
---

## Summary
- **Feature**: `main-process-log-parser`
- **Discovery Scope**: Extension (既存システムへの統合型機能拡張)
- **Key Findings**:
  - 既存パーサー実装（`claudeParser.ts`, `geminiParser.ts`）はNode.js/Browser両対応のため、Main processでも再利用可能
  - データ正規化責務はMain processに属するべき（現状のUI層でのパース処理は設計上の不整合）
  - LogFileServiceは生データ（raw LogEntry）を保存済み、パース済みデータ保存への変更は不要

## Research Log

### 既存パーサー実装の再利用可能性

- **Context**: UI層で使用中のLLMパーサー（`claudeParser.ts`, `geminiParser.ts`）がMain processでも利用可能かを確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/shared/utils/parserTypes.ts`
  - `electron-sdd-manager/src/shared/utils/claudeParser.ts`
  - `electron-sdd-manager/src/shared/utils/geminiParser.ts`
- **Findings**:
  - パーサーは`shared/utils/`に配置され、プラットフォーム非依存の実装
  - `LogStreamParser`インターフェースによる統一仕様
  - `ParsedLogEntry`型による正規化済み出力形式
  - Node.js APIやDOM APIへの依存なし
- **Implications**: 新規パーサー実装不要。既存実装をMain processから直接利用可能。

### delta統合（ストリーミング断片結合）の現状

- **Context**: ストリーミング出力のdelta断片をどこで統合すべきか
- **Sources Consulted**:
  - `useIncrementalLogParser.ts`（現在UI層でdelta処理を実施）
  - `parserTypes.ts`（`DeltaAccumulator`インターフェース）
- **Findings**:
  - 現状：`useIncrementalLogParser`フックがUI層で`parseLogData()`を呼び出し、delta統合を実施
  - `parseLogData()`内部でdelta断片を蓄積し、完全なメッセージに統合
  - delta統合ロジックは既にパーサー内に実装済み
- **Implications**: Main processでパース時に`parseData()`を呼び出すことで、delta統合済みの`ParsedLogEntry[]`をUIに送信可能。UI層でのdelta統合処理は不要になる。

### IPC/WebSocket API型定義の現状

- **Context**: ログデータの送信フォーマットとAPI型定義
- **Sources Consulted**:
  - `src/shared/api/types.ts`
  - `src/main/ipc/channels.ts`
  - `src/shared/stores/agentStore.ts`
- **Findings**:
  - 現在のIPC：`onAgentLog`イベント、`LogEntry`型（raw format）を送信
  - 現在のWebSocket：`agent-log`イベント、同様に`LogEntry`型を送信
  - `agentStore.logs: Map<string, LogEntry[]>`でraw logsを保持
  - `useIncrementalLogParser`がUI層でLogEntryをParseする
- **Implications**: API型定義を`LogEntry → ParsedLogEntry`に変更する必要がある。これは破壊的変更だが、設計上正しい方向性。

### LogFileServiceのデータ保存形式

- **Context**: ログファイルに保存するデータ形式（raw vs parsed）
- **Sources Consulted**:
  - `src/main/services/logFileService.ts`
  - requirements.md (Requirement 7: ログファイル形式の維持)
- **Findings**:
  - LogFileService: `appendLog(entry: LogEntry)`でJSONL形式保存
  - 互換性・デバッグツール対応のため、raw format維持が要求仕様
  - パースコストは問題にならない（必要時のみ読み込み）
- **Implications**: LogFileServiceの変更不要。読み込み時（`logParserService`等）でパーサーを適用すればよい。

## Architecture Pattern Evaluation

### Log Parsing Pipeline Options

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Main Process Parsing (選択)** | Main processでパース、ParsedLogEntryを送信 | データ正規化責務の正当な配置、UI層の簡略化 | IPC overhead増加の可能性（データサイズ増） | Electronアーキテクチャ原則に準拠 |
| **UI Layer Parsing (現状)** | UI層で受信後にパース | IPC payloadが軽量 | UI層がLLM固有フォーマットを認識、Mainとの状態不整合 | 設計原則違反（データ正規化はMainの責務） |
| **Hybrid (部分的パース)** | Main processで基本パース、UI層で表示用整形 | 柔軟性 | 責務境界が曖昧、複雑性増加 | YAGNI原則違反 |

## Design Decisions

### Decision: Main ProcessでのLog Parsing実施

- **Context**: ログパース責務をUI層とMain processのどちらに配置するか
- **Alternatives Considered**:
  1. **現状維持**（UI層でパース）- データ正規化責務がRendererに漏出
  2. **Main processでパース**（推奨）- データ正規化をMainに集約
- **Selected Approach**: Main processでパース実施
- **Rationale (Why)**:
  - **Technical reasons**: Electronアーキテクチャ原則「Main processはビジネスロジック・データ正規化を担当」
  - **Context considerations**: UI層はLLM固有フォーマットを意識すべきでない（LLM追加時の変更範囲最小化）
  - **Constraints that ruled out alternatives**: 現状維持は設計原則違反
- **Trade-offs**: IPC payload増加（ParsedLogEntryはLogEntryより若干大きい）vs 設計一貫性・保守性向上 → 後者を優先
- **Follow-up**: パフォーマンステストで大量ログ時のIPC overhead検証

### Decision: API Breaking Change許容

- **Context**: IPC/WebSocket APIの型を`LogEntry → ParsedLogEntry`に変更するか
- **Alternatives Considered**:
  1. **互換性維持**（両方の型をサポート）- 複雑性増加
  2. **Breaking Change**（推奨）- クリーンな設計
- **Selected Approach**: Breaking Change許容
- **Rationale (Why)**:
  - **Technical reasons**: 内部API（外部公開なし）のため、影響範囲は限定的
  - **Context considerations**: 既存クライアント（Remote UI含む）は同時に更新される
  - **Constraints that ruled out alternatives**: 互換性レイヤーは将来の技術的負債になる
- **Trade-offs**: 移行コスト vs 長期保守性 → 一度の移行で設計整合性を確保
- **Follow-up**: Remote UIとElectron UIの両方で動作確認

### Decision: Log File Format維持

- **Context**: ログファイルにパース済みデータを保存するか
- **Alternatives Considered**:
  1. **Parsed data保存** - パースコスト削減
  2. **Raw data保存**（推奨）- 互換性・柔軟性維持
- **Selected Approach**: Raw data保存維持
- **Rationale (Why)**:
  - **Technical reasons**: 外部ツール（jq, grep等）での解析可能性維持
  - **Context considerations**: パーサーバグ修正時の再パース可能性
  - **Constraints that ruled out alternatives**: パースコストは問題にならない（オンデマンド読み込み）
- **Trade-offs**: 読み込み時パースコスト vs ログ互換性・デバッグ容易性 → 後者を優先
- **Follow-up**: なし

## Risks & Mitigations

- **Risk 1**: IPC payload増加によるパフォーマンス低下 → Mitigation: 大量ログ時のストリーム処理・バッファリング戦略の検討
- **Risk 2**: 既存Claude専用コードでのGeminiログ誤処理 → Mitigation: engineId必須化、フォールバックロジック実装
- **Risk 3**: Remote UIでのログ表示不具合 → Mitigation: WebSocket API更新とRemote UI側の同期テスト

## References

- [Electron Process Architecture](https://www.electronjs.org/docs/latest/tutorial/process-model) - Main/Renderer責務分離
- [structure.md](.kiro/steering/structure.md) - "Electron Process Boundary Rules (Strict)"
- [design-principles.md](.kiro/steering/design-principles.md) - AI設計判断の原則
