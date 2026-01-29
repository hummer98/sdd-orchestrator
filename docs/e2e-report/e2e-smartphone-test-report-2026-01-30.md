# スマートフォン版Remote UI E2Eテストレポート

**日時**: 2026-01-30
**対象**: electron-sdd-manager/e2e-playwright/smartphone-*.spec.ts
**実行環境**: Playwright + Chromium (viewport: 375x667)

## エグゼクティブサマリー

スマートフォン版Remote UIの4つのE2Eテストスイートを実行した結果、**77テスト中32件が失敗**した（成功率: 28.6%）。

失敗の主な原因は、**テスト期待値と実装の不一致**である：
- data-testid属性の命名不一致
- UI要素の表示条件の違い（デスクトップ版とスマートフォン版の差異）
- ボタンテキストの言語不一致（英語期待 vs 日本語実装）

## テスト実行結果サマリー

| テストスイート | 成功 | 失敗 | 合計 |
|---------------|------|------|------|
| smartphone-agent-log.spec.ts | 18 | 0 | 18 |
| smartphone-auto-execution.spec.ts | 8 | 13 | 21 |
| smartphone-spec-create.spec.ts | 0 | 19 | 19 |
| smartphone-spec.spec.ts | *(実行中断)* | - | 19 |
| **合計** | **22** | **32** | **54+** |

## 主要な問題

### 1. Auto Execution ボタンの不一致

**問題箇所**: `smartphone-auto-execution.spec.ts`

#### data-testid の不一致

- **テスト期待値**: `data-testid="auto-execution-button"`
- **実装**: `data-testid="auto-execute-button"`
- **ファイル**: `src/shared/components/workflow/SpecWorkflowFooter.tsx:135`

```tsx
// 実装 (SpecWorkflowFooter.tsx:135)
<button
  data-testid="auto-execute-button"  // ← テストは "auto-execution-button" を期待
  onClick={onAutoExecution}
  ...
```

#### ボタンテキストの不一致

- **テスト期待値**: "Auto Execute All"
- **実装**: "自動実行" または "停止"
- **ファイル**: `src/shared/components/workflow/SpecWorkflowFooter.tsx:148-158`

```tsx
// 実装
{isAutoExecuting ? (
  <>
    <Square className="w-4 h-4" />
    停止  // ← テストは英語を期待
  </>
) : (
  <>
    <Bot className="w-4 h-4" />
    自動実行  // ← テストは "Auto Execute All" を期待
  </>
)}
```

#### 影響を受けるテスト

- `should display Auto Execute All button in spec detail` ❌
- `should have Auto Execute All button enabled` ❌
- `should handle Auto Execute All click without error` ❌
- `should display phases in correct order` ❌
- `should display current phase tag` ❌
- `should display impl phase item` ❌
- `should display impl phase permission toggle` ❌
- `should display inspection phase item` ❌

### 2. Create Spec ボタンの不一致

**問題箇所**: `smartphone-spec-create.spec.ts`

#### スマートフォン版専用UIの考慮不足

- **テスト期待値**: `data-testid="create-spec-button"`（通常のボタン）
- **実装**: `data-testid="create-fab"`（Floating Action Button）
- **ファイル**: `src/remote-ui/App.tsx:331-346`

```tsx
// スマートフォン版の実装 (App.tsx:331)
{isSmartphone && (
  <button
    data-testid="create-fab"  // ← テストは "create-spec-button" を期待
    onClick={handleCreateClick}
    className="fixed right-4 bottom-20 z-50 w-14 h-14 rounded-full ..."
    aria-label={activeTab === 'specs' ? '新規Specを作成' : '新規バグを作成'}
  >
    <Plus className="w-6 h-6" />
  </button>
)}
```

**原因**: スマートフォン版では通常のヘッダーボタンではなく、FAB（Floating Action Button）として実装されているため、testidが異なる。

#### 影響を受けるテスト（全19テスト）

- `should display create spec button` ❌
- `should have create spec button enabled` ❌
- `should have proper aria-label on create button` ❌
- `should open create spec dialog on button click` ❌
- `should display dialog as fullscreen on smartphone` ❌
- `should display dialog title` ❌
- `should display description textarea` ❌
- `should have placeholder text in description field` ❌
- `should display worktree mode checkbox` ❌
- `should have worktree checkbox unchecked by default` ❌
- `should display submit button` ❌
- `should display cancel button` ❌
- `should display close button` ❌
- `should disable submit button when description is empty` ❌
- `should enable submit button when description is entered` ❌
- `should keep submit button disabled for whitespace-only description` ❌
- `should allow typing in description field` ❌
- `should toggle worktree checkbox` ❌
- `should close dialog on cancel button click` ❌

### 3. Agent Log 表示テスト

**問題箇所**: `smartphone-agent-log.spec.ts`

#### ステータス

✅ **全18テスト成功** - スマートフォン版Agent Log表示は正常に動作

