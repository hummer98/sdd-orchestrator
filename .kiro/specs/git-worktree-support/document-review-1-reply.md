# Response to Document Review #1

**Feature**: git-worktree-support
**Review Date**: 2026-01-12
**Reply Date**: 2026-01-12

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 5      | 4            | 1             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C-1.1: 自動実行フローのDesign未定義

**Issue**: Requirement 6.1-6.4「自動実行フロー」のinspection連携について、Designに具体的なコンポーネント定義がない。`autoExecutionCoordinator` が言及されているが、インタフェース定義・フロー図がない

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdのRequirements Traceabilityテーブル（行170）で以下のように記載されている：
```
| 6.1-6.5 | 自動実行フロー | autoExecutionCoordinator | - | - |
```
インタフェース定義がなく、「-」で埋められている。

実際には、既存の`autoExecutionCoordinator`が`electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts`に実装されており：
- `AutoExecutionState`インタフェース（行47-70）
- `AutoExecutionPermissions`インタフェース（行76-84）に`inspection?: boolean`が存在
- `AutoExecutionEvents`（行165-173）でフェーズ実行イベントが定義済み

ただし、design.mdには以下が不足している：
1. 既存`autoExecutionCoordinator`への参照と、worktree用拡張方針
2. inspection連携のシーケンス図
3. spec-merge自動実行のトリガー条件

**Action Items**:
- design.mdに`autoExecutionCoordinator`拡張セクションを追加
- inspection連携のシーケンス図を追加
- 既存実装への参照を明記

---

### C-1.2: inspection失敗時の修正主体が不明

**Issue**: Requirements 6.3「inspection失敗時の修正とリトライ」vs Tasks 9.1の説明が不整合。Requirementsでは「問題が検出された場合、修正を試行して再度inspection」だが、誰が修正を行うか（AI Agent? spec-impl?）が不明

**Judgment**: **Fix Required** ✅

**Evidence**:
requirements.md（行133）：
```
3. When inspectionで問題が検出された場合, the system shall 修正を試行して再度inspectionを実行する
```

tasks.md（行107）：
```
- inspection失敗時の修正とリトライ
```

いずれも「修正」の実行主体が明示されていない。

既存の自動実行パターン（`autoExecutionCoordinator.ts`行82-83）を参照すると：
```typescript
readonly inspection?: boolean;
readonly deploy?: boolean;
```
inspectionは独立したフェーズとして定義されており、失敗時の修正は通常AI Agentが行う。

**Action Items**:
- requirements.md Requirement 6.3に修正主体を明記：「AI Agentが修正を試行」
- tasks.md Task 9.1の説明に「AI Agentによる修正」を追加

---

## Response to Warnings

### W-1.1: 監視パス切り替えの詳細不足

**Issue**: Requirement 8「監視パスの切り替え」について、Designでは`SpecsWatcherService拡張`と`WorktreeService.getWatchPath`が言及されているが、監視再初期化のトリガーと実装詳細が不明確

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md（行579-582）DD-008「監視パスの動的切り替え」：
```
| Decision | WorktreeService.getWatchPathでspec.jsonのworktreeフィールドを参照し動的に切り替え |
...
| Consequences | SpecsWatcherServiceの初期化/再初期化ロジックが必要 |
```

トリガー条件が「必要」と記載されているが、具体的な実装詳細がない。

**Action Items**:
- design.mdに監視再初期化のトリガー条件を追加：「spec.jsonのworktreeフィールド追加/削除時」
- SpecsWatcherService拡張セクションにresetWatch()メソッド追加

---

### W-1.2: autoExecutionCoordinatorのインタフェース未定義

**Issue**: Task 9実装前にdesign.mdへインタフェース追加が必要

**Judgment**: **Fix Required** ✅

**Evidence**:
C-1.1と同じ問題。既存の`autoExecutionCoordinator`は存在するが、worktree対応のための拡張が設計に含まれていない。

**Action Items**:
- C-1.1の修正に含める

---

### W-1.3: 7回リトライの適用範囲が不明確

**Issue**: Requirements「7回試行」という数値がRequirements 6.4、Requirement 7.4、Tasks 8.3、9.1で言及されているが、inspectionリトライとコンフリクト解決リトライが同じ7回なのか別々なのか不明確

**Judgment**: **No Fix Needed** ❌

**Evidence**:
requirements.md：
- Requirement 6.4（行134）：「If 7回試行しても問題が解決しない場合」→ inspectionリトライ
- Requirement 7.5（行146）：「If 自動解決に失敗した場合」→ リトライ回数未指定

tasks.md：
- Task 8.3（行93）：「最大7回までリトライ」→ コンフリクト解決
- Task 9.1（行108）：「最大7回試行後にユーザー報告」→ inspection

