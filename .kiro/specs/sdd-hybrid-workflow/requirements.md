# Requirements Document

## Introduction

本ドキュメントは、SDD Manager (Spec-Driven Development Manager) の Spec Manager画面右ペインを刷新し、AI-アルゴリズムハイブリッドワークフローを実現するためのUI要件を定義する。

SDDワークフローは「要件定義 -> 設計 -> タスク -> 実装 -> 検査 -> デプロイ」の6フェーズで構成され、各フェーズはspec.jsonの状態に基づいて「pending（未実行）」「generated（生成完了）」「approved（承認済）」の状態遷移を行う。本機能はこのワークフロー全体を可視化し、手動/自動の両モードでフェーズ実行を制御するUIを提供する。

## Requirements

### Requirement 1: ワークフロービューの基本表示

**Objective:** As a 開発者, I want SDDの全フェーズを縦に一覧表示するビューを見ること, so that ワークフロー全体の進捗と現在の状態を把握できる

#### Acceptance Criteria

1. When Spec Managerの右ペインが表示されるとき, the WorkflowView shall 「要件定義」「設計」「タスク」「実装」「検査」「デプロイ」の6フェーズを縦に並べて表示する
2. The WorkflowView shall 各フェーズ間を矢印（↓）で接続して遷移順序を視覚的に示す
3. When spec.jsonが読み込まれたとき, the WorkflowView shall approvalsフィールドに基づいて各フェーズの状態（pending/generated/approved）を判定する
4. The WorkflowView shall ページ下部に「自動実行」ボタンと「spec-status実行」ボタンを常時表示する

### Requirement 2: フェーズ状態に応じたUI表示

**Objective:** As a 開発者, I want 各フェーズの状態に応じて適切なボタンとラベルを見ること, so that 次に取るべきアクションが明確になる

#### Acceptance Criteria

1. While フェーズがpending状態のとき, the WorkflowView shall そのフェーズに「実行」ボタンを表示する
2. While フェーズがgenerated状態のとき, the WorkflowView shall そのフェーズに「生成完了」ラベルと「承認」ボタンを表示する
3. While フェーズがapproved状態のとき, the WorkflowView shall そのフェーズに承認済みアイコン（チェックマーク）と「承認済」ラベルを表示する
4. While 前フェーズがgenerated状態で次フェーズがpendingのとき, the WorkflowView shall 次フェーズに「承認して実行」ボタンを表示する
5. When 「生成完了」リンクがクリックされたとき, the WorkflowView shall そのフェーズを実行したときのAgentログを表示する

### Requirement 3: フェーズ手動実行機能

**Objective:** As a 開発者, I want 各フェーズを手動で実行・承認できること, so that 段階的にレビューしながらワークフローを進められる

#### Acceptance Criteria

1. When 「実行」ボタンがクリックされたとき, the WorkflowView shall 該当フェーズのスラッシュコマンド（spec-requirements, spec-design, spec-tasks, spec-impl）をElectron IPC経由でAgentプロセスに送信する
2. While コマンド実行中のとき, the WorkflowView shall 「実行」ボタンをローディング表示+「実行中」ラベルに変更しdisable状態にする
3. When コマンドが完了したとき, the WorkflowView shall spec.jsonのapprovals.[phase].generatedをtrueに更新する
4. When 「承認」ボタンがクリックされたとき, the WorkflowView shall spec.jsonのapprovals.[phase].approvedをtrueに更新する
5. When 「承認して実行」ボタンがクリックされたとき, the WorkflowView shall 前フェーズを承認してから次フェーズのコマンドを実行する

### Requirement 4: バリデーション実行オプション

**Objective:** As a 開発者, I want フェーズ間でvalidate-*コマンドを実行できること, so that 成果物の品質を検証しながら進められる

#### Acceptance Criteria

1. The WorkflowView shall 「要件定義」と「設計」の間にvalidate-gapの実行オプションを表示する
2. The WorkflowView shall 「設計」と「タスク」の間にvalidate-designの実行オプションを表示する
3. The WorkflowView shall 「実装」と「検査」の間にvalidate-implの実行オプションを表示する
4. When validate実行オプションのチェックボックスがオンでその位置に到達したとき, the WorkflowView shall 該当のvalidateコマンドを自動実行する
5. When validate実行オプションの横の「実行」ボタンがクリックされたとき, the WorkflowView shall 該当のvalidateコマンドを即時実行する

### Requirement 5: 自動実行許可の設定

**Objective:** As a 開発者, I want 各フェーズの自動実行許可を切り替えられること, so that どこで停止するかを事前に指定できる

#### Acceptance Criteria

1. The WorkflowView shall 各フェーズ名の左側に自動実行許可アイコン（許可: 再生アイコン / 停止: 禁止アイコン）を表示する
2. When フェーズ名がクリックされたとき, the WorkflowView shall そのフェーズの自動実行許可をトグル（許可/停止を切り替え）する
3. The WorkflowView shall デフォルトで「要件定義」のみ許可、それ以外は停止の状態で表示する
4. The WorkflowView shall 自動実行許可の状態をローカルストレージに保存し、次回表示時に復元する

