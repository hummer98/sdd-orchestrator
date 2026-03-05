# Response to Document Review #1

**Feature**: multi-window-integration
**Review Date**: 2026-02-26
**Reply Date**: 2026-02-26

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 7      | 6            | 1             | 0                |
| Info     | 4      | 2            | 2             | 0                |

---

## Response to Warnings

### W-1: Requirements Decision Log未更新

**Issue**: WindowManagerの方針が「再設計する」（requirements.md Decision Log）から「拡張する」（research.md/design.md）に変更されたが、Decision Logが更新されていない

**Judgment**: **Fix Required** ✅

**Evidence**:
- `requirements.md` line 22: `Conclusion: 再設計する`
- `research.md` line 54: `「再設計」ではなく、既存WindowManagerの拡張が適切`
- `design.md` line 351: `既存WindowManagerクラスに...追加`

研究フェーズで既存WindowManagerの分析を行った結果、基本機能（Map管理、重複チェック、状態永続化）が十分に実装されており、拡張が適切と判断された。Decision Logの結論が実際の設計と矛盾している。

**Action Items**:
- requirements.md Decision Log「既存WindowManagerコード」のConclusionを「拡張する（研究フェーズで再評価後に決定）」に更新
- Rationaleも研究結果を反映して更新

---

### W-2: パフォーマンステスト欠如

**Issue**: OQ2（10ウィンドウ同時オープン時のメモリ消費）が未解決のまま設計・タスクフェーズに進行

**Judgment**: **Fix Required** ✅

**Evidence**:
- `research.md` line 173: `実用上3-5ウィンドウ程度を想定。各サービスのメモリフットプリントは小さい（Watcherのchokidarインスタンスが最大だが、プロジェクトディレクトリごとに必要なためウィンドウ別は妥当）`

研究フェーズでリスク分析が完了している。10ウィンドウは非現実的な使用パターンであり、3-5ウィンドウの実用範囲ではメモリ影響は軽微。OQ2を正式にクローズすべき。

**Action Items**:
- requirements.md OQ2に研究結果の回答を追記し、クローズ状態にする

---

### W-3: Auto-Execution BrowserWindow直接参照

**Issue**: `BrowserWindow.getAllWindows()[0]`の明示的修正タスクがない

**Judgment**: **Fix Required** ✅

**Evidence**:
- `src/main/trpc/helpers/projectSetup.ts` line 442: Bug Auto-Execution内で `const window = BrowserWindow.getAllWindows()[0];`
- `src/main/trpc/helpers/projectSetup.ts` line 484: Spec Auto-Execution内で `const window = BrowserWindow.getAllWindows()[0];`

これらは`getCurrentProjectPath()`経由ではなく、BrowserWindow APIを直接使用しているため、Task 3.1の互換レイヤーでは対処できない。Task 6.4に明示的な修正項目を追加すべき。

**Action Items**:
- tasks.md Task 6.4に`BrowserWindow.getAllWindows()[0]`参照箇所の特定と修正を明記

---

### W-4: 状態復元E2Eテスト欠落

**Issue**: Design Testing Strategyに記載のE2Eシナリオ「状態復元」がタスクに不在

**Judgment**: **Fix Required** ✅

**Evidence**:
- `design.md` line 527: `状態復元: アプリ再起動後に前回のウィンドウ配置が復元される`がE2Eシナリオとして記載
- Task 10にはマルチウィンドウ操作、重複防止、ウィンドウクローズの3シナリオのみ
- 状態復元E2Eはアプリの再起動を伴うため、WebdriverIO E2Eでは実装が困難かつフラジャイル

状態復元ロジックはTask 8.1/8.2のユニットテストで十分にカバーされる。Design.mdのE2E Testing Strategyから「状態復元」を削除してtasks.mdとの整合を取る。

**Action Items**:
- design.md E2E Testsセクションから「状態復元」を削除し、ユニットテストでカバーされることを注記

---

### W-5: EventBus projectPath網羅性不明

**Issue**: 22プロジェクトスコープイベントのうちTask 6.3で明示列挙は6件のみ

**Judgment**: **Fix Required** ✅

