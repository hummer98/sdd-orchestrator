# Response to Document Review #1

**Feature**: watcher-hmr-health-check
**Review Date**: 2025-12-20
**Reply Date**: 2025-12-20

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Critical Issues

### C-2.1: module.hot API使用の詳細不足

**Issue**: Design/Tasksでmodule.hot APIを使用と記載されているが、Vite環境ではimport.meta.hot APIが正しい。

**Judgment**: **Fix Required** ✅

**Evidence**:
`.kiro/steering/tech.md`を確認:
```markdown
### electron-sdd-manager
- **フロントエンド**: React + TypeScript (Vite)
```
プロジェクトはViteを使用しているため、HMR APIは`import.meta.hot`が正しい。`module.hot`はWebpack固有のAPI。

**Action Items**:
- design.md: 「module.hot APIでリスナー再登録」を「import.meta.hot APIでリスナー再登録」に修正
- design.md: TypeScript型定義として`vite/client`の参照を追記
- tasks.md Task 5.3: 「module.hot API」を「import.meta.hot API」に修正

---

### G-1: エラーリカバリー戦略の不足

**Issue**: chokidarがエラーを発火した後のwatcher再起動手順が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存の`specsWatcherService.ts`を確認:
```typescript
.on('error', (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('[SpecsWatcherService] Watcher error', { error: message });
})
```
現在はエラーをログ出力するのみで、リカバリー処理がない。再起動手順の詳細設計が必要。

**Action Items**:
- design.md: エラーリカバリー戦略セクションに再起動手順（停止→エラークリア→パス再設定→開始）を追記

---

## Response to Warnings

### C-1.1: notificationStoreの通知表示仕様不足

**Issue**: 通知のUI仕様（トースト形式、ダイアログ形式、表示時間等）が未定義。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存の`notificationStore.ts`を確認:
```typescript
const DEFAULT_DURATION = 5000;

interface NotificationState {
  notifications: Notification[];
}

export const notify = {
  error: (message: string, action?: Notification['action']) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message,
      action,
      duration: 8000, // Errors stay longer
    });
  },
  // ...
};
```
既存のnotificationStoreにはトースト形式の通知機能が実装済み。`type`, `message`, `action`, `duration`が設定可能。本機能はこの既存パターンを使用するため、追加のUI仕様定義は不要。

---

### C-2.2: BugsWatcherServiceテスト不足

**Issue**: Tasks 7.2/7.3でSpecsWatcherServiceのテストは明記されているが、BugsWatcherServiceのテストが明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdを確認:
```markdown
- [ ] 7.2 ユニットテストを作成する
  - SpecsWatcherService.getStatus()の正常/停止/エラー状態テスト
```
BugsWatcherServiceに同様の拡張を行うと記載されているが（design.md）、テストは明記されていない。

**Action Items**:
- tasks.md Task 7.2: BugsWatcherService.getStatus()のテストを追記
- tasks.md Task 7.3: BugsWatcherServiceのイベント伝播テストを追記

---

### C-4.1: ヘルスチェックHookのマウント場所未定義

**Issue**: useWatcherHealthCheckをマウントする具体的なコンポーネントが未指定。

**Judgment**: **Fix Required** ✅

**Evidence**:
App.tsxを確認すると、イベントリスナーのセットアップパターンが存在:
```typescript
const eventListenersSetup = useRef(false);
useEffect(() => {
  if (eventListenersSetup.current) {
    return;
  }
  eventListenersSetup.current = true;
  const cleanup = setupEventListeners();
  return () => {
    eventListenersSetup.current = false;
    cleanup();
  };
}, [setupEventListeners]);
```
同様のパターンでApp.tsx内にuseWatcherHealthCheckをマウントするのが適切。

**Action Items**:
- design.md: マウント場所を「App.tsx内でuseEffectを使用してマウント」と明記
- tasks.md Task 7.1: 「App.tsx内にuseWatcherHealthCheckをマウント（useRefで二重実行防止）」と詳細化

---

### G-2: HMR環境での動作保証

**Issue**: ViteのHMR（import.meta.hot）とWebpackのHMR（module.hot）の両方への対応が必要だが、Vite環境のみ。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
C-2.1で対応済み。本プロジェクトはVite専用のため、import.meta.hotのみサポートすれば十分。Webpackへの対応は不要（Non-Goalsとして扱う）。

---

### G-4: テストのモック戦略

**Issue**: chokidarをモックする方法、HMR環境をテストでシミュレートする方法が未定義。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
テストモック戦略は実装フェーズで標準的なVitestのモック機能を使用して対応可能。以下の既存パターンに従えばよい:
- chokidar: `vi.mock('chokidar')` でモック
- import.meta.hot: Vitestでは`import.meta`をモック可能

設計段階で詳細なモック戦略を定義する必要性は低い。

---

### O-2: E2Eテスト追加の必要性

**Issue**: 本機能のE2Eテストが明記されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
design.mdに「E2E Tests (if applicable)」セクションがあり、以下を記載:
```markdown
- watcher起動確認: プロジェクト選択後にwatcher状態がhealthyになる
- エラー通知確認: watcherエラー時に通知が表示される
```
E2Eテストの方針は記載済み。詳細な実装はtasks.mdに必須で追加する必要はなく、実装フェーズで対応可能。

---

## Response to Info (Low Priority)

| #    | Issue                      | Judgment      | Reason                                                        |
| ---- | -------------------------- | ------------- | ------------------------------------------------------------- |
| C-1.2 | 履歴ログ形式未定義           | No Fix Needed | 既存のlogger実装に従う。JSON構造化ログは既存パターン            |
| C-4.2 | デフォルトインターバル値の不一致 | Fix Required  | Requirementsにデフォルト5秒を明記すべき                          |
| A-1〜A-4 | 曖昧さ解消                 | No Fix Needed | 実装フェーズで詳細化可能。設計段階では過度な詳細は不要           |

---

## Files to Modify

| File             | Changes                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| design.md        | - 「module.hot」→「import.meta.hot」に修正<br>- vite/client型定義の参照を追記<br>- エラーリカバリー手順を追記<br>- Hookマウント場所を「App.tsx」と明記 |
| tasks.md         | - Task 5.3: 「module.hot」→「import.meta.hot」に修正<br>- Task 7.1: App.tsx内マウントを詳細化<br>- Task 7.2/7.3: BugsWatcherServiceテストを追記 |
| requirements.md  | - Requirement 2.5: デフォルト間隔5秒を明記                                                                     |

---

## Conclusion

**5件の修正が必要**（Critical: 2件、Warning: 2件、Info: 1件）

主な修正内容:
1. HMR APIをViteの`import.meta.hot`に統一
2. エラーリカバリー戦略の詳細化
3. BugsWatcherServiceのテスト追記
4. Hookマウント場所の明確化
5. デフォルトインターバル値の明記

修正を適用するには `--fix` フラグで再実行してください:
```
/kiro:document-review-reply watcher-hmr-health-check --fix
```

---

_This reply was generated by the document-review-reply command._
