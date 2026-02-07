# Response to Document Review #13

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 4      | 3            | 0             | 0                |
| Warning  | 5      | 1            | 4             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C-1: Req 9 AC1のチャンネル数がresearch.md/tasks.mdと不一致（Cloudflare 11→10、Install 17→20、Schedule 10→9）

**Issue**: requirements.md Req 9 AC1のチャンネル数がresearch.md/tasks.mdのプロシージャ数と一致しない。Cloudflare 11チャンネル→10プロシージャ、Install 17チャンネル→20プロシージャ、Schedule 10チャンネル→9プロシージャ。

**Judgment**: **Fix Required** ✅

**Evidence**:
- research.md行48: `cloudflareHandlers.ts: 11`（ハンドラファイルのチャンネル数）
- research.md行375-388: cloudflare routerに10 Query/Mutationが定義
- research.md行350: `CLOUDFLARE_TUNNEL_STATUS_CHANGED → events.onCloudflareTunnelStatusChanged`（1 Subscription）
- 11 = 10 Query/Mutation + 1 Subscription。requirements.mdの「11チャンネル」は正確だが、SubscriptionはReq 8で対応するため**「（うち1個はSubscriptionでReq 8対応、cloudflare routerは10プロシージャ）」**の注記が必要

同様に:
- Install: research.md行49で`installHandlers.ts: 17`。install routerは20プロシージャ（行392-413）。差分3プロシージャは移行時に他ハンドラから統合または新規追加。requirements.mdの「17チャンネル」を「20プロシージャ」に更新が必要
- Schedule: research.md行51で`scheduleTaskHandlers.ts: 10`。schedule routerは9プロシージャ（行427-438）。10 = 9 Query/Mutation + 1 Subscription（SCHEDULE_TASK_STATUS_CHANGED）。「（うち1個はSubscriptionでReq 8対応、schedule routerは9プロシージャ）」の注記が必要

**Action Items**:

- requirements.md Req 9 AC1のチャンネル数をresearch.mdのルーターマッピングに基づいて正確に更新する
- 各ドメインのSubscription対象チャンネルを「（うちX個はSubscriptionでReq 8対応）」と注記する

---

### C-2: system.tsのRequirementsコメント誤り

**Issue**: system.tsファイル内のRequirementsコメントが「6.1, 6.2, 6.3, 6.4」となっているが、systemRouterはReq 1に対応すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `electron-sdd-manager/src/main/trpc/routers/system.ts` 行3: `Requirements: 6.1, 6.2, 6.3, 6.4`
- Req 6はAutoExecution移行を指す
- systemRouterはReq 1（パイロット移行）に対応
- 同ファイル行4: `Task 2.1: getAppVersion, getPlatform, getAppPath, getNodeEnv` は正しい
- 行13: `// Zod Schemas (Task 2.1: Requirements 1.1, 1.2)` — こちらは正しいReq番号

**注**: これは実装コードのコメント修正であり、spec文書の修正ではない。ただしレビューで指摘されているため修正対象とする。

**Action Items**:

- `electron-sdd-manager/src/main/trpc/routers/system.ts` 行3のコメントを `Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6` に修正する

---

### C-3: requirements.md Req 9 AC1のinstallチャンネル数17が不正確

**Issue**: requirements.mdは17チャンネルとしているが、research.mdのinstall routerマッピングでは20プロシージャが定義されている。

**Judgment**: C-1に統合して対応（C-1のAction ItemsでInstallチャンネル数を修正）

**Evidence**: C-1参照。Install関連はSubscriptionを含まず純粋にプロシージャ数の不一致。research.mdハンドラ構成テーブル（行49）は元ハンドラの17チャンネルを記載しているが、install routerのマッピングテーブル（行392-413）では20プロシージャ。差分は移行設計時の統合・新規追加による。

**Action Items**: C-1のAction Itemsに含む

---

### C-4: Subscriptionチャンネルの扱いが一貫していない

