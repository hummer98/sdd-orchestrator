# Response to Document Review #15

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 0            | 2             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: CRITICAL-01: steering/tech.md「IPC設計パターン」セクションが移行前の状態のまま

**Issue**: tech.mdの「IPC設計パターン」セクション（行94-97）がレガシーIPC構造のみを記載しており、tRPCルーターの存在が反映されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
tech.md行94-97の記述がレガシーIPC構造のみであることは事実。しかし、これはspec文書の問題ではなく、steering文書の問題である。

tasks.md Task 13.1に以下の記述がある:
```
13.1 (P) `.kiro/steering/tech.md`のIPC設計パターンセクションをtRPCに更新する
  - 「IPC設計パターン」セクションをtRPCルーターベースの設計に書き換える
  - tRPC Context DI、ルーター構成、Subscriptionパターンを記載する
  - 「Remote UI アーキテクチャ」セクション内のIpcApiClient記述も更新対象に含める
```

本レビューはspec文書（requirements.md, design.md, tasks.md）のドキュメントレビューであり、steering文書の更新はTask 13.1のスコープに正しく含まれている。移行中の暫定更新を行うと、Task 13.1実行時に二重作業が発生する。段階的移行の設計方針（DD-001）に基づき、レガシーIPC/tRPC共存期間中はTask 13.1まで据え置きとする方針は設計上妥当。

---

### C2: CRITICAL-02: steering/structure.md「IPC Pattern」セクションがレガシー構造のまま

**Issue**: structure.mdの「IPC Pattern」セクション（行308-315）がレガシーIPC構造のみを記載しており、tRPCディレクトリ構造が反映されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
CRITICAL-01と同様。structure.md行308-315はレガシーIPC構造のみだが、これはsteering文書の問題。

tasks.md Task 13.2に以下の記述がある:
```
13.2 (P) `.kiro/steering/structure.md`のディレクトリ構造をtRPCを反映して更新する
  - `src/main/ipc/`セクションを削除し、`src/main/trpc/`構造に置き換える
  - スキーマ、ルーター、テストのディレクトリ構成を記載する
  - 「Electron Process Boundary Rules」セクションの正しい実装パターンに、vanillaClientを使ったStore実装パターン（DD-006準拠）を追加する
```

Task 13.2が全移行完了後のsteering更新として正しく定義されている。spec文書への修正は不要。

---

## Response to Warnings

### W1: WARNING-01: Task 9.2のMain側`webContents.send()`削除スコープが不明確

**Issue**: Task 9.2はRenderer側の差し替えを主眼としているが、Main側の`webContents.send()`削除がどのTaskで行われるか明確でない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
tasks.md Task 9.2（行215-222）の記述を確認すると、以下の箇所にMain側の処理が明記されている:

```
- 実装着手前にMain側webContents.send呼び出し箇所の現状マッピングを実施し、移行対象を確定する
- 既存の`BrowserWindow.webContents.send()`呼び出しを削除または整理する
```

行219に「既存の`BrowserWindow.webContents.send()`呼び出しを削除または整理する」と明確に記述されており、Main側の削除はTask 9.2のスコープに含まれている。レビュー指摘は不正確。

---

### W2: WARNING-02: handlers.ts内のユーティリティファイル（projectFileUtils.ts等）の最終処分が未記載

**Issue**: `src/main/ipc/`内のユーティリティファイル（projectFileUtils.ts, projectUtils.ts, watcherUtils.ts, worktreeUtils.ts）の最終処分がTask 11.2のスコープに含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
ワークツリー内に以下のユーティリティファイルが存在することを確認（git statusで`??`として表示、Task 4.4等で作成された新規ファイル）:

- `electron-sdd-manager/src/main/ipc/projectFileUtils.ts`
- `electron-sdd-manager/src/main/ipc/projectUtils.ts`
- `electron-sdd-manager/src/main/ipc/watcherUtils.ts`
- `electron-sdd-manager/src/main/ipc/worktreeUtils.ts`

tasks.md内でこれらのファイル名を検索したが、言及は**なし**。Task 11.2の削除対象リストにも含まれていない。

Task 11.2の現在の記述:
```
channels.ts, handlers.ts, ipcUtils.ts, sshChannels.tsを物理削除する
```

これらのユーティリティファイルはレガシーハンドラから抽出されたヘルパー関数であり、`ipc/`ディレクトリの完全撤廃時に処分方針が必要。

**Action Items**:

- tasks.md Task 11.2の削除対象リストに`projectFileUtils.ts`, `projectUtils.ts`, `watcherUtils.ts`, `worktreeUtils.ts`を追加する
- または、これらのファイルの`src/main/trpc/helpers/`等への移動先を明記する

---

### W3: WARNING-03: Remote UI WebSocketApiClientとの整合性検証タスクの具体性不足

**Issue**: Task 11.5に`npm run build:remote`が含まれておらず、Remote UIビルド検証が不足している。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md Task 11.5（行314-319）の記述:

```
- `npm run build` と `npm run typecheck` が成功することを確認する
- `vitest run` で全統合テストがpassすることを確認する
- 型エラーや未使用importが残っていないことを確認する
```