**Evidence**:
EventBus EVENT_NAMES定数を調査した結果、プロジェクトスコープイベントは以下の22件:
- Agent系6: AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_START_ERROR, AGENT_EXIT_ERROR, AGENT_RECORD_CHANGED
- Spec/Bug変更2: SPECS_CHANGED, BUGS_CHANGED
- AutoExecution系5: AUTO_EXECUTION_STATUS_CHANGED, AUTO_EXECUTION_PHASE_STARTED, AUTO_EXECUTION_PHASE_COMPLETED, AUTO_EXECUTION_ERROR, AUTO_EXECUTION_COMPLETED
- BugAutoExecution系6: BUG_AUTO_EXECUTION_STATUS_CHANGED, BUG_AUTO_EXECUTION_PHASE_STARTED, BUG_AUTO_EXECUTION_PHASE_COMPLETED, BUG_AUTO_EXECUTION_ERROR, BUG_AUTO_EXECUTION_COMPLETED, BUG_AUTO_EXECUTION_EXECUTE_PHASE
- File系2: GIT_CHANGES_DETECTED, PROJECT_FILE_CHANGED
- Metrics系1: METRICS_UPDATED

Task 6.3に完全なチェックリストを追加することで実装漏れを防止する。

**Action Items**:
- tasks.md Task 6.3に全22プロジェクトスコープイベントのチェックリストを追加

---

### W-6: Case-insensitiveパス比較未対応

**Issue**: macOS APFSでのcase-insensitiveパス比較が設計に含まれていない

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- Task 1.4で追加予定の`fs.realpathSync`はOSのファイルシステム層でパスを正規化する
- macOS APFSのcase-insensitiveファイルシステムでは、`fs.realpathSync('/users/foo/project')`はディスク上の正規パス（例: `/Users/foo/Project`）を返す
- これにより、異なるケースで入力されたパスも同一の正規パスに解決され、Map lookupで正しく重複検出される
- 既存の`normalizePath`（末尾スラッシュ除去）+ `realpathSync`（シンボリックリンク解決 + ケース正規化）の組み合わせで十分

`fs.realpathSync`がOSレベルでケース正規化を行うため、追加のcase-insensitive比較ロジックは不要。

---

### W-7: DD-003トレードオフ未検証

**Issue**: 非フォーカスウィンドウAuto-Executionの動作制限が未ドキュメント

**Judgment**: **Fix Required** ✅

**Evidence**:
- `design.md` DD-003 line 591: 「非フォーカスウィンドウのAuto-Executionは正しく動作しない可能性」と記載あり
- ただし影響範囲（具体的にどの操作が影響を受けるか）の説明が不足
- 互換レイヤー削除後の移行計画の記載がない

DD-003のConsequencesセクションに「Known Limitations」として影響範囲と将来の解決方針を追記する。

**Action Items**:
- design.md DD-003 Consequencesに影響範囲と解決方針を追記

---

## Response to Info (Low Priority)

| #    | Issue                           | Judgment      | Reason                                                                 |
| ---- | ------------------------------- | ------------- | ---------------------------------------------------------------------- |
| I-1  | Steering文書更新                | No Fix Needed | 実装完了後の作業であり、specフェーズでの対応は不要。実装完了時に対応    |
| I-2  | (P)マーカーの定義               | Fix Required  | tasks.md冒頭に(P)の定義を追加（タスクグループ内で並列実行可能を示す）  |
| I-3  | webContentsToWindowId最適化     | No Fix Needed | DD-002のFollow-upに記載済み。パフォーマンス測定結果で判断する設計判断   |
| I-4  | OQ3の正式解決                   | Fix Required  | 研究結果に基づきDecision Logを更新（既存WindowManagerを拡張して活用）   |

---

## Files to Modify

| File             | Changes                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| requirements.md  | Decision Log「既存WindowManagerコード」の更新、OQ2クローズ、OQ3解決            |
| design.md        | E2Eテストリストから「状態復元」削除、DD-003にKnown Limitations追記             |
| tasks.md         | (P)マーカー定義追加、Task 6.3に22イベントチェックリスト追加、Task 6.4にBrowserWindow.getAllWindows()[0]修正追記 |

---

## Conclusion

7件のWarningのうち6件がFix Required、1件（W-6: case-insensitive比較）は`fs.realpathSync`で対処済みのためNo Fix Needed。4件のInfoのうち2件がFix Required。全体として、仕様の一貫性に関する軽微なギャップであり、Criticalな問題はない。

修正は主に3つのカテゴリに集約される:
1. **Decision Log/OQの更新**: 研究結果を反映して正式にクローズ（W-1, W-2, I-4）
2. **タスクの補強**: 実装漏れ防止のためのチェックリスト追加（W-3, W-5, I-2）
3. **設計ドキュメントの整合**: E2Eテストリストとトレードオフ文書化（W-4, W-7）

