# Response to Document Review #1

**Feature**: schedule-task-execution
**Review Date**: 2026-01-25
**Reply Date**: 2026-01-25

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: Remote UI対応方針未定義

**Issue**: requirements.mdに「Remote UI対応: 要/不要」の明記がない（steering/tech.mdの要求）。スケジュールタスクの設定・即時実行をRemote UIから操作可能にするか未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
steering/tech.mdの「新規Spec作成時の確認事項」セクション（行199-216）で、新しい機能を設計する際は「Remote UI対応: 要/不要」を明記することが要求されている：

```markdown
## 新規Spec作成時の確認事項

### Remote UI影響チェック

新しい機能を設計する際は、以下を明確にすること：

1. **Remote UIへの影響有無**
   - この機能はRemote UIからも利用可能にするか？
   - Desktop専用機能か？
...
3. **要件定義での明記**
   - `requirements.md` に「Remote UI対応: 要/不要」を記載
```

requirements.mdにはこの記載がないため、追加が必要。

**Action Items**:
- requirements.mdに「Remote UI対応: 不要（Desktop専用機能）」を追加
- 理由: スケジュールタスクはMain Processでのタイマー管理とアイドル検出が必要であり、Electron環境に密結合している。Remote UIからの操作は技術的に意味がない（スケジューラはDesktopアプリが起動していないと動作しない）

---

## Response to Warnings

### W1: electron-store同期詳細不足

**Issue**: Requirements 9.2とDesign DD-004で「同期タイミングと競合解決」がOpen Questionとして残されているが、タスクに詳細実装が含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md DD-004で同期方針が記載されているが、具体的な同期タイミングと競合解決ルールが不足している。既存のconfigStore.ts（行1-291）のパターンを参考にすると、electron-storeはキャッシュとして使用し、プロジェクトファイルをマスターとするパターンが適切。

**Action Items**:
- design.md DD-004に以下を追記:
  - 同期タイミング: 保存時即時（ファイル→electron-store）、プロジェクト開始時（ファイル読み込み→electron-storeに反映）
  - 競合解決ルール: プロジェクト内ファイル（`.kiro/schedule-tasks.json`）を常にマスターとする
- tasks.md 4.1の説明を更新: electron-store同期の詳細を含める

---

### W2: 並列実行のリソース制限

**Issue**: 複数プロンプトの並列実行が可能（Req 5.5）だが、リソース制限（最大同時Agent数）の設定がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存のautoExecutionCoordinator.ts（行28）に最大並行実行数の定数が定義されている：

```typescript
/** 最大並行実行数 */
export const MAX_CONCURRENT_EXECUTIONS = 5;
```

ScheduleTaskCoordinatorは同様の設計パターンを採用することで、リソース制限を実現できる。design.mdのDD-001で「AutoExecutionCoordinatorと同様のパターン」と明記されているため、この制限も暗黙的に継承される。

requirements.md 5.5の「条件と許可フラグ次第で並列実行可能」はタスク単位の設定であり、システム全体の同時Agent数制限とは別の概念。設計時点で明示する必要はなく、実装時にAutoExecutionCoordinatorの定数を参照すればよい。

---

### W3: キュー可視化UIの方針決定

**Issue**: requirements.md Open Questionに「キューイングされたタスクの可視化UI」があるが、設計/タスクで対応されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
requirements.md Open Questionsに「キューイングされたタスクの可視化UI（必要に応じて設計フェーズで検討）」と記載されている。設計フェーズでこの機能は「現時点では不要」と判断されたと解釈できる。

design.mdではScheduleTaskSettingViewとScheduleTaskListItemで十分な情報（タスク名、次回実行予定、最終実行開始日時）が表示される設計になっており、キュー状態の詳細可視化は初期実装では過剰。

この件はOpen Questionsに残しておき、ユーザーフィードバックを受けて将来的に検討すればよい。

---

### W4: エラー通知UIの具体化

**Issue**: Agent実行エラー時の「通知表示」がDesign Error Handlingに記載されているが、具体的なUI（トースト、ダイアログ等）の設計がない。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md Error Handlingセクション（行666-686）で「通知表示 + ログ記録」と記載されているが、具体的なコンポーネントが未特定。既存の通知パターン（shared/components/ui/Toast.tsx）を使用すべき。