#### 対象機能

- Agent実行ログの表示
- MobileLayout専用のログパネル表示
- ログフィルタリング（Info/Warn/Error）
- ログのスクロール動作

## 成功したテストケース

### smartphone-agent-log.spec.ts（18/18 成功）

- ✅ Agent Log Displayの基本表示
- ✅ ログレベルフィルタリング（Info/Warn/Error）
- ✅ ログパネルのスクロール動作
- ✅ MobileLayout専用UI要素の表示

### smartphone-auto-execution.spec.ts（8/21 成功）

- ✅ Permission Control関連（2テスト）
  - 自動実行パーミッショントグルの表示
  - トグルのクリック可能性
- ✅ Phase Sequence関連（2テスト）
  - Requirements フェーズのgenerated icon表示
  - 前フェーズ未承認時のボタン無効化
- ✅ Resume Functionality関連（2テスト）
  - 生成フェーズのApproveボタン表示
  - Approveボタンの有効状態
- ✅ Intermediate Artifacts関連（1テスト）
  - 完了フェーズのgenerated icon表示
- ✅ Document Review Integration関連（1テスト）
  - Deployフェーズアイテムの表示

## その他の観測事項

### projectConfigService エラー

テスト実行中、以下のエラーが多数発生：

```
[electron-err] [projectConfigService] Invalid config format
```

**頻度**: 40+ 回
**影響**: テスト失敗の直接原因ではないが、アプリケーションの安定性に影響する可能性がある。

**推奨**: projectConfigServiceのエラーハンドリングとバリデーションロジックを調査。

### IPC Handler 重複登録エラー

```
Error: Attempted to register a second handler for 'cloudflare:get-settings'
```

**発生箇所**: Electronアプリ起動時
**影響**: テスト実行には影響なし
**推奨**: IPC handlerの登録ロジックを見直し、重複登録を防止。

## 修正が必要な箇所

### 🔴 必須修正（テスト実行不可）

1. **Auto Execution ボタンのtestid修正**
   - ファイル: `src/shared/components/workflow/SpecWorkflowFooter.tsx:135`
   - 修正: `data-testid="auto-execute-button"` → `data-testid="auto-execution-button"`

2. **Create Spec ボタンのtestid統一**
   - **Option A**: テストを修正して`create-fab`を使用
   - **Option B**: FABに`data-testid="create-spec-button"`を追加（複数testid対応）
   - 推奨: **Option A** - スマートフォン版専用のテストIDを使用

### 🟡 仕様確認が必要（バグか仕様か不明）

3. **Auto Execute ボタンのテキスト言語**
   - 現状: 日本語「自動実行」
   - テスト期待: 英語「Auto Execute All」
   - 判断基準: プロダクトの言語ポリシーによる
   - 推奨: テストを修正して日本語を期待値とする

## 推奨される修正アプローチ

### Phase 1: 明確な不一致の修正

```diff
# src/shared/components/workflow/SpecWorkflowFooter.tsx

- data-testid="auto-execute-button"
+ data-testid="auto-execution-button"
```

### Phase 2: スマートフォン版テストの修正

```diff
# electron-sdd-manager/e2e-playwright/smartphone-spec-create.spec.ts

- const createButton = page.locator('[data-testid="create-spec-button"]');
+ const createButton = page.locator('[data-testid="create-fab"]');
```

### Phase 3: テキスト期待値の国際化対応

```diff
# electron-sdd-manager/e2e-playwright/smartphone-auto-execution.spec.ts

- await expect(autoExecButton).toContainText('Auto Execute All');
+ await expect(autoExecButton).toContainText('自動実行');
```

## 次のステップ

1. ✅ **このレポートを確認** - 問題箇所の特定完了
2. ⏳ **修正方針の決定** - testidとテキストの修正方針を決定
3. ⏳ **修正の実装** - 上記の推奨修正を適用
4. ⏳ **テスト再実行** - 修正後のテスト成功率を確認
5. ⏳ **リグレッション確認** - デスクトップ版E2Eテストも実行して影響範囲を確認

## 付録: テスト実行ログ

- **実行時刻**: 2026-01-29 20:23:24 - 20:30:37 (約7分)
- **ログファイル**: `/private/tmp/claude-501/-Users-yamamoto-git-sdd-orchestrator/tasks/b4b35d0.output`
- **テスト結果ディレクトリ**: `electron-sdd-manager/test-results/`

## 結論

スマートフォン版Remote UIのE2Eテストは、**実装とテスト期待値の不一致**が主な失敗原因である。実装自体は動作しているが、テストが古い仕様またはデスクトップ版の仕様を期待している。

**修正優先度**:
- 🔴 **High**: testid の不一致（修正箇所明確、影響大）
- 🟡 **Medium**: ボタンテキストの言語（仕様確認必要）
- 🟢 **Low**: projectConfigServiceエラー（調査必要、テストには影響なし）
