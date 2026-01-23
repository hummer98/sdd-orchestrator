# Implementation Plan

## 1. useSubmitShortcutフック実装

- [x] 1.1 共通フック `useSubmitShortcut` を作成する
  - `onSubmit` コールバックと `disabled` フラグを受け取るインタフェースを定義
  - テキストエリア用の `onKeyDown` ハンドラを返す
  - Cmd+Enter（macOS）およびCtrl+Enter（Windows/Linux）の検出ロジックを実装
  - IME変換中（`isComposing`）の送信抑制を実装
  - disabled状態での送信抑制を実装
  - 単独Enterは改行として通過させる（送信しない）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 4.1, 4.2, 4.3_

- [x] 1.2 useSubmitShortcutフックのユニットテストを作成する
  - Cmd+Enterで送信コールバックが呼び出されることを検証
  - Ctrl+Enterで送信コールバックが呼び出されることを検証
  - IME変換中（isComposing=true）は送信されないことを検証
  - disabled=trueの場合は送信されないことを検証
  - 単独Enterでは送信されないことを検証
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

- [x] 1.3 shared/hooks/index.ts から useSubmitShortcut をエクスポートする
  - 既存のフックエクスポートパターンに従ってエクスポートを追加
  - _Requirements: 4.1_

## 2. ダイアログコンポーネントへの統合

- [x] 2.1 (P) AskAgentDialogにショートカットキー機能を統合する
  - useSubmitShortcutフックをインポート
  - フックにonSubmitコールバックとdisabled状態を渡す
  - テキストエリアにonKeyDownハンドラを設定
  - _Requirements: 2.1_

- [x] 2.2 (P) CreateSpecDialogにショートカットキー機能を統合する
  - useSubmitShortcutフックをインポート
  - フックにonSubmitコールバックとdisabled状態を渡す
  - テキストエリアにonKeyDownハンドラを設定
  - _Requirements: 2.2_

- [x] 2.3 (P) CreateBugDialogにショートカットキー機能を統合する
  - useSubmitShortcutフックをインポート
  - フックにonSubmitコールバックとdisabled状態を渡す
  - テキストエリアにonKeyDownハンドラを設定
  - _Requirements: 2.3_

- [x] 2.4 (P) CreateSpecDialogRemoteにショートカットキー機能を統合する
  - useSubmitShortcutフックをインポート
  - フックにonSubmitコールバックとdisabled状態を渡す
  - テキストエリアにonKeyDownハンドラを設定
  - _Requirements: 2.4_

- [x] 2.5 (P) CreateBugDialogRemoteにショートカットキー機能を統合する
  - useSubmitShortcutフックをインポート
  - フックにonSubmitコールバックとdisabled状態を渡す
  - テキストエリアにonKeyDownハンドラを設定
  - _Requirements: 2.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | macOSでCmd+Enterでフォーム送信 | 1.1, 1.2 | Feature |
| 1.2 | Windows/LinuxでCtrl+Enterで送信 | 1.1, 1.2 | Feature |
| 1.3 | Enterのみで改行挿入 | 1.1, 1.2 | Feature |
| 1.4 | disabled時はショートカット無視 | 1.1, 1.2 | Feature |
| 2.1 | AskAgentDialogでショートカット有効 | 2.1 | Feature |
| 2.2 | CreateSpecDialogでショートカット有効 | 2.2 | Feature |
| 2.3 | CreateBugDialogでショートカット有効 | 2.3 | Feature |
| 2.4 | CreateSpecDialogRemoteでショートカット有効 | 2.4 | Feature |
| 2.5 | CreateBugDialogRemoteでショートカット有効 | 2.5 | Feature |
| 3.1 | IME変換中はショートカット無視 | 1.1, 1.2 | Feature |
| 3.2 | IME確定後はショートカット有効 | 1.1, 1.2 | Feature |
| 4.1 | shared/hooksにフック配置 | 1.1, 1.3 | Infrastructure |
| 4.2 | フックが送信関数と無効状態を受け取る | 1.1 | Feature |
| 4.3 | フックがonKeyDownハンドラを返す | 1.1 | Feature |
