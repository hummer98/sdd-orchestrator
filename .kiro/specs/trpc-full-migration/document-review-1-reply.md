# Response to Document Review #1

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 3      | 2            | 1             | 0                |
| Warning  | 6      | 5            | 1             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Critical Issues

### C1: `GET_INITIAL_PROJECT_PATH`の配置先矛盾（Section 1.6 #1）

**Issue**: research.mdではsystem routerに配置、design.mdではprojectRouterに配置されている。

**Judgment**: **Fix Required** ✅

**Evidence**:
`GET_INITIAL_PROJECT_PATH`は実際のコードベースでは`projectHandlers.ts`内で処理されている（`electron-sdd-manager/src/main/ipc/projectHandlers.ts:257`）。プロジェクト初期パスの取得はプロジェクト管理ドメインに属するため、design.mdの`projectRouter`配置が正しい。

research.mdのsystem routerマッピングにこのチャンネルが含まれているのは誤り。

**Action Items**:

- research.mdのsystem routerマッピングから`GET_INITIAL_PROJECT_PATH`を削除する
- system routerのマッピングを3チャンネル（`GET_APP_VERSION`, `GET_PLATFORM`, `GET_NODE_ENV`）に修正する（ただしC2参照）

---

### C2: Req 1の`GET_APP_PATH` vs `GET_INITIAL_PROJECT_PATH`の矛盾（Section 1.6 #6）

**Issue**: requirements.mdは`GET_APP_PATH`を明記しているが、research.mdのsystem routerには含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`channels.ts`を検索した結果、`GET_APP_PATH`というチャンネルは**存在しない**。実在するのは：
- `GET_APP_VERSION` (`ipc:get-app-version`)
- `GET_PLATFORM` (`ipc:get-platform`)
- `GET_INITIAL_PROJECT_PATH` (`ipc:get-initial-project-path`)

`GET_NODE_ENV`もchannels.tsに存在しない。

requirements.md Req 1の4チャンネル定義は実際のコードベースと不一致。正しいsystem系チャンネルは`GET_APP_VERSION`と`GET_PLATFORM`の2つのみ（`GET_INITIAL_PROJECT_PATH`はprojectRouter、`GET_NODE_ENV`は新規追加）。

**Action Items**:

- requirements.md Req 1のAcceptance Criteria 1を修正：
  - `GET_APP_PATH → system.getAppPath` を削除
  - `GET_INITIAL_PROJECT_PATH`はProject移行（Req 3）に移動
  - system routerの対象を`GET_APP_VERSION`, `GET_PLATFORM`, `GET_NODE_ENV`（新規追加）の3つに明確化
- research.mdのsystem routerマッピングを修正：`GET_INITIAL_PROJECT_PATH`を削除し、`GET_NODE_ENV`は新規追加であることを明記

---

### C3: Subscription End-to-Endテスト戦略の明確化（Section 1.5）

**Issue**: electron-trpc IPC経由のSubscription配信をテストする具体的な方法が未定義。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Task 9.3に既に「EventEmitter発火時にSubscription経由でデータが配信されることを検証する」「`waitFor`パターンを使用し、固定sleepを回避する」「主要イベント（Agent出力、Spec変更、AutoExecution状態変更）を優先的にテストする」と記載されている。

具体的なテスト方法はtRPC callerベーステストで、`observable()`のEventEmitter連携をユニットテストレベルで検証できる。これはTask 9.3の記述で十分。

Renderer側のSubscription接続（IPC経由のEnd-to-End）はE2Eテスト（Task 12.1のUJ-004: Agent実行中ログ表示）で担保される。

テスト戦略の段階分けが明確であるため、追加の記載は不要。

---

## Response to Warnings

### W1: configプロシージャ数の統一（Section 1.6 #2）

**Issue**: design.md Service Interface: 22プロシージャ、research.md: 24チャンネル（`getBugsWorktreeDefault`, `setBugsWorktreeDefault`追加）、tasks.md: 「全24プロシージャ」

**Judgment**: **Fix Required** ✅