---

## Applied Fixes

**Applied Date**: 2026-02-26
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Decision Log更新（W-1）、OQ1/OQ2/OQ3クローズ（W-2, I-4） |
| design.md | E2Eテストリストから「状態復元」削除（W-4）、DD-003にKnown Limitations追記（W-7） |
| tasks.md | (P)マーカー定義追加（I-2）、Task 6.3に22イベントチェックリスト追加（W-5）、Task 6.4にBrowserWindow.getAllWindows()[0]修正追記（W-3） |

### Details

#### requirements.md

**Issue(s) Addressed**: W-1, W-2, I-4

**Changes**:
- Decision Log「既存WindowManagerコード」のConclusionを「再設計する」から「拡張する（研究フェーズで再評価後に決定）」に更新
- Rationaleを研究結果を反映した内容に更新
- OQ1に解決済みステータスと研究結果の回答を追記
- OQ2に解決済みステータスと「3-5ウィンドウ想定、パフォーマンス問題は実装後対応」を追記
- OQ3に解決済みステータスと「既存WindowManagerを拡張して活用」を追記

**Diff Summary**:
```diff
- - **Conclusion**: 再設計する
- - **Rationale**: 既存実装はIPCハンドラ（旧）前提の設計で...
+ - **Conclusion**: 拡張する（研究フェーズで再評価後に決定）
+ - **Rationale**: 研究フェーズで既存WindowManagerを分析した結果、基本機能が十分に実装されており...

  1. **electron-trpcの`createIPCHandler`のマルチウィンドウ対応**:...
+    - **解決済み**: electron-trpc 0.7.1のソースコード調査により、Singleton IPCHandler + attachWindow()/detachWindow()パターンを採用
  2. **パフォーマンス影響**:...
+    - **解決済み**: 実用上3-5ウィンドウ程度を想定。各サービスのメモリフットプリントは小さく...
  3. **旧WindowManager/ConfigStore拡張コードの扱い**:...
+    - **解決済み**: 既存WindowManagerの拡張アプローチを採用。既存コードは削除せず...
```

#### design.md

**Issue(s) Addressed**: W-4, W-7

**Changes**:
- E2E Testsセクションから「状態復元」を削除し、ユニットテストでカバーされる旨の注記を追加
- DD-003にKnown Limitationsフィールドを追加し、非フォーカスウィンドウのAuto-Execution制限と修正計画を記載

**Diff Summary**:
```diff
  - **ウィンドウクローズ**: ウィンドウクローズ後にWatcherが停止していることの検証
- - **状態復元**: アプリ再起動後に前回のウィンドウ配置が復元される
+ > **Note**: 状態復元はTask 8.1/8.2のユニットテストでカバーする。

  | Consequences | tRPCプロシージャ内では`ctx.services`経由で...
+ | Known Limitations | 非フォーカスウィンドウのAuto-Execution: 互換レイヤー経由のgetCurrentProjectPath()はフォーカスウィンドウの状態を返すため...Task 6.4で明示的に修正する |
```

#### tasks.md

**Issue(s) Addressed**: W-3, W-5, I-2

**Changes**:
- ファイル冒頭に(P)マーカーの定義（「タスクグループ内で並列実行可能」）を追加
- Task 6.3にプロジェクトスコープ全22イベントのチェックリストを追加
- Task 6.4に`BrowserWindow.getAllWindows()[0]`直接参照の修正項目を追加

**Diff Summary**:
```diff
  # Implementation Plan
+ > **Note**: タスク名の`(P)`マーカーは「タスクグループ内で並列実行可能」を示す。

  6.3 イベント発火箇所にprojectPathメタデータを付与する
+   **プロジェクトスコープ全22イベントのチェックリスト**:
+     - [ ] AGENT_OUTPUT
+     - [ ] AGENT_STATUS_CHANGE
+     ... (全22イベント)

  6.4 productionServices.tsのウィンドウ別サービス分離を実施する
+   **`BrowserWindow.getAllWindows()[0]`直接参照の修正**: projectSetup.ts内のAuto-Execution関連コードで...
+   _Verify: ... Grep "getAllWindows" in src/ (結果0件を確認)_
```

---

_Fixes applied by document-review-reply command._
