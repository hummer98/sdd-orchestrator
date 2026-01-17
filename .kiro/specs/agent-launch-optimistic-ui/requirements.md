# Requirements: Agent Launch Optimistic UI

## Decision Log

### ローディング表示方式の選択

- **Discussion**: 以下のアプローチを検討
  - Option A: ローカルステート（useState）→ Spec切り替えでステート消失リスク
  - Option B: Main processから即時イベント送信 → 複雑
  - Option C: agentStoreに「起動中」ステート追加 → グローバルだが新しい状態管理追加
  - Option D: Main processからAGENT_LAUNCHINGイベント → タイムアウト考慮が必要
- **Conclusion**: Renderer側ローカルステート + タイムアウト付き（Option Aの改良版）
- **Rationale**:
  - IPC戻り値は現状使われておらず破棄されている
  - Agent一覧更新はfileWatcher経由で独立動作
  - Spec切り替え時にローカルステートがリセットされても、戻った時は`isXxxExecuting`（グローバルstore経由）が正しい状態を反映するため問題ない

### Main process異常時の対策

- **Discussion**: キャンセルオペレーションがないため、Main processのハング・タイムアウト時にUIがLoadingのままスタックするリスクがある
- **Conclusion**: 10秒タイムアウトを設定し、超過時にローカルステートをリセット
- **Rationale**: ユーザーが再操作可能になることを優先。Claude CLI起動が遅い環境も考慮した時間設定

### 適用範囲

- **Discussion**: Inspectionボタンだけでなく、他の実行ボタンにも適用すべきか検討。複雑化の懸念があったが、共通化により対応可能
- **Conclusion**: 全実行ハンドラに適用（8箇所程度）
- **Rationale**: カスタムフック`useLaunchingState`による共通化でコード重複を防ぎ、一貫したUX提供

### Remote UI対応

- **Discussion**: Remote UIでも同様の体験が必要か
- **Conclusion**: 対応する
- **Rationale**: 同じWorkflowViewコンポーネントを共有しているため、自動的に適用される

## Introduction

Agent実行ボタンをクリックした際、現状はfileWatcher経由でAgent状態が更新されるまで（5-15ms程度）ボタンがdisableにならず、反応が鈍く感じられる。本機能では、クリック時に即座にローディング状態を表示し（Optimistic UI）、Main process異常時のタイムアウトガードも設けることで、レスポンシブで堅牢なUXを実現する。

## Requirements

### Requirement 1: Optimistic UIによる即時フィードバック

**Objective:** ユーザーとして、実行ボタンをクリックした際に即座にローディング状態が表示されることで、操作が受け付けられたことを確認したい

#### Acceptance Criteria

1. When ユーザーが実行ボタンをクリックした時、the system shall 即座に（同期的に）ボタンをdisabled状態にし、ローディング表示に切り替える
2. When IPC呼び出しが完了した時、the system shall ローカルのlaunching状態をfalseに戻す
3. If fileWatcher経由でAgent実行状態（`isXxxExecuting`）がtrueになった場合、then the system shall 引き続きボタンをdisabled状態に維持する
4. If IPC呼び出しがエラーで失敗した場合、then the system shall ローカルのlaunching状態をfalseに戻し、エラー通知を表示する

### Requirement 2: タイムアウトガードによる異常系対策

**Objective:** ユーザーとして、Main processの異常時にUIがスタックせず、再操作可能になることで、アプリケーションが応答不能にならないようにしたい

#### Acceptance Criteria

1. When 実行ボタンがクリックされた時、the system shall 10秒のタイムアウトタイマーを開始する
2. If タイムアウトが発生した場合、then the system shall ローカルのlaunching状態をfalseに戻し、タイムアウトエラー通知を表示する
3. When IPC呼び出しが正常に完了した時、the system shall タイムアウトタイマーをクリアする
4. When コンポーネントがアンマウントされた時、the system shall タイムアウトタイマーをクリアする（メモリリーク防止）

### Requirement 3: 共通フックによる実装統一

**Objective:** 開発者として、ローディング状態管理ロジックを共通化することで、コード重複を防ぎ保守性を向上させたい

#### Acceptance Criteria

1. The system shall `useLaunchingState`カスタムフックを提供し、launching状態とwrapExecution関数を返す
2. The system shall wrapExecution関数で非同期関数をラップすることで、launching状態管理とタイムアウト処理を自動適用する
3. The system shall タイムアウト時間をオプションパラメータで設定可能にする（デフォルト: 10000ms）

### Requirement 4: 対象ハンドラへの適用

**Objective:** ユーザーとして、全ての実行ボタンで一貫したレスポンシブな体験を得たい

#### Acceptance Criteria

1. The system shall 以下のハンドラに`useLaunchingState`を適用する:
   - `handleExecutePhase`（requirements, design, tasks, impl, deploy）
   - `handleStartDocumentReview`
   - `handleExecuteDocumentReviewReply`
   - `handleApplyDocumentReviewFix`
   - `handleStartInspection`
   - `handleExecuteInspectionFix`
2. The system shall 各ボタンのdisabled判定を `launching || isXxxExecuting` に更新する
3. The system shall Remote UIでも同様の動作を提供する（WorkflowView共有のため自動適用）

### Requirement 5: 既存動作との互換性

**Objective:** 開発者として、既存のAgent状態管理（fileWatcher経由）に影響を与えず、追加的な改善として実装したい

#### Acceptance Criteria

1. The system shall fileWatcher経由のAgent状態更新フローを変更しない
2. The system shall IPC呼び出しの戻り値の扱いを変更しない（現状通り破棄）
3. The system shall agentStoreの構造を変更しない

## Out of Scope

- キャンセルオペレーションの実装（将来課題）
- Main processからの即時イベント送信（AGENT_LAUNCHINGイベント）
- agentStoreへの「起動中」ステート追加
- タイムアウト時間のユーザー設定機能

## Open Questions

- なし（設計フェーズで詳細化）