これらは明確に別々の文脈で使用されており：
1. **inspectionリトライ**: inspection失敗 → AI修正 → 再inspection（最大7回）
2. **コンフリクト解決リトライ**: gitマージコンフリクト → AI解決試行 → 再マージ（最大7回）

両者は独立したリトライカウンタを持つことが文脈から明らか。混乱の恐れは低い。

**Reasoning**: 異なるフェーズ（inspection vs spec-merge）での7回制限は自然な設計。明示的に「同一」と書く必要はない。

---

### W-2.1: worktree作成失敗時のロールバック

**Issue**: 部分的に作成されたブランチの削除処理は考慮されているか

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md Error Handlingセクション（行463-470）：
```
### Error Strategy
- git操作失敗: Result型でエラーを返し、UI層でメッセージ表示
- impl中断時: worktree作成をロールバック不要（ディレクトリ未作成のため）
```

「ディレクトリ未作成のため」は不正確。worktree作成は以下の順序：
1. `git branch feature/{name}` → ブランチ作成
2. `git worktree add` → worktree作成

ステップ1が成功しステップ2が失敗した場合、孤立したブランチが残る。

**Action Items**:
- design.mdのError Handlingセクションにロールバック手順を追加
- WorktreeService.createWorktreeのエラー時に`git branch -d`を実行する仕様を追加

---

### W-2.2: パス検証のセキュリティ考慮

**Issue**: spec.jsonのworktree.pathに悪意あるパス（シンボリックリンク、親ディレクトリトラバーサル）が設定された場合の検証がない

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdのWorktreeService（行256-259）：
```typescript
resolveWorktreePath(relativePath: string): string;
```

パス検証の記載がない。相対パスは`../{project}-worktrees/{feature-name}`形式で保存されるため、`../../etc/passwd`のような悪意あるパスが設定される可能性がある。

**Action Items**:
- design.mdのWorktreeService.resolveWorktreePathに以下を追加：
  - パス正規化（`path.resolve`後の`path.normalize`）
  - プロジェクトルート親ディレクトリ内に収まることの検証
  - シンボリックリンク解決（`fs.realpath`）

---

## Response to Info (Low Priority)

| #    | Issue                              | Judgment      | Reason                                                                 |
| ---- | ---------------------------------- | ------------- | ---------------------------------------------------------------------- |
| I-1.1 | UI仕様の詳細不足（アイコン種類等） | No Fix Needed | 実装時に決定可能。設計段階で詳細UI仕様は不要                           |
| I-2.1 | ロギング詳細不足                   | No Fix Needed | steering/logging.md準拠を前提とする。実装時に詳細化                   |
| I-2.2 | デバッグ手順未記載                 | No Fix Needed | 実装後にsteering/debugging.mdを更新。設計段階では不要                 |

---

## Response to Ambiguities

### A-2: Open Questions不整合（複数のspecが同時にworktreeモード）

**Issue**: research.mdでは「問題なし」と記載されているが、requirements.mdのOpen Questionsでは未解決扱い

**Judgment**: **Fix Required** ✅

**Evidence**:
research.md（行192-193）：
```
- **Risk 3**: 複数Specが同時にworktreeモード
  - **Mitigation**: 各Specは独立したworktreeを持つため問題なし（ドキュメントで明記）
```

requirements.md（行170）：
```
- 複数のspecが同時にworktreeモードの場合の管理方法
```

research.mdで解決済みの内容がrequirements.mdに反映されていない。

**Action Items**:
- requirements.mdのOpen Questionsから「複数のspecが同時にworktreeモード」を削除
- Decision Logに追記：「各Specは独立したworktreeを持つため問題なし」

---

### A-4: worktreeパス形式の不整合

**Issue**: 「gitデフォルトの場所」の定義が不明確

**Judgment**: **Fix Required** ✅

**Evidence**:
requirements.md Decision Log（行17-19）：
```
### worktree作成場所
- **Conclusion**: gitデフォルトの場所を使用
```

requirements.md（行78-79）：
```
3. When mainブランチでimpl開始されたとき, the system shall gitデフォルトの場所にworktreeを作成する
```

research.md（行34）：
```
- worktreeパスは`../{project}-worktrees/{feature-name}`形式が適切
```

「gitデフォルト」は実際には`git worktree add ../path`のパス指定であり、gitが自動的に場所を決めるわけではない。

**Action Items**:
- requirements.mdの「gitデフォルトの場所」を「`../{project}-worktrees/{feature-name}`」に変更
- Decision Logの「gitデフォルト」表現を修正

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| requirements.md | C-1.2: Requirement 6.3に修正主体（AI Agent）を明記、A-2: Open Questions更新、A-4: パス形式の明確化 |
| design.md | C-1.1: autoExecutionCoordinator拡張セクション追加、W-1.1: 監視再初期化トリガー追加、W-2.1: ロールバック手順追加、W-2.2: パス検証追加 |
| tasks.md | C-1.2: Task 9.1に「AI Agentによる修正」を追加 |

