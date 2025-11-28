# Implementation Plan

## Phase 1: 既存機能（完了済み）

- [x] 1. Electronプロジェクト基盤構築
- [x] 2. IPC通信基盤の実装
- [x] 3. FileService実装
- [x] 4. CommandService実装（単一プロセス版）
- [x] 5. ConfigStore実装
- [x] 6. アプリケーションメニュー実装
- [x] 7. Zustand状態管理Store実装
- [x] 8-15. UIコンポーネント実装
- [x] 16. クロスプラットフォームビルド設定
- [x] 17-18. ユニットテスト・統合テスト

## Phase 2: Orchestrator/Spec Manager/SDD Agent構造への拡張

### 19. アプリ名変更とリファクタリング
- [x] 19.1 (T) パッケージ名・タイトル変更
  - package.json の name を "sdd-orchestrator" に変更
  - BrowserWindow タイトルを "SDD Orchestrator" に変更
  - ドキュメント・コメントの更新
  - _Requirements: 14.1_

### 20. AgentRegistry実装
- [x] 20.1 (T) AgentRegistry基本実装
  - テスト: register/unregister/get/getBySpec
  - 実装: Map<agentId, AgentInfo> による状態管理
  - _Requirements: 5.1, 5.2_

- [x] 20.2 (T) AgentRegistry状態更新機能
  - テスト: updateStatus/updateActivity
  - 実装: 状態遷移ロジック（running→completed/interrupted/hang/failed）
  - _Requirements: 5.2_

- [x] 20.3 (T) hang検出機能
  - テスト: checkHangAgents（閾値超過判定）
  - 実装: lastActivityAt と現在時刻の比較
  - _Requirements: 5.3, 5.4_

### 21. AgentProcess実装
- [x] 21.1 (T) AgentProcess基本実装
  - テスト: spawn/pid取得/kill
  - 実装: child_process.spawn ラッパー
  - _Requirements: 5.1_

- [x] 21.2 (T) stdout/stderrストリーミング
  - テスト: onOutput イベント発火
  - 実装: stdout.on('data') / stderr.on('data') ハンドリング
  - _Requirements: 9.1, 9.4_

- [x] 21.3 (T) stdin転送機能
  - テスト: writeStdin でプロセスに入力転送
  - 実装: process.stdin.write
  - _Requirements: 10.1, 10.2_

- [x] 21.4 (T) exit イベントハンドリング
  - テスト: onExit イベント発火、終了コード取得
  - 実装: process.on('close') / process.on('error')
  - _Requirements: 9.6_

### 22. PIDファイル管理実装
- [x] 22.1 (T) PIDファイル書き込み
  - テスト: writePidFile で .kiro/runtime/agents/{specId}/{agentId}.json 作成
  - 実装: fs.writeFile + JSON.stringify
  - _Requirements: 5.5_

- [x] 22.2 (T) PIDファイル読み込み
  - テスト: readPidFile / readAllPidFiles
  - 実装: fs.readFile + JSON.parse、ディレクトリ走査
  - _Requirements: 5.6_

- [x] 22.3 (T) PIDファイル更新
  - テスト: updatePidFile（status/lastActivityAt更新）
  - 実装: 読み込み→変更→書き込みのアトミック処理
  - _Requirements: 5.5, 5.6_

- [x] 22.4 (T) プロセス生存確認
  - テスト: checkProcessAlive（PIDからプロセス存在確認）
  - 実装: process.kill(pid, 0) でシグナル送信テスト
  - _Requirements: 5.6, 5.7_

### 23. ログファイル管理実装
- [x] 23.1 (T) ログファイル書き込み
  - テスト: appendLog で .kiro/runtime/logs/{specId}/{agentId}.log 追記
  - 実装: fs.appendFile + JSONL形式
  - _Requirements: 9.3_

- [x] 23.2 (T) ログファイル読み込み
  - テスト: readLog でログファイル読み込み・パース
  - 実装: fs.readFile + JSONL パース
  - _Requirements: 9.3_