**Action Items**:
- design.md Error Handlingに「トースト通知（shared/components/ui/Toast.tsx）を使用」を追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | ログフォーマット未定義 | No Fix Needed | steering/logging.mdに準拠することはdevelopment guidelinesで暗黙的に要求される。設計に明示は不要 |
| I2 | アイドル同期頻度未定義 | No Fix Needed | design.md DD-002で「IPCで状態を同期」と記載あり。具体的な同期間隔（10秒等）は実装詳細であり設計で決定する必要はない |
| I3 | プロンプト長制限未定義 | No Fix Needed | 過剰な設計。実装時にUIの使い勝手を見て判断すればよい。Zodバリデーションで後から追加可能 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | 「Remote UI対応: 不要（Desktop専用機能）」をIntroduction後に追加 |
| design.md | DD-004に同期詳細を追記、Error Handlingにトースト通知を追記 |
| tasks.md | タスク4.1のelectron-store同期説明を更新 |

---

## Conclusion

全10件のレビュー指摘のうち、3件が修正必要と判断された：
1. **C1**: Remote UI対応方針の明記（requirements.md）
2. **W1**: electron-store同期詳細（design.md, tasks.md）
3. **W4**: エラー通知UIの具体化（design.md）

残りの7件は、既存コードのパターンやステアリング文書の暗黙ルールに従っており、追加の修正は不要。

次のステップ: `--autofix`モードにより修正を自動適用

---

## Applied Fixes

**Applied Date**: 2026-01-25
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Remote UI対応方針を追加 |
| design.md | DD-004に同期詳細追記、Error Handlingにトースト通知追記 |
| tasks.md | タスク4.1にelectron-store同期詳細を追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1 (Remote UI対応方針未定義)

**Changes**:
- Introduction後に「Remote UI対応: 不要（Desktop専用機能）」を追加
- 理由を明記

**Diff Summary**:
```diff
 スケジュールに基づいてClaude Codeを自動起動し、指定プロンプトを実行する機能。...
+
+**Remote UI対応**: 不要（Desktop専用機能）
+- 理由: スケジュールタスクはMain Processでのタイマー管理とアイドル検出が必要であり、Electron環境に密結合している。Remote UIからの操作は技術的に意味がない（スケジューラはDesktopアプリが起動していないと動作しない）
```

#### design.md

**Issue(s) Addressed**: W1 (electron-store同期詳細不足), W4 (エラー通知UI未設計)

**Changes**:
- DD-004に同期タイミングと競合解決ルールを追記
- Error Strategyにトースト通知コンポーネント（`shared/components/ui/Toast.tsx`）を明記

**Diff Summary**:
```diff
 | Consequences | 同期タイミングと競合解決の設計が必要。Requirements 9.2, 9.3 |
+
+**同期タイミング**:
+- **保存時**: ファイル（`.kiro/schedule-tasks.json`）への書き込み成功後、即座にelectron-storeのキャッシュを更新
+- **プロジェクト開始時**: ファイルから読み込み、electron-storeのキャッシュに反映
+
+**競合解決ルール**:
+- プロジェクト内ファイル（`.kiro/schedule-tasks.json`）を常にマスター（Single Source of Truth）とする
+- electron-storeはあくまでキャッシュであり、ファイルが存在する場合は常にファイルの内容を優先
+- ファイルが存在しない場合のみelectron-storeのキャッシュを使用（フォールバック）
```

```diff
 ### Error Strategy

-- ユーザーエラー: フォームバリデーションで即時フィードバック
-- システムエラー: 通知表示 + ログ記録
-- Agent実行エラー: 実行ログに記録、次回スケジュールで再試行
+- ユーザーエラー: フォームバリデーションで即時フィードバック
+- システムエラー: トースト通知（`shared/components/ui/Toast.tsx`） + ログ記録
+- Agent実行エラー: トースト通知で表示、実行ログに記録、次回スケジュールで再試行
```

#### tasks.md

**Issue(s) Addressed**: W1 (electron-store同期詳細不足)

**Changes**:
- タスク4.1にelectron-store同期の詳細実装内容を追加

**Diff Summary**:
```diff
 - [ ] 4.1 scheduleTaskStoreを作成
   - タスク一覧のキャッシュ管理
   - 編集画面の状態管理
   - IPC経由でのデータ取得・更新
+  - **electron-store同期**:
+    - 保存時: ファイル書き込み成功後にelectron-storeキャッシュ更新
+    - 読み込み時: プロジェクトファイルをマスターとし、キャッシュに反映
+    - 競合時: プロジェクトファイル優先（electron-storeはフォールバック）
   - _Requirements: 全UI_
+  - _Requirements: 全UI, 9.2_
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
