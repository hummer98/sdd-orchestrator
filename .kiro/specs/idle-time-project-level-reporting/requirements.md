# Requirements: Idle Time Project-Level Reporting

## Decision Log

### アイドル時間報告のトリガー
- **Discussion**: Spec選択に依存しないアイドル時間報告をどう実現するか。選択肢: A) ウィンドウフォーカス状態、B) マウス/キーボード操作、C) HumanActivityTrackerの拡張
- **Conclusion**: A) ウィンドウフォーカス状態を使用
- **Rationale**: 最もシンプルで確実。ウィンドウがフォーカス中=アクティブ、フォーカス外れ=アイドル開始。マウス/キーボード追跡は過剰で、プライバシー懸念もある

### Spec追跡との優先度
- **Discussion**: Spec追跡中（HumanActivityTracker.isActive=true）とプロジェクトレベル追跡をどう共存させるか
- **Conclusion**: Spec追跡を優先し、Spec未選択時はフォールバック
- **Rationale**: Spec追跡はより精密なアクティビティ時刻を持つ。既存機能を維持しつつ、Spec未選択時のギャップを埋める

### useIdleTimeSyncの統合場所
- **Discussion**: `useIdleTimeSync`フックをどのコンポーネントで呼び出すか
- **Conclusion**: App.tsx（トップレベル）で呼び出す
- **Rationale**: プロジェクト選択状態に応じて動作させるため、アプリ全体のライフサイクルに合わせる必要がある

### 新規実装 vs 既存機能の修正
- **Discussion**: 新規specとして実装するか、既存の`schedule-task-scheduler-activation`の追加要件とするか
- **Conclusion**: 新規specとして実装
- **Rationale**: 既存specは完了済み。別の関心事（Renderer側のアクティビティ報告）を明確に分離

## Introduction

`schedule-task-scheduler-activation` specで実装されたアイドル時間統合では、「Rendererがアクティビティを報告する」ことが前提となっている。しかし、現在の実装では`useIdleTimeSync`フックがApp.tsxで呼び出されておらず、かつ`HumanActivityTracker.isActive`がSpec選択時のみtrueになるため、Spec未選択時にはアイドル時間がMain Processに報告されない。

本specは、プロジェクト選択時（Spec選択有無に関わらず）にアイドル時間を報告する仕組みを実装し、`waitForIdle: true`のスケジュールタスクが正しく動作するようにする。

## Requirements

### Requirement 1: useIdleTimeSyncのApp.tsx統合

**Objective:** システムとして、プロジェクト選択時にアイドル時間報告を開始したい。スケジュールタスクのアイドル条件が正しく動作するようにするため。

#### Acceptance Criteria
1. When App.tsxがマウントされ、プロジェクトが選択されている時、システムは`useIdleTimeSync`フックを有効化する
2. When プロジェクトが未選択の時、システムはアイドル時間報告を行わない
3. When プロジェクトが変更された時、システムは新しいプロジェクトに対してアイドル時間報告を継続する

### Requirement 2: ウィンドウフォーカス状態に基づくアクティビティ追跡

**Objective:** システムとして、ウィンドウフォーカス状態でユーザーアクティビティを検出したい。Spec未選択時でもアイドル時間を正確に計算できるようにするため。

#### Acceptance Criteria
1. When ウィンドウがフォーカスを得た時、システムは「現在時刻」を最終アクティビティ時刻として記録する
2. When ウィンドウがフォーカスを失った時、システムはその時点の最終アクティビティ時刻を保持する（更新しない）
3. While ウィンドウがフォーカス中の時、システムは10秒間隔で最終アクティビティ時刻を更新する
4. When アプリがバックグラウンドになった時、システムは最後のフォーカス喪失時刻からアイドル時間を計算できる

### Requirement 3: Spec追跡との優先度制御

**Objective:** システムとして、Spec追跡中はその精密なアクティビティ時刻を優先したい。既存機能との整合性を保つため。

#### Acceptance Criteria
1. If HumanActivityTracker.isActive=true かつ getLastActivityTime()がnullでない場合、システムはSpec追跡のアクティビティ時刻を報告する
2. If HumanActivityTracker.isActive=false または getLastActivityTime()がnullの場合、システムはウィンドウフォーカス状態のアクティビティ時刻を報告する
3. When Specが選択された時、システムはSpec追跡のアクティビティ時刻に切り替える
4. When Specが解除された時、システムはウィンドウフォーカス状態のアクティビティ時刻に切り替える

### Requirement 4: 同期間隔とIPC

**Objective:** システムとして、適切な間隔でMain Processにアイドル時間を報告したい。リソース消費を抑えつつ、スケジューラの1分間隔チェックに十分な精度を提供するため。

#### Acceptance Criteria
1. システムは10秒間隔でMain Processにアイドル時間を報告する（既存の`IDLE_SYNC_INTERVAL_MS`を維持）
2. When 報告が行われた時、システムは既存のIPCチャネル`SCHEDULE_TASK_REPORT_IDLE_TIME`を使用する
3. If 報告に失敗した場合、システムはエラーをコンソールに記録し、次の報告サイクルで再試行する

### Requirement 5: テスト

**Objective:** 開発者として、アイドル時間報告が正しく動作することを検証したい。実装の正確性を保証するため。

#### Acceptance Criteria
1. ユニットテストは`useIdleTimeSync`のSpec追跡優先ロジックを検証する
2. ユニットテストはウィンドウフォーカス状態に基づくアクティビティ時刻更新を検証する
3. ユニットテストはプロジェクト未選択時に報告がスキップされることを検証する
4. 統合テスト（オプション）はMain Process側で正しいアイドル時間が計算されることを検証する

## Out of Scope

- HumanActivityTrackerの内部ロジック変更（既存のSpec単位セッション追跡は変更しない）
- Main Process側のIdleTimeTrackerの変更（既存のまま使用）
- ScheduleTaskCoordinatorの変更（既存のまま使用）
- E2Eテスト（ユニット/統合テストのみ）
- Remote UI対応（Electron固有のウィンドウフォーカスAPIを使用するため）

## Open Questions

- なし（すべて解決済み）

## Related Specifications

- `.kiro/specs/schedule-task-scheduler-activation/` - スケジューラ起動とアイドル時間統合の前提spec
- `.kiro/specs/schedule-task-execution/` - スケジュールタスク機能の元spec
