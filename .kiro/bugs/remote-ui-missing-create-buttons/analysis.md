# Bug Analysis: remote-ui-missing-create-buttons

## Summary
Remote-UIにSpec/Bug新規作成ボタンがなく、作成機能が使えない。Electron版では`SpecListHeader`と`BugPane`にPlusアイコンがあり、ダイアログ経由で作成可能。

## Root Cause
Remote-UIは読み取り・操作専用のインターフェースとして設計されており、作成UIが意図的に省略されている。

### Technical Details
- **Location**:
  - 欠落箇所: `electron-sdd-manager/src/main/remote-ui/index.html:71-78` (spec-list-section)
  - 欠落箇所: `electron-sdd-manager/src/main/remote-ui/index.html:81-91` (bug-list-section)
- **Component**: Remote-UI SpecList, BugList
- **Trigger**: 機能未実装

## Impact Assessment
- **Severity**: Medium（作成機能が使えないが、既存Spec/Bugの操作は可能）
- **Scope**: Remote-UIで新規作成を行いたいユーザー
- **Risk**: モバイルからの作成ができないため、PC版が必要

## Related Code

### Electron版の実装

**SpecListHeader.tsx** ([L36-48](electron-sdd-manager/src/renderer/components/SpecListHeader.tsx#L36-L48)):
```tsx
<button
  onClick={onCreateClick}
  disabled={disabled}
  title="新規仕様を作成"
  className="p-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
>
  <Plus className="w-4 h-4" />
</button>
```

**CreateSpecDialog.tsx** ([L48](electron-sdd-manager/src/renderer/components/CreateSpecDialog.tsx#L48)):
```tsx
const agentInfo = await window.electronAPI.executeSpecInit(currentProject, trimmed, commandPrefix);
```

### Remote-UIの現状

**index.html** (spec-list-section):
```html
<section id="spec-list-section" class="p-4">
  <div id="spec-list" class="space-y-2">
    <!-- Spec items will be rendered here - NO create button -->
  </div>
</section>
```

### WebSocket API

既存のWebSocketメッセージには`CREATE_SPEC`や`CREATE_BUG`が存在しない。
現在サポートされているメッセージ:
- `EXECUTE_PHASE` - Specフェーズ実行
- `EXECUTE_BUG_PHASE` - Bugフェーズ実行
- `EXECUTE_VALIDATION` - バリデーション実行
- `EXECUTE_DOCUMENT_REVIEW` - ドキュメントレビュー実行

## Proposed Solution

### Option 1: シンプルな作成ボタン追加（推奨）
Remote-UIにシンプルな作成UIを追加。

**必要な変更:**
1. `index.html` - spec-list-section / bug-list-section にPlusボタン追加
2. `components.js` - 作成ダイアログコンポーネント追加
3. `webSocketHandler.ts` - `CREATE_SPEC` / `CREATE_BUG` メッセージハンドラ追加
4. `app.js` - 作成フロー処理追加

**UI設計:**
- モバイル向けシンプルなダイアログ
- 説明文入力のみ（Spec名は自動生成）
- spec-init / bug-create コマンドを実行

- Pros: 完全な機能パリティ
- Cons: 工数大（WebSocket API拡張含む）

### Option 2: 作成機能は意図的に省略
Remote-UIは監視・操作専用とし、作成はPC版に限定。

- Pros: 変更不要
- Cons: 機能差異が残る

### Option 3: 外部リンク方式
「PC版で作成」ボタンを表示し、作成はデスクトップ版に誘導。

- Pros: 最小限の変更
- Cons: ユーザー体験が悪い

### Recommended Approach
**Option 1（シンプルな作成ボタン追加）** を推奨。

理由:
1. Remote-UIからの作成ニーズは高い（外出先からの作成）
2. WebSocket APIの拡張は既存パターンに沿って実装可能
3. モバイル向けシンプルUIで十分（詳細設定はPC版で）

## Dependencies
- WebSocket APIの拡張が必要
- `specManagerService` へのアクセス（既存のworkflowController経由）

## Implementation Steps

### Step 1: WebSocket API追加
1. `webSocketHandler.ts` に `handleCreateSpec` / `handleCreateBug` メソッド追加
2. `CREATE_SPEC` / `CREATE_BUG` メッセージタイプを処理

### Step 2: Remote-UI UI追加
1. `index.html` にPlusボタン追加
2. `components.js` に作成ダイアログクラス追加
3. `app.js` に作成フロー処理追加

### Step 3: バリデーション
1. 入力検証（空チェック）
2. 重複チェック（既存Spec/Bug名）

## Testing Strategy
1. Remote-UIで新規Spec作成ボタンをタップ
2. 説明を入力して作成実行
3. Spec一覧に新規Specが表示されることを確認
4. 同様にBug作成をテスト
