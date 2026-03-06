# Response to Document Review #2

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Reply Date**: 2026-03-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 6      | 3            | 3             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C-01: remote-ui/App.tsx更新タスク欠落

**Issue**: Design Wiring Pointsに `src/remote-ui/App.tsx | Bug関連import削除、Issue関連追加` が記載されているが、Tasks 12.2（DesktopLayout）や14.2（Renderer配線）のいずれにも `remote-ui/App.tsx` の更新が含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md Wiring Pointsテーブル（行951）に `src/remote-ui/App.tsx | Bug関連import削除、Issue関連追加` が明記
- Task 12.2は `DesktopLayout.tsx` のみ対象、Task 14.2は `renderer/App.tsx`（Electron側）のみ対象
- `remote-ui/App.tsx` はRemote UIのルートコンポーネントであり、Bug関連importの削除とIssue関連の追加が必要

**Action Items**:
- tasks.md: Task 12.2に `remote-ui/App.tsx` のBug→Issue配線更新を追加

---

### C-02: getPRFilesのtRPC公開+タスク未追加

**Issue**: Review #1 Reply (W-03) で `GitHubApiService` に `getPRFiles` メソッドと `PRFile` 型が追加されたが、`IssueRouterProcedures` への反映とタスクへの反映が漏れている。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md `GitHubApiService` インターフェース（行454）: `getPRFiles` 定義済み
- design.md `IssueRouterProcedures`（行576-600）: `getPRFiles` Query未定義 → RendererからPRファイル一覧を取得できない
- tasks.md Task 3.4: `getPRFiles` の記述なし
- tasks.md Task 4.2: `getPRFiles` Queryの記述なし
- tasks.md Task 8.2: PRDetailViewが `getPRFiles` を呼び出す必要があるが言及なし

**Action Items**:
- design.md: `IssueRouterProcedures` に `getPRFiles` Queryを追加
- tasks.md: Task 3.4に `getPRFiles` 実装を追記
- tasks.md: Task 4.2に `getPRFiles` Queryを追記
- tasks.md: Task 8.2に `getPRFiles` 呼び出しへの言及を追記

---

## Response to Warnings

### W-01: issueRouter getPRFiles Query欠落

**Issue**: `IssueRouterProcedures` に `getPRFiles` Queryが含まれていない。

**Judgment**: **Fix Required** ✅（C-02と統合して対応）

**Evidence**: C-02と同一。`IssueRouterProcedures` への `getPRFiles` 追加で解決。

---

### W-02: safeStorage非対応環境のフォールバック未設計

**Issue**: `GitHubCredentialService` にsafeStorage非対応環境のフォールバック機構がない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md DD-004 Consequences: "Linux環境ではSecret Serviceの設定が必要な場合がある"
- research.md: "safeStorage APIがLinux環境でSecret Service未設定時に失敗 → Mitigation: `isEncryptionAvailable()` チェック。フォールバックとして `GITHUB_TOKEN` 環境変数をサポート"
- 現在の `GitHubCredentialService` precondition: "`safeStorage.isEncryptionAvailable()` must return true" — falseの場合の動作が未定義
- Slash Commands側（`gh-issue.sh`）は `GITHUB_TOKEN` 環境変数フォールバックが設計済みだが、UI側（`GitHubApiService`）のフォールバックが未設計

`isEncryptionAvailable()` がfalseの場合にUIが完全に使用不能になることを防ぐため、`GitHubApiService` が `GITHUB_TOKEN` 環境変数をフォールバックとして参照する設計をdesign.mdに追記する。

**Action Items**:
- design.md: `GitHubApiService` のResponsibilities & Constraintsにフォールバック動作を追記
- design.md: `GitHubCredentialService` のpreconditionにフォールバック記述を追加

---

### W-03: Needs Discussion項目の決定（W-05, W-08）

**Issue**: Review #1で "Needs Discussion" と判定された2件（ダイレクトモードPR動作、WebSocket PRメッセージタイプ）がドキュメントに未反映。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- W-05（ダイレクトモードPR動作）とW-08（WebSocket PRメッセージタイプ）はいずれもプロダクト判断が必要な項目
- requirements.md Open Questionsに「ダイレクトモードでの実装時、PR作成は任意とするか、完了時に自動提案するか」が記載済み
- ドキュメントレビューの範囲ではこれらの決定は行えない。ユーザーの意思決定を待つ必要がある
- 実装フェーズで決定しても問題ない範囲（影響はTask 4.4の分岐ロジックとTask 12.1のメッセージタイプ追加のみ）

