# Bug Analysis: sessionid-parse-chunk-split

## Summary
Claude Codeのstdout出力がチャンク分割される場合、`parseAndUpdateSessionId()`が不完全なJSONをパースしようとして失敗し、sessionIdが取得されない。

## Root Cause
`parseAndUpdateSessionId()`メソッドは、各チャンク（`data`パラメータ）が完全なJSON行を含むことを前提として`\n`で分割・パースを試みているが、Node.jsの子プロセスstdoutイベントはデータを任意の位置で分割して配信するため、JSON行の途中で切断されることがある。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/specManagerService.ts:1315-1358`
- **Component**: `SpecManagerService.parseAndUpdateSessionId()`
- **Trigger**: Claude Codeの`system/init`メッセージが大きい場合（ツール一覧、slash_commands一覧を含む）、Node.jsが内部バッファサイズに基づいてチャンクを分割

### 問題のコードパターン
```typescript
// specManagerService.ts:1324-1327
const lines = data.split('\n').filter((line) => line.trim());
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);  // チャンク境界で分割された不完全なJSONでエラー
```

### 発生フロー
1. `process.onOutput()` がstdoutチャンクを受信（specManagerService.ts:635-641）
2. チャンクがJSON行の途中で切断されている
3. `parseAndUpdateSessionId()` が `\n` で分割
4. 不完全なJSON文字列で `JSON.parse()` が失敗
5. catch節で静かに無視され、sessionIdが抽出されないまま終了
6. 次のチャンクには前半部分がないため、やはりパース失敗
7. `AgentInputPanel.tsx:35` の `canResume` 判定で `agent.sessionId` が空のため false

## Impact Assessment
- **Severity**: Medium
- **Scope**: 長い出力を生成するエージェント（spec-inspection等）で発生しやすい
- **Risk**: 修正による既存動作への影響は低い（バッファリングは追加処理のみ）

## Proposed Solution

### Option 1: agentIdごとのバッファリング（推奨）
- **Description**: 改行で終わらない不完全な行をMapに保持し、次のチャンクと結合
- **Pros**:
  - 確実にJSON行を完全な形で処理可能
  - 既存のパース処理ロジックへの変更は最小限
- **Cons**:
  - agentごとのバッファ管理が必要（メモリ使用量微増）

```typescript
// 追加: クラスフィールド
private sessionIdParseBuffers = new Map<string, string>();

// 変更: parseAndUpdateSessionId()
private parseAndUpdateSessionId(agentId: string, specId: string, data: string): void {
  const agent = this.registry.get(agentId);
  if (agent?.sessionId) {
    this.sessionIdParseBuffers.delete(agentId);
    return;
  }

  // 前回の残りバッファと結合
  const buffer = (this.sessionIdParseBuffers.get(agentId) || '') + data;
  const lines = buffer.split('\n');

  // 最後の行が改行で終わっていない場合はバッファに保持
  const lastLine = lines.pop() || '';
  if (lastLine) {
    this.sessionIdParseBuffers.set(agentId, lastLine);
  } else {
    this.sessionIdParseBuffers.delete(agentId);
  }

  // 完全な行のみパース
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'system' && parsed.subtype === 'init' && parsed.session_id) {
        // ... 既存のsessionId更新処理
        this.sessionIdParseBuffers.delete(agentId);
        return;
      }
    } catch {
      // Not valid JSON, skip
    }
  }
}
```

### Option 2: 正規表現でsession_idを直接抽出
- **Description**: JSONパースせずに`"session_id":"..."` パターンをマッチ
- **Pros**: バッファ管理不要
- **Cons**:
  - JSONの構造変更に弱い
  - session_idが行境界で分割される可能性は残る

### Recommended Approach
**Option 1（バッファリング）** を推奨。理由：
1. 技術的に正確（JSONLストリームの正しい処理方法）
2. 他の行パース処理にも応用可能
3. 将来の拡張性が高い

## Dependencies
- `SpecManagerService` クラスに新規フィールド追加
- agent終了時のバッファクリーンアップ（オプション）

## Testing Strategy
1. **単体テスト**: `parseAndUpdateSessionId()` に対して分割されたチャンクを渡すテスト
   - チャンク1: `{"type":"system","subtype":"init","session_id":"abc`
   - チャンク2: `123-def"}\n`
   - → sessionIdが正しく抽出されることを確認
2. **統合テスト**: spec-inspectionなど大きな出力を生成するエージェントを実行し、sessionIdが設定されることを確認
3. **回帰テスト**: 既存の短いレスポンスでも正常に動作することを確認