### Requirement 6: 自動実行モード

**Objective:** As a 開発者, I want 複数フェーズを自動で連続実行できること, so that 手動操作を最小限にしてワークフローを進められる

#### Acceptance Criteria

1. When 「自動実行」ボタンがクリックされたとき, the WorkflowView shall 現在のフェーズから自動実行許可があるフェーズまで連続実行を開始する
2. While 自動実行中のとき, the WorkflowView shall 「自動実行」ボタンを「停止」ボタンに変更し、自動実行状態を視覚的に示す
3. When 自動実行許可が停止（禁止アイコン）のフェーズに到達したとき, the WorkflowView shall 自動実行を停止し人間の操作を待つ
4. When 「停止」ボタンがクリックされたとき, the WorkflowView shall 現在実行中のフェーズ完了後に自動実行を停止する
5. If Agentプロセスがエラー終了したとき, then the WorkflowView shall 自動実行を停止しエラー状態を表示する
6. When 全フェーズが完了したとき, the WorkflowView shall 「全工程完了」メッセージを表示し「自動実行」ボタンをdisable状態にする

### Requirement 7: 実装フェーズのタスク進捗表示

**Objective:** As a 開発者, I want 実装フェーズでタスク単位の進捗を見ること, so that どのタスクが完了したか把握できる

#### Acceptance Criteria

1. While 実装フェーズが表示されているとき, the WorkflowView shall tasks.mdから読み取ったタスク一覧をサブアイテムとして表示する
2. The WorkflowView shall 各タスクの状態を「未着手」「実行中」「完了」のいずれかで表示する
3. When タスクが実行開始されたとき, the WorkflowView shall 該当タスクの状態を「実行中」に更新する
4. When タスクが完了したとき, the WorkflowView shall 該当タスクの状態を「完了」に更新しチェックマークアイコンを表示する
5. When 全タスクが完了したとき, the WorkflowView shall 実装フェーズを「完了」状態に更新する

### Requirement 8: 検査・デプロイフェーズの実行

**Objective:** As a 開発者, I want 検査フェーズとデプロイフェーズを実行できること, so that ワークフロー全体を完了できる

#### Acceptance Criteria

1. While 実装フェーズが完了しているとき, the WorkflowView shall 検査フェーズに「実行」ボタンを表示する
2. When 検査フェーズの「実行」ボタンがクリックされたとき, the WorkflowView shall validate-implスラッシュコマンドをAgentプロセスに送信する
3. When 検査フェーズが完了したとき, the WorkflowView shall spec.jsonにinspection_completed: trueを設定しデプロイフェーズを有効化する
4. While 検査フェーズが完了しているとき, the WorkflowView shall デプロイフェーズに「実行」ボタンを表示する
5. When デプロイフェーズの「実行」ボタンがクリックされたとき, the WorkflowView shall deploymentスラッシュコマンドをAgentプロセスに送信する
6. When デプロイフェーズが完了したとき, the WorkflowView shall spec.jsonにdeploy_completed: trueを設定する

### Requirement 9: spec-status実行機能

**Objective:** As a 開発者, I want いつでもspec-statusを実行できること, so that 現在の仕様の状態を確認できる

#### Acceptance Criteria

1. The WorkflowView shall 「spec-status実行」ボタンを常にenable状態で表示する
2. When 「spec-status実行」ボタンがクリックされたとき, the WorkflowView shall spec-statusスラッシュコマンドをAgentプロセスに送信する
3. When spec-statusコマンドが完了したとき, the WorkflowView shall 実行結果をAgentログパネルに表示する

### Requirement 10: 成果物一覧の保持

**Objective:** As a 開発者, I want requirements.md、design.md、tasks.mdの内容を引き続き確認できること, so that 各フェーズの成果物をレビューできる

#### Acceptance Criteria

1. The WorkflowView shall 成果物一覧（requirements.md、design.md、tasks.md）の表示機能を保持する
2. When 成果物名がクリックされたとき, the WorkflowView shall 該当ファイルの内容をMarkdownプレビューで表示する
3. When 該当ファイルが存在しないとき, the WorkflowView shall 「未作成」ラベルを表示する

### Requirement 11: バックエンド通信（Electron IPC）

**Objective:** As a 開発者, I want UIからのコマンド実行要求をバックエンドに送信できること, so that Agentプロセスを制御できる

#### Acceptance Criteria

1. The WorkflowView shall フェーズ実行コマンドをElectron IPC経由でメインプロセスに送信する
2. The WorkflowView shall コマンド実行結果（成功/失敗/出力）をIPC経由で受信する
3. When IPCでAgentプロセスの状態変化イベントを受信したとき, the WorkflowView shall UIの状態を更新する
4. If IPC通信がタイムアウトしたとき, then the WorkflowView shall エラーメッセージを表示しリトライオプションを提供する