**Evidence**:
`SETTINGS_BUGS_WORKTREE_DEFAULT_GET`/`SET`は実際には`bugWorktreeHandlers.ts`（`electron-sdd-manager/src/main/ipc/bugWorktreeHandlers.ts:164,174`）に定義されている。config router には含めるべきではない（ドメインが異なる）。

configHandlers.tsのsafeHandle呼び出しは18件（research.mdと一致）。design.md Service Interfaceの22プロシージャは、VcsScheme（2） + RemoteUiAutoStart（2）を追加した18+4=22で正しい計算。

research.mdで24チャンネルとされているのは、`getBugsWorktreeDefault`/`setBugsWorktreeDefault`を誤ってconfigに含めたため。これらはbugWorktreeHandlersのドメインであり、config routerではなくbug/git routerの移行対象。

**Action Items**:

- tasks.md Task 3.1の「全24プロシージャ」を「全22プロシージャ」に修正する
- research.md config routerから`SETTINGS_BUGS_WORKTREE_DEFAULT_GET`/`SET`を削除し、bugWorktreeHandlers対応のgit router（またはbug router）に移動する

---

### W2: projectプロシージャ数の表記修正（Section 1.6 #3）

**Issue**: Task 4.1の「全8プロシージャ」と記載しつつ9個を列挙。

**Judgment**: **Fix Required** ✅

**Evidence**:
Task 4.1のテキスト内で列挙されているプロシージャは9個（selectProject、showOpenDialog、validateKiroDirectory、getInitialProjectPath、setProjectPath、getWindowProject、setWindowProject、createNewWindow、getIsE2ETest）。design.md projectRouter Service Interfaceも9個定義。

数値の表記ミス。

**Action Items**:

- tasks.md Task 4.1の「全8プロシージャ」を「全9プロシージャ」に修正する

---

### W3: SSH関連チャンネルの具体化（Section 3 #1）

**Issue**: research.mdで「N/A」、design.mdで「misc routerに含める」とあるが、具体的なプロシージャ一覧なし。

**Judgment**: **Fix Required** ✅

**Evidence**:
`sshChannels.ts`には10個のチャンネル定義がある：
- `SSH_CONNECT`, `SSH_DISCONNECT`
- `SSH_GET_STATUS`, `SSH_GET_CONNECTION_INFO`, `SSH_STATUS_CHANGED`（イベント）
- `SSH_GET_RECENT_REMOTE_PROJECTS`, `SSH_ADD_RECENT_REMOTE_PROJECT`, `SSH_REMOVE_RECENT_REMOTE_PROJECT`
- `SSH_VALIDATE_URI`, `SSH_PARSE_URI`

`sshHandlers.ts`にはsafeHandle呼び出しが7件（SSH_CONNECT, SSH_DISCONNECT, SSH_GET_STATUS, SSH_GET_CONNECTION_INFO, SSH_GET_RECENT_REMOTE_PROJECTS, SSH_ADD_RECENT_REMOTE_PROJECT, SSH_REMOVE_RECENT_REMOTE_PROJECT）。
SSH_STATUS_CHANGEDはイベント通知（Subscription対象）。
SSH_VALIDATE_URI, SSH_PARSE_URIはチャンネル定義のみでハンドラ未登録。

**Action Items**:

- research.mdのsshHandlers行のチャンネル数を「N/A」から「7（+1イベント通知, +2未使用チャンネル定義）」に更新する
- research.mdにSSHプロシージャマッピングテーブルを追加する

---

### W4: 全チャンネル数219の検証（Section 1.6 #5）

**Issue**: requirements.mdの219チャンネルとresearch.mdの合計が不一致。

**Judgment**: **Fix Required** ✅

**Evidence**:
research.mdのハンドラ別チャンネル数を再計算：
- configHandlers: 18
- projectHandlers: 14
- fileHandlers: 7
- projectFileHandlers: 4
- specHandlers: 25
- bugHandlers: 7
- bugWorktreeHandlers: 6
- agentHandlers: 10
- autoExecutionHandlers: 13
- bugAutoExecutionHandlers: 12
- gitHandlers: 6
- worktreeHandlers: 5
- worktreeImplHandlers: 3
- convertWorktreeHandlers: 2
- cloudflareHandlers: 11
- installHandlers: 17
- mcpHandlers: 6
- scheduleTaskHandlers: 10
- metricsHandlers: 4
- remoteAccessHandlers: 6
- sshHandlers: 7
- clipboardHandlers: 1
- startImplPhase: 1
- handlers.ts本体内のsystem系: ~9（GET_APP_VERSION, GET_PLATFORM, GET_INITIAL_PROJECT_PATH等）
- イベント通知チャンネル: ~35

