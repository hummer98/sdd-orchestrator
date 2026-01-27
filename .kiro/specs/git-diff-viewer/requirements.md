# Requirements: Git Diff Viewer

## Decision Log

### UI配置：ArtifactEditorとの切り替え方法
- **Discussion**: タブ形式とトグルボタンの2案を検討。タブ形式は拡張性があるが、ArtifactEditor内部のタブと二段になり混乱を招く懸念。
- **Conclusion**: セグメントボタン（Segmented Control）を採用。CenterPaneContainerレベルで「Artifacts | Git Diff」を排他的に切り替え。
- **Rationale**: ArtifactEditorの内部タブ（requirements/design/tasks）と視覚的に区別でき、UI階層が明確。2択の切り替えに最適。

### 差分表示の範囲
- **Discussion**: worktree使用時と通常ブランチ使用時で異なる差分表示が必要。
- **Conclusion**:
  - **worktree使用時**: `git diff <base-branch>...HEAD` で分岐元からの全変更（コミット済み + 未コミット + untracked）を表示
  - **通常ブランチ**: `git status` 相当（working directoryの変更のみ）を表示
- **Rationale**: worktreeではPull RequestのFiles表示と同様に「このブランチで何が変更されたか」を総合的に把握したい。通常ブランチでは分岐元が明確でないため、working directory変更に限定。

### MVP範囲：差分表示モード
- **Discussion**: unified diff（1カラム）とsplit view（2カラム）の切り替え機能をMVPに含めるか。
- **Conclusion**: MVP範囲に含める。
- **Rationale**: コードレビューや差分確認の際、split viewは視認性が高く、ユーザー体験に大きく影響する基本機能。

### 自動更新の実装方法
- **Discussion**: 手動更新のみか、File Watch自動監視か。
- **Conclusion**: File Watchで常時監視し、自動更新を実装。
- **Rationale**: 負荷が大きくない想定であり、ファイル変更を即座に反映することでユーザー体験が向上する。

### Remote UI対応
- **Discussion**: ブラウザアクセス版（Remote UI）でもGitViewを使えるようにするか。
- **Conclusion**: Remote UIにも対応する（WebSocketApiClient経由）。
- **Rationale**: Remote UIはモバイルやリモート環境での利用を想定しており、git差分確認はどの環境でも有用。技術的にも実現可能。

### レイアウト：ファイルツリーと差分ビューワー
- **Discussion**: ファイルツリーと差分ビューワーの配置方法。
- **Conclusion**: 左側にファイルツリー、右側に差分ビューワーを配置。両者の間にリサイズハンドルを設置。
- **Rationale**: 既存のSpecPane（AgentListPanel + WorkflowView）と同様のリサイズ可能レイアウトで統一感を持たせる。

### ショートカットキー
- **Discussion**: GitViewとArtifactEditorの切り替え操作性。
- **Conclusion**: `Ctrl+Shift+G` でトグル。
- **Rationale**: Gitを連想しやすく、既存ショートカット（Ctrl+F: 検索）と競合しない。

### 大量ファイル時の表示制限
- **Discussion**: 変更ファイルが100件以上ある場合、表示を制限するか。
- **Conclusion**: 全件表示、制限なし。
- **Rationale**: worktree環境では大量変更は想定しにくい。仮に発生してもスクロールで対応可能。

## Introduction

Git Diff Viewerは、worktreeまたは現在ブランチのgit差分をツリー構造で可視化し、シンタックスハイライト付き差分ビューワーでファイルの変更内容を確認できる機能。ArtifactEditorと並列に配置され、セグメントボタンで切り替え可能。Pull RequestのFiles表示に近い体験をElectronアプリ内で提供し、コードレビューや変更確認を効率化する。

## Requirements

### Requirement 1: Git差分データ取得（Main Process）

**Objective**: Main Processで安全にgit操作を実行し、差分情報をRendererに提供する。

#### Acceptance Criteria
1. When GitViewが初回表示される時、システムは以下を実行する:
   - worktree使用時: `git diff <base-branch>...HEAD --name-status` でファイル一覧とステータス（A/M/D）を取得
   - 通常ブランチ使用時: `git status --porcelain` でファイル一覧とステータス（??/M/D）を取得
