# Bug Analysis: agent-log-input-improvements

## Summary
AgentInputPanelコンポーネントにおいて、2つの改善が必要:
1. **入力履歴機能の削除**: 現在実装されている履歴表示・再送信機能を削除
2. **複数行入力対応**: `<input>` を `<textarea>` に変更し、Option+Enterで改行、Enterで送信

## Root Cause

### 技術的詳細
- **Location**: `electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx`
- **Component**: AgentInputPanel
- **Trigger**: 機能改善要求（バグではなく機能変更）

### 現在の実装分析

#### 1. 入力履歴機能（削除対象）
```typescript
// Lines 16-20: 履歴の型定義
interface InputHistoryItem {
  id: string;
  input: string;
  timestamp: number;
}

// Line 26: 履歴のstate
const [history, setHistory] = useState<InputHistoryItem[]>([]);

// Lines 42-47: 履歴への追加処理
const historyItem: InputHistoryItem = {
  id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  input,
  timestamp: Date.now(),
};
setHistory((prev) => [...prev, historyItem]);

// Lines 67-69: 履歴クリックハンドラ
const handleHistoryClick = (input: string) => {
  handleSend(input);
};

// Lines 125-154: 履歴UIセクション
{history.length > 0 && (
  <div className="mt-3">
    ...履歴表示UI...
  </div>
)}
```

#### 2. 現在の入力フィールド（変更対象）
```typescript
// Lines 75-91: 単一行input要素
<input
  type="text"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="追加の指示を入力..."
  ...
/>

// Lines 58-64: Enterキー処理（現在はShift+Enterを無視）
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
    e.preventDefault();
    handleSend(inputValue);
  }
};
```

## Impact Assessment
- **Severity**: Low（UX改善のみ、機能的なバグではない）
- **Scope**: AgentInputPanelコンポーネントのみ
- **Risk**: 低（既存のテストを更新すれば問題なし）

## Related Code
- メインファイル: [AgentInputPanel.tsx](electron-sdd-manager/src/renderer/components/AgentInputPanel.tsx)
- テストファイル: [AgentInputPanel.test.tsx](electron-sdd-manager/src/renderer/components/AgentInputPanel.test.tsx)
- インポート元: [components/index.ts](electron-sdd-manager/src/renderer/components/index.ts)

## Proposed Solution

### Option 1（推奨）: 最小変更アプローチ

#### 変更1: 入力履歴機能の削除
1. `InputHistoryItem` インターフェースを削除
2. `history` stateを削除
3. `handleSend`内の履歴追加処理を削除
4. `handleHistoryClick`関数を削除
5. 履歴UIセクション全体を削除
6. `History`, `Clock` アイコンのimportを削除

#### 変更2: 複数行入力対応
1. `<input type="text">` を `<textarea>` に変更
2. `handleKeyDown` を修正:
   - **Enter**: 送信（既存動作）
   - **Option(Alt)+Enter**: 改行を挿入
3. textareaの高さを動的に調整（min: 1行、max: 4-5行程度）
4. CSSで適切なリサイズ制御

```typescript
// 新しいキーハンドラ（概念）
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.nativeEvent.isComposing) return;

  if (e.key === 'Enter' && e.altKey) {
    // Option+Enter: 改行を挿入（デフォルト動作を許可）
    return;
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend(inputValue);
  }
};
```

### Recommended Approach
**Option 1を推奨**。シンプルで既存コードへの影響が最小限。

## Dependencies
- テストファイル `AgentInputPanel.test.tsx` の更新が必要
  - 入力履歴関連テスト（Task 32.2セクション）を削除
  - 複数行入力の新しいテストを追加

## Testing Strategy
1. **手動テスト**:
   - 入力フィールドでOption+Enterを押して改行されることを確認
   - 複数行入力時にテキストエリアが拡張されることを確認
   - Enterキーで送信されることを確認
   - 履歴セクションが表示されないことを確認

2. **ユニットテスト**:
   - 既存の履歴テスト（Task 32.2）を削除
   - 新規テスト追加:
     - Option+Enterで改行が挿入される
     - Enterで送信される
     - 複数行テキストが正しく送信される

3. **既存テスト維持**:
   - Task 32.1のテストは基本的に維持（input→textareaへの変更に対応）
