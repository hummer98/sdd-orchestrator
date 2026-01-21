# Implementation Plan

## タスク概要

プロジェクト選択インターフェース機能を実装する。プロジェクト未選択時にメイン領域に表示されるUIで、OS標準フォルダ選択ダイアログ、パス直接入力、最近開いたプロジェクトへのクイックアクセスの3つの方法でプロジェクトを開けるようにする。

---

## Tasks

- [x] 1. RecentProjectListコンポーネントの実装
- [x] 1.1 (P) 最近開いたプロジェクトをリスト表示するコンポーネントを作成
  - 最大6件の最近開いたプロジェクトを縦並びリストで表示
  - フォルダ名（最後のパスセグメント）とフルパスを表示
  - projectStore.recentProjectsを参照（読み取り専用）
  - 最近開いたプロジェクトが存在しない場合は非表示
  - クリック時にprojectStore.selectProject()を呼び出し
  - ダークモード対応のスタイリング（dark:プレフィックス使用）
  - Folderアイコン（Lucide React）を使用
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

- [x] 1.2 RecentProjectListの単体テストを作成
  - 最大6件が表示されることのテスト
  - プロジェクトなし時の非表示テスト
  - クリックでselectProjectが呼ばれるテスト
  - フォルダ名抽出のテスト
  - _Requirements: 3.1, 3.4_

- [x] 2. ProjectSelectionViewコンポーネントの実装
- [x] 2.1 プロジェクト選択UI全体を管理するコンポーネントを作成
  - タイトル/説明テキストの表示
  - 「フォルダを選択」ボタン（プライマリアクション、FolderOpenアイコン）
  - パス入力フィールド + 「開く」ボタン
  - RecentProjectListの統合
  - ローカルstate：inputPath（入力値）、isLoading（読み込み中）
  - projectStore.errorのエラー表示
  - Flexbox縦配置レイアウト
  - ダークモード対応スタイリング
  - _Requirements: 1.1, 2.1, 4.1, 4.2, 4.4_

- [x] 2.2 (P) フォルダ選択ダイアログ機能を実装
  - 「フォルダを選択」ボタンクリックでelectronAPI.showOpenDialog()呼び出し
  - フォルダ選択後にprojectStore.selectProject()でプロジェクトを開く
  - キャンセル時は何もしない（showOpenDialogのnull戻り値ハンドリング）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.3_

- [x] 2.3 (P) パス直接入力機能を実装
  - テキストフィールドでパス入力
  - 「開く」ボタンでprojectStore.selectProject()呼び出し
  - Enterキーで「開く」ボタンと同等動作（onKeyDownハンドラ）
  - 空入力時は「開く」ボタン無効化（disabled={!inputPath.trim()}）
  - 存在しないパスの場合はprojectStore.errorを表示
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2_

- [x] 2.4 エラーメッセージ表示を実装
  - projectStore.errorの状態をUIに反映
  - エラー表示後も入力フィールドは編集可能
  - ユーザーがパス修正後に再試行可能
  - RecentProjectListクリック時のエラー表示（存在しないパス）
  - _Requirements: 2.3, 3.6_

- [x] 2.5 ProjectSelectionViewの単体テストを作成
  - フォルダ選択ボタンクリックでshowOpenDialogが呼ばれるテスト
  - パス入力とEnterキーでselectProjectが呼ばれるテスト
  - 空入力時のボタン無効化テスト
  - エラー表示テスト
  - _Requirements: 1.1, 2.1, 2.3, 2.4, 2.5_

- [x] 3. App.tsxへの統合
- [x] 3.1 App.tsxにProjectSelectionViewを統合
  - プレースホルダーテキスト（「プロジェクトを選択してください」）をProjectSelectionViewに置換
  - currentProject === nullの条件分岐を維持
  - プロジェクト選択後は通常のアプリケーション画面を表示
  - _Requirements: 4.1, 4.3_

- [x] 3.2 コンポーネントのエクスポート設定
  - ProjectSelectionViewをcomponents/index.tsに追加
  - RecentProjectListをcomponents/index.tsに追加
  - _Requirements: 4.1_

- [x] 4. 既存RecentProjectsコンポーネントの廃止
- [x] 4.1 (P) RecentProjects.tsxを削除
  - ファイル削除：renderer/components/RecentProjects.tsx
  - 未使用のため、他ファイルへの影響なし
  - _Requirements: 6.1_

- [x] 4.2 (P) RecentProjects.test.tsxを削除
  - ファイル削除：renderer/components/RecentProjects.test.tsx
  - _Requirements: 6.2_

- [x] 4.3 components/index.tsからRecentProjectsのexportを削除
  - export { RecentProjects } from './RecentProjects' を削除
  - _Requirements: 6.3_

- [x] 5. 検証
- [x] 5.1 ビルドとテストの実行
  - npm run buildでビルド成功を確認
  - npm run typecheckで型エラーなしを確認
  - npm run testでテスト成功を確認
  - _Requirements: 6.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | フォルダを選択ボタンでダイアログ表示 | 2.1, 2.2, 2.5 | Feature |
| 1.2 | フォルダ選択でプロジェクトが開かれる | 2.2 | Feature |
| 1.3 | キャンセル時は何もしない | 2.2 | Feature |
| 1.4 | 有効なパスでプロジェクト読み込み | 2.2 | Feature |
| 2.1 | テキストフィールドでパス入力 | 2.1, 2.3, 2.5 | Feature |
| 2.2 | 開くボタンでプロジェクトが開かれる | 2.3 | Feature |
| 2.3 | 存在しないパスでエラー表示 | 2.3, 2.4, 2.5 | Feature |
| 2.4 | Enterキーで開くボタンと同等動作 | 2.3, 2.5 | Feature |
| 2.5 | 空入力時は開くボタン無効化 | 2.3, 2.5 | Feature |
| 3.1 | 最近のプロジェクトを縦並びリストで最大6件表示 | 1.1, 1.2 | Feature |
| 3.2 | フォルダ名とフルパス表示 | 1.1 | Feature |
| 3.3 | クリックでプロジェクトが開かれる | 1.1 | Feature |
| 3.4 | 最近のプロジェクトなしの場合は非表示 | 1.1, 1.2 | Feature |
| 3.5 | 最近開いた順で表示 | 1.1 | Feature |
| 3.6 | 存在しないパスはエラー表示 | 2.4 | Feature |
| 4.1 | プロジェクト未選択時のみメイン領域に表示 | 2.1, 3.1, 3.2 | Feature |
| 4.2 | UI要素の縦配置順序 | 2.1 | Feature |
| 4.3 | プロジェクト選択後は通常画面表示 | 3.1 | Feature |
| 4.4 | ダークモード対応スタイリング | 1.1, 2.1 | Feature |
| 5.1 | configStore.recentProjects機能を活用 | 1.1 | Feature |
| 5.2 | projectStore.selectProject()を使用 | 2.3 | Feature |
| 5.3 | electronAPI.showOpenDialogを使用 | 2.2 | Feature |
| 6.1 | RecentProjects.tsxを削除 | 4.1 | Infrastructure |
| 6.2 | RecentProjects.test.tsxを削除 | 4.2 | Infrastructure |
| 6.3 | components/index.tsからexport削除 | 4.3 | Infrastructure |
| 6.4 | 削除後もビルド・テスト正常 | 5.1 | Infrastructure |