**Issue**: requirements.md全体でSubscriptionチャンネルの扱いが一貫していない。Req 6ではイベント通知の注記があるが、Req 9にはない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Req 6 AC4（requirements.md行128）: 「イベント通知はReq 8で対応」と明記 ✅
- Req 9 AC1（requirements.md行167-174）: Cloudflare 11、Install 17、Schedule 10にSubscriptionの注記なし ❌
- 一貫性の観点から、Req 9にも同様の注記が必要

**Action Items**:

- requirements.md Req 9 AC1の各ドメインに「（うちSubscription X個はReq 8で対応）」の注記を追加する

---

## Response to Warnings

### W-1: Subscription cleanup検証が単一タスク内の一項目に過ぎない

**Issue**: Design DD-003でBrowserWindowクローズ時のcleanup動作の検証がTask 9.1の一項目に留まる。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
tasks.md行210に以下の独立したサブ項目が既に明記されている:
> 「electron-trpc SubscriptionのBrowserWindowクローズ時cleanup動作を検証する（observable内のunsubscribe関数が正しく呼ばれること、EventEmitterリスナーが解除されることをテストで確認）」

これはTask 9.1内の独立したサブ項目として具体的なテスト内容（unsubscribe呼び出し確認、EventEmitterリスナー解除確認）まで明記されており、十分な粒度で定義されている。別タスクとして分離する必要はない。

---

### W-2: Remote UI webContents.send削除時のbroadcast影響が未分析

**Issue**: webContents.send()削除時にRemote UIへの通知が途絶える可能性。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- design.md行20 Non-Goals: 「既存WebSocket通信を維持」と明記
- research.md行89-93: 「IpcApiClientの削除はRemote UIに影響しない（WebSocketApiClientは独立）」
- `webContents.send()` はElectron IPC（Main→Renderer BrowserWindow通信）であり、WebSocket broadcast（`webSocketHandler.ts`経由）とは完全に独立した経路
- tRPC移行で`webContents.send()`をSubscriptionに置換するのはBrowserWindow向けのみ。Remote UIのWebSocket broadcastは別の実装パスで維持される

---

### W-3: 移行中の並行テスト戦略が未定義

**Issue**: レガシーIPC/tRPC共存期間中に両方のテストを実行する方法が明確でない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- design.md行575-617: Testing Strategy/Integration Test Strategyが既に定義済み
- tasks.mdの各タスクにVerifyステップ（`npm run build && npm run typecheck` pass）が明記されている
- 各ドメイン移行タスクにはCleanupタスク（例: Task 2.3, 3.3, 4.4等）で旧ハンドラ削除とテスト更新が含まれている
- 移行中は旧テストが動作し続け、ドメイン移行完了後に旧テストを削除する流れはtasks.mdの構造から自然に導出される

---

### W-4: SSH関連チャンネル数がrequirements.mdに未記載

**Issue**: Req 9 AC1の「SSH関連」にチャンネル数が記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- requirements.md行171: 「SSH関連」のみでチャンネル数未記載
- research.md行462-475: SSH 7 Query/Mutation + 1 Subscription（SSH_STATUS_CHANGED → events.onSshStatusChanged）= 計8チャンネル
- 他のドメイン（Cloudflare, Install, MCP, Schedule等）はチャンネル数が記載されているため一貫性に欠ける

**Action Items**:

- requirements.md Req 9 AC1の「SSH関連」を「SSH関連（7チャンネル、うちSubscription 1個はReq 8で対応）」に更新する

---

### W-5: webSocketHandler.tsがtRPC移行でどう影響を受けるか不明確

