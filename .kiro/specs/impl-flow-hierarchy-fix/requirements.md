# Requirements: 実装フローエリア階層構造の修正

## Decision Log

### 1-1: PhaseItem(impl)の配置
- **Discussion**: impl PhaseItemをImplFlowFrame外に残すか、内部に移動するか
- **Conclusion**: ImplFlowFrame内に移動
- **Rationale**: 実装フローの視覚的グループ化を実現し、impl/inspection/deployが同一枠内にあることを明確にする

### 1-2: worktree連動ロジックの実装方式
- **Discussion**: PhaseItemに特殊分岐を追加するか、新規コンポーネントを作成するか
- **Conclusion**: 新パネル（ImplPhasePanel）を作成して対応
- **Rationale**: PhaseItemの汎用性を維持し、impl固有のworktree分岐ロジックを専用コンポーネントに集約

### 2-1: 実装フェーズUI設計
- **Discussion**: PhaseItemをそのまま使用してハンドラで分岐するか、専用パネルを作成するか
- **Conclusion**: 新規「ImplPhasePanel」を作成
- **Rationale**: 関心の分離、保守性向上、テスト容易性。worktree作成、mainブランチチェック、ラベル切り替えなどの複雑なロジックを1箇所に集約

### 2-2: deployフェーズのラベル
- **Discussion**: worktreeモード時にラベルを変更するか
- **Conclusion**: worktreeモード時は「コミット」→「マージ」に変更
- **Rationale**: ユーザーへの明示性向上。worktreeモードではspec-mergeが実行されることを視覚的に伝える

### 3-1: deployフェーズUI
- **Discussion**: deploy専用パネルを作成するか、PhaseItemをそのまま使用するか
- **Conclusion**: PhaseItemをそのまま使用（ラベルのみ動的変更）
- **Rationale**: YAGNI原則。deployの特殊性は低く、ラベル変更のみで十分。実行ロジックは既存のhandleExecutePhase内で分岐済み

### 3-2: ImplFlowFrameの責務
- **Discussion**: ImplFlowFrameを統合コンポーネントにするか、枠のみにするか
- **Conclusion**: 枠のみ（children方式）
- **Rationale**: 柔軟性、関心の分離。ImplFlowFrameは「worktreeモードの視覚的表現」に専念し、中身は親が制御

## Introduction

worktree-execution-ui機能の実装後、WorkflowViewの階層構造に齟齬が発生している。具体的には、impl PhaseItemの「実行」ボタンとImplFlowFrameヘッダーの「実装開始」ボタンが重複しており、またdeploy PhaseItemがImplFlowFrame外に配置されている。本仕様では、これらの問題を解決し、実装フローエリア（impl, inspection, deploy）の階層構造を整理する。

## Requirements

### Requirement 1: ImplFlowFrameの責務簡素化

**Objective:** 開発者として、ImplFlowFrameがworktreeモードの視覚的表現（枠・背景色・チェックボックス）のみを担当するようにしたい。これにより、コンポーネントの責務が明確になり保守性が向上する。

#### Acceptance Criteria

1.1. ImplFlowFrameは「実装開始」ボタンを持たないこと（削除する）
1.2. ImplFlowFrameはworktreeモードチェックボックスをヘッダーに表示すること
1.3. ImplFlowFrameはworktreeモード選択時に紫系の背景色を適用すること
1.4. ImplFlowFrameはchildren propsを受け取り、内部にレンダリングすること
1.5. ImplFlowFrameのProps型から実行関連のprops（canExecute, isExecuting, onExecute）を削除すること

### Requirement 2: ImplPhasePanelの新規作成

**Objective:** 開発者として、impl固有のworktree連動ロジックを専用コンポーネントに集約したい。これにより、PhaseItemの汎用性を維持しつつ、複雑なimplロジックを分離できる。

#### Acceptance Criteria

2.1. ImplPhasePanelコンポーネントを新規作成すること
2.2. ImplPhasePanelはworktreeモード状態を受け取り、実行ロジックを内部で分岐すること
2.3. When worktreeモードが選択されており、かつworktreeが未作成の場合、ImplPhasePanelは「Worktreeで実装開始」ラベルを表示すること
2.4. When worktreeモードが選択されており、かつworktreeが作成済みの場合、ImplPhasePanelは「Worktreeで実装継続」ラベルを表示すること
2.5. When 通常モードが選択されており、かつ実装未開始の場合、ImplPhasePanelは「実装開始」ラベルを表示すること
2.6. When 通常モードが選択されており、かつ実装開始済みの場合、ImplPhasePanelは「実装継続」ラベルを表示すること
2.7. ImplPhasePanelは実行ボタンクリック時、worktreeモードに応じて適切な処理（worktree作成 or 通常モード開始）を実行すること
2.8. ImplPhasePanelはworktreeモード時、mainブランチでない場合にエラーを表示すること
2.9. ImplPhasePanelはPhaseItemと同等のステータス表示（pending/executing/approved）を持つこと
2.10. ImplPhasePanelはworktreeモード時に紫系のアクセントカラーを適用すること

### Requirement 3: WorkflowViewの階層構造修正

**Objective:** ユーザーとして、実装フロー（impl, inspection, deploy）が視覚的に1つのグループとして表示されるようにしたい。これにより、ワークフローの理解が容易になる。

#### Acceptance Criteria

3.1. ImplFlowFrame内にImplPhasePanel、TaskProgressView、InspectionPanel、deploy PhaseItemが順に配置されること
3.2. WORKFLOW_PHASESのmapループからimplとdeployを除外し、ImplFlowFrame内で個別にレンダリングすること
3.3. DocumentReviewPanelはImplFlowFrame外（tasks後、ImplFlowFrame前）に配置を維持すること
3.4. 各コンポーネント間に適切な矢印コネクタ（ArrowDown）を表示すること

### Requirement 4: deployラベルの動的変更

**Objective:** ユーザーとして、worktreeモード時にdeployボタンが「マージ」と表示されるようにしたい。これにより、実行される処理（spec-merge）が明確になる。

#### Acceptance Criteria

4.1. When worktreeモード（spec.json.worktree.path存在）の場合、deploy PhaseItemのラベルを「マージ」と表示すること
4.2. When 通常モードの場合、deploy PhaseItemのラベルを「コミット」と表示すること
4.3. PhaseItemコンポーネントはlabel propsを動的に受け取れること（既存機能）

### Requirement 5: 既存機能の維持

**Objective:** 開発者として、本修正により既存機能が破壊されないことを保証したい。

#### Acceptance Criteria

5.1. worktreeモード選択→実装開始→チェックボックスロックのフローが正常に動作すること
5.2. 通常モード選択→実装開始→deploy完了のフローが正常に動作すること
5.3. 自動実行機能が正常に動作すること（impl, inspection, deployの順序実行）
5.4. InspectionPanelの機能（検査実行、Fix実行、自動実行フラグ）が維持されること
5.5. TaskProgressViewの機能（タスク一覧、個別実行）が維持されること

## Out of Scope

- worktreeの自動削除・クリーンアップ機能
- worktreeモードと通常モードの途中切り替え（実装開始後）
- 複数worktreeの同時管理
- worktreeパスのカスタマイズ
- Remote UIへの対応（本仕様はElectron UI専用）
- PhaseItemコンポーネント自体の変更（label propsは既存機能）

## Open Questions

- なし（設計フェーズで詳細を決定）
