# Requirements Document

## Project Description (Input)
InspectionワークフローのUI改善。document-reviewと同様のインターフェースを実装する。

### 主な機能:
1. **InspectionPanel コンポーネント作成**
   - GO/NOGO状態表示
   - ラウンド数表示
   - 「Inspection実行」ボタン
   - 「Fix実行」ボタン（NOGO時のみ表示）
   - 自動実行フラグ（run/pause/skip）

2. **spec.json構造の変更（後方互換なし）**
   - document-reviewと統一した形式に変更
   - inspection フィールドを以下の構造に:
     ```json
     "inspection": {
       "status": "completed",
       "rounds": 2,
       "currentRound": null,
       "roundDetails": [
         { "roundNumber": 1, "passed": false, "fixApplied": true },
         { "roundNumber": 2, "passed": true }
       ]
     }
     ```

3. **ワークフロー統合**
   - WorkflowViewへのInspectionPanel統合
   - GO時にDeployボタンを有効化
   - NOGO時にFix実行ボタンを表示
   - Fix実行後に再Inspection

4. **Fixフロー**
   - `--fix`相当: tasks.mdにFix用タスク追加
   - `/kiro:spec-impl`を自動実行
   - 実装完了後に再Inspection

## Scope

- **対象**: Desktop UI のみ（InspectionPanel は Desktop 専用コンポーネント）
- **Remote UI連携**: 既存の Remote UI の Inspection フェーズ表示は維持（spec.json の新構造を適切に解釈できるようにする）
- **既存パターン踏襲**: DocumentReviewPanel と同様のUIパターンを踏襲

## Requirements

### Requirement 1: InspectionPanel コンポーネント

**Objective:** As a 開発者, I want InspectionワークフローをGUIで操作できるようにしたい, so that Inspection結果の確認と再実行を効率的に行える

#### Acceptance Criteria

1. When InspectionPanel がレンダリングされる, the InspectionPanel shall 進捗インジケータ（checked/unchecked/executing/skip-scheduled）をタイトル左側に表示する
2. When InspectionPanel がレンダリングされる, the InspectionPanel shall 自動実行フラグ制御ボタン（run/pause/skip）をタイトル右側に表示する
3. When InspectionPanel がレンダリングされる, the InspectionPanel shall ラウンド数と現在のラウンド番号をスタッツエリアに表示する
4. While inspection.roundDetails が存在する, the InspectionPanel shall 最新ラウンドのGO/NOGO状態をバッジで表示する
5. When inspection状態がGO（passed: true）, the InspectionPanel shall 「Inspection開始」ボタンを表示する
6. When inspection状態がNOGO（passed: false）かつfixAppliedがfalse, the InspectionPanel shall 「Fix実行」ボタンを優先的に表示する
7. When inspection状態がNOGO（passed: false）かつfixAppliedがtrue, the InspectionPanel shall 「Inspection開始」ボタンを表示する（再Inspection用）
8. While Agentが実行中, the InspectionPanel shall 全てのアクションボタンを無効化する
9. While 自動実行モードが有効, the InspectionPanel shall 全てのアクションボタンを無効化する
10. When 自動実行フラグ制御ボタンがクリックされる, the InspectionPanel shall フラグを run → pause → skip → run の順に切り替える

### Requirement 2: spec.json Inspection構造

**Objective:** As a システム, I want Inspection状態を構造化して管理したい, so that マルチラウンドのInspectionフローを正確に追跡できる

#### Acceptance Criteria

1. The spec.json shall inspection フィールドに status（pending/in_progress/completed）を含む
2. The spec.json shall inspection フィールドに rounds（完了したラウンド数）を含む
3. The spec.json shall inspection フィールドに currentRound（実行中のラウンド番号またはnull）を含む
4. The spec.json shall inspection フィールドに roundDetails 配列を含む
5. When Inspectionが実行される, the specManagerService shall roundDetailsに新しいラウンドエントリを追加する
6. When InspectionがGO判定, the specManagerService shall 該当ラウンドのpassedをtrueに設定する
7. When InspectionがNOGO判定, the specManagerService shall 該当ラウンドのpassedをfalseに設定する
8. When Fix実行が完了する, the specManagerService shall 該当ラウンドのfixAppliedをtrueに設定する

