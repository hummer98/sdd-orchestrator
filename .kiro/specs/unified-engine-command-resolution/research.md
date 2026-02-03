# Research & Design Decisions: Unified Engine Command Resolution

## Summary

- **Feature**: `unified-engine-command-resolution`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 現状、`command: 'claude'`と`command: getClaudeCommand()`の混在が根本原因
  - 既存の`LLMEngineId`型と`ClaudePathResolverService`を活用可能
  - 影響範囲は内部コードのみで、破壊的変更でも問題なし

## Research Log

### 現状のコマンド解決パターン調査

- **Context**: `startAgent`呼び出し時のコマンド指定方法の実態を調査
- **Sources Consulted**: `handlers.ts`, `agentHandlers.ts`, `specHandlers.ts`, `bugHandlers.ts`, `IpcApiClient.ts`
- **Findings**:
  - `handlers.ts`: `command: 'claude'`を直接指定（3箇所）
  - `agentHandlers.ts`: `command === 'claude' ? getClaudeCommand() : command`で変換
  - `IpcApiClient.ts`: `'claude'`リテラルを使用
  - `agentStoreAdapter.ts`: `command`パラメータを受け取り、そのまま渡す
- **Implications**: 呼び出し側での責任分散が問題。`startAgent`内部で統一解決すべき

### 既存のエンジン抽象化調査

- **Context**: `LLMEngineId`型と`LLMEngineRegistry`の活用可能性を調査
- **Sources Consulted**: `llmEngineRegistry.ts`, `engineConfigService.ts`
- **Findings**:
  - `LLMEngineId = 'claude' | 'gemini'`が既に定義
  - `LLMEngine`インターフェースに`command: string`プロパティあり
  - `DEFAULT_LLM_ENGINE = 'claude'`が定義済み
  - `engineConfigService`でフェーズ別エンジン設定が可能
- **Implications**: 既存の型定義を活用し、新しいサービスで橋渡し

### ClaudePathResolverServiceの役割確認

- **Context**: 既存のパス解決ロジックの再利用性を確認
- **Sources Consulted**: `claudePathResolverService.ts`, `agentProcess.ts`
- **Findings**:
  - `resolveClaudePath()`: ログインシェル経由で`which claude`を実行
  - `getClaudePath()`: キャッシュされたパスを返す、E2E環境変数をサポート
  - `getClaudeCommand()`: `getClaudePathResolverService().getClaudePath()`のヘルパー
- **Implications**: `EngineCommandResolverService`から委譲で再利用可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. 呼び出し側で`getClaudeCommand()`統一 | 全ての呼び出し側で`getClaudeCommand()`を呼ぶ | 変更が小さい | 呼び出し漏れが発生しやすい、将来のマルチエンジン対応が困難 | 却下 |
| B. `startAgent`内部解決 + `engineId`パラメータ | `startAgent`内部でコマンド解決、呼び出し側は`engineId`のみ指定 | 責任が明確、拡張しやすい | 全呼び出し元の更新が必要 | **採用** |
| C. `LLMEngineRegistry`直接統合 | `LLMEngineRegistry`にパス解決機能を追加 | 既存の抽象化に統合 | 変更範囲が大きい、段階的統合の方針に反する | 将来検討 |

## Design Decisions

### Decision: `EngineCommandResolverService`の導入

- **Context**: コマンドパス解決を`startAgent`内部で行う方法
- **Alternatives Considered**:
  1. `startAgent`内に直接実装: 責任が肥大化
  2. `LLMEngineRegistry.getLLMEngine(engineId).command`を使用: `command`プロパティは`'claude'`リテラルで、パス解決されていない
  3. 新しいサービスで委譲: **採用**
- **Selected Approach**: `EngineCommandResolverService`を新設
- **Rationale (Why)**:
  - 単一責任原則: パス解決ロジックを分離
  - テスト容易性: DIパターンでモック可能
  - 拡張性: 将来のエンジン追加時に`switch`文で拡張
- **Trade-offs**: 新しいファイル追加のオーバーヘッド vs 明確な責任分離
- **Follow-up**: 将来的に`LLMEngineRegistry`に統合を検討

### Decision: 後方互換性を維持しない

- **Context**: `command`パラメータの扱い
- **Alternatives Considered**:
  1. `command`パラメータを残しつつ`engineId`も追加: 混乱が生じる
  2. `command`をdeprecated警告付きで残す: 不要な複雑さ
  3. `command`を完全削除、`engineId`に統一: **採用**
- **Selected Approach**: `command`パラメータを削除
- **Rationale (Why)**:
  - 調査の結果、カスタムコマンドを渡しているケースがない
  - 全て内部コードなので破壊的変更でも問題なし
  - 明確なAPIで将来の保守性向上
- **Trade-offs**: 一度に全箇所の更新が必要 vs クリーンなAPI
- **Follow-up**: なし

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 更新漏れによるコンパイルエラー | TypeScript型チェックで検出、CIで検証 |
| E2Eテストの破損 | E2E_MOCK_CLAUDE_COMMANDのサポートを維持 |
| `ClaudePathResolverService`の解決失敗 | 既存のフォールバック動作を維持（`'claude'`を返す） |

## References

- `electron-sdd-manager/src/shared/registry/llmEngineRegistry.ts` - 既存のLLMエンジン抽象化
- `electron-sdd-manager/src/main/services/claudePathResolverService.ts` - パス解決ロジック
- `electron-sdd-manager/src/main/services/specManagerService.ts` - `startAgent`実装