---

## Conclusion

レビューで指摘された課題のうち、Critical 2件、Warning 4件が修正必要と判断された。

主な修正内容：
1. **設計の明確化**: autoExecutionCoordinator拡張、監視パス再初期化トリガーの詳細化
2. **セキュリティ強化**: パス検証の追加
3. **エラーハンドリング**: worktree作成失敗時のロールバック手順
4. **ドキュメント整合性**: Open Questions解決、パス形式の統一

W-1.3（7回リトライの適用範囲）は文脈から明らかなため修正不要と判断。

---

## Applied Fixes

**Applied Date**: 2026-01-12
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | C-1.2: 修正主体明記、A-2: Open Questions更新、A-4: パス形式明確化 |
| design.md | C-1.1: AutoExecutionCoordinator拡張セクション追加、W-1.1: SpecsWatcherService拡張詳細追加、W-2.1: ロールバック手順追加、W-2.2: パス検証追加 |
| tasks.md | C-1.2: Task 9.1に「AI Agentによる修正」追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: C-1.2, A-2, A-4

**Changes**:
- Requirement 6.3に「AI Agentによる」を追加
- Decision Logの「worktree作成場所」を`../{project}-worktrees/{feature-name}`形式に変更
- Decision Logに「複数specのworktreeモード同時使用」を追加（解決済み）
- Open Questionsから「複数のspecが同時にworktreeモード」を削除

**Diff Summary**:
```diff
- **Conclusion**: gitデフォルトの場所を使用
+ **Conclusion**: `../{project}-worktrees/{feature-name}` 形式の固定パスを使用

- 3. When mainブランチでimpl開始されたとき, the system shall gitデフォルトの場所にworktreeを作成する
+ 3. When mainブランチでimpl開始されたとき, the system shall `../{project}-worktrees/{feature-name}` にworktreeを作成する

- 3. When inspectionで問題が検出された場合, the system shall 修正を試行して再度inspectionを実行する
+ 3. When inspectionで問題が検出された場合, the system shall AI Agentによる修正を試行して再度inspectionを実行する

+ ### 複数specのworktreeモード同時使用
+ - **Conclusion**: 各Specは独立したworktreeを持つため問題なし

- - 複数のspecが同時にworktreeモードの場合の管理方法
```

#### design.md

**Issue(s) Addressed**: C-1.1, W-1.1, W-1.2, W-2.1, W-2.2

**Changes**:
- Requirements Traceabilityに Auto Execution Flow を追加
- Components and Interfaces に AutoExecutionCoordinator拡張 を追加
- System Flows に Auto Execution Flow (inspection → spec-merge) シーケンス図を追加
- AutoExecutionCoordinator拡張セクションを追加（インタフェース定義、イベント定義）
- SpecsWatcherService拡張セクションを追加（resetWatchPath、トリガー条件）
- WorktreeError型に PATH_VALIDATION_ERROR を追加
- resolveWorktreePathにセキュリティ検証のドキュメントを追加
- Error Strategy にロールバック手順を追加

**Diff Summary**:
```diff
- | 6.1-6.5 | 自動実行フロー | autoExecutionCoordinator | - | - |
+ | 6.1-6.5 | 自動実行フロー | AutoExecutionCoordinator拡張 | startAutoExecution, handleInspectionComplete | Auto Execution Flow |

+ | AutoExecutionCoordinator拡張 | Main/Service | inspection→spec-merge自動連携 | 6.1-6.5 | SpecManagerService (P0) | Service, Event |

+ | { type: 'PATH_VALIDATION_ERROR'; path: string; reason: string };

+ ### Auto Execution Flow (inspection → spec-merge) [新規シーケンス図]

+ #### AutoExecutionCoordinator拡張 [新規セクション]
+ #### SpecsWatcherService拡張 [新規セクション]

- - impl中断時: worktree作成をロールバック不要（ディレクトリ未作成のため）
+ - worktree作成失敗時のロールバック:
+   1. ブランチ作成成功 → worktree追加失敗の場合: `git branch -d feature/{name}` でブランチを削除
+   2. worktree追加成功 → spec.json更新失敗の場合: `git worktree remove` + `git branch -d` で完全ロールバック
+   3. WorktreeService.createWorktreeはtry-catch内で上記ロールバックを自動実行
```

#### tasks.md

**Issue(s) Addressed**: C-1.2

**Changes**:
- Task 9.1の説明に「AI Agentによる」を追加

**Diff Summary**:
```diff
-   - inspection失敗時の修正とリトライ
+   - inspection失敗時のAI Agentによる修正とリトライ
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
