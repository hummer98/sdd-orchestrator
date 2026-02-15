# Response to Document Review #1

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Reply Date**: 2026-02-15

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 4      | 4            | 0             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Warnings

### W-01: Design.mdのIntegration Test StrategyとTasks.mdの記述レベル不一致

**Issue**: Design.mdのIntegration Test Strategyは「tRPC vanillaClientをモック、useSharedAgentStoreはリアル実装を使用」の新規統合テストを定義しているが、Tasks.md Task 6.4は「モック構造をuseSharedAgentStore対応に更新する」という既存テスト更新のみ。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード調査により、現行のコンポーネントテスト（AgentListPanel.test.tsx, AgentLogPanel.test.tsx, SpecList.test.tsx）は全て`vi.mock()`によるモックベースのテストパターンを使用していることを確認。Design.mdが定義する「`useSharedAgentStore`はリアル実装を使用」する統合テストとは明確に異なるアプローチ。

ただし、今回のリファクタリングの主目的は「状態の二重管理廃止」であり、新規統合テストの作成は必須ではない。既存のモックベーステストを`useSharedAgentStore`対応に更新することで十分なカバレッジが確保される。

**Action Items**:

- Design.mdのIntegration Test Strategyセクションを、既存テスト更新の文脈に合わせて修正（「リアル実装使用」の記載を「モック構造の更新」に修正し、必要に応じて将来の統合テスト拡充を示唆する形に変更）

---

### W-02: requirements.md Criterion 3.5のSharedAgentInfo型名の用語不整合

**Issue**: requirements.md Criterion 3.5が「SharedAgentInfo型（またはリネーム後のAgentInfo）」と記載しているが、ソースコードでは既に`AgentInfo`として定義されており、`SharedAgentInfo`という名前は使われていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`src/shared/api/types.ts`の型定義を確認（line 152）:
```typescript
export interface AgentInfo {
  agentId: string;
  specId: string;
  // ...
}
```
ソースコード上で`SharedAgentInfo`という型名は存在しない。requirements.mdの「SharedAgentInfo型（またはリネーム後のAgentInfo）」という表現は、型名が既に`AgentInfo`である事実と矛盾しmisleading。

**Action Items**:

- requirements.md Criterion 3.5を「`AgentInfo`型（`shared/api/types`の統一型）」に修正

---

### W-03: requirements.md「SSSOT」vs「SSOT」の表記揺れ

**Issue**: requirements.mdの一部で「SSSOT」（3つのS）と余分なSが入っている。

**Judgment**: **Fix Required** ✅

**Evidence**:
以下の4箇所で「SSSOT」（誤）が使用されていることを確認:
1. `requirements.md` line 27: Introduction内「SSSOT（`useSharedAgentStore`）」
2. `requirements.md` line 63: Requirement 4タイトル「skipPermissionsのSSSOT移行」
3. `requirements.md` line 73: Requirement 5タイトル「runningAgentCountのSSSOT移行」
4. `tasks.md` line 72: Task 5タイトル「関連ファイルのimportパスとSSSOT読み取りへの更新」

design.mdでは全箇所「SSOT」（正）で統一されている。

**Action Items**:

- requirements.md: 3箇所の「SSSOT」を「SSOT」に修正
- tasks.md: 1箇所の「SSSOT」を「SSOT」に修正

---

### W-04: getAgentByIdの位置づけ明確化

**Issue**: Design.md AgentActionStore interfaceに`getAgentById(agentId: string): AgentInfo | undefined`が残されているが、「アクション専用」の原則と矛盾する可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
`src/renderer/stores/agentStore.ts`（line 670-672）で現在の実装を確認:
```typescript
getAgentById: (agentId: string) => {
  const shared = useSharedAgentStore.getState().getAgentById(agentId);
  return shared ? toRendererAgentInfo(shared) : undefined;
},
```
既にSSOT委譲パターンで実装されている。型変換が不要になった後は純粋なSSOT委譲メソッドとなる。Design.mdのImplementation NotesにSSOT委譲パターンであることを明示すべき。

**Action Items**:

- Design.md AgentActionStore interfaceの`getAgentById`にコメントで「SSOT委譲メソッド」であることを明記
- Design.md Implementation Notesに`getAgentById`がSSOT委譲パターンであることを追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-01 | startedAt型変更に伴うコンポーネント側の対応が未記載 | Fix Required ✅ | Renderer固有AgentInfoでは`startedAt: string`に制限しており、`toRendererAgentInfo()`でnumber→ISO string変換を実施している。型変換廃止後、コンポーネントに`string | number`が渡されるため、型ガード対応の注記をtasks.mdに追加すべき |
| I-02 | getLogsFromShared()の削除対象が明示されていない | No Fix Needed ❌ | ソースコード確認でログ同期は既に`useAgentLogSubscription`フックに移行済み。subscribe-and-syncブロックにログ同期コードは含まれておらず、削除対象として明示する必要がない |
| I-03 | setSkipPermissions委譲パターンの明示 | No Fix Needed ❌ | Design.md DD-003 Consequencesに「`setSkipPermissions`内でのプロジェクト設定永続化ロジック（tRPC呼び出し）は、ファサードのアクションとして残す（SSOTはインメモリ状態のみを管理）」と記載済み。Req 6.2の「アクション内部でSSOTのメソッドを呼び出すパターンが維持される」と合わせて、責務分担は十分明確 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `requirements.md` | W-02: Criterion 3.5の型名修正。W-03: 3箇所の「SSSOT」→「SSOT」修正 |
| `design.md` | W-01: Integration Test Strategy修正。W-04: Implementation NotesにgetAgentById SSOT委譲パターン追記 |
| `tasks.md` | W-03: 1箇所の「SSSOT」→「SSOT」修正。I-01: Task 4.1〜4.4にstartedAt型ガード注記追加 |