総チャンネル数は正確な再計算が必要だが、本Specの移行作業自体には影響しない（全ハンドラの移行は個別にresearch.mdのマッピングテーブルで管理される）。requirements.mdの219は概算として維持し、実装時に正確なカウントを確認する方針で問題ない。

**Action Items**:

- research.mdのSSHチャンネル数を更新する（上記W3と統合）
- requirements.md Introductionの「全219個のIPCチャンネル」に「（概算値、正確な数値は各ドメインマッピングテーブル参照）」を追記する

---

### W5: tech.md Remote UIセクションの更新タスク追加（Section 4.1）

**Issue**: `IpcApiClient`記述の更新がTask 13.1に明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Task 13.1は「IPC設計パターンセクションをtRPCに更新する」と記載されているが、tech.mdの「Remote UI アーキテクチャ」セクション内の`IpcApiClient`記述の更新は明示されていない。tech.md更新時にIpcApiClient関連の記述も更新対象に含める必要がある。

**Action Items**:

- tasks.md Task 13.1に「tech.md Remote UIセクション内のIpcApiClient記述も更新対象に含める」を追記する

---

### W6: Open Questionのクローズ（Section 3 #2）

**Issue**: requirements.mdのOpen Question 1（Subscription実装方式）がクローズされていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Open Question 1には「調査ポイント: WebSocket不要でIPC経由のSubscriptionが可能か」と記載されており、これはresearch.md冒頭で「electron-trpc 0.7.1はQueries, Mutations, Subscriptionsを完全サポート」と回答済み。しかしOpen Questionは計画段階の記録であり、requirements.mdの文書構造上は解決済みの記録としてそのまま残すことが適切。requirements.mdのOpen Questionセクションは設計プロセスの記録であり、削除やクローズ記載は不要。research.mdに調査結果が記録されているため、参照時に矛盾は生じない。

---

## Response to Info (Low Priority)

| #   | Issue                                  | Judgment      | Reason                                                                                          |
| --- | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| I1  | design.mdの省略ルーター詳細化          | No Fix Needed | 意図的な設計判断（「同じパターンに従う」の記載は適切）。research.mdに詳細マッピングがあり参照可能 |
| I2  | Menu EventsのSubscription化アプローチ  | No Fix Needed | 実装時に解決すべき詳細。設計文書に実装パターンの詳細例は不要（YAGNI）                           |
| I3  | 移行進捗チェックリスト統一             | No Fix Needed | 各Taskの検証方法は既に_Verify:セクションで定義済み。追加の統一は過剰                            |
| I4  | Subscription帯域ベンチマーク           | No Fix Needed | パフォーマンス最適化はOut of Scope。移行完了後に必要に応じて検討（requirements.md記載通り）      |

---

## Files to Modify

| File             | Changes                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| requirements.md  | Req 1 Acceptance Criteria修正（GET_APP_PATH削除、GET_INITIAL_PROJECT_PATHをReq 3に移動）、219チャンネル注釈追加 |
| research.md      | system routerマッピング修正、config router BugsWorktree削除、SSHチャンネル数・マッピング追加           |
| tasks.md         | Task 3.1: 24→22、Task 4.1: 8→9、Task 13.1: Remote UI記述追記                                        |

---

## Conclusion

Critical 3件のうち2件がFix Required。特にC1/C2は`GET_APP_PATH`が実在しないチャンネルであることが確認され、requirements.mdとresearch.mdの修正が必須。C3（Subscriptionテスト戦略）は既存のTask 9.3とE2Eテスト（Task 12.1）の記述で十分と判断。

Warning 6件のうち5件がFix Required。主にプロシージャ数の数値不整合とSSHチャンネル具体化。

