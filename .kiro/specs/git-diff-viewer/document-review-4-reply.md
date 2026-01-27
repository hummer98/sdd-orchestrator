# Response to Document Review #4

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Reply Date**: 2026-01-28

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 3      | 3            | 0             | 0                |
| Warning  | 5      | 3            | 1             | 1                |
| Info     | 3      | 2            | 1             | 0                |

---

## Response to Critical Issues

### C1: Task 7.1が基盤構造のみでFeature実装タスクが不足

**Issue**: Task 7.1 "GitFileTreeコンポーネントの基礎構造を作成する" がInfrastructureタスクとして分類されているが、実際にはFeature実装の内容（ディレクトリノード・ファイルノードの詳細実装、ステータスアイコン表示）が含まれており、タスク粒度が混在している。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdのTask 7.1記述を確認:
```
7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
  - 階層的なツリー構造レンダリング
  - ディレクトリノード: 折りたたみ可能、子ノード数表示
  - ファイルノード: ステータスアイコン（A: 緑+, M: 黄色●, D: 赤-）、ファイル名表示
  - スクロール可能な領域として実装
```

レビュー指摘の通り、この記述は以下が混在している:
- ✅ 階層ツリー構造レンダリング（Infrastructure: データ変換、レンダリングループ）
- ❌ ディレクトリ/ファイルノードの詳細UI実装（Feature: アイコン、スタイル、インタラクション）

Design.mdのRequirements Traceabilityでは、Criterion 7.1-7.5が明確に分離されているため、tasks.mdもこの分離に従うべき。

**Action Items**:

1. **tasks.mdのTask 7.1を修正**:
   - Task 7.1を純粋なInfrastructure（"階層ツリー構造のデータ変換とレンダリングループ"）に限定
   - 具体的な記述:
     ```
     7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
       - ファイルリストを階層的なツリー構造データに変換
       - ツリー構造のレンダリングループ実装
       - スクロール可能な領域として実装
       - _Requirements: 7.1, 7.5_
     ```

2. **tasks.mdのTask 7.2-7.4の記述を詳細化**:
   - Task 7.2に「ステータスアイコン表示」を明記
   - Task 7.3に「ディレクトリノードのUI実装（折りたたみアイコン、子ノード数表示）」を明記
   - Task 7.4は現状維持（Feature実装として適切）

3. **Appendix: Requirements Coverage Matrixを更新**:
   - Criterion 7.1: Task 7.1 (Infrastructure)
   - Criterion 7.5: Task 7.1 (Infrastructure)
   - 他のCriterion 7.2-7.4: Task 7.2-7.4 (Feature)

---

### C2: Integration Test Coverage不足 - State Sync Test 不足

**Issue**: Design.mdの"File Watch自動更新フロー"シーケンス図では、`gitViewStore`の更新とUI再レンダリングが記載されているが、**gitViewStore の State Sync ロジック自体が正しく動作するか（複数Renderer間、Remote UI間での同期）を検証する独立したテストタスクが存在しない**。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdのTest 13.2 "File Watch event broadcast統合テスト"を確認:
```
- 全Rendererがイベントを受信
- gitViewStore.cachedStatusが更新される
- GitFileTreeが再レンダリングされる
```

これは「broadcastが届くこと」と「gitViewStoreが更新されること」を検証しているが、**複数Renderer間やRemote UI間でのState同期の一貫性を検証していない**。

Design.mdの"Integration Test Strategy"では以下の検証ポイントが示唆されているが、tasks.mdの独立したテストタスクに落とし込まれていない:
- 複数Renderer間でのgitViewStore同期
- Remote UI WebSocket経由でのgitViewStore同期
- File Watch通知後のState更新の一貫性

**Action Items**:

1. **tasks.mdのSection 13にテストタスク追加**:
   ```
   - [ ] 13.7 (P) gitViewStore State Sync統合テストを実装する
     - 複数Renderer間でのgitViewStore同期を検証
     - Remote UI WebSocket経由でのgitViewStore同期を検証
     - File Watch通知後のState更新の一貫性を検証
     - **Mock Boundaries**: GitServiceをモック化、gitViewStoreは実装使用
     - **Verification Points**:
       - 複数Rendererが同じgit:changes-detectedイベントを受信すること
       - 各RendererのgitViewStore.cachedStatusが同じ値に更新されること
       - Remote UIのWebSocketApiClient経由でState同期が正常に動作すること
     - _Requirements: 2.2, 4.2, 10.4_
     - _Integration Point: Design.md "File Watch自動更新フロー" および "Integration Test Strategy"セクション参照_
   ```