2. When ファイル選択時、システムは `git diff <file-path>` で指定ファイルの差分を取得する。
3. If git コマンド実行が失敗した場合、システムはエラーメッセージを返す（例: "gitリポジトリでない", "gitコマンドが見つからない"）。
4. The system shall worktreeの分岐元ブランチを `git worktree list` + `.git/worktrees/{name}/HEAD` から自動検出する。
5. The system shall untracked files（`??` ステータス）も差分対象に含める（内容は全行追加として扱う）。

### Requirement 2: File Watch自動監視

**Objective**: ファイルシステムの変更を検知し、自動的にgit差分を再取得する。

#### Acceptance Criteria
1. When GitViewが表示されている時、システムはchokidarでプロジェクトディレクトリを監視する。
2. When ファイル変更/追加/削除イベントが発生した時、システムは差分情報を再取得してRendererに通知する。
3. The system shall 監視負荷を軽減するため、イベント発生から300ms以内の連続イベントはdebounce処理する。
4. When GitViewが非表示になった時、システムはFile Watch監視を停止する。

### Requirement 3: IPC通信層

**Objective**: Renderer ProcessからMain Processのgit操作を安全に呼び出す。

#### Acceptance Criteria
1. The system shall 以下のIPCチャンネルを提供する:
   - `git:get-status`: ファイル一覧とステータスを取得
   - `git:get-diff`: 指定ファイルの差分を取得
   - `git:watch-changes`: File Watch開始（差分変更時に `git:changes-detected` イベントをブロードキャスト）
   - `git:unwatch-changes`: File Watch停止
2. The system shall preload経由で型安全なAPIを `window.electronAPI.git.*` として公開する。
3. If Remote UI環境の場合、システムはWebSocketApiClient経由で同等の操作を提供する。

### Requirement 4: UI State管理（gitViewStore）

**Objective**: GitViewのUI状態をZustandで管理する（structure.mdのUI State原則に準拠）。

#### Acceptance Criteria
1. The system shall `renderer/stores/gitViewStore.ts` を作成し、以下の状態を保持する:
   - 選択中ファイルパス
   - ファイルツリーの展開状態（Map<dirPath, boolean>）
   - 差分表示モード（'unified' | 'split'）
   - リサイズハンドルの位置（ファイルツリー幅）
2. The system shall git差分データそのもの（ファイル一覧、差分内容）はMain Processから受け取ったキャッシュとして保持する（Domain StateはMainが管理）。

### Requirement 5: CenterPaneContainer実装

**Objective**: ArtifactEditorとGitViewを排他的に切り替えるコンテナを実装する。

#### Acceptance Criteria
1. The system shall `renderer/components/CenterPaneContainer.tsx` を作成し、以下を実装する:
   - セグメントボタン（"Artifacts" | "Git Diff"）による排他的切り替え
   - 選択状態に応じて `<ArtifactEditor />` または `<GitView />` を表示
2. The system shall セグメントボタンのデザインは既存のUI（mode toggle: Edit/Preview）と統一感を持たせる。
3. When `Ctrl+Shift+G` が押下された時、システムはArtifactsとGit Diffを切り替える。
4. The system shall 切り替え状態をlayoutStoreで永続化する。

### Requirement 6: GitView実装（ファイルツリー + 差分ビューワー）

**Objective**: git差分を可視化するメインUIコンポーネントを実装する。

#### Acceptance Criteria
1. The system shall `renderer/components/GitView.tsx` を作成し、以下の2カラムレイアウトを実装する:
   - 左側: `<GitFileTree />` （ファイルツリー）
   - 右側: `<GitDiffViewer />` （差分ビューワー）
   - 中央: `<ResizeHandle />` （既存コンポーネント再利用）
2. When GitViewが初回表示された時、システムは `window.electronAPI.git.getStatus()` を呼び出してファイル一覧を取得する。
3. When File Watch通知（`git:changes-detected`）を受信した時、システムはファイル一覧を再取得する。
4. If git操作が失敗した場合、システムはエラーメッセージを中央に表示する（例: "gitリポジトリでない"）。

### Requirement 7: GitFileTree実装（階層ファイルツリー）

**Objective**: 変更ファイルを階層的なツリー構造で表示する。

#### Acceptance Criteria
1. The system shall `renderer/components/GitFileTree.tsx` を作成し、以下を実装する:
   - ディレクトリノード: 折りたたみ可能、子ノード数表示
   - ファイルノード: ステータスアイコン（A: 緑+, M: 黄色●, D: 赤-）、ファイル名表示
