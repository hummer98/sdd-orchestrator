# Requirements: Project Editor Dark Mode & UI統一

## Decision Log

### カラーモードの統一方針
- **Discussion**: システム準拠（auto）とダークモード固定（dark）の選択肢を検討
- **Conclusion**: `data-color-mode="dark"` 固定を採用
- **Rationale**: ArtifactEditorと完全に統一するため。将来的にシステム準拠に移行する場合は別Specで対応

### デフォルト表示モードの統一
- **Discussion**: ArtifactEditorとProjectFileEditor/RemoteProjectEditorでデフォルトモードが`edit`になっている
- **Conclusion**: 全エディタのデフォルトを`preview`（Markdown表示）に変更
- **Rationale**: ユーザーリクエスト。ドキュメント閲覧が主用途であり、プレビュー表示をデフォルトにする方が自然

### Remote UIへの適用
- **Discussion**: RemoteProjectEditorにも同様の変更を適用するか
- **Conclusion**: 適用する
- **Rationale**: UI/UXの一貫性を保つため。Remote UIも同じユーザー体験を提供すべき

## Introduction

ProjectファイルエディタのMarkdown表示をArtifactEditorと統一する機能改善。ダークモード対応、デフォルト表示モードの変更、編集/プレビュー切り替えUIの統一を行う。

## Requirements

### Requirement 1: カラーモードのダークモード固定

**Objective:** ユーザーとして、ProjectファイルエディタでもArtifactEditorと同じダークモード表示を使いたい

#### Acceptance Criteria
1. ProjectFileEditorの`data-color-mode`が`dark`に設定されていること
2. RemoteProjectEditorの`data-color-mode`が`dark`に設定されていること
3. MDEditorコンポーネントがダークモードで表示されること

### Requirement 2: デフォルト表示モードのpreview化

**Objective:** ユーザーとして、エディタを開いた時にMarkdownプレビュー表示をデフォルトで見たい

#### Acceptance Criteria
1. `editorStore.ts`の初期`mode`が`preview`であること
2. `projectEditorStore.ts`の初期`mode`が`preview`であること
3. ArtifactEditor、ProjectFileEditor、RemoteProjectEditorすべてでファイル読み込み時にプレビューモードで表示されること

### Requirement 3: 編集/プレビュー切り替えUIの統一

**Objective:** ユーザーとして、どのエディタでも同じUIで編集/プレビューを切り替えたい

#### Acceptance Criteria
1. ProjectFileEditorの切り替えUIがArtifactEditorと同じボタングループスタイルであること
   - 左ボタン: Edit（編集アイコン）
   - 右ボタン: Preview（目のアイコン）
   - 選択中のボタンが青色でハイライト
2. RemoteProjectEditorに編集/プレビュー切り替えUIが追加されること
3. 切り替えUIのスタイル（色、サイズ、配置）がArtifactEditorと一致すること

## Out of Scope

- システム設定に連動したカラーモード切り替え機能
- 検索機能（SearchBar）のProjectFileEditor/RemoteProjectEditorへの追加
- ツールバー表示/非表示の統一

## Open Questions

- なし（設計フェーズで詳細を決定）
