# Implementation Plan

## Tasks

- [x] 1. layoutConfigServiceにglobalAgentPanelHeightを追加
- [x] 1.1 (P) LayoutValuesスキーマとデフォルト値を拡張する
  - globalAgentPanelHeightプロパティをZodスキーマに追加（後方互換のためoptional）
  - DEFAULT_LAYOUTに初期値120を追加
  - 既存の設定ファイルからの読み込み時、プロパティが存在しない場合はデフォルト値にフォールバック
  - _Requirements: 4.3, 5.1, 5.2_

- [x] 2. GlobalAgentPanelを常時表示化する
- [x] 2.1 (P) 0件時のreturn null削除と空状態メッセージ表示を実装する
  - globalAgents.length === 0時のreturn nullを削除
  - 0件時に「グローバルエージェントなし」メッセージを表示
  - 1件以上の場合は既存のエージェントリストを表示
  - 折りたたみ状態との共存を維持（折りたたみ時は空状態メッセージも非表示）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 3. App.tsxにグローバルエージェント欄のリサイズ機能を統合する
- [x] 3.1 globalAgentPanelHeight状態と定数を追加する
  - GLOBAL_AGENT_PANEL_MIN（80px）、GLOBAL_AGENT_PANEL_MAX（300px）定数を定義
  - DEFAULT_LAYOUTにglobalAgentPanelHeight（120px）を追加
  - useState hookでglobalAgentPanelHeight状態を管理
  - Task 1.1完了後に実施
  - _Requirements: 3.3, 3.4_

- [x] 3.2 リサイズハンドラーとResizeHandleを配置する
  - handleGlobalAgentPanelResizeコールバックを実装（上方向リサイズ、min/max制限付き）
  - 左サイドバー内のGlobalAgentPanel上部にResizeHandle（vertical）を配置
  - GlobalAgentPanelをheightスタイル付きdivでラップ
  - リサイズ終了時にsaveLayout呼び出し
  - _Requirements: 3.1, 3.2_

- [x] 3.3 レイアウト保存・復元・リセット機能を拡張する
  - saveLayout関数にglobalAgentPanelHeightを追加
  - loadLayout関数でglobalAgentPanelHeightを復元（存在しない場合はデフォルト値）
  - resetLayout関数でglobalAgentPanelHeightをデフォルト値にリセット
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.3_

- [x] 4. 動作確認とテストを実施する
- [x] 4.1 手動動作確認を行う
  - 0件時にパネルが表示され空状態メッセージが表示されることを確認
  - リサイズハンドルでパネル高さが変更できることを確認
  - アプリ再起動後にリサイズ位置が復元されることを確認
  - レイアウトリセットでデフォルトサイズに戻ることを確認
  - _Requirements: 1.1, 1.2, 2.1, 3.2, 4.1, 4.2, 4.5_

- [x]* 4.2 ユニットテストを追加する
  - GlobalAgentPanel: 0件時の空状態メッセージ表示、1件以上でリスト表示
  - layoutConfigService: globalAgentPanelHeightあり/なしの設定読み込み
  - 後方互換性テスト（古い設定ファイル形式）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.3_

- [x] 4.3 E2Eテストを追加する
  - GlobalAgentPanelが常に表示される（0件時も）ことを確認
  - リサイズハンドルのドラッグでパネル高さが変更されることを確認
  - アプリ再起動後にリサイズ位置が復元されることを確認
  - layout-persistence.e2e.spec.ts にテストケースを追加
  - _Requirements: 1.1, 3.2, 4.2_

## Notes

- Task 1.1とTask 2.1は並列実行可能（異なるファイルを変更するため）
- Task 3.xはTask 1.1完了後に実施（layoutConfigServiceの型定義に依存）
- Task 4は全実装完了後に実施