2. When ファイルノードがクリックされた時、システムは `gitViewStore.setSelectedFile(path)` を呼び出す。
3. When ディレクトリノードがクリックされた時、システムは展開/折りたたみ状態をトグルする。
4. The system shall ファイルリストが空の場合、"変更がありません" と表示する。
5. The system shall スクロール可能な領域として実装する（大量ファイル対応）。

### Requirement 8: GitDiffViewer実装（差分表示）

**Objective**: シンタックスハイライト付きで差分を表示する。

#### Acceptance Criteria
1. The system shall `renderer/components/GitDiffViewer.tsx` を作成し、以下を実装する:
   - `react-diff-view` を使用したdiff表示
   - `prismjs` によるシンタックスハイライト
   - 差分表示モード切り替えボタン（unified/split）
2. When ファイルが選択された時、システムは `window.electronAPI.git.getDiff(filePath)` を呼び出して差分を取得する。
3. When 差分表示モードが切り替えられた時、システムは `gitViewStore.setDiffMode(mode)` を呼び出し、表示を更新する。
4. If 選択ファイルがuntracked（`??`）の場合、システムはファイル全体を「追加行」として表示する。
5. If 選択ファイルがバイナリの場合、システムは "バイナリファイルは表示できません" と表示する。
6. The system shall diff表示領域はスクロール可能とする。

### Requirement 9: SpecPaneへの統合

**Objective**: 既存のSpecPaneをCenterPaneContainerに置き換える。

#### Acceptance Criteria
1. The system shall `renderer/components/SpecPane.tsx` を以下のように変更する:
   - `<ArtifactEditor />` を `<CenterPaneContainer />` に置き換え
   - CenterPaneContainerは内部でArtifactEditorとGitViewを切り替える
2. The system shall 既存のレイアウト（RightPane: AgentListPanel + WorkflowView）は変更しない。
3. The system shall リサイズハンドルの位置状態管理を既存のlayoutStoreと統合する。

### Requirement 10: Remote UI対応

**Objective**: Remote UI環境でもGitViewを利用可能にする。

#### Acceptance Criteria
1. The system shall `shared/api/types.ts` にgit操作のAPI定義を追加する。
2. The system shall `WebSocketApiClient.ts` にgit操作のWebSocket実装を追加する。
3. The system shall GitView関連コンポーネントを `shared/components/git/` に配置し、Electron版とRemote UI版で共有する。
4. When Remote UI環境の場合、システムはWebSocketApiClient経由でMain Processのgit操作を呼び出す。

### Requirement 11: キーボードショートカット

**Objective**: キーボード操作でGitViewへの切り替えを効率化する。

#### Acceptance Criteria
1. When `Ctrl+Shift+G`（Mac: `Cmd+Shift+G`）が押下された時、システムはArtifactsとGit Diffを切り替える。
2. The system shall GitView内で以下のキーボード操作を提供する:
   - `↑/↓`: ファイルツリー内でファイル選択を移動
   - `Enter`: 選択ファイルの差分を表示
   - `Space`: ディレクトリの展開/折りたたみ

### Requirement 12: パフォーマンス最適化

**Objective**: 大量ファイル変更時もスムーズに動作させる。

#### Acceptance Criteria
1. The system shall ファイルツリーのレンダリングを仮想スクロール（または遅延レンダリング）で最適化する（ファイル数が100件を超える場合）。
2. The system shall File Watchのイベントを300ms debounceして、連続変更時のgit操作回数を削減する。
3. The system shall 差分取得は選択ファイルのみ行い、全ファイルの差分を先読みしない。

## Out of Scope

以下は今回のMVP範囲外とする:

- ファイルフィルタリング機能（拡張子、パス名で絞り込み）
- コミット間の差分比較（現状はHEADとの比較のみ）
- 差分から直接ファイル編集する機能
- 差分表示内での検索機能
- 変更行へのコメント機能
- Stageエリアへの追加/削除操作（`git add` / `git reset`）

## Open Questions

設計フェーズで検討すべき事項:

- **Q1**: `react-diff-view` と `prismjs` の依存関係バージョンはどのように選定するか？既存の `@uiw/react-md-editor` との競合はないか？
- **Q2**: Remote UI環境でのFile Watch実装方法は？（WebSocketでのストリーミング通知 vs ポーリング）
- **Q3**: worktree分岐元ブランチの検出ロジックはすべてのgit環境で動作するか？（古いgitバージョン、特殊なworktree構成）
- **Q4**: 仮想スクロールの実装には `react-window` や `react-virtual` を使用するか？それとも独自実装？