---

### W-04: PRListViewの親コンポーネント明確化

**Issue**: PRListViewがIssuePaneのサブタブなのかIssueListPanelのサブタブなのかで記述が矛盾。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md Architecture diagram（行80-81）: `IssuePane --> PRList`, `IssuePane --> PRDetail`
- design.md UI Components Summary（行719）: PRListView "IssueListPanel内のサブタブとして表示"
- design.md Components and Interfaces テーブル（行313）: `IssuePane` の依存が `IssueListPanel (P0), IssueDetailView (P0)` のみ — PRListView/PRDetailViewへの依存が未記載
- Architecture diagramではIssuePaneの直接子として描画されており、Components and Interfacesテーブルと一致させるべき

**Action Items**:
- design.md: `IssuePane` の Key Dependencies に `PRListView (P0), PRDetailView (P0)` を追加

---

### W-05: ポーリングライフサイクル未定義

**Issue**: issueStoreの60秒ポーリングの開始/停止タイミングが未定義。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- design.md issueStore Responsibilities & Constraints（行634）: "ポーリング制御（60秒間隔、手動リフレッシュ対応）" と記載
- 既存パターンとの一貫性: `specStore` のポーリングもタブ表示時に開始、非表示時に停止する暗黙的なReactライフサイクルに依存しており、design.mdに明示的なライフサイクル定義はない
- 実装レベルの詳細（React `useEffect` の cleanup でポーリング停止）であり、設計文書で規定する粒度ではない
- GitHub API rate limit（5000 req/hour for authenticated）に対して60秒ポーリングは十分安全

---

### W-06: Task 14.7 Steering更新の具体性不足

**Issue**: Task 14.7の記述が抽象的すぎ、具体的な変更内容が列挙されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Task 14.7の現在の記述を確認:
```
- `product.md`: Core Capability #4 "バグ修正ワークフロー" → "Issue連携ワークフロー"、Target Use Cases・ワークフローパターン更新
- `structure.md`: `shared/components/bug/` → `issue/`、`bugStore` / `bugAutoExecutionStore` → `issueStore`、Agent Category `bug:{bugId}` → `issue:{issueNumber}`
- `tech.md`: tRPCルーター一覧 `bug` → `issue`
```

各ファイルごとに具体的な変更内容が列挙されている。レビューが指摘する "structure.mdの行38, 179, 41, 57..." のような行番号レベルの詳細は実装時に確認すべき事項であり、タスク定義としては現在の粒度で十分。

---

## Response to Info (Low Priority)

| #    | Issue                          | Judgment      | Reason                                                                              |
| ---- | ------------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| S-01 | issueRouter SRP改善            | No Fix Needed ❌ | Credential分離は将来の改善項目。初期実装では1ルーターに集約しても問題ない。既存specRouterも20プロシージャを1ルーターで管理 |
| S-02 | E2E GitHub APIモック戦略       | No Fix Needed ❌ | E2Eテストは `[ ]*` マーク（optional）であり、モック戦略は実装時に具体化可能         |
| S-03 | PRDetailView仕様の構造改善     | No Fix Needed ❌ | 情報として正確であり、Notesカラムへの記述は簡潔さの点で許容範囲                      |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | `IssueRouterProcedures` に `getPRFiles` Query追加。`IssuePane` 依存にPRListView/PRDetailView追加。`GitHubApiService` にフォールバック設計追記。`GitHubCredentialService` preconditionにフォールバック記述追加 |
| tasks.md | Task 3.4に `getPRFiles` 追記。Task 4.2に `getPRFiles` Query追記。Task 8.2に `getPRFiles` 呼び出し追記。Task 12.2に `remote-ui/App.tsx` 更新追加 |

---

## Conclusion

11件のレビュー指摘のうち、5件が **Fix Required**、6件が **No Fix Needed** と判定。

Critical 2件（remote-ui/App.tsx タスク欠落、getPRFiles tRPC未公開）は明確なドキュメントの欠落であり修正が必要。W-01はC-02と統合、W-02はフォールバック設計の追記、W-04はコンポーネント依存関係の明確化で対応。

