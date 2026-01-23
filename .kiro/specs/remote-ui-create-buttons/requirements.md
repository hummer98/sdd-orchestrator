# Requirements: Remote UI Create Buttons

## Decision Log

### 共通化の方針
- **Discussion**: タブヘッダー（タブボタン + 新規作成ボタン）をElectron版と共通化するか、Remote UI側のみ対応するか検討
- **Conclusion**: 最小限対応（Remote UIのみ対応）を採用
- **Rationale**:
  - Electron版とRemote UI版でコンポーネント構造が根本的に異なる（DocsTabs vs LeftSidebar）
  - ダイアログ実装もIPC vs WebSocketで異なる
  - 既存のBug作成パターン（CreateBugDialogRemote）が安定して動作している
  - まず機能追加し、動作確認後に共通化を別途検討

### Spec作成APIの実装方針
- **Discussion**: WebSocket APIに新規メソッドを追加する必要がある
- **Conclusion**: `executeSpecPlan`相当のメソッドをApiClientインターフェースに追加
- **Rationale**: Electron版の`executeSpecPlan` IPCと同等の機能をWebSocket経由で提供

### UI配置
- **Discussion**: 新規作成ボタンをどこに配置するか
- **Conclusion**: LeftSidebarのタブヘッダー部分に、アクティブタブに応じた新規作成ボタンを追加
- **Rationale**: Electron版DocsTabs.tsxと同様のUXを提供

## Introduction

Remote UIにSpec/Bug新規作成機能を追加する。現状Remote UIにはSpec/Bugの新規作成ボタンがなく、デスクトップアプリでの作成が必須となっている。本機能により、Remote UIからも直接Spec/Bugを作成できるようになる。

## Requirements

### Requirement 1: タブヘッダーへの新規作成ボタン追加

**Objective:** As a Remote UIユーザー, I want LeftSidebarのタブヘッダーに新規作成ボタンがある, so that SpecまたはBugを素早く作成できる

#### Acceptance Criteria
1. When Specsタブがアクティブの場合, the system shall Spec新規作成ボタン（+アイコン）を表示する
2. When Bugsタブがアクティブの場合, the system shall Bug新規作成ボタン（+アイコン）を表示する
3. When 新規作成ボタンをクリックした場合, the system shall 対応する作成ダイアログを表示する

### Requirement 2: Spec新規作成ダイアログ（CreateSpecDialogRemote）

**Objective:** As a Remote UIユーザー, I want Spec作成ダイアログで説明を入力してspec-planを開始できる, so that Remote UIから直接仕様策定を始められる

#### Acceptance Criteria
1. The system shall ダイアログに説明入力用のテキストエリアを表示する
2. The system shall Worktreeモードスイッチを表示する（オプション）
3. When 「spec-planで作成」ボタンをクリックした場合, the system shall WebSocket API経由でspec-planを実行する
4. When spec-plan実行に成功した場合, the system shall ダイアログを閉じ、エージェントビューに遷移する
5. When エラーが発生した場合, the system shall エラーメッセージを表示する
6. If 説明が空の場合, then the system shall 作成ボタンを無効化する

### Requirement 3: WebSocket API拡張（executeSpecPlan）

**Objective:** As a システム, I want WebSocket API経由でspec-planを実行できる, so that Remote UIからSpec作成が可能になる

#### Acceptance Criteria
1. The system shall ApiClientインターフェースに`executeSpecPlan`メソッドを追加する
2. The system shall WebSocketApiClientに`executeSpecPlan`の実装を追加する
3. The system shall webSocketHandlerに`EXECUTE_SPEC_PLAN`メッセージハンドラーを追加する
4. When executeSpecPlanが呼ばれた場合, the system shall AgentInfoを返す

### Requirement 4: LeftSidebar統合

**Objective:** As a システム, I want LeftSidebarコンポーネントがタブ切り替えと新規作成を統合的に扱う, so that 一貫したUXを提供できる

#### Acceptance Criteria
1. The system shall LeftSidebarのタブヘッダー部分にタブボタンと新規作成ボタンを横並びで配置する
2. When タブが切り替わった場合, the system shall 新規作成ボタンのラベル/動作を切り替える
3. The system shall 既存のBug作成機能（CreateBugDialogRemote）との整合性を保つ

### Requirement 5: 既存Bug作成ボタンの移動

**Objective:** As a システム, I want BugsViewからCreateBugButtonRemoteをLeftSidebarに移動する, so that Spec/Bug作成が同じ場所で行える

#### Acceptance Criteria
1. The system shall BugsView内の既存CreateBugButtonRemote/CreateBugDialogRemoteを削除する（重複回避）
2. The system shall LeftSidebar内でBugタブ選択時にCreateBugDialogRemoteを表示できるようにする
3. The system shall FAB（Floating Action Button）のスマートフォン対応を維持する

## Out of Scope

- タブヘッダーUIのElectron版との共通コンポーネント化（将来の検討事項）
- spec-planの対話機能（既存のAgentViewで対応）
- Spec/Bug削除機能
- IpcApiClientへの`executeSpecPlan`追加（Electron版は既存の`window.electronAPI.executeSpecPlan`を使用）

## Open Questions

- スマートフォン表示時のFAB配置：Spec/Bug両方のFABを表示するか、アクティブタブに応じて切り替えるか
  - 暫定決定：アクティブタブに応じて1つのFABを表示する（Electron版DocsTabs.tsxの挙動に合わせる）
