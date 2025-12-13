# Requirements Document

## Introduction

本文書は、Slash Command責務分離機能の要件を定義する。現在の `/kiro:spec-*` コマンドはSubagent内でspec.jsonのバリデーション・更新を行っており、AIにとって不得意な定型作業をさせている問題がある。新しい `/spec-manager:*` コマンドセットでは、AIは純粋な成果物生成に集中し、spec.json管理は全てElectron側（TypeScript）で実行する責務分離を実現する。

## Requirements

### Requirement 1: 成果物生成コマンド

**Objective:** 開発者として、AIが成果物生成のみに集中するコマンドを使用したい。これにより、AIが得意な創造的作業に専念でき、生成品質が向上する。

#### Acceptance Criteria
1. When ユーザーが `/spec-manager:init` コマンドを実行した場合, the Spec Manager shall プロジェクト説明からfeature名を生成し、spec.jsonとrequirements.md（プロジェクト説明のみ）を初期化する
2. When ユーザーが `/spec-manager:requirements` コマンドを実行した場合, the Spec Manager shall 指定されたfeatureのrequirements.mdのみを生成する
3. When ユーザーが `/spec-manager:design` コマンドを実行した場合, the Spec Manager shall 指定されたfeatureのdesign.mdのみを生成する
4. When ユーザーが `/spec-manager:tasks` コマンドを実行した場合, the Spec Manager shall 指定されたfeatureのtasks.mdのみを生成する
5. When ユーザーが `/spec-manager:impl` コマンドを実行した場合, the Spec Manager shall 指定されたタスクの実装のみを実行する
6. The Spec Manager shall 成果物生成コマンド（requirements/design/tasks/impl）においてspec.jsonの更新を行わない（読み取りは許可）
7. The Spec Manager shall initコマンドにおいてspec.jsonとrequirements.mdの初期ファイル作成を行う（これは初期化であり更新ではない）

### Requirement 2: 生成完了確認機構

**Objective:** Electronアプリとして、AI生成ログを解析して完了状態を確認したい。これにより、spec.json更新のトリガーを正確に判断できる。

#### Acceptance Criteria
1. When requirements生成が完了した場合, the LogParser shall ログのresult行から`subtype`を読み取り、`success`であれば完了と判定する
2. When design生成が完了した場合, the LogParser shall ログのresult行から`subtype`を読み取り、`success`であれば完了と判定する
3. When tasks生成が完了した場合, the LogParser shall ログのresult行から`subtype`を読み取り、`success`であれば完了と判定する
4. When impl実行が完了した場合, the Spec Manager shall Claude API Structured Outputを使用してresult行と最後のassistantメッセージを解析し、完了タスクを型安全なJSONとして取得する
5. The LogParser shall result行のsubtypeとして`success`、`error_max_turns`、`error_during_execution`、`no_result`を識別する
6. If ログにresult行が存在しない場合, then the LogParser shall `no_result`を返す

### Requirement 3: spec.json管理のElectron側移行

**Objective:** アーキテクトとして、spec.json管理を全てElectron側で実行したい。これにより、AIの責務を純粋な成果物生成に限定できる。

#### Acceptance Criteria
1. When 完了判定がsuccessの場合, the Electron App shall 対応するphaseのspec.jsonを自動更新する
2. When 完了判定がerrorの場合, the Electron App shall spec.jsonを更新せずエラー状態を表示する
3. The Electron App shall spec.jsonのphaseフィールドを適切なフェーズ値に遷移させる
4. The Electron App shall spec.jsonのapprovals配下のgeneratedフラグを更新する
5. The Electron App shall spec.jsonのupdated_atタイムスタンプを現在時刻で更新する
6. While spec.jsonの更新中, the Electron App shall 他のspec操作をブロックする

### Requirement 4: Slash CommandおよびSDD設定インストール機能

**Objective:** 開発者として、プロジェクトにSlash CommandやSDD設定ファイルが不足している場合に簡単にインストールしたい。これにより、新規プロジェクトでもスムーズにSDDワークフローを開始できる。

#### Acceptance Criteria
1. When プロジェクトを開いた場合, the Project Checker shall Slash Commandファイルの存在を確認する
2. When プロジェクトを開いた場合, the Project Checker shall SDD設定ファイル（`.kiro/settings/`配下）の存在を確認する
3. If 必要なSlash Commandファイルが不足している場合, then the Project Checker shall インストールボタンを表示する
4. If 必要なSDD設定ファイルが不足している場合, then the Project Checker shall インストールボタンを表示する
5. When ユーザーがインストールボタンをクリックした場合, the Installer shall 不足しているファイルをプロジェクトにコピーする
6. The Project Checker shall 確認対象として5つの新コマンド（init, requirements, design, tasks, impl）を含める
7. The Project Checker shall 確認対象として必須SDD設定ファイル（rules/ears-format.md, rules/tasks-generation.md, rules/tasks-parallel-analysis.md, templates/specs/init.json, templates/specs/requirements-init.md, templates/specs/requirements.md, templates/specs/design.md, templates/specs/tasks.md）を含める
8. When インストールが完了した場合, the Installer shall 成功メッセージを表示する
9. If インストール中にエラーが発生した場合, then the Installer shall エラー詳細を表示し、ロールバック可能な状態を維持する

### Requirement 5: コマンド実行フロー

**Objective:** 開発者として、生成から確認までの一連のフローを効率的に実行したい。これにより、SDDワークフローがスムーズに進行する。

#### Acceptance Criteria
1. When 生成コマンドが完了した場合, the Electron App shall ログのresult行を解析して完了判定を行う（requirements/design/tasksの場合）、またはImplCompletionAnalyzerで解析する（implの場合）
2. When 完了判定がsuccessの場合, the Electron App shall UIに次のフェーズへの進行ボタンを表示する
3. While 生成コマンドが実行中の場合, the Electron App shall 進行状況をUIに表示する
4. If 完了判定がerrorの場合, then the Electron App shall 再実行ボタンとエラー詳細を表示する
5. The Electron App shall 各フェーズの完了状態をリアルタイムでUIに反映する
6. If ログにresult行が存在しない（no_result）場合, then the Electron App shall セッションレジューム + "continue"で自動リトライを実行する（最大2回）
7. While リトライ中の場合, the Electron App shall `continuing`ステータスとリトライ回数をUIに表示する
8. If リトライ上限（2回）に達した場合, then the Electron App shall `stalled`ステータスを設定し、自動実行時はスキップして次へ進み、手動実行時はUI通知のみ行う

### Requirement 6: impl完了解析（Claude API Structured Output）

**Objective:** システム連携担当者として、impl完了解析の出力を100%確実にパースしたい。これにより、Electron側での自動処理が安定する。

#### Acceptance Criteria
1. The ImplCompletionAnalyzer shall Claude API Structured Outputを使用してJSON出力を保証する
2. The ImplCompletionAnalyzer shall Zodスキーマで型安全な出力を取得する
3. The ImplCompletionAnalyzer shall completedTasksフィールドに完了したタスクIDの配列を含める（例: ["1.1", "1.2"]）
4. The ImplCompletionAnalyzer shall statsフィールドに実行統計（num_turns, duration_ms, total_cost_usd）を含める
5. The ImplCompletionAnalyzer shall パース失敗が原理的に発生しない設計とする
6. The ImplCompletionAnalyzer shall `@anthropic-ai/sdk`のbeta.messages.parseを使用する