W-03（Needs Discussion未解決）はユーザー判断待ち、W-05（ポーリングライフサイクル）とW-06（Task 14.7具体性）は既存パターンとの一貫性・現在の記述レベルで十分と判定。

---

## Applied Fixes

**Applied Date**: 2026-03-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | `IssueRouterProcedures` に `getPRFiles` Query追加、`IssuePane` 依存にPRListView/PRDetailView追加、`GitHubApiService` にPATフォールバック設計追記、`GitHubCredentialService` preconditionにフォールバック記述追加 |
| tasks.md | Task 3.4に `getPRFiles` 追記、Task 4.2に `getPRFiles` Query追記、Task 8.2に `getPRFiles` 呼び出し追記、Task 12.2に `remote-ui/App.tsx` 更新追加 |

### Details

#### design.md

**Issue(s) Addressed**: C-02, W-01, W-02, W-04

**Changes**:
- `IssueRouterProcedures` に `getPRFiles: Query<{ projectPath: string; number: number }, PRFile[]>` を追加
- `IssuePane` の Key Dependencies に `PRListView (P0), PRDetailView (P0)` を追加
- `GitHubApiService` Responsibilities & Constraints に `GITHUB_TOKEN` 環境変数フォールバックを追記
- `GitHubCredentialService` precondition に safeStorage 非対応時のフォールバック動作を追記

**Diff Summary**:
```diff
 // IssueRouterProcedures
   getPRCIStatus: Query<{ projectPath: string; sha: string }, CIStatus>;
+  getPRFiles: Query<{ projectPath: string; number: number }, PRFile[]>;
   testConnection: Query<{ projectPath: string }, GitHubUser>;

 // Components and Interfaces
-| IssuePane | Shared/UI | ... | IssueListPanel (P0), IssueDetailView (P0) | - |
+| IssuePane | Shared/UI | ... | IssueListPanel (P0), IssueDetailView (P0), PRListView (P0), PRDetailView (P0) | - |

 // GitHubApiService Responsibilities
 - レート制限ヘッダー（`X-RateLimit-Remaining`）の監視
+- PAT取得フォールバック: `GitHubCredentialService.getToken()` がnullの場合（safeStorage非対応環境含む）、`GITHUB_TOKEN` 環境変数をフォールバックとして参照

 // GitHubCredentialService Preconditions
-- Preconditions: `safeStorage.isEncryptionAvailable()` must return true
+- Preconditions: `safeStorage.isEncryptionAvailable()` must return true for token storage/retrieval. If false, UI displays a warning and guides user to set `GITHUB_TOKEN` environment variable as fallback
```

#### tasks.md

**Issue(s) Addressed**: C-01, C-02

**Changes**:
- Task 3.4: `getPRFiles` 実装とRequirements 8.3への参照を追加
- Task 4.2: `getPRFiles` Queryを追加
- Task 8.2: "変更diff表示" を `getPRFiles` Query呼び出しによる具体的な実装方法に更新
- Task 12.2: `remote-ui/App.tsx` のBug→Issue配線更新を追加

**Diff Summary**:
```diff
 ## Task 3.4
   - CIステータス取得（`GET /repos/owner/repo/commits/{sha}/status`）
+  - PRファイル一覧取得（`getPRFiles`: `GET /repos/{owner}/{repo}/pulls/{number}/files`）
-  - _Requirements: 8.1, 8.4, 8.5_
+  - _Requirements: 8.1, 8.3, 8.4, 8.5_

 ## Task 4.2
-  - Query: listPullRequests, getPullRequest, getPRCIStatus
+  - Query: listPullRequests, getPullRequest, getPRCIStatus, getPRFiles

 ## Task 8.2
-- [ ] 8.2 PRDetailViewを実装する
-  - 変更diff表示
+  - `getPRFiles` Query呼び出しによるファイル変更リスト + patchベースdiff表示

 ## Task 12.2
   - Electron版と同等のレイアウト構成に準拠
+  - `remote-ui/App.tsx`: Bug関連import削除、Issue関連import追加（Design Wiring Points準拠）
```

---

_Fixes applied by document-review-reply command._