`npm run build:remote`の明記はなし。IpcApiClient削除（Task 11.4）でApiClientインターフェースに変更が入る可能性があり、WebSocketApiClientのビルドが壊れていないことをRemote UIビルドで確認すべき。`npm run build`にRemote UIビルドが含まれていない場合、検証漏れとなる。

**Action Items**:

- tasks.md Task 11.5のVerifyコマンドに`npm run build:remote`を追加する

---

### W4: WARNING-04: 移行中のTypeScript/ビルド検証状態が不明

**Issue**: Task 1〜8完了後のビルド状態が記録されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
各ハンドラ削除タスク（3.3, 4.4, 5.4, 6.3, 7.3, 8.3）のVerify条件に`npm run build && npm run typecheck pass`が記載されており、タスク完了時にビルドが通過していることが前提条件として定義されている。ビルド通過の記録はspec文書の責務ではなく、実行時の検証事項である。ドキュメントへの修正は不要。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | eventsRouter Subscription数の不一致（36 vs 34+3=37） | No Fix Needed | design.mdのService Interface定義を数えると36個のSubscription（行380-437）。Task 9.1の記述でも「合計36個」と明記。research.mdの34個はpreloadリスナー数であり、design.mdの36個はSubscription設計数。数え方の基準が異なるため実質的な不一致ではない |
| I2 | Task 10.5 miscルーターのプロシージャ数の変動可能性 | No Fix Needed | レビュー自身が「実装時に最終的なプロシージャ構成を確定する形で問題ない」と結論。ドキュメント修正不要 |
| I3 | Req 2.4のチャンネル数記載の正確性 | No Fix Needed | レビュー自身が「数値に矛盾はない」と結論。ドキュメント修正不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 11.2: `projectFileUtils.ts`, `projectUtils.ts`, `watcherUtils.ts`, `worktreeUtils.ts`の処分を追記 |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 11.5: Verifyコマンドに`npm run build:remote`を追加 |

---

## Conclusion

レビュー#15の9件の指摘のうち、2件がFix Required（W2: ユーティリティファイル処分未記載、W3: Remote UIビルド検証不足）と判断された。残りの7件は、既存のtasks.mdに既に対応が含まれているか、steering文書の更新がTask 13で適切に計画されているため、Fix不要と判断した。

CRITICAL-01/02については、steering文書の更新はspec文書のスコープ外であり、Task 13.1/13.2で正しく計画されている。WARNING-01についてはTask 9.2に既にMain側`webContents.send()`削除が明記されており、レビュー指摘が不正確。

修正適用には `--fix` フラグを使用してください。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 11.2: ユーティリティファイル4件の処分を削除対象リストに追加 |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 11.5: `npm run build:remote`をVerifyコマンドに追加 |

### Details

#### `.kiro/specs/trpc-full-migration/tasks.md` - Task 11.2

**Issue(s) Addressed**: W2 (WARNING-02)

**Changes**:
- Task 11.2の削除対象リストに`projectFileUtils.ts`, `projectUtils.ts`, `watcherUtils.ts`, `worktreeUtils.ts`を追加
- Verifyコマンドにこれらのファイル名を追加

**Diff Summary**:
```diff
- - [ ] 11.2 channels.ts, handlers.ts, ipcUtils.ts, sshChannels.tsを物理削除する
+ - [ ] 11.2 channels.ts, handlers.ts, ipcUtils.ts, sshChannels.ts、およびユーティリティファイルを物理削除する
+   - `src/main/ipc/projectFileUtils.ts` を削除する（tRPCルーター側にロジック移行済みの場合）、または `src/main/trpc/helpers/` に移動する
+   - `src/main/ipc/projectUtils.ts` を削除する（同上）
+   - `src/main/ipc/watcherUtils.ts` を削除する（同上）
+   - `src/main/ipc/worktreeUtils.ts` を削除する（同上）
-   - _Verify: Grep "channels.ts|handlers.ts|ipcUtils.ts|sshChannels.ts" in src/main/ipc/ should return 0 results_
+   - _Verify: Grep "channels.ts|handlers.ts|ipcUtils.ts|sshChannels.ts|projectFileUtils.ts|projectUtils.ts|watcherUtils.ts|worktreeUtils.ts" in src/main/ipc/ should return 0 results_
```

#### `.kiro/specs/trpc-full-migration/tasks.md` - Task 11.5

**Issue(s) Addressed**: W3 (WARNING-03)

**Changes**:
- Verifyコマンドに`npm run build:remote`を追加
- Remote UI側のビルド検証項目を追加

**Diff Summary**:
```diff
  - `npm run build` と `npm run typecheck` が成功することを確認する
+   - `npm run build:remote` が成功することを確認する（Remote UI側のWebSocketApiClientがApiClientインターフェース変更の影響を受けていないこと）
-   - _Verify: Grep "electronAPI|ipcRenderer.on" should return 0 results_
+   - _Verify: Grep "electronAPI|ipcRenderer.on" should return 0 results; `npm run build:remote` pass_
```

---

_Fixes applied by document-review-reply command._
