# Implementation Plan

## Task 1: ProjectAgentFooterコンポーネント作成

- [x] 1.1 (P) ProjectAgentFooterコンポーネントを実装する
  - フッターエリアの基本構造を作成する
  - `p-4 border-t`スタイルで既存WorkflowFooterと同様の視覚デザインを適用する
  - `onRelease`と`isReleaseRunning`のpropsを受け取るインタフェースを定義する
  - lucide-reactの`Bot`アイコンと「release」テキストを含むボタンを配置する
  - ボタンに`flex-1`スタイルを適用して横幅いっぱいに広げる
  - ボタンクリック時に`onRelease`ハンドラを呼び出す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_
  - _Method: ProjectAgentFooterProps, Bot (lucide-react)_
  - _Verify: Grep "Bot" in ProjectAgentFooter.tsx_

- [x] 1.2 disabled状態とツールチップを実装する
  - `isReleaseRunning`がtrueの場合にボタンをdisabledにする
  - `currentProject`が未選択（null/undefined）の場合もボタンをdisabledにする
  - disabled状態の視覚的スタイルを適用する
  - disabled時にHTML標準の`title`属性で理由を表示（「release実行中」または「プロジェクト未選択」）
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: title属性, disabled props_
  - _Verify: Grep "disabled" in ProjectAgentFooter.tsx_

## Task 2: ProjectAgentPanelへの統合

- [x] 2.1 ProjectAgentPanelのレイアウト構造を更新する
  - ProjectAgentFooterをimportする
  - Agent Listに`flex-1 overflow-y-auto`を維持し、フッターを固定位置に配置する
  - Header / AgentList / Footerのflex構造でレイアウト分割する
  - Agent Listがスクロールしてもフッターは固定位置に表示されることを確認する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: flex-1 overflow-y-auto, shrink-0_
  - _Verify: Grep "ProjectAgentFooter" in ProjectAgentPanel.tsx_

- [x] 2.2 handleReleaseハンドラを実装する
  - `/release`をプロンプトとして`executeAskProject`を呼び出す
  - Agent起動後、`addAgent`でProject Agentとして追加する
  - `selectForProjectAgents`と`selectAgent`で選択状態を更新する
  - 成功時に`notify.success`でフィードバックを表示する
  - エラー時に`notify.error`で通知する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Method: executeAskProject, addAgent, selectForProjectAgents, selectAgent_
  - _Verify: Grep "executeAskProject.*release" in ProjectAgentPanel.tsx_

- [x] 2.3 isReleaseRunning状態の算出ロジックを実装する
  - Project Agentリストから`args?.includes('/release')`かつ`status === 'running'`のAgentを検出する
  - `getProjectAgents`セレクタを使用してAgentリストを取得する
  - 算出結果を`isReleaseRunning`としてProjectAgentFooterに渡す
  - _Requirements: 6.1, 6.2, 6.3_
  - _Method: getProjectAgents, isReleaseRunning算出ロジック_
  - _Verify: Grep "release" in ProjectAgentPanel.tsx_

## Task 3: 単体テストの実装

- [x] 3.1 (P) ProjectAgentFooterのユニットテストを作成する
  - ボタンのenabled/disabled状態のテスト
  - onReleaseハンドラ呼び出しのテスト
  - disabled時のtitle属性（ツールチップ）の存在確認
  - ボタンスタイル（flex-1、p-4 border-t）の確認
  - _Requirements: 1.1, 1.2, 2.3, 3.1, 3.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ProjectAgentFooter.tsxコンポーネント作成 | 1.1 | Feature |
| 1.2 | onRelease, isReleaseRunning props | 1.1 | Feature |
| 1.3 | p-4 border-tスタイル | 1.1 | Feature |
| 1.4 | WorkflowFooterと同様のデザイン | 1.1 | Feature |
| 2.1 | Botアイコンとreleaseテキスト | 1.1 | Feature |
| 2.2 | flex-1スタイル | 1.1 | Feature |
| 2.3 | onReleaseハンドラ呼び出し | 1.1, 3.1 | Feature |
| 2.4 | lucide-react Botアイコン | 1.1 | Feature |
| 3.1 | isReleaseRunning時のdisabled | 1.2, 3.1 | Feature |
| 3.2 | ツールチップで「release実行中」表示 | 1.2, 3.1 | Feature |
| 3.3 | disabled視覚スタイル | 1.2 | Feature |
| 4.1 | ProjectAgentPanelへのフッター配置 | 2.1 | Feature |
| 4.2 | 固定位置フッター | 2.1 | Feature |
| 4.3 | flex構造によるレイアウト分割 | 2.1 | Feature |
| 5.1 | handleReleaseハンドラ追加 | 2.2 | Feature |
| 5.2 | /releaseプロンプトでAsk Agent起動 | 2.2 | Feature |
| 5.3 | 既存Project Ask方式での起動 | 2.2 | Feature |
| 5.4 | Agent ListへのAgent表示 | 2.2 | Feature |
| 6.1 | 実行中Agentリストからrelease検出 | 2.3 | Feature |
| 6.2 | /releaseプロンプトAgentでisReleaseRunning=true | 2.3 | Feature |
| 6.3 | Agent List状態参照 | 2.3 | Feature |
