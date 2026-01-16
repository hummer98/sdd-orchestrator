# Requirements: Bug Auto Execution Per-Bug State

## Decision Log

### アーキテクチャ方針
- **Discussion**: 既存の `BugAutoExecutionService` をリファクタリングするか、新規storeを作成するか
- **Conclusion**: 新規 `bugAutoExecutionStore.ts` を作成
- **Rationale**: Spec用の `autoExecutionStore.ts` と同じパターンで実装し、コードベースの一貫性を保つ。関心の分離（IPC通信 vs 状態管理）も明確になる

### 状態同期方式
- **Discussion**: IPCイベント（push）のみか、pull + push両方か
- **Conclusion**: pull + push両方
- **Rationale**: バグ選択時に即座に正しい状態を表示するため。IPCイベント欠損時のリカバリーにもなる

### 既存サービスの扱い
- **Discussion**: `BugAutoExecutionService` を維持してリファクタリングするか、削除するか
- **Conclusion**: 完全削除（コメント含む）
- **Rationale**: 混乱を避けるため。IPC呼び出しはコンポーネントから直接行う

### Remote UI対応
- **Discussion**: Remote UIへの影響有無
- **Conclusion**: 対応あり
- **Rationale**: Bug自動実行はRemote UIでも使用されている

## Introduction

`bug-auto-execution-ipc-migration` バグ修正の実装漏れを解消する。現在、Renderer側の `BugAutoExecutionService` がシングルトンで1つの状態のみを管理しているため、バグAでエラーが発生するとバグBを選択しても「エラー」表示が残る問題がある。Spec用の `autoExecutionStore.ts` と同様に、Bug毎の状態をMap管理する `bugAutoExecutionStore.ts` を実装し、選択中のバグに対応する状態を正しく表示できるようにする。

## Requirements

### Requirement 1: Bug自動実行状態のBug毎管理

**Objective:** As a ユーザー, I want 各バグの自動実行状態が独立して管理される, so that バグを切り替えても正しい状態が表示される

#### Acceptance Criteria

1. The `bugAutoExecutionStore` shall `Map<bugPath, BugAutoExecutionRuntimeState>` で状態を管理する
2. When バグAで自動実行エラーが発生する, the バグBの状態 shall 影響を受けない
3. When バグを選択する, the UI shall そのバグに対応する自動実行状態を表示する
4. The store shall 以下の状態を保持する: `isAutoExecuting`, `currentAutoPhase`, `autoExecutionStatus`, `lastFailedPhase`, `retryCount`

### Requirement 2: IPCイベントによる状態更新（push）

**Objective:** As a システム, I want Main Processからの状態変更通知でstoreを更新する, so that リアルタイムで状態が反映される

#### Acceptance Criteria

1. When `onBugAutoExecutionStatusChanged` イベントを受信する, the store shall 該当bugPathのエントリを更新する
2. When `onBugAutoExecutionPhaseCompleted` イベントを受信する, the store shall 完了をログ出力する
3. When `onBugAutoExecutionCompleted` イベントを受信する, the store shall 該当bugPathの状態を `completed` に更新する
4. When `onBugAutoExecutionError` イベントを受信する, the store shall 該当bugPathの状態を `error` に更新する
5. The IPCリスナー shall アプリ初期化時に一度だけ登録される

### Requirement 3: バグ選択時の状態取得（pull）

**Objective:** As a ユーザー, I want バグ選択時に最新の自動実行状態が表示される, so that 常に正確な状態を確認できる

#### Acceptance Criteria

1. When バグを選択する, the システム shall Main Processから該当バグの自動実行状態を取得する
2. When 状態取得に成功する, the store shall 取得した状態で該当bugPathのエントリを更新する
3. If Main Processに該当バグの状態がない場合, the store shall デフォルト状態（idle）を設定する
4. The 状態取得 shall `window.electronAPI.bugAutoExecutionStatus({ bugPath })` を使用する

### Requirement 4: BugWorkflowViewのstore連携

**Objective:** As a コンポーネント, I want storeから状態を取得する, so that Bug毎の正しい状態を表示できる

#### Acceptance Criteria

1. The `BugWorkflowView` shall `bugAutoExecutionStore` から選択中バグの状態を取得する
2. When 自動実行を開始する, the コンポーネント shall `window.electronAPI.bugAutoExecutionStart()` を直接呼び出す
3. When 自動実行を停止する, the コンポーネント shall `window.electronAPI.bugAutoExecutionStop()` を直接呼び出す
4. When リトライする, the コンポーネント shall `window.electronAPI.bugAutoExecutionRetryFrom()` を直接呼び出す
5. The `BugAutoExecutionService` への参照 shall すべて削除される

### Requirement 5: BugAutoExecutionServiceの削除

**Objective:** As a 開発者, I want 不要になったサービスを削除する, so that コードベースが整理され混乱を避けられる

#### Acceptance Criteria

1. The `src/renderer/services/BugAutoExecutionService.ts` shall 削除される
2. The `src/renderer/services/BugAutoExecutionService.test.ts` shall 削除される
3. The `BugAutoExecutionService` への参照 shall すべてのファイルから削除される
4. The `getBugAutoExecutionService()`, `disposeBugAutoExecutionService()` への参照 shall すべて削除される

### Requirement 6: Remote UI対応

**Objective:** As a Remote UIユーザー, I want Bug自動実行状態がBug毎に正しく表示される, so that Desktop UIと同等の体験が得られる

#### Acceptance Criteria

1. The `bugAutoExecutionStore` shall `shared/stores/` に配置され、Electron版とRemote UI版で共有される
2. The Remote UI shall WebSocket経由で状態変更通知を受信し、storeを更新する
3. When Remote UIでバグを選択する, the システム shall WebSocket経由で状態を取得する
4. The Electron版とRemote UI版 shall 同一のstoreインターフェースを使用する

## Out of Scope

- Main Process側（`BugAutoExecutionCoordinator`, `bugAutoExecutionHandlers`）の変更
- Bug自動実行のビジネスロジック変更
- 新しいIPC APIの追加（既存APIを使用）

## Open Questions

- なし（設計フェーズで詳細を決定）