### 24. SpecManagerService実装
- [x] 24.1 (T) Agent起動機能
  - テスト: startAgent で AgentProcess 生成、AgentRegistry 登録
  - 実装: generateAgentId、spawn、PIDファイル作成
  - _Requirements: 5.1, 6.1_

- [x] 24.2 (T) Agent停止機能
  - テスト: stopAgent で プロセスkill、状態更新
  - 実装: AgentProcess.kill、AgentRegistry.updateStatus
  - _Requirements: 5.1_

- [x] 24.3 (T) セッション復元機能
  - テスト: restoreAgents でPIDファイルから状態復元
  - 実装: readAllPidFiles → checkProcessAlive → register
  - _Requirements: 5.6, 5.7_

- [x] 24.4 (T) セッション再開機能
  - テスト: resumeAgent で claude --resume {sessionId} 実行
  - 実装: 新AgentProcess生成、PIDファイル更新
  - _Requirements: 5.8_

- [x] 24.5 (T) stdin転送機能
  - テスト: sendInput で該当Agentにstdin転送
  - 実装: AgentRegistry.get → AgentProcess.writeStdin
  - _Requirements: 10.1, 10.2_

- [x] 24.6 (T) 実行グループ排他制御
  - テスト: validate実行中にimpl起動ブロック、逆も同様
  - 実装: 現在実行中グループの判定、グループ単位のロック
  - _Requirements: 6.5_

### 25. Hang検出タイマー実装
- [x] 25.1 (T) 定期チェックタイマー
  - テスト: setInterval でhang検出、イベント発火
  - 実装: AgentRegistry.checkHangAgents → status更新 → IPC送信
  - _Requirements: 5.3_

### 26. ConfigStore拡張
- [x] 26.1 (T) hangThreshold設定
  - テスト: getHangThreshold/setHangThreshold
  - 実装: electron-store スキーマ拡張、デフォルト5分
  - _Requirements: 5.4, 13.1, 13.2_

### 27. IPCチャネル追加
- [x] 27.1 IPC Agent管理チャネル実装
  - チャネル: start-agent, stop-agent, resume-agent, get-agents, send-agent-input
  - ハンドラー: SpecManagerService メソッド呼び出し
  - _Requirements: 5.1-5.8, 10.1-10.3_

- [x] 27.2 IPC Agent イベントチャネル実装
  - チャネル: agent-output, agent-status-change
  - イベント送信: webContents.send
  - _Requirements: 9.1-9.10_

- [x] 27.3 IPC 設定チャネル拡張
  - チャネル: get-hang-threshold, set-hang-threshold
  - _Requirements: 13.1, 13.2_

### 28. Preload API拡張
- [x] 28.1 Agent管理API公開
  - startAgent, stopAgent, resumeAgent, getAgents, getAllAgents, sendAgentInput
  - onAgentOutput, onAgentStatusChange
  - _Requirements: 5.1-5.8, 9.1-9.10, 10.1-10.3_

- [x] 28.2 設定API拡張
  - getHangThreshold, setHangThreshold
  - _Requirements: 13.1, 13.2_

### 29. useAgentStore実装
- [x] 29.1 (T) Agent状態管理
  - テスト: agents Map、selectedAgentId、isLoading
  - 実装: zustand store with Map<string, AgentInfo[]>
  - _Requirements: 5.1, 5.2_

- [x] 29.2 (T) Agent操作アクション
  - テスト: loadAgents, selectAgent, startAgent, stopAgent, resumeAgent
  - 実装: ElectronAPI呼び出し、状態更新
  - _Requirements: 5.1-5.8_

- [x] 29.3 (T) ログ管理
  - テスト: logs Map、appendLog、clearLogs
  - 実装: agentId -> LogEntry[] マッピング
  - _Requirements: 9.1-9.10_

- [x] 29.4 (T) イベントリスナー設定
  - テスト: onAgentOutput/onAgentStatusChange でstore更新
  - 実装: useEffect での listener 登録・解除
  - _Requirements: 9.1, 5.2_

