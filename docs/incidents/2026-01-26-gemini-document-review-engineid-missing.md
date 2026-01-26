# [Resolved] Gemini Document Review engineId未伝達バグ

> **Status:** Resolved
> **Discovered:** 2026-01-26T04:24:03Z
> **Resolved:** 2026-01-26T04:27:00Z
> **Related Spec:** llm-stream-log-parser, gemini-document-review

## 概要

ドキュメントレビューでGeminiスキーム（`gemini-cli`）を選択した際、AgentログがGeminiパーサーでパースされず、正常に表示されない。`executeDocumentReview`メソッドが`startAgent`に`engineId`を渡していないことが原因。

## 症状

- ドキュメントレビューでGeminiスキームを選択
- Agentログパネルにログが正常にパースされて表示されない
- Claudeスキームでは正常に動作

## 根本原因

`specManagerService.ts`の`executeDocumentReview`メソッドで、Gemini CLIを使用する場合に`startAgent`へ`engineId: 'gemini'`が渡されていない。

### 問題箇所

```typescript
// specManagerService.ts:1709-1721
// For Gemini CLI, use the engine configuration
const command = engine.command;
const args = engine.buildArgs(featureName);
const cmdString = Array.isArray(command) ? command[0] : command;
const cmdArgs = Array.isArray(command) ? [...command.slice(1), ...args] : args;

return this.startAgent({
  specId,
  phase: 'document-review',
  command: cmdString,
  args: cmdArgs,
  group: 'doc',
  // ← engineId が渡されていない
});
```

## なぜ発生したか（SDD観点）

### 1. 要件の抽象度が高すぎた

llm-stream-log-parser の requirements.md 要件 2.1:
> "When an agent is started, the system shall record the `engineId` (LLMEngineId) in the agent metadata"

この要件は「Agent起動時にengineIdを記録する」という汎用的な記述で、**具体的にどの実行パスでengineIdを渡すべきか**が列挙されていなかった。

### 2. タスク定義が受け取り側のみだった

tasks.md の Task 6.2:
> "Agent起動時の`engineId`設定 - `specManagerService.ts`でAgent起動時に`engineId`を設定"

実装では`startAgent`メソッドに`engineId`パラメータを追加し、`AgentRecord`に保存する「受け取り側」の実装のみが行われた。**呼び出し側（caller）の修正**が漏れた。

### 3. 機能横断的な統合ポイントの見落とし

- `llm-stream-log-parser`：ログパーサーのengineId対応
- `gemini-document-review`：ドキュメントレビューのスキーム選択

この2つの機能の**統合ポイント**（Geminiスキーム選択時にengineIdを渡す）が、どちらのスコープでも明示的に定義されなかった。

### 4. Inspectionの限界

inspection-1.md では Task 6.2 が「PASS」と判定されたが、これは:
- `startAgent`の引数に`engineId`が追加されている ✓
- `AgentRecord`に`engineId`が保存される ✓

という「受け取り側」の実装確認のみでPASSとなり、**エンドツーエンドの動作確認**（Geminiスキームで実際にドキュメントレビューを実行してログが正しくパースされるか）が不足していた。

## 教訓

1. **統合要件の明示化**: 複数の機能が関わる場合、統合ポイントを明示的に要件化する
2. **呼び出し側の列挙**: 「〜を記録する」だけでなく「〜を渡す」側のタスクも明示的に定義する
3. **E2E検証の重要性**: ユニットテストのPASSだけでなく、実際のユースケースでのエンドツーエンド検証を行う
4. **スキーム→engineIdマッピング**: `ReviewerScheme`と`LLMEngineId`の対応関係を型レベルで明確化する

## 修正方針

1. `ReviewerScheme` → `LLMEngineId` のマッピング関数を追加
2. `executeDocumentReview`でGemini/debatexスキーム使用時に`engineId`を渡す
3. TDDで修正（失敗するテストを先に書く）

## 影響範囲

- `specManagerService.ts` の `executeDocumentReview` メソッド
- Geminiスキームでのドキュメントレビュー実行時のログ表示

## テスト期待値

```typescript
describe('executeDocumentReview with Gemini scheme', () => {
  it('should pass engineId: "gemini" to startAgent when scheme is gemini-cli', async () => {
    const result = await service.executeDocumentReview({
      specId: 'test-spec',
      featureName: 'test-feature',
      scheme: 'gemini-cli',
    });

    // AgentRecord に engineId: 'gemini' が記録されている
    expect(result.ok).toBe(true);
    expect(result.value.engineId).toBe('gemini');
  });
});
```

## 解決

### 修正内容

1. **`reviewEngineRegistry.ts`に`getEngineIdFromScheme`関数を追加**
   - `ReviewerScheme` → `LLMEngineId`のマッピング関数
   - `'claude-code'` → `'claude'`
   - `'gemini-cli'` → `'gemini'`
   - `'debatex'` → `'claude'`（テキスト出力のため）

2. **`specManagerService.ts`の`executeDocumentReview`メソッドを修正**
   - 冒頭で`const engineId = getEngineIdFromScheme(scheme)`を呼び出し
   - 3箇所の`startAgent`呼び出しすべてに`engineId`を渡すよう修正

### 修正ファイル

- `electron-sdd-manager/src/shared/registry/reviewEngineRegistry.ts`
- `electron-sdd-manager/src/main/services/specManagerService.ts`

### テスト追加

- `specManagerService.test.ts`: engineId伝達テスト3件追加
- `reviewEngineRegistry.test.ts`: `getEngineIdFromScheme`テスト5件追加

### 検証結果

- `specManagerService.test.ts`: 127件すべてパス
- `reviewEngineRegistry.test.ts`: 42件すべてパス
