# Response to Document Review #1

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Reply Date**: 2026-01-27

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C1: Acceptance Criteria 7.1-7.5のTask分割不足

**Issue**: Requirement 7の5つのAcceptance Criteriaが単一のInfrastructure Task 7.1でカバーされており、Feature Implementation taskが不足している。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdのTask 7.1を確認すると、確かに以下のように包括的な記述になっている:
```markdown
7.1 (P) 変更ファイルを階層的なツリー構造で表示するコンポーネントを実装する
  - ディレクトリノード: 折りたたみ可能、子ノード数表示
  - ファイルノード: ステータスアイコン（A: 緑+, M: 黄色●, D: 赤-）、ファイル名表示
  - ファイルノードクリック時に選択ファイルを設定
  - ディレクトリノードクリック時に展開/折りたたみ状態をトグル
  - ファイルリスト空時に"変更がありません"メッセージを表示
  - スクロール可能な領域として実装
```

このタスクは、複数のAcceptance Criteria（7.1: ツリー表示、7.2: ファイル選択、7.3: 展開/折りたたみ、7.4: 空メッセージ、7.5: スクロール）をすべて含んでおり、タスク粒度が粗すぎる。

**Action Items**:
- Task 7.1を以下のように分割:
  - 7.1 (P Infrastructure): GitFileTreeコンポーネントの基礎構造作成（階層的なツリー構造レンダリング、Criterion 7.1）
  - 7.2 (P Feature): ファイルノードクリック時の選択機能実装（Criterion 7.2）
  - 7.3 (P Feature): ディレクトリノードの展開/折りたたみ機能実装（Criterion 7.3）
  - 7.4 (P Feature): 空リストメッセージ表示実装（Criterion 7.4）
  - （Criterion 7.5のスクロール対応は7.1の基礎構造に含まれるため独立タスク不要）

---

### C2: IPC統合テストタスクの明確化不足

**Issue**: Design.mdに詳細な統合テスト仕様（Data Flow、Mock Boundaries、Verification Points）が記載されているが、tasks.mdのTask 13.1-13.5は簡潔な記述のみで、実装時にどのレベルまでテストすべきか不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdの「Integration Test Strategy」セクション（lines 869-895）には以下の詳細が記載されている:
- **Data Flow**: Renderer → IpcApiClient → IPC Handler → GitService → git CLI
- **Mock Boundaries**: IPC transportは実機、GitService内部のgit CLIはモック
- **Verification Points**: gitViewStore.cachedStatus更新、GitFileTree再レンダリング等

一方、tasks.mdのTask 13.1は以下の簡潔な記述のみ:
```markdown
13.1 (P) Renderer → Main git:get-status IPC通信の統合テストを実装する
  - リクエスト送信、レスポンス受信、Result型解析を検証
```

これでは、どこまでをモックし、何を検証すべきか不明確。

**Action Items**:
- Task 13.1-13.5の各項目に以下を追加:
  - **Mock Boundaries**: どのレイヤーをモック化するか（例: child_process.spawnをモック、IPC transportは実装使用）
  - **Verification Points**: 具体的な検証項目（例: gitViewStore.cachedStatusの値、エラーハンドリング）
  - **Design参照**: 「詳細はDesign.md "Integration Test Strategy"セクション参照」を明記

---

## Response to Warnings

### W1: Remote UI統合テストの欠如

**Issue**: Design.mdにRemote UI E2Eテスト計画（ブラウザアクセス、WebSocket経由File Watch）が記載されているが、tasks.mdに対応タスクがない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdの「E2E/UI Tests」セクション（lines 899-910）に以下の記載がある:
```markdown
**Remote UI E2E** (追加):
1. **ブラウザアクセス**: Remote UIで"Git Diff"表示 → WebSocket経由でgit差分取得
2. **File Watch over WebSocket**: ファイル変更 → Remote UIで自動更新
```

しかし、tasks.mdには該当するタスクが存在しない（Task 13.1-13.5はElectron版のみ、Task 14は存在しない）。

**Action Items**:
- tasks.mdに以下のタスクを追加:
  ```markdown
  13.6 (P) Remote UI統合テストを実装する
    - WebSocket経由のgit操作テスト（getGitStatus, getGitDiff）
    - File Watch over WebSocketテスト（ファイル変更検知 → Remote UI自動更新）
    - _Requirements: 10.4_
    - _Integration Point: Design.md "Remote UI E2E"_
  ```