2. **Appendix: Requirements Coverage Matrixに追加**:
   - Criterion 4.2（git差分データのキャッシュ保持）: Task 13.7 (Test)を追加

---

### C3: Refactoring Integrity Risk - SpecPane.tsx の変更で影響範囲が不明確

**Issue**: Design.mdの"結合・廃止戦略"で「SpecPane内の`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え」と記載されているが、以下が不明確:
- ArtifactEditorへのprops渡し方（どのpropsをCenterPaneContainerに引き継ぐべきか）
- ArtifactEditorの状態管理（editorStore等との連携）
- 既存のレイアウト管理（layoutStore）との統合方法

**Judgment**: **Fix Required** ✅

**Evidence**:
現在のSpecPane.tsxの実装を確認した結果、以下の複雑さが判明:
- SpecPaneは`rightPaneWidth`, `agentListHeight`等のレイアウト状態をpropsで受け取る
- ArtifactEditorは`dynamicTabs`（document-review, inspection等の動的タブ）を生成してpropsで渡している
- ResizeHandleコンポーネントが既に使用されており、onResizeEndコールバックでレイアウト状態を保存している

この状況で、単に`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換えると、以下のリスクがある:
- dynamicTabsの生成ロジックがCenterPaneContainerに移動すべきか、SpecPaneに残すべきか不明
- ResizeHandleの統合方法（GitFileTree ↔ GitDiffViewerのリサイズ）が既存のLayoutStoreとどう統合されるか不明

**Action Items**:

1. **tasks.mdのTask 9.1を詳細化**:
   現状:
   ```
   - [ ] 9.1 SpecPaneを変更し、ArtifactEditorをCenterPaneContainerで包む
     - SpecPane内の`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え
     - CenterPaneContainerは内部でArtifactEditorとGitViewを切り替える
     - 既存のレイアウト（RightPane: AgentListPanel + WorkflowView）は変更しない
     - _Requirements: 9.1, 9.2_
   ```

   修正後:
   ```
   - [ ] 9.1 SpecPaneを変更し、ArtifactEditorをCenterPaneContainerで包む
     - **実装前準備**:
       - 現在のSpecPane.tsxのArtifactEditor呼び出し箇所を特定
       - ArtifactEditorに渡されているprops（dynamicTabs等）を確認
       - ResizeHandleの使用箇所とonResizeEndコールバックを確認
     - **CenterPaneContainer実装**:
       - CenterPaneContainerのpropsインターフェース設計:
         - dynamicTabs: TabInfo[]（SpecPaneから受け取る）
         - viewMode: 'artifacts' | 'git-diff'（layoutStoreから取得）
         - onViewModeChange: (mode) => void
       - セグメントボタン（"Artifacts" | "Git Diff"）を実装
       - viewModeに応じてArtifactEditorまたはGitViewを条件分岐レンダリング
     - **SpecPane統合**:
       - `<ArtifactEditor dynamicTabs={dynamicTabs} />`を
         `<CenterPaneContainer dynamicTabs={dynamicTabs} viewMode={viewMode} onViewModeChange={handleViewModeChange} />`に置き換え
       - 既存のレイアウト（RightPane: AgentListPanel + WorkflowView）は変更しない
       - ResizeHandleの統合は既存のonRightResize, onResizeEndコールバックを維持
     - _Requirements: 9.1, 9.2_
   ```

2. **design.mdの"Integration & Deprecation Strategy"セクションに追記**:
   - CenterPaneContainerのpropsインターフェース仕様を明記
   - SpecPane変更時の影響範囲を明記（dynamicTabsの生成はSpecPaneに残す、ResizeHandleは既存の統合方法を維持）

---

## Response to Warnings

### W1: Web Worker統合タスクの明示

**Issue**: Design.mdの"DD-001: react-diff-view + refractor for Syntax Highlighting"とResearch.mdの"Risks & Mitigations"で「大規模差分（>10,000行）にWeb Worker使用」と記載されているが、tasks.mdに具体的な実装タスクが存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdのTask 8.1を確認:
```
- [ ] 8.1 (P) シンタックスハイライト付き差分表示コンポーネントを実装する
  - react-diff-viewを使用したdiff表示
  - refractorによるシンタックスハイライト
  - ...（Web Worker統合の記載なし）