### 30. AgentListPanel実装
- [x] 30.1 Agent一覧UI
  - Spec選択時にAgent一覧表示
  - 各Agentの状態（running/completed/interrupted/hang）バッジ
  - Agent選択でログパネル切り替え
  - _Requirements: 5.1, 5.2_

- [x] 30.2 「続けて」ボタン
  - interrupted状態のAgentに表示
  - クリックで resumeAgent 呼び出し
  - _Requirements: 5.7, 5.8_

- [x] 30.3 停止ボタン
  - running状態のAgentに表示
  - クリックで stopAgent 呼び出し
  - _Requirements: 5.1_

### 31. AgentLogPanel実装
- [x] 31.1 Agent単位ログ表示
  - 選択Agentのログを表示
  - stdout/stderr の色分け
  - 仮想スクロール（@tanstack/react-virtual）
  - _Requirements: 9.1, 9.2, 9.4, 9.9_

- [x] 31.2 ログ操作機能
  - コピーボタン、クリアボタン
  - 自動スクロール
  - _Requirements: 9.7, 9.8, 9.10_

### 32. AgentInputPanel実装
- [x] 32.1 stdin入力UI
  - テキスト入力フィールド + 送信ボタン
  - Enter キーで送信
  - _Requirements: 10.1, 10.2_

- [x] 32.2 入力履歴表示
  - 過去の入力履歴をリスト表示
  - 履歴クリックで再送信
  - _Requirements: 10.3_

### 33. 既存UIの更新
- [x] 33.1 SpecList更新
  - 実行中Agent数の表示追加
  - _Requirements: 2.2_

- [x] 33.2 PhaseExecutionPanel更新
  - 実行グループ（doc/validate/impl）ボタンに変更
  - 排他制御の視覚的フィードバック
  - _Requirements: 6.1-6.8_

- [x] 33.3 LogPanel → AgentLogPanel置換
  - グローバルログパネルからAgent単位ログパネルへ
  - _Requirements: 9.1-9.10_

### 34. RecentProjects UIからの削除
- [x] 34.1 左ペインからRecentProjects削除
  - メニューバーからのみアクセス
  - _Requirements: 1.4_

### 35. 統合テスト追加
- [x] 35.1 Agent起動→ログ受信→完了フロー
  - _Requirements: 5.1, 9.1-9.6_
  - 実装: specManagerService.test.ts (Task 24.1テスト)

- [x] 35.2 セッション復元フロー
  - _Requirements: 5.6, 5.7_
  - 実装: specManagerService.test.ts (Task 24.3テスト)

- [x] 35.3 セッション再開フロー
  - _Requirements: 5.8_
  - 実装: specManagerService.test.ts (Task 24.4テスト)

- [x] 35.4 並列実行・排他制御
  - _Requirements: 6.3, 6.4, 6.5_
  - 実装: specManagerService.test.ts (Task 24.6テスト)

### 36. E2Eテスト追加
- [x] 36.1 docグループ実行E2E
  - requirement → design → tasks 逐次実行
  - _Requirements: 6.2_
  - 実装: src/e2e/agent-workflow.e2e.test.ts (シナリオドキュメント)

- [x] 36.2 アプリ再起動→中断Agent表示→再開E2E
  - _Requirements: 5.6, 5.7, 5.8_
  - 実装: src/e2e/agent-workflow.e2e.test.ts (シナリオドキュメント)

## Task Priority

### P0 (Core)
- 20.1-20.3: AgentRegistry
- 21.1-21.4: AgentProcess
- 22.1-22.4: PIDファイル管理
- 24.1-24.5: SpecManagerService

### P1 (Essential)
- 23.1-23.2: ログファイル管理
- 27.1-27.3: IPCチャネル
- 28.1-28.2: Preload API
- 29.1-29.4: useAgentStore

### P2 (UI)
- 30.1-30.3: AgentListPanel
- 31.1-31.2: AgentLogPanel
- 32.1-32.2: AgentInputPanel
- 33.1-33.3: 既存UI更新

### P3 (Quality)
- 35.1-35.4: 統合テスト
- 36.1-36.2: E2Eテスト
