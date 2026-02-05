# Implementation Plan

## Overview

ProjectファイルエディタのUI/UXをArtifactEditorと統一する実装タスク。変更は主にUI属性変更とストア初期値の変更であり、小規模な修正の集合となる。

---

## Tasks

- [x] 1. ストア層のデフォルトモード変更
- [x] 1.1 (P) editorStoreの初期modeをpreviewに変更
  - ArtifactEditor用エディタ状態の初期値を`'edit'`から`'preview'`に変更
  - 既存の型定義・APIは維持
  - _Requirements: 2.1_

- [x] 1.2 (P) projectEditorStoreの初期modeをpreviewに変更
  - ProjectFileEditor/RemoteProjectEditor用エディタ状態の初期値を`'edit'`から`'preview'`に変更
  - 既存の型定義・APIは維持
  - _Requirements: 2.2_

- [x] 2. ProjectFileEditorのUI変更
- [x] 2.1 data-color-modeをdarkに変更
  - MDEditorコンポーネントのdata-color-mode属性を`"light"`から`"dark"`に変更
  - _Requirements: 1.1, 1.3_

- [x] 2.2 編集/プレビュー切り替えUIをボタングループスタイルに変更
  - 既存のシングルボタンをArtifactEditorと同じ2ボタン構成（Edit/Preview横並び）に置換
  - EditボタンにLucide Editアイコン、PreviewボタンにLucide Eyeアイコンを使用
  - 選択中のボタンを青色でハイライト（ArtifactEditorと同じスタイル）
  - clsx + Tailwindで条件付きスタイリングを実装
  - _Requirements: 3.1, 3.3_

- [x] 3. RemoteProjectEditorのUI変更
- [x] 3.1 data-color-modeをdarkに変更
  - MDEditorコンポーネントのdata-color-mode属性を`"auto"`から`"dark"`に変更
  - _Requirements: 1.2, 1.3_

- [x] 3.2 ストアのmodeを使用するように変更
  - 現在の`preview="edit"`固定をprojectEditorStoreの`mode`を参照するよう変更
  - _Requirements: 2.3_

- [x] 3.3 編集/プレビュー切り替えUIをヘッダーに追加
  - ArtifactEditorと同じボタングループ（Edit/Preview横並び）を追加
  - EditボタンにLucide Editアイコン、PreviewボタンにLucide Eyeアイコンを使用
  - 選択中のボタンを青色でハイライト
  - clsx + Tailwindで条件付きスタイリングを実装
  - _Requirements: 3.2, 3.3_

- [x] 4. テストの更新
- [x] 4.1 (P) editorStore.test.tsの期待値を更新
  - 初期modeが`'preview'`であることを検証するテストを更新
  - _Requirements: 2.1_

- [x] 4.2 (P) projectEditorStore.test.tsの期待値を更新
  - 初期modeが`'preview'`であることを検証するテストを更新
  - _Requirements: 2.2_

- [x] 4.3 ProjectFileEditor.test.tsxのUI変更に伴う更新
  - ボタングループUIの存在を検証
  - モード切り替え動作のテスト
  - _Requirements: 3.1, 3.3_

- [x] 4.4 RemoteProjectEditor.test.tsxに切り替えUIテストを追加
  - 切り替えUIの存在を検証
  - モード切り替え動作のテスト
  - _Requirements: 3.2, 3.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ProjectFileEditorのdata-color-modeがdark | 2.1 | Feature |
| 1.2 | RemoteProjectEditorのdata-color-modeがdark | 3.1 | Feature |
| 1.3 | MDEditorがダークモードで表示 | 2.1, 3.1 | Feature |
| 2.1 | editorStoreの初期modeがpreview | 1.1, 4.1 | Feature |
| 2.2 | projectEditorStoreの初期modeがpreview | 1.2, 4.2 | Feature |
| 2.3 | 全エディタでファイル読込時にプレビュー表示 | 1.1, 1.2, 3.2 | Feature |
| 3.1 | ProjectFileEditorの切り替えUIがボタングループスタイル | 2.2, 4.3 | Feature |
| 3.2 | RemoteProjectEditorに切り替えUI追加 | 3.3, 4.4 | Feature |
| 3.3 | 切り替えUIのスタイルがArtifactEditorと一致 | 2.2, 3.3, 4.3, 4.4 | Feature |