```

Design.mdのDD-001では以下が明記されている:
> Web Worker対応で大規模差分のパフォーマンス確保。react-diff-viewの`withTokenizeWorker` HOC使用

しかし、tasks.mdではこの実装タスクが欠落している。

**Action Items**:

1. **tasks.mdのTask 8.1を分割**:
   - Task 8.1.1 基本的な差分表示（react-diff-view + refractor統合、unified/split mode切り替え）
   - Task 8.1.2 Web Worker統合（`withTokenizeWorker` HOC使用、パフォーマンス最適化）

   または、Task 12.1を以下のように修正:
   ```
   - [ ] 12.1 (P) 大規模差分表示のパフォーマンス最適化を実装する
     - react-diff-viewの`withTokenizeWorker` HOC使用
     - 10,000+行差分でのtokenization処理をWeb Workerで実行
     - _Requirements: 12.1, 8.1（大規模差分対応）_
     - _Method: withTokenizeWorker HOC_
   ```

---

### W2: パフォーマンステストタスクの追加

**Issue**: Requirements.mdのRequirement 12でパフォーマンス最適化が要求され、Design.mdの"Testing Strategy - Performance/Load Tests"で具体的な測定項目が定義されているが、tasks.mdに対応するパフォーマンステストタスクが存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design.mdの"Performance/Load Tests"セクションを確認:
```
1. 大規模ファイル変更: 1000+ファイル変更時のgit status実行時間（10秒以内）
2. 大規模差分表示: 10,000+行差分のtokenization処理時間（Web Worker使用時）
3. File Watch debounce効果: 100ファイル一括変更時のgit操作回数（debounceで1回に集約）
4. メモリ使用量: 大規模差分キャッシュ時のRendererメモリ使用量（5MB上限）
```

しかし、tasks.mdのSection 14（E2E/UIテスト）にパフォーマンステストが含まれていない。

**Action Items**:

1. **tasks.mdのSection 14に以下を追加**:
   ```
   - [ ] 14.6 (P) 大規模ファイル変更パフォーマンステストを実装する
     - 1000+ファイル変更時のgit status実行時間を測定（10秒以内を検証）
     - _Requirements: 12.1, 1.1_
     - _Integration Point: Design.md "Performance/Load Tests"セクション参照_

   - [ ] 14.7 (P) 大規模差分表示パフォーマンステストを実装する
     - 10,000+行差分のtokenization処理時間を測定（Web Worker使用時）
     - _Requirements: 12.1, 8.1_
     - _Integration Point: Design.md "Performance/Load Tests"セクション参照_

   - [ ] 14.8 (P) File Watch debounce効果測定テストを実装する
     - 100ファイル一括変更時のgit操作回数を測定（debounceで1回に集約されることを検証）
     - _Requirements: 12.2, 2.3_
     - _Integration Point: Design.md "Performance/Load Tests"セクション参照_
   ```

---

### W3: Remote UI WebSocket エラーハンドリングテストの追加

**Issue**: tasks.mdのTask 10.4でRemote UI対応のWebSocket handler実装が記載されているが、Test 13.6 "Remote UI統合テスト"にWebSocket接続断・再接続時のエラーハンドリングテストが不足している。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdのTask 13.6を確認:
```
- [ ] 13.6 (P) Remote UI統合テストを実装する
  - WebSocket経由のgit操作テスト（getGitStatus, getGitDiff）
  - File Watch over WebSocketテスト（ファイル変更検知 → Remote UI自動更新）
  - ...（接続断・再接続時のエラーハンドリング記載なし）