---

### W2: E2E/UIテストタスクの欠如

**Issue**: Design.mdにE2Eテスト計画（GitView初回表示、ファイル選択、差分モード切り替え等）が記載されているが、tasks.mdに対応タスクがない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdの「E2E/UI Tests」セクション（lines 899-905）に以下の記載がある:
```markdown
**Critical User Paths**:
1. **GitView初回表示**: SpecPane → "Git Diff"タブクリック → ファイルリスト表示
2. **ファイル選択と差分表示**: ファイルツリーでファイルクリック → 右側に差分表示
3. **差分モード切り替え**: unified/splitボタンクリック → 表示形式変更
4. **ファイル変更検知**: テスト中にファイル編集 → 自動的に差分更新
5. **ショートカットキー**: Ctrl+Shift+G → Artifacts/Git Diff切り替え
```

しかし、tasks.mdにはE2E/UIテストに該当するタスクが存在しない（Task 14が存在しない）。

**Action Items**:
- tasks.mdに以下のタスクセクションを追加:
  ```markdown
  ## 14. E2E/UIテスト（Critical User Paths）
  - [ ] 14.1 GitView初回表示テスト
    - SpecPane → "Git Diff"タブクリック → ファイルリスト表示を検証
    - _Requirements: 6.1, 6.2_
  - [ ] 14.2 ファイル選択と差分表示テスト
    - ファイルツリーでファイルクリック → 差分表示、シンタックスハイライトを検証
    - _Requirements: 7.2, 8.2_
  - [ ] 14.3 差分モード切り替えテスト
    - unified/splitボタンクリック → 表示形式変更を検証
    - _Requirements: 8.3_
  - [ ] 14.4 ファイル変更検知テスト
    - ファイル編集 → 自動更新を検証
    - _Requirements: 2.2, 6.3_
  - [ ] 14.5 ショートカットキーテスト
    - Ctrl+Shift+G → Artifacts/Git Diff切り替えを検証
    - _Requirements: 5.3, 11.1_
  ```

---

### W3: Design.mdとTask 9.1の記述不整合

**Issue**: Design.mdは「ArtifactEditorを包む」、Task 9.1は「置き換え」と記述が異なる。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdの「結合・廃止戦略」セクション（line 983）:
```markdown
`<ArtifactEditor />`を`<CenterPaneContainer />`で包む
```

tasks.mdのTask 9.1（line 116）:
```markdown
SpecPane内の`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え
```

既存コードのSpecPane.tsx（確認済み）では、ArtifactEditorが直接配置されており、CenterPaneContainerで包む形が正しい実装となる。「置き換え」という表現は、ArtifactEditorを削除すると誤解される可能性がある。

**Action Items**:
- Design.mdの「既存ファイルの変更」表（line 983）の記述を以下に変更:
  ```markdown
  `<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え、CenterPaneContainer内部でArtifactEditorとGitViewを切り替える
  ```