全修正は文書レベルの修正（プロシージャ数、チャンネル名、マッピングテーブル）であり、設計アーキテクチャへの影響はない。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Req 1 Acceptance Criteria修正、219チャンネル注釈追加 |
| research.md | system routerマッピング修正、config router BugsWorktree削除、SSHチャンネル数・マッピング追加 |
| tasks.md | Task 3.1プロシージャ数修正、Task 4.1プロシージャ数修正、Task 13.1 Remote UI記述追記 |

### Details

#### requirements.md

**Issue(s) Addressed**: C2, W4

**Changes**:
- Req 1 Acceptance Criteria 1から`GET_APP_PATH → system.getAppPath`を削除
- `GET_NODE_ENV`に「新規追加プロシージャ」注記を追加
- Introduction「全219個」を「全IPCチャンネル（約219個、正確な数値は各ドメインマッピングテーブル参照）」に修正

**Diff Summary**:
```diff
- - `GET_APP_VERSION` → `system.getAppVersion`
- - `GET_PLATFORM` → `system.getPlatform`
- - `GET_APP_PATH` → `system.getAppPath`
- - `GET_NODE_ENV` → `system.getNodeEnv`
+ - `GET_APP_VERSION` → `system.getAppVersion`
+ - `GET_PLATFORM` → `system.getPlatform`
+ - `GET_NODE_ENV` → `system.getNodeEnv`（新規追加プロシージャ）
```

```diff
- 全219個のIPCチャンネルをtRPCに移行し
+ 全IPCチャンネル（約219個、正確な数値は各ドメインマッピングテーブル参照）をtRPCに移行し
```

#### research.md

**Issue(s) Addressed**: C1, C2, W1, W3

**Changes**:
- system routerマッピングから`GET_INITIAL_PROJECT_PATH`を削除し、3プロシージャに整理
- project routerマッピングに`GET_INITIAL_PROJECT_PATH`を追加
- config routerマッピングから`SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SET`を削除（bugWorktreeHandlersドメイン）
- sshHandlersのチャンネル数を「N/A」から「7 (+1イベント通知)」に更新
- SSH関連プロシージャマッピングテーブルを新規追加（7 query/mutation + 1 subscription）

**Diff Summary**:
```diff
 ### system router（Req 1 拡張）
- | GET_INITIAL_PROJECT_PATH | system.getInitialProjectPath | query |
+ （削除、project routerに移動）
+ | GET_NODE_ENV | system.getNodeEnv | query | 新規追加プロシージャ |
```

```diff
 ### project router（Req 3）
+ | GET_INITIAL_PROJECT_PATH | project.getInitialProjectPath | query |
```

```diff
 ### config router（Req 2）
- | SETTINGS_BUGS_WORKTREE_DEFAULT_GET | config.getBugsWorktreeDefault | query |
- | SETTINGS_BUGS_WORKTREE_DEFAULT_SET | config.setBugsWorktreeDefault | mutation |
+ **注**: bugWorktreeHandlers.tsドメインのため移動
```

```diff
- | `sshHandlers.ts` | N/A | SSH |
+ | `sshHandlers.ts` | 7 (+1イベント通知) | SSH |
```

#### tasks.md

**Issue(s) Addressed**: W1, W2, W5

**Changes**:
- Task 3.1: 「全24プロシージャ」を「全22プロシージャ」に修正、BugsWorktreeDefaultをリストから除外
- Task 4.1: 「全8プロシージャ」を「全9プロシージャ」に修正
- Task 13.1: 「Remote UI アーキテクチャ」セクション内のIpcApiClient記述更新を追記

**Diff Summary**:
```diff
- config routerに全24プロシージャ（...BugsWorktreeDefault）を定義する
+ config routerに全22プロシージャ（...RemoteUiAutoStart）を定義する
```

```diff
- project routerに全8プロシージャ（selectProject...getIsE2ETest）を定義する
+ project routerに全9プロシージャ（selectProject...getIsE2ETest）を定義する
```

```diff
  - tRPC Context DI、ルーター構成、Subscriptionパターンを記載する
+ - 「Remote UI アーキテクチャ」セクション内のIpcApiClient記述も更新対象に含める
```

---

_Fixes applied by document-review-reply command._