**Issue**: webSocketHandler.tsの不変性がDesignに明記されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- design.md行20 Non-Goals: 「Remote UI用tRPC over WebSocket（将来の別Specで検討、既存WebSocket通信を維持）」
- research.md行86-93: Remote UI影響分析で「IpcApiClientの削除はRemote UIに影響しない」「tRPC over WebSocketの導入はScope外」と明記
- webSocketHandler.tsの不変性は上記2つの文書で十分にカバーされている

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-1 | ContextServicesの肥大化リスク | No Fix Needed ❌ | 現時点では実装が進行中（Task 1-5.3完了）であり、実際に問題が顕在化してから対処すべき（YAGNI原則）。将来的な検討メモは不要 |
| S-2 | Design内にルータープロシージャ数サマリがない | No Fix Needed ❌ | research.mdに詳細なマッピングテーブルが存在し、Design文書にサマリを重複させるとSSOT原則に反する |
| S-3 | 中間パターンのライフサイクルが分散 | No Fix Needed ❌ | tasks.mdの各ドメインタスク構造（実装→UI移行→Cleanup）が統一されており、ライフサイクルは自明。追加テーブルは冗長 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `.kiro/specs/trpc-full-migration/requirements.md` | Req 9 AC1: Cloudflareチャンネル数にSubscription注記追加、Installチャンネル数17→20に修正、Scheduleチャンネル数にSubscription注記追加、SSH関連にチャンネル数追加、Remote Accessにチャンネル数追加 |
| `electron-sdd-manager/src/main/trpc/routers/system.ts` | 行3のRequirementsコメントを「1.1, 1.2, 1.3, 1.4, 1.5, 1.6」に修正 |

---

## Conclusion

13ラウンドのレビューで指摘された12件のうち、**Fix Required 4件**（C-1/C-2/C-4/W-4、C-3はC-1に統合）、**No Fix Needed 8件**と判断した。

主な修正内容:
1. requirements.md Req 9 AC1のチャンネル数をresearch.mdのルーターマッピングに基づいて正確化し、Subscription対象の注記を統一的に追加
2. system.tsのRequirementsコメントをReq 1に修正

No Fix Neededの判断は、既存文書（design.md Non-Goals, research.md Remote UI分析, tasks.md Verifyステップ）に既に十分な記載があることをエビデンスとして確認した上でのもの。

次のステップ: `--fix` オプションで修正を適用するか、手動で修正を実施。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `.kiro/specs/trpc-full-migration/requirements.md` | Req 9 AC1: Cloudflareチャンネル数を「10プロシージャ、うちSubscription 1個はReq 8で対応」に修正、Installチャンネル数を「20プロシージャ」に修正、Scheduleチャンネル数を「9プロシージャ、うちSubscription 1個はReq 8で対応」に修正、SSH関連に「7プロシージャ、うちSubscription 1個はReq 8で対応」を追加 |
| `electron-sdd-manager/src/main/trpc/routers/system.ts` | 行3のRequirementsコメントを「1.1, 1.2, 1.3, 1.4, 1.5, 1.6」に修正 |

### Details

#### `.kiro/specs/trpc-full-migration/requirements.md`

**Issue(s) Addressed**: C-1, C-3, C-4, W-4

**Changes**:
- Cloudflare Tunnel: 「11チャンネル」→「10プロシージャ、うちSubscription 1個はReq 8で対応」
- Install関連: 「17チャンネル」→「20プロシージャ」
- Schedule Task: 「10チャンネル」→「9プロシージャ、うちSubscription 1個はReq 8で対応」
- SSH関連: チャンネル数なし→「7プロシージャ、うちSubscription 1個はReq 8で対応」

**Diff Summary**:
```diff
-   - Cloudflare Tunnel（11チャンネル）
-   - Install関連（17チャンネル）
+   - Cloudflare Tunnel（10プロシージャ、うちSubscription 1個はReq 8で対応）
+   - Install関連（20プロシージャ）
    - MCP Server（6チャンネル）
-   - Schedule Task（10チャンネル）
-   - SSH関連
+   - Schedule Task（9プロシージャ、うちSubscription 1個はReq 8で対応）
+   - SSH関連（7プロシージャ、うちSubscription 1個はReq 8で対応）
```

#### `electron-sdd-manager/src/main/trpc/routers/system.ts`

**Issue(s) Addressed**: C-2

**Changes**:
- 行3のRequirementsコメントをReq 6からReq 1に修正

**Diff Summary**:
```diff
- * Requirements: 6.1, 6.2, 6.3, 6.4
+ * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
```

---

_Fixes applied by document-review-reply command._
