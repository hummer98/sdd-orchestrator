# Response to Document Review #1

**Feature**: common-commands-installer
**Review Date**: 2026-01-21
**Reply Date**: 2026-01-21

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-1: Remote UIからのインストール時の挙動未定義

**Issue**: design.md:23 で「Remote UIでのcommonコマンド上書き確認（Desktop UI専用）」がNon-Goalsに挙げられているが、Remote UIからコマンドセットインストール自体は可能である場合の挙動が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md のNon-GoalsにRemote UIでの確認が「Desktop UI専用」と記載されているが、Remote UIからinstallByProfileを呼び出した場合の挙動が明確に定義されていない
- 既存のpreload/index.ts (行720-725) では`installCommandsetByProfile`がIPC経由で公開されており、Remote UIからも呼び出し可能
- コンフリクトがある場合、Desktop UIでは確認ダイアログを表示するが、Remote UIではこれが不可能

**Action Items**:
- design.mdに「Remote UI時の挙動」セクションを追加
- Remote UIからのinstallByProfile呼び出し時は、commonコマンドを自動スキップ（既存ファイル優先）する方針を明記

---

### W-2: Preload API定義がTasksに含まれていない

**Issue**: confirmCommonCommands IPCハンドラの追加に伴い、preload.ts での API エクスポートが必要だが、tasks.md で明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- preload/index.ts（約2000行）を確認すると、すべてのIPC APIは`electronAPI`オブジェクトに明示的に追加されている
- 新しいIPCチャンネル（confirmCommonCommands）を追加する場合、preload/index.tsにも対応するメソッド追加が必要
- Task 4.1では「IPCハンドラの追加」と記載されているが、preload層の変更が含まれていない

**Action Items**:
- Task 4.1に以下を追記:
  - `preload/index.ts`に`confirmCommonCommands`メソッドを追加
  - IPC_CHANNELSに新しいチャンネル定義を追加

---

### W-3: electronAPI型定義の更新がTasksに含まれていない

**Issue**: Renderer側でelectronAPI.confirmCommonCommandsを呼び出すため、型定義の更新が必要。

**Judgment**: **Fix Required** ✅

**Evidence**:
- electron.d.ts（約1300行）を確認すると、ElectronAPIインターフェースにすべてのIPC APIが型定義されている
- TypeScript環境でRenderer側からelectronAPI.confirmCommonCommandsを呼び出すには、型定義の追加が必須
- Task 4.1にはこの型定義更新が含まれていない

**Action Items**:
- Task 4.1に以下を追記:
  - `electron.d.ts`のElectronAPIインターフェースに`confirmCommonCommands`メソッドの型定義を追加
  - 関連する型（CommonCommandDecision, CommonCommandsInstallResult）のexportを追加

---

## Response to Info (Low Priority)

| #   | Issue                                    | Judgment      | Reason                                             |
| --- | ---------------------------------------- | ------------- | -------------------------------------------------- |
| I-1 | Open Questionの将来検討事項              | No Fix Needed | 将来的な検討事項として残す設計意図通り             |
| I-2 | テンプレートディレクトリの非コマンドファイル除外 | No Fix Needed | Task 2.1に「READMEなど非コマンドファイルを除外」と記載済み |

---

## Files to Modify

| File       | Changes                                                      |
| ---------- | ------------------------------------------------------------ |
| design.md  | Remote UI時の挙動を記載したセクションを追加                  |
| tasks.md   | Task 4.1にpreload.tsと型定義の変更を追記                     |

---

## Conclusion

3件のWarning指摘すべてを**Fix Required**と判定しました。

- W-1: design.mdにRemote UI時の挙動を明記
- W-2, W-3: Task 4.1にpreload.tsと型定義の変更を追記

Info指摘（2件）は現状のままで問題ないため、修正不要です。

`--autofix`フラグが指定されているため、上記の修正を自動適用します。

---

## Applied Fixes

**Applied Date**: 2026-01-21
**Applied By**: --autofix

### Summary

| File      | Changes Applied                                                   |
| --------- | ----------------------------------------------------------------- |
| design.md | Remote UI時の挙動セクションを追加                                 |
| tasks.md  | Task 4.1にpreload.tsと型定義の変更を追記                          |

### Details

#### design.md

**Issue(s) Addressed**: W-1

**Changes**:
- Non-Goalsセクションの後に「Remote UI時の挙動」セクションを追加
- Remote UIからのinstallByProfile呼び出し時は既存ファイルを優先してスキップする方針を明記

**Diff Summary**:
```diff
 ### Non-Goals

 - CLIでのコマンドセットインストール対応
 - commonコマンドの個別インストール/アンインストール機能
 - commonコマンドのバージョン管理機能
 - Remote UIでのcommonコマンド上書き確認（Desktop UI専用）
+
+### Remote UI時の挙動
+
+**背景**: Remote UIからはコマンドセットインストール（installByProfile）を呼び出すことが可能だが、上書き確認ダイアログを表示できない。
+
+**方針**: Remote UIからのinstallByProfile呼び出し時は、commonコマンドのコンフリクトがある場合、**既存ファイルを優先してスキップ**する（自動スキップ）。
+
+**実装詳細**:
+- `installByProfile`の結果にコンフリクトが含まれている場合、Desktop UIは確認ダイアログを表示
+- Remote UI（またはAPIクライアント）は確認ダイアログを表示できないため、コンフリクトをスキップとして扱う
+- スキップされたファイルは結果の`skipped`配列に含まれ、ログに警告として記録される
+
+**理由**:
+- ユーザーのカスタマイズを誤って上書きするリスクを回避
+- Remote UIからの操作は主に自動化や一括処理が想定されるため、既存ファイルの保護が優先される
```

#### tasks.md

**Issue(s) Addressed**: W-2, W-3

**Changes**:
- Task 4.1の内容を拡張し、preload.tsと型定義の変更を追記
- channels.ts、preload/index.ts、electron.d.tsへの変更を明記
- Verifyセクションに追加ファイルを含める

**Diff Summary**:
```diff
 - [ ] 4.1 confirmCommonCommands IPCハンドラを追加
-  - 新しいIPCチャンネルを定義してcommonコマンドの確認決定を受信
+  - 新しいIPCチャンネル（CONFIRM_COMMON_COMMANDS）を`channels.ts`に定義
+  - `handlers.ts`にIPCハンドラを追加してcommonコマンドの確認決定を受信
   - ユーザー決定（上書き/スキップの配列）をUnifiedCommandsetInstallerに渡す
   - インストール結果をRendererに返却
+  - `preload/index.ts`に`confirmCommonCommands`メソッドを追加（ipcRenderer.invoke経由）
+  - `electron.d.ts`のElectronAPIインターフェースに`confirmCommonCommands`メソッドの型定義を追加
+  - 関連する型（CommonCommandDecision, CommonCommandsInstallResult）をRenderer側でも使用できるようにexport
   - _Requirements: 3.4, 3.5_
-  - _Method: confirmCommonCommands IPC handler_
-  - _Verify: Grep "confirmCommonCommands" in handlers.ts_
+  - _Method: confirmCommonCommands IPC handler, preload API, type definitions_
+  - _Verify: Grep "confirmCommonCommands" in handlers.ts, preload/index.ts, electron.d.ts_
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