### Requirement 3: WorkflowView統合

**Objective:** As a 開発者, I want InspectionPanelをワークフローUIに統合したい, so that 他のフェーズと一貫した操作体験を得られる

#### Acceptance Criteria

1. While tasks フェーズが承認済み, the WorkflowView shall InspectionPanelを表示する
2. When inspection.passed が true（GO判定）, the WorkflowView shall Deployフェーズを有効化する
3. When inspection.passed が false（NOGO判定）, the WorkflowView shall Deployフェーズを無効化する
4. While InspectionPanel が表示されている, the WorkflowView shall implフェーズとdeployフェーズの間にInspectionPanelを配置する
5. When inspectionフィールドが存在しない（レガシーspec）, the WorkflowView shall inspection.passedフィールドから状態を推定する

### Requirement 4: Fix実行フロー

**Objective:** As a 開発者, I want NOGO時に修正を適用して再Inspectionを実行したい, so that 品質基準を満たすまで反復できる

#### Acceptance Criteria

1. When 「Fix実行」ボタンがクリックされる, the InspectionPanel shall inspection-{n}.mdの指摘事項をtasks.mdに追加するフローを開始する
2. When Fix用タスクがtasks.mdに追加される, the specManagerService shall /kiro:spec-impl コマンドを自動実行する
3. When impl実行が完了する, the specManagerService shall 該当ラウンドのfixAppliedをtrueに設定する
4. When fixAppliedがtrueになる, the InspectionPanel shall 「Inspection開始」ボタンを表示する
5. When 「Inspection開始」ボタンがクリックされる（再Inspection）, the specManagerService shall 新しいラウンドを開始する

### Requirement 5: 自動実行フラグ制御

**Objective:** As a 開発者, I want Inspectionフェーズの自動実行動作を制御したい, so that ワークフローを柔軟に管理できる

#### Acceptance Criteria

1. The InspectionPanel shall 自動実行フラグとして「run」「pause」「skip」の3値をサポートする
2. When 自動実行フラグが「run」, the 自動実行エンジン shall Inspectionフェーズを自動実行する
3. When 自動実行フラグが「pause」, the 自動実行エンジン shall Inspectionフェーズで一時停止する
4. When 自動実行フラグが「skip」, the 自動実行エンジン shall Inspectionフェーズをスキップしてdeployに進む
5. When 自動実行フラグが変更される, the specManagerService shall spec.json の autoExecution.permissions.inspection を更新する

### Requirement 6: Remote UI 互換性

**Objective:** As a システム, I want Remote UIが新しいspec.json構造を正しく解釈できるようにしたい, so that Remote UIでもInspection状態を確認できる

#### Acceptance Criteria

1. When Remote UI が spec.json を受信する, the SpecDetail コンポーネント shall inspection.passed から GO/NOGO 状態を判定する
2. When inspection.roundDetails が存在する, the SpecDetail コンポーネント shall 最新ラウンドのpassed値を使用する
3. When inspection.roundDetails が存在しない（レガシー）, the SpecDetail コンポーネント shall inspection.passed を直接参照する
4. If inspection フィールドが存在しない, then the SpecDetail コンポーネント shall inspection フェーズを pending として表示する

### Requirement 7: 進捗インジケータ表示

**Objective:** As a 開発者, I want Inspectionの進捗状態を視覚的に確認したい, so that 現在のワークフロー状態を素早く把握できる

#### Acceptance Criteria

1. While 自動実行フラグが「skip」, the InspectionPanel shall skip-scheduled インジケータ（矢印アイコン、黄色）を表示する
2. While inspection.status が「in_progress」または Agent が実行中, the InspectionPanel shall executing インジケータ（スピナーアイコン、青色）を表示する
3. While inspection.rounds が 1 以上, the InspectionPanel shall checked インジケータ（チェックアイコン、緑色）を表示する
4. While inspection が未実行, the InspectionPanel shall unchecked インジケータ（空円アイコン、グレー）を表示する
