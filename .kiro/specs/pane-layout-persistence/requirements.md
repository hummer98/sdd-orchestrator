# Requirements Document

## Introduction

本ドキュメントは、SDD Orchestratorにおけるプロジェクト毎のUIレイアウト設定（ペインサイズ）を永続化する機能の要件を定義する。ユーザーがペインをリサイズした際に自動的に設定を保存し、次回プロジェクトを開いた際に復元することで、作業環境の継続性を実現する。

## Requirements

### Requirement 1: レイアウト設定の保存

**Objective:** ユーザーとして、ペインのサイズを調整した際に自動的に保存されてほしい。次回プロジェクトを開いたときに同じレイアウトで作業を再開したいため。

#### Acceptance Criteria

1. When ユーザーがペインのリサイズを完了する, the SDD Orchestrator shall 現在のペインサイズを `.kiro/sdd-orchestrator.json` に保存する
2. When `.kiro/sdd-orchestrator.json` が存在しない状態で初回リサイズが完了する, the SDD Orchestrator shall 新規にファイルを作成して設定を保存する
3. When 保存処理中にエラーが発生する, the SDD Orchestrator shall エラーをログに記録し、UIの動作を中断しない
4. The SDD Orchestrator shall ペインサイズをピクセル値またはパーセンテージとして保存する

### Requirement 2: レイアウト設定の復元

**Objective:** ユーザーとして、プロジェクトを開いた際に以前設定したペインサイズが自動的に復元されてほしい。毎回手動でレイアウトを調整する手間を省きたいため。

#### Acceptance Criteria

1. When プロジェクトが選択される, the SDD Orchestrator shall `.kiro/sdd-orchestrator.json` からレイアウト設定を読み込む
2. If `.kiro/sdd-orchestrator.json` が存在しない, then the SDD Orchestrator shall デフォルトのレイアウト値を適用する
3. If 設定ファイルの読み込みに失敗する, then the SDD Orchestrator shall デフォルトのレイアウト値を適用しエラーをログに記録する
4. If 設定ファイルのフォーマットが不正である, then the SDD Orchestrator shall デフォルトのレイアウト値を適用し警告をログに記録する

### Requirement 3: レイアウトのリセット機能

**Objective:** ユーザーとして、レイアウトをデフォルト状態にリセットする方法がほしい。レイアウトが使いにくくなった場合に元に戻したいため。

#### Acceptance Criteria

1. When ユーザーがメニュー「表示」から「レイアウトをリセット」を選択する, the SDD Orchestrator shall すべてのペインサイズをデフォルト値にリセットする
2. When レイアウトがリセットされる, the SDD Orchestrator shall リセット後のデフォルト値を `.kiro/sdd-orchestrator.json` に保存する
3. The SDD Orchestrator shall メニューバーの「表示」メニュー内に「レイアウトをリセット」項目を配置する

### Requirement 4: 設定ファイルの構造

**Objective:** 開発者として、設定ファイルが明確で拡張可能な構造を持っていてほしい。将来的に他の設定も追加できるようにしたいため。

#### Acceptance Criteria

1. The SDD Orchestrator shall 設定を `.kiro/sdd-orchestrator.json` ファイルに JSON 形式で保存する
2. The SDD Orchestrator shall レイアウト設定を `layout` キー配下に格納する
3. The SDD Orchestrator shall 各ペインのサイズを識別可能な名前で管理する
4. The SDD Orchestrator shall 設定ファイルに `version` フィールドを含め、将来のフォーマット変更に対応可能にする

### Requirement 5: デフォルト値の定義

**Objective:** ユーザーとして、初回起動時やリセット時に適切なデフォルトレイアウトで開始したい。最初から使いやすいレイアウトで作業を始めたいため。

#### Acceptance Criteria

1. The SDD Orchestrator shall アプリケーション内にデフォルトのペインサイズを定義する
2. While 設定ファイルが存在しない, the SDD Orchestrator shall デフォルトのペインサイズを使用して表示する
3. The SDD Orchestrator shall デフォルト値を一箇所で定義し、保存・復元・リセット処理で共有する