---

## Conclusion

Critical指摘は0件。Warning 4件は全て修正が必要だが、いずれも用語修正・記述レベルの調整であり、アーキテクチャや設計方針への影響はない。Info 3件のうち1件（I-01: startedAt型ガード注記）のみ修正が必要で、残り2件はソースコード調査により現行の仕様文書で十分カバーされていることを確認した。

全体として仕様の品質は高く、修正は軽微なものに限られる。

---

## Applied Fixes

**Applied Date**: 2026-02-15
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | W-02: Criterion 3.5の型名修正、W-03: 3箇所の「SSSOT」→「SSOT」修正 |
| `design.md` | W-01: Integration Test Strategy修正（モックベースパターンに合わせた記載に変更）、W-04: Implementation NotesにgetAgentById SSOT委譲パターン追記 |
| `tasks.md` | W-03: 1箇所の「SSSOT」→「SSOT」修正、I-01: Task 4.1, 4.2, 4.4にstartedAt型ガード注記追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: W-02, W-03

**Changes**:
- Criterion 3.5の型名を「SharedAgentInfo型（またはリネーム後のAgentInfo）」→「`AgentInfo`型（`shared/api/types`の統一型）」に修正
- Introduction内「SSSOT」→「SSOT」に修正
- Requirement 4タイトル「skipPermissionsのSSSOT移行」→「skipPermissionsのSSOT移行」に修正
- Requirement 5タイトル「runningAgentCountのSSSOT移行」→「runningAgentCountのSSOT移行」に修正

**Diff Summary**:
```diff
- コンポーネントは状態をSSSOT（`useSharedAgentStore`）から直接読み取り
+ コンポーネントは状態をSSOT（`useSharedAgentStore`）から直接読み取り
```
```diff
- ### Requirement 4: skipPermissionsのSSSOT移行
+ ### Requirement 4: skipPermissionsのSSOT移行
```
```diff
- ### Requirement 5: runningAgentCountのSSSOT移行
+ ### Requirement 5: runningAgentCountのSSOT移行
```
```diff
- 5. 全コンポーネントが統一された`SharedAgentInfo`型（またはリネーム後の`AgentInfo`）を使用すること
+ 5. 全コンポーネントが統一された`AgentInfo`型（`shared/api/types`の統一型）を使用すること
```

#### design.md

**Issue(s) Addressed**: W-01, W-04

**Changes**:
- Integration Test Strategy: 「tRPC vanillaClientをモック、useSharedAgentStoreはリアル実装を使用」→「既存テストのモック構造をuseSharedAgentStore対応に更新」に修正。将来の統合テスト拡充を示唆する記載を追加
- Implementation Notes: `getAgentById`がSSOT委譲メソッドであることの説明を追記

**Diff Summary**:
```diff
- - **Mock Boundaries**: tRPC vanillaClientをモック。`useSharedAgentStore`はリアル実装を使用
+ - **Approach**: 既存コンポーネントテストのモック構造を`useSharedAgentStore`対応に更新する。モックベースのテストパターン（`vi.mock()`）を維持し、状態読み取り元の変更を反映する
```
```diff
+ - `getAgentById`はSSOT委譲メソッドとしてファサードに残す（`useSharedAgentStore.getState().getAgentById()`への委譲）。状態読み取りメソッドだが、既存の呼び出しパターンとの互換性のためファサードのインターフェースに含める
```

#### tasks.md

**Issue(s) Addressed**: W-03, I-01

**Changes**:
- Task 5タイトル「関連ファイルのimportパスとSSSOT読み取りへの更新」→「関連ファイルのimportパスとSSOT読み取りへの更新」に修正
- Task 4.1に「startedAtがstring | numberになるため、型ガード対応の注記」を追加
- Task 4.2に同注記を追加
- Task 4.4に同注記を追加

**Diff Summary**:
```diff
- ## Task 5. 関連ファイルのimportパスとSSSOT読み取りへの更新
+ ## Task 5. 関連ファイルのimportパスとSSOT読み取りへの更新
```
```diff
  - [ ] 4.1 (P) AgentListPanelの状態読み取りをSSOTに移行する
    ...
+   - 注: `startedAt`が`string | number`になるため、ISO文字列前提のコードがあれば型ガードを追加する
```

---

_Fixes applied by document-review-reply command._