- tasks.mdのTask 9.1の記述を以下に統一:
  ```markdown
  SpecPane内の`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え（CenterPaneContainerは内部でArtifactEditorとGitViewを切り替える）
  ```

---

## Response to Info (Low Priority)

| #  | Issue                 | Judgment      | Reason                                                                                                     |
| -- | --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| I1 | ロギング詳細化の推奨 | No Fix Needed | Design.mdの「Error Handling」および「Monitoring」セクションで既にログ出力方針が記載されている。詳細なログレベル定義は実装時に`.kiro/steering/logging.md`を参照すれば十分であり、仕様書への追加は過剰。 |

---

## Files to Modify

| File       | Changes                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| tasks.md   | Task 7.1を7.1-7.4に分割、Task 13.1-13.5に詳細追加、Task 13.6追加、Task 14.1-14.5追加、Coverage Matrix更新 |
| design.md  | 「既存ファイルの変更」表のSpecPane記述を統一                                                              |

---

## Conclusion

**Fix Required**: 5項目（Critical 2件、Warning 3件）
**No Fix Needed**: 1項目（Info 1件）

すべての修正が完了後、tasks.mdはより明確な実装ガイドとなり、テストカバレッジも向上します。次のステップは、これらの修正を tasks.md と design.md に適用することです。

修正は `--fix` フラグを使用して適用できます: `/kiro:document-review-reply git-diff-viewer 1 --fix`

---

## Applied Fixes

**Applied Date**: 2026-01-27
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 7.1を4つのサブタスク（7.1-7.4）に分割、Task 13.1-13.5に詳細追加、Task 13.6追加、Task 14.1-14.5追加、Coverage Matrix更新 |
| design.md | SpecPane統合記述の明確化（ArtifactEditor置き換えの説明追加） |

### Details

#### tasks.md

**Issue(s) Addressed**: C1, C2, W1, W2, W3

**Changes**:
- **Task 7.1分割**: 単一の包括的タスクを Infrastructure（7.1: 基礎構造）と3つのFeatureタスク（7.2: ファイル選択、7.3: 展開/折りたたみ、7.4: 空メッセージ表示）に分割
- **Task 13.1-13.5詳細化**: 各統合テストに以下を追加
  - **Mock Boundaries**: モック化する境界の明確化（例: child_process.spawnモック、IPC transportは実装使用）
  - **Verification Points**: 具体的な検証項目の列挙（例: gitViewStore.cachedStatus更新、エラーハンドリング）
  - **Design参照**: "Integration Test Strategy"セクションへの参照追加
- **Task 13.6追加**: Remote UI統合テスト（WebSocket経由のgit操作、File Watch over WebSocket）
- **Task 14.1-14.5追加**: E2E/UIテストセクション新設
  - 14.1: GitView初回表示テスト
  - 14.2: ファイル選択と差分表示テスト
  - 14.3: 差分モード切り替えテスト
  - 14.4: ファイル変更検知テスト
  - 14.5: ショートカットキーテスト
- **Coverage Matrix更新**: Task 7.1-7.4の行を分離、Task typeをInfrastructure/Featureで正確に区別

**Diff Summary**:
```diff
- 7.1 (P) 変更ファイルを階層的なツリー構造で表示するコンポーネントを実装する
-   - ディレクトリノード: 折りたたみ可能、子ノード数表示
-   - ファイルノード: ステータスアイコン、ファイル名表示
-   - ファイルノードクリック時に選択ファイルを設定
-   - ディレクトリノードクリック時に展開/折りたたみ状態をトグル
-   - ファイルリスト空時に"変更がありません"メッセージを表示
-   - スクロール可能な領域として実装
+ 7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
+   - 階層的なツリー構造レンダリング
+   - ディレクトリノード: 折りたたみ可能、子ノード数表示
+   - ファイルノード: ステータスアイコン、ファイル名表示
+   - スクロール可能な領域として実装
+ 7.2 (P Feature) ファイルノードクリック時の選択機能を実装する
+ 7.3 (P Feature) ディレクトリノードの展開/折りたたみ機能を実装する
+ 7.4 (P Feature) ファイルリスト空時のメッセージ表示を実装する
```

```diff
- 13.1 (P) Renderer → Main git:get-status IPC通信の統合テストを実装する
-   - リクエスト送信、レスポンス受信、Result型解析を検証
+ 13.1 (P) Renderer → Main git:get-status IPC通信の統合テストを実装する
+   - リクエスト送信、レスポンス受信、Result型解析を検証
+   - **Mock Boundaries**: child_process.spawnをモック化、IPC transportは実装使用
+   - **Verification Points**: gitViewStore.cachedStatusの値、Result<T, ApiError>型の正しい解析、エラーハンドリング
+   - _Integration Point: Design.md "Integration Test Strategy"セクション参照_
```

```diff
+ ## 14. E2E/UIテスト（Critical User Paths）
+ - [ ] 14.1 (P) GitView初回表示テストを実装する
+ - [ ] 14.2 (P) ファイル選択と差分表示テストを実装する
+ - [ ] 14.3 (P) 差分モード切り替えテストを実装する
+ - [ ] 14.4 (P) ファイル変更検知テストを実装する
+ - [ ] 14.5 (P) ショートカットキーテストを実装する
```

#### design.md

**Issue(s) Addressed**: W3

**Changes**:
- **既存ファイルの変更テーブル**: SpecPaneの変更内容記述を統一
  - 旧: `<ArtifactEditor />`を`<CenterPaneContainer />`で包む
  - 新: `<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え、CenterPaneContainer内部でArtifactEditorとGitViewを切り替える

**Diff Summary**:
```diff
- `<ArtifactEditor />`を`<CenterPaneContainer />`で包む
+ `<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え、CenterPaneContainer内部でArtifactEditorとGitViewを切り替える
```

---

_Fixes applied by document-review-reply command._