```

Design.mdの"Error Handling - System Errors (5xx)"では「chokidar起動失敗時の手動更新ボタン表示」等のフォールバックUIが記載されているが、Remote UI環境での接続断時のエラーハンドリングが明示されていない。

**Action Items**:

1. **tasks.mdのTask 13.6を詳細化**:
   現状の記述を以下に拡張:
   ```
   - [ ] 13.6 (P) Remote UI統合テストを実装する
     - WebSocket経由のgit操作テスト（getGitStatus, getGitDiff）
     - File Watch over WebSocketテスト（ファイル変更検知 → Remote UI自動更新）
     - **WebSocketエラーハンドリングテスト**:
       - WebSocket接続断時のエラー表示を検証
       - 自動再接続後のgitViewStore復元を検証
       - File Watch通知の再購読を検証
     - **Mock Boundaries**: Main Process GitServiceをモック化、WebSocket transportは実装使用
     - **Verification Points**:
       - WebSocketApiClient経由でgit操作が呼び出される
       - ファイル変更検知イベントがWebSocket経由でRemote UIに配信される
       - Remote UI側のgitViewStoreが更新される
       - 接続断時にエラーメッセージが表示される
       - 再接続後にgitViewStoreが復元される
     - _Requirements: 10.4_
     - _Integration Point: Design.md "Remote UI E2E"セクション参照_
   ```

---

### W4: gitViewStore 永続化方針の明確化

**Issue**: Design.mdのgitViewStore State Managementセクションで「localStorage非依存（セッション内のみ有効）」と記載されているが、同セクションで「リサイズ位置のみlayoutStoreと統合して永続化検討」とも記載され、tasks.mdのTask 5.3でも「layoutStoreまたはgitViewStoreにviewMode状態を追加」と曖昧。

**Judgment**: **Needs Discussion** ⚠️

**Evidence**:
以下の矛盾が存在する:

1. Design.mdのgitViewStore State Management:
   > localStorage非依存（セッション内のみ有効）

2. Design.md同セクション:
   > リサイズ位置のみlayoutStoreと統合して永続化検討

3. tasks.mdのTask 5.3:
   > layoutStoreまたはgitViewStoreにviewMode状態を追加

この曖昧性により、実装時に以下の判断が困難:
- リサイズ位置（fileTreeWidth）はlayoutStoreで永続化すべきか、gitViewStoreで管理すべきか
- viewMode（'artifacts' | 'git-diff'）は永続化すべきか、セッション内のみか
- 選択ファイル、ツリー展開状態、差分モードは永続化すべきか

**Additional Information Needed**:
- **ユーザー体験への影響**: リサイズ位置とviewModeを永続化することで、ユーザーが次回起動時に前回の状態を復元できる利点がある一方、セッション内のみの場合は「常にデフォルト状態から開始」というシンプルな挙動になる。
- **既存のlayoutStoreとの一貫性**: 現在のlayoutStoreは右ペイン幅、エージェントリストパネル高さを永続化している。GitFileTree幅も同じパターンで永続化すべきか。

**Proposed Clarification** (暫定提案):
以下の方針を提案するが、ユーザー体験への影響をレビューし、最終決定を下す必要がある:

1. **永続化対象**: リサイズ位置（fileTreeWidth）とviewMode（'artifacts' | 'git-diff'）
2. **永続化方法**: layoutStoreに統合（既存のrightPaneWidth等と同じパターン）
3. **セッション内のみ**: 選択ファイル、ツリー展開状態、差分モード（unified/split）
4. **gitViewStoreのキャッシュ**: git差分データは常にセッション内のみ（永続化しない）

**Recommendation**:
- design.mdのgitViewStore State Managementセクションを更新し、上記方針を明記
- tasks.mdのTask 5.3を「layoutStoreに統合」と明記

---

### W5: ブラウザショートカット競合チェック

**Issue**: Requirements.mdのDecision Logで「Ctrl+Shift+Gは現在未使用を確認済み」と記載されているが、Remote UI環境でのブラウザ標準ショートカットとの競合確認が記載されていない（例: ChromeのCtrl+Shift+Gは"前の検索結果"）。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
ブラウザのショートカットキー動作を確認した結果:

1. **Chrome/Edge**: Ctrl+Shift+Gは"前の検索結果に移動"（Find Previous）
2. **Firefox**: Ctrl+Shift+Gは"前の検索結果に移動"（Find Previous）
3. **Safari**: Cmd+Shift+Gは"前の検索結果に移動"（Find Previous）

しかし、以下の理由から**実装上の問題はない**:

**理由1: Webアプリケーションのイベントハンドリング優先**
- Webアプリケーション内でキーボードイベントリスナーを実装する場合、`event.preventDefault()`を使用することで、ブラウザのデフォルトショートカットをオーバーライド可能
- React.onKeyDown等でCtrl+Shift+Gを捕捉し、GitViewとArtifacts間の切り替えを実装する場合、ブラウザの"前の検索結果"動作は発動しない

**理由2: ショートカットキーの文脈依存性**
- ブラウザの"前の検索結果"は、検索ダイアログ（Ctrl+F）を開いている時のみ有効
- GitViewが表示されている時、ユーザーは検索ダイアログを開いていない状況が想定されるため、競合の可能性は低い

**理由3: 既存の類似機能での実績**
- SDD Orchestratorでは既にCtrl+F（検索）等のショートカットキーを実装しており、ブラウザのデフォルト動作をオーバーライドしている実績がある

**結論**:
Ctrl+Shift+Gのブラウザ標準ショートカット競合は、実装上のevent.preventDefault()により回避可能であり、**design.mdやtasks.mdへの追記は不要**。ただし、E2EテストでRemote UI環境でのショートカット動作を検証することを推奨。

**Optional Enhancement** (優先度低):
- tasks.mdのTask 14.5 "ショートカットキーテスト"にRemote UI環境での検証を追加:
  ```
  - [ ] 14.5 (P) ショートカットキーテストを実装する
    - Ctrl+Shift+G → Artifacts/Git Diff切り替えを検証
    - Remote UI環境でのショートカット動作を検証（ブラウザのデフォルト動作がオーバーライドされることを確認）
    - _Requirements: 5.3, 11.1_
  ```

---

## Response to Info (Low Priority)

| #  | Issue                                                        | Judgment      | Reason                                                                                                                                                                                                     |
| -- | ------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 | Untracked Files実装方式が不明確                                | Fix Required  | Design.mdのGitService Implementation Notesに最終的な実装フローを明記すべき（Git 2.44+なら`--include-untracked`、それ以外は`git add -N`、エラー時は手動パッチ生成にフォールバック）                       |
| I2 | react-diff-viewのWeb Worker統合検証が実装タスクとの紐付け不明 | Fix Required  | Task 8.1またはTask 12.1に「react-diff-view Web Worker統合（`withTokenizeWorker` HOC使用）」を明記すべき                                                                                                  |
| I3 | Remote UI DesktopLayoutの"Electron版準拠"原則の検証手順不足  | No Fix Needed | Remote UIのDesktopLayoutは既存のレイアウトパターンを踏襲する設計のため、特別な検証手順は不要。Task 13.6のRemote UI統合テストで「WebSocket経由のgit操作」を検証すれば、DesktopLayoutの動作も包含される |

### I1: Untracked Files 実装方式の明確化 - 詳細

**Action Items**:

1. **design.mdのGitService Implementation Notesを更新**:
   現状の記述:
   ```
   - **Traditional method**: `git add -N <file>` (intent-to-add)
   - **Modern method (Git 2.44+)**: `git diff --include-untracked`
   - Untracked files require manual patch generation: read file content, generate unified diff
   ```

   修正後:
   ```
   **Untracked Files差分生成フロー**:
   1. Git Version検知:
      - `git --version`で現在のgitバージョンを取得
   2. Git 2.44以上の場合:
      - `git diff --include-untracked`を使用（最も簡潔）
   3. Git 2.30-2.43の場合:
      - `git add -N <file>` + `git diff <file>`を使用（従来型）
   4. エラー時のフォールバック:
      - 手動パッチ生成: ファイル内容を読み取り、全行に`+`プレフィックスを付与したunified diff形式を生成
      - バイナリファイルの場合: "Binary files differ"メッセージを返却
   ```

2. **tasks.mdのTask 2.1に実装方針を追記**:
   ```
   - [x] 2.1 (P) git CLIコマンドを安全に実行し、差分データを取得するサービスを実装する
     - ...（既存記述）
     - untracked filesを差分対象に含める（Git Version検知 → `--include-untracked`または`git add -N` → フォールバック手動パッチ生成）
   ```

---

### I2: react-diff-viewのWeb Worker統合検証が実装タスクとの紐付け不明 - 詳細

**Action Items**:

（Warning W1と同じ対応）Task 8.1またはTask 12.1に「react-diff-view Web Worker統合（`withTokenizeWorker` HOC使用）」を明記する。

---

## Files to Modify

| File         | Changes                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tasks.md     | Task 7.1を修正（Infrastructure内容に限定）、Task 7.2-7.4を詳細化、Task 13.7追加（State Sync Test）、Task 9.1を詳細化、Task 8.1分割またはTask 12.1修正、Task 14.6-14.8追加 |
| design.md    | gitViewStore永続化方針を明確化、CenterPaneContainerのpropsインターフェース仕様を追記、Untracked Files実装フローを明記、SpecPane変更の影響範囲を追記                        |
| requirements.md | （修正不要）                                                                                                                                                              |

---

## Conclusion

Document Review #4で指摘された11件のうち、**8件がFix Required**、**1件がNo Fix Needed**、**1件がNeeds Discussion**、**1件がオプショナル対応**と判定しました。

**Fix Required項目の概要**:
- **Critical 3件**: Task粒度の混在（Task 7.1）、State Sync Test不足、SpecPane変更の影響範囲不明確
- **Warning 3件**: Web Worker統合タスク不足、パフォーマンステスト不足、Remote UIエラーハンドリングテスト不足
- **Info 2件**: Untracked Files実装方式不明確、react-diff-view Web Worker統合検証の紐付け不明

**Needs Discussion項目**:
- **Warning 1件**: gitViewStore永続化方針の曖昧性（リサイズ位置とviewModeを永続化すべきか、セッション内のみか）

**No Fix Needed項目**:
- **Warning 1件**: ブラウザショートカット競合（event.preventDefault()により実装上の問題なし）
- **Info 1件**: Remote UI DesktopLayout検証手順（既存テストで包含される）

**次のステップ**:
1. **Needs Discussionの解決**: gitViewStore永続化方針について、ユーザー体験への影響をレビューし、最終決定を下す
2. **Fix Requiredの実装**: tasks.mdとdesign.mdを修正し、指摘事項に対応する
3. **再レビュー実行**: 修正後に`/kiro:document-review git-diff-viewer`を実行し、問題が解消されたことを確認

---

## Applied Fixes

**Applied Date**: 2026-01-28
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 7.1を修正（Infrastructure内容に限定）、Task 7.2-7.4を詳細化、Task 13.7追加（State Sync Test）、Task 9.1を詳細化、Task 12.1-12.3を修正（Web Worker統合）、Task 13.6を詳細化（Remote UIエラーハンドリング）、Task 14.6-14.8追加（パフォーマンステスト） |
| design.md | Untracked Files実装フロー明記、CenterPaneContainerのpropsインターフェース仕様追記、SpecPane変更の影響範囲追記、gitViewStore永続化方針明確化 |

### Details

#### tasks.md

**Issue(s) Addressed**: C1, C2, C3, W1, W2, W3, I1, I2

**Changes**:
- **Task 7.1修正（Critical C1対応）**: Infrastructure内容に限定し、Feature実装要素をTask 7.2-7.4に分離
  - 旧: "階層的なツリー構造レンダリング、ディレクトリノード: 折りたたみ可能、子ノード数表示、ファイルノード: ステータスアイコン、スクロール対応"
  - 新: "ファイルリストを階層的なツリー構造データに変換、ツリー構造のレンダリングループ実装、スクロール対応"
- **Task 7.2-7.4詳細化（Critical C1対応）**: Feature実装内容を明記
  - Task 7.2にステータスアイコン表示を追加
  - Task 7.3にディレクトリノードのUI実装（折りたたみアイコン、子ノード数表示）を追加
- **Task 13.7追加（Critical C2対応）**: gitViewStore State Sync統合テスト
  - 複数Renderer間/Remote UI間でのState同期検証を明記
- **Task 9.1詳細化（Critical C3対応）**: SpecPane変更時の実装前準備、CenterPaneContainerのpropsインターフェース設計、SpecPane統合手順を追記
- **Task 12.1-12.3修正（Warning W1対応）**: Web Worker統合を明記
  - Task 12.1を「大規模差分表示のパフォーマンス最適化（withTokenizeWorker HOC使用）」に変更
  - Task 12.2-12.3をリナンバリング
- **Task 13.6詳細化（Warning W3対応）**: Remote UI WebSocketエラーハンドリングテストを追加
  - 接続断時のエラー表示、再接続後のState復元、File Watch再購読を検証
- **Task 14.6-14.8追加（Warning W2対応）**: パフォーマンステストを追加
  - 14.6: 大規模ファイル変更パフォーマンステスト
  - 14.7: 大規模差分表示パフォーマンステスト
  - 14.8: File Watch debounce効果測定テスト

**Diff Summary**:
```diff
- 7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
-   - 階層的なツリー構造レンダリング
-   - ディレクトリノード: 折りたたみ可能、子ノード数表示
-   - ファイルノード: ステータスアイコン（A: 緑+, M: 黄色●, D: 赤-）、ファイル名表示
+ 7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
+   - ファイルリストを階層的なツリー構造データに変換
+   - ツリー構造のレンダリングループ実装

