# Requirements Document

## Introduction

本ドキュメントは、SDD Orchestratorにおけるプロジェクト選択機能の統一に関する要件を定義する。現状、コマンドライン引数、メニュー、IPC（setProjectPath）で別々の処理パスが存在し、特にsetProjectPathはUIを更新しないという問題がある。本機能では、すべての経路から呼び出される統一されたselectProjectハンドラーを実装し、一貫したプロジェクト選択動作を実現する。

## Requirements

### Requirement 1: 統一IPCハンドラーの作成

**Objective:** As a 開発者, I want プロジェクト選択のための統一されたIPCハンドラーを使用したい, so that すべての経路で一貫した動作を保証できる

#### Acceptance Criteria
1. The SDD Manager shall selectProjectというIPCハンドラーを提供する
2. When selectProjectハンドラーが呼び出された時, the SDD Manager shall プロジェクトパスの検証を実行する
3. When 有効なプロジェクトパスが指定された時, the SDD Manager shall configStoreのprojectPathを更新する
4. When 有効なプロジェクトパスが指定された時, the SDD Manager shall ファイルウォッチャーを初期化する
5. When 有効なプロジェクトパスが指定された時, the SDD Manager shall specs、bugs等のデータを読み込む
6. If 無効なパスが指定された場合, the SDD Manager shall エラーメッセージを返却する

### Requirement 2: 既存経路の統合

**Objective:** As a 開発者, I want 既存のプロジェクト選択経路をselectProjectハンドラーに統合したい, so that コードの重複を排除し保守性を向上できる

#### Acceptance Criteria
1. When コマンドライン引数でプロジェクトパスが指定された時, the SDD Manager shall selectProjectハンドラーを呼び出す
2. When メニューからプロジェクトを選択した時, the SDD Manager shall selectProjectハンドラーを呼び出す
3. When IPCでプロジェクトを設定した時, the SDD Manager shall selectProjectハンドラーを呼び出す
4. The SDD Manager shall 従来のsetProjectPathハンドラーを廃止またはselectProjectへのエイリアスとする

### Requirement 3: UIの自動更新

**Objective:** As a ユーザー, I want プロジェクト選択後にUIが自動的に更新されることを期待する, so that 現在のプロジェクト状態を常に確認できる

#### Acceptance Criteria
1. When プロジェクトが選択された時, the SDD Manager shall サイドバーのSpec一覧を更新する
2. When プロジェクトが選択された時, the SDD Manager shall サイドバーのBug一覧を更新する
3. When プロジェクトが選択された時, the SDD Manager shall ウィンドウタイトルにプロジェクトパスを表示する
4. When プロジェクトが選択された時, the SDD Manager shall ステータスバーにプロジェクト情報を表示する

### Requirement 4: E2Eテスト・デバッグ対応

**Objective:** As a テスト担当者, I want selectProjectハンドラーをE2Eテストやデバッグで使用したい, so that プログラム的にプロジェクトを切り替えてテストできる

#### Acceptance Criteria
1. The SDD Manager shall selectProjectハンドラーをwindow.electronAPI経由で公開する
2. When MCP経由でselectProjectが呼び出された時, the SDD Manager shall 通常の操作と同様にプロジェクトを選択する
3. The SDD Manager shall selectProjectの呼び出し結果（成功/失敗）を返却する
4. If プロジェクト選択が失敗した場合, the SDD Manager shall 失敗理由を含むエラーオブジェクトを返却する

### Requirement 5: プロジェクトパスの検証

**Objective:** As a ユーザー, I want 無効なプロジェクトパスが指定された場合に適切なフィードバックを受けたい, so that 問題を迅速に特定できる

#### Acceptance Criteria
1. When プロジェクトパスが指定された時, the SDD Manager shall ディレクトリの存在を確認する
2. If 指定されたパスがディレクトリでない場合, the SDD Manager shall エラーを返却する
3. If 指定されたパスにアクセス権限がない場合, the SDD Manager shall エラーを返却する
4. While プロジェクトを選択中, the SDD Manager shall .kiroディレクトリの有無を確認する（警告のみ、エラーにはしない）

### Requirement 6: 状態の一貫性保証

**Objective:** As a 開発者, I want プロジェクト切り替え時に状態が一貫していることを保証したい, so that 予期しない動作を防止できる

#### Acceptance Criteria
1. When 新しいプロジェクトが選択された時, the SDD Manager shall 既存のファイルウォッチャーを停止する
2. When 新しいプロジェクトが選択された時, the SDD Manager shall 既存のプロジェクト関連データをクリアする
3. When プロジェクト選択中にエラーが発生した時, the SDD Manager shall 前の状態を維持する
4. The SDD Manager shall プロジェクト選択操作を排他的に実行する（同時に複数の選択操作を防止）
