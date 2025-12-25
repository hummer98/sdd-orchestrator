# Requirements Document

## Introduction

Bugsタブ選択時のペイン連動機能を実装する。左ペインでBugsタブを選択した際、Specsタブと同様のペイン連動動作を実現する。Bug選択状態に応じてメインペインと右ペインの表示を適切に制御し、ワークフロー実行とAgent管理を可能にする。

## Requirements

### Requirement 1: Bugsタブ選択時の未選択状態表示

**Objective:** As a ユーザー, I want Bugsタブ選択時にBugが未選択の場合はメイン・右ペインを空にする, so that UIの状態が明確でSpecsタブと一貫した動作になる

#### Acceptance Criteria
1. When ユーザーが左ペインでBugsタブを選択し、かつBugアイテムが未選択の場合, the SDD Orchestrator shall メインペインを空の状態で表示する
2. When ユーザーが左ペインでBugsタブを選択し、かつBugアイテムが未選択の場合, the SDD Orchestrator shall 右ペインを空の状態で表示する
3. When ユーザーがSpecsタブからBugsタブに切り替えた場合, the SDD Orchestrator shall Bugの選択状態を維持する（以前にBugが選択されていた場合は選択状態を保持）

### Requirement 2: Bugアイテム選択時のメインペイン表示

**Objective:** As a ユーザー, I want Bugアイテム選択時にメインペインでBugドキュメントを閲覧・編集できる, so that Bugの詳細情報を確認しながら作業を進められる

#### Acceptance Criteria
1. When ユーザーがBugアイテムを選択した場合, the SDD Orchestrator shall メインペインにドキュメントタブを表示する
2. The SDD Orchestrator shall ドキュメントタブとしてreport.md、analysis.md、fix.md、verification.mdの4つのタブを表示する
3. When ドキュメントタブが選択された場合, the SDD Orchestrator shall 対応するMarkdownファイルの内容をプレビュー表示する
4. If 対応するドキュメントファイルが存在しない場合, the SDD Orchestrator shall 空の状態または「ドキュメント未生成」のプレースホルダーを表示する

### Requirement 3: Bugアイテム選択時の右ペイン表示

**Objective:** As a ユーザー, I want Bugアイテム選択時に右ペインでワークフローとAgent一覧を確認できる, so that Bug修正の進捗とエージェント状態を把握できる

#### Acceptance Criteria
1. When ユーザーがBugアイテムを選択した場合, the SDD Orchestrator shall 右ペインにBugワークフロービューを表示する
2. The SDD Orchestrator shall ワークフロービューにReport、Analyze、Fix、Verify、Deployの5つのフェーズを表示する
3. The SDD Orchestrator shall 各フェーズの進捗状態（pending/generated/approved）をアイコンまたはバッジで表示する
4. When ユーザーがBugアイテムを選択した場合, the SDD Orchestrator shall 右ペインにAgent一覧パネルを表示する
5. While Agentが実行中の場合, the SDD Orchestrator shall Agent一覧に実行中のエージェント情報を表示する

### Requirement 4: フェーズ自動実行ボタンの動作

**Objective:** As a ユーザー, I want 各フェーズの自動実行ボタンでBugワークフローを進められる, so that AIエージェントによる自動処理を実行できる

#### Acceptance Criteria
1. The SDD Orchestrator shall Reportフェーズには自動実行ボタンを表示しない（レポートは手動作成のため）
2. When ユーザーがAnalyzeフェーズの実行ボタンをクリックした場合, the SDD Orchestrator shall `/kiro:bug-analyze`コマンドを実行する
3. When ユーザーがFixフェーズの実行ボタンをクリックした場合, the SDD Orchestrator shall `/kiro:bug-fix`コマンドを実行する
4. When ユーザーがVerifyフェーズの実行ボタンをクリックした場合, the SDD Orchestrator shall `/kiro:bug-verify`コマンドを実行する
5. When ユーザーがDeployフェーズの実行ボタンをクリックした場合, the SDD Orchestrator shall `/commit`コマンドを実行する
6. While フェーズコマンドが実行中の場合, the SDD Orchestrator shall 実行中フェーズの実行ボタンを無効化する
7. While フェーズコマンドが実行中の場合, the SDD Orchestrator shall 実行中インジケータを表示する

### Requirement 5: 選択状態の管理

**Objective:** As a ユーザー, I want Bugの選択状態がセッション中保持される, so that タブ切り替え時に選択状態が維持され、再起動時にはリセットされる

#### Acceptance Criteria
1. When ユーザーがBugアイテムを選択した場合, the SDD Orchestrator shall 選択状態をメモリ上で保持する
2. When ユーザーがSpecsタブとBugsタブを切り替えた場合, the SDD Orchestrator shall 各タブの選択状態を個別に維持する
3. When アプリケーションを再起動した場合, the SDD Orchestrator shall Bugの選択状態をリセットする（永続化しない）
4. When 選択中のBugが削除された場合, the SDD Orchestrator shall 選択状態を解除し、未選択状態に戻す

### Requirement 6: Specsタブとの一貫性

**Objective:** As a ユーザー, I want BugsタブがSpecsタブと一貫した操作感を持つ, so that 学習コストを抑えて直感的に操作できる

#### Acceptance Criteria
1. The SDD Orchestrator shall Bugsタブの3ペインレイアウト（左：リスト、中央：ドキュメント、右：ワークフロー+Agent）をSpecsタブと同じ構成にする
2. The SDD Orchestrator shall ワークフロービューのUIデザイン（フェーズアイテム、コネクタ、進捗アイコン）をSpecsタブと同じスタイルにする
3. The SDD Orchestrator shall Agent一覧パネルのUIデザインをSpecsタブと同じスタイルにする
4. When フェーズ実行ボタンがクリックされた場合, the SDD Orchestrator shall Specsタブと同様のAgent起動・ログ表示動作を行う