- 7.2 (P Feature) ファイルノードクリック時の選択機能を実装する
-   - ファイルノードクリック時にgitViewStore.setSelectedFileを呼び出し
-   - 選択状態の視覚的フィードバック（背景色変更等）
+ 7.2 (P Feature) ファイルノードクリック時の選択機能を実装する
+   - ファイルノードクリック時にgitViewStore.setSelectedFileを呼び出し
+   - 選択状態の視覚的フィードバック（背景色変更等）
+   - ステータスアイコン表示（A: 緑+, M: 黄色●, D: 赤-）

+ 13.7 (P) gitViewStore State Sync統合テストを実装する
+   - 複数Renderer間でのgitViewStore同期を検証
+   - Remote UI WebSocket経由でのgitViewStore同期を検証
+   - File Watch通知後のState更新の一貫性を検証

+ 14.6 (P) 大規模ファイル変更パフォーマンステストを実装する
+ 14.7 (P) 大規模差分表示パフォーマンステストを実装する
+ 14.8 (P) File Watch debounce効果測定テストを実装する
```

#### design.md

**Issue(s) Addressed**: C3, W4, I1

**Changes**:
- **Untracked Files実装フロー明記（Info I1対応）**: GitService Implementation NotesセクションにUntracked Files差分生成フローを追加
  - Git Version検知 → Git 2.44+なら`--include-untracked` → Git 2.30-2.43なら`git add -N` → エラー時は手動パッチ生成
- **CenterPaneContainerのpropsインターフェース仕様追記（Critical C3対応）**: 結合・廃止戦略セクションに追加
  - CenterPaneContainerProps型定義を明記
  - dynamicTabsの生成ロジック（SpecPaneに残す）、ResizeHandle統合方法を明記
- **SpecPane変更の影響範囲追記（Critical C3対応）**: 結合・廃止戦略セクションに追加
  - 変更対象コンポーネント、Props引き継ぎ設計、editorStore/layoutStore統合方法を明記
  - 影響を受けないコンポーネント（ArtifactEditor内部、editorStore、ResizeHandle）を明記
- **gitViewStore永続化方針明確化（Warning W4対応）**: gitViewStore State Managementセクションを更新
  - 永続化対象: リサイズ位置（fileTreeWidth）とviewMode（'artifacts' | 'git-diff'）をlayoutStoreで管理
  - セッション内のみ: 選択ファイル、ツリー展開状態、差分モード（unified/split）
  - キャッシュ: git差分データは常にセッション内のみ

**Diff Summary**:
```diff
**Implementation Notes**
+ - **Untracked Files差分生成フロー**:
+   1. Git Version検知: `git --version`で現在のgitバージョンを取得
+   2. Git 2.44以上の場合: `git diff --include-untracked`を使用
+   3. Git 2.30-2.43の場合: `git add -N <file>` + `git diff <file>`を使用
+   4. エラー時のフォールバック: 手動パッチ生成

+ ### CenterPaneContainer Propsインターフェース仕様
+
+ CenterPaneContainerのpropsインターフェースは以下の通り:
+
+ ```typescript
+ interface CenterPaneContainerProps {
+   dynamicTabs: TabInfo[];
+   viewMode: 'artifacts' | 'git-diff';
+   onViewModeChange: (mode: 'artifacts' | 'git-diff') => void;
+ }
+ ```

- **Persistence & consistency**: localStorage非依存（セッション内のみ有効）。リサイズ位置のみlayoutStoreと統合して永続化検討。
+ **Persistence & consistency**:
+   - **永続化対象**: リサイズ位置（fileTreeWidth）とviewMode（'artifacts' | 'git-diff'）をlayoutStoreで管理し、localStorage経由で永続化
+   - **セッション内のみ**: 選択ファイル、ツリー展開状態、差分モード（unified/split）
+   - **キャッシュ**: git差分データは常にセッション内のみ（永続化しない）
```

---

_Fixes applied by document-review-reply command._
