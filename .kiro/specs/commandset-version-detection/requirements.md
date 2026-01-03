# Requirements Document

## Introduction

SDD-Orchestratorのバージョンアップ時に、プロジェクトにインストール済みのコマンドセットが古くなったことを自動検出する機能。コマンドセット毎に独立したセマンティックバージョンを持ち、インストール時に`.kiro/sdd-orchestrator.json`に記録する。プロジェクト一覧表示時に期待バージョンと比較し、差分があれば警告アイコンを表示して再インストールを促す。バージョン不明の既存プロジェクトは`0.0.1`として扱い、常に更新対象となる。

## Scope

- **対象**: Desktop UI のみ
- **Remote UI**: 対象外（Desktop専用機能として実装）

## Requirements

### Requirement 1: コマンドセットバージョンの記録

**Objective:** As a ユーザー, I want コマンドセットインストール時にバージョン情報が記録される, so that 後からバージョン差分を検出できる

#### Acceptance Criteria

1. When コマンドセットをインストールする, the SDD Orchestrator shall インストールしたコマンドセット名とそのセマンティックバージョンを`.kiro/sdd-orchestrator.json`に記録する
2. When 複数のコマンドセットをインストールする, the SDD Orchestrator shall 各コマンドセットのバージョンを個別に記録する
3. The SDD Orchestrator shall コマンドセットバージョンをセマンティックバージョン形式（`MAJOR.MINOR.PATCH`）で管理する
4. When 既存のコマンドセットを再インストールする, the SDD Orchestrator shall 記録済みのバージョン情報を新しいバージョンで上書きする

### Requirement 2: バージョン差分の検出

**Objective:** As a ユーザー, I want プロジェクト読み込み時にコマンドセットの古さを自動検出してほしい, so that 更新が必要なプロジェクトを把握できる

#### Acceptance Criteria

1. When プロジェクトを読み込む, the SDD Orchestrator shall インストール済みコマンドセットのバージョンとアプリ内蔵の期待バージョンを比較する
2. If インストール済みバージョンが期待バージョンより古い, then the SDD Orchestrator shall そのコマンドセットを「更新が必要」と判定する
3. If `.kiro/sdd-orchestrator.json`にバージョン情報が存在しない（レガシープロジェクト）, then the SDD Orchestrator shall バージョンを`0.0.1`として扱い、常に「更新が必要」と判定する
4. If `.kiro/sdd-orchestrator.json`自体が存在しない, then the SDD Orchestrator shall コマンドセット未インストールと判定する
5. The SDD Orchestrator shall セマンティックバージョン比較ルール（MAJOR.MINOR.PATCH）に従ってバージョンの新旧を判定する

### Requirement 3: プロジェクト一覧での警告表示

**Objective:** As a ユーザー, I want プロジェクト一覧で更新が必要なプロジェクトを視覚的に識別したい, so that 更新作業の優先順位を判断できる

#### Acceptance Criteria

1. When プロジェクト一覧を表示する, the SDD Orchestrator shall 各プロジェクトのコマンドセットバージョン状態を確認する
2. If プロジェクトに更新が必要なコマンドセットがある, then the SDD Orchestrator shall そのプロジェクトに警告アイコンを表示する
3. When ユーザーが警告アイコンにホバーする, the SDD Orchestrator shall 更新が必要なコマンドセット名と現在バージョン・期待バージョンをツールチップで表示する
4. While プロジェクトが選択されている, the SDD Orchestrator shall 詳細パネルにコマンドセットバージョン状態を表示する

### Requirement 4: 再インストールの促進

**Objective:** As a ユーザー, I want 古いコマンドセットを簡単に更新したい, so that 最新の機能を利用できる

#### Acceptance Criteria

1. When 更新が必要なプロジェクトを選択する, the SDD Orchestrator shall コマンドセット更新を促すUIを表示する
2. When ユーザーが更新ボタンをクリックする, the SDD Orchestrator shall コマンドセットインストールダイアログを開く
3. If 更新が必要なコマンドセットがある, then the SDD Orchestrator shall インストールダイアログで更新対象のコマンドセットをハイライト表示する

### Requirement 5: バージョン定義のSSOT化（単一情報源）

**Objective:** As a 開発者, I want コマンドセットバージョンの定義が1箇所に集約されてほしい, so that バージョン更新時に1ファイルのみ変更すればよい

#### Acceptance Criteria

1. The SDD Orchestrator shall `CommandsetDefinitionManager.ts`をコマンドセットバージョンの唯一の情報源（SSOT）として使用する
2. The SDD Orchestrator shall `UpdateManager.ts`の`LATEST_VERSIONS`定数を削除する
3. When `UpdateManager`がバージョン情報を必要とする, the SDD Orchestrator shall `CommandsetDefinitionManager`からバージョン情報を取得する
4. The SDD Orchestrator shall バージョン更新時に`CommandsetDefinitionManager.ts`のみの変更で済むようにする

### Requirement 6: sdd-orchestrator.jsonスキーマ拡張

**Objective:** As a 開発者, I want sdd-orchestrator.jsonのスキーマが後方互換性を維持してほしい, so that 既存プロジェクトが正常に動作し続ける

#### Acceptance Criteria

1. The SDD Orchestrator shall 既存の`sdd-orchestrator.json`構造（version, profile, layout）を維持する
2. The SDD Orchestrator shall 新しい`commandsets`フィールドを追加してコマンドセットバージョン情報を格納する
3. If `commandsets`フィールドが存在しない, then the SDD Orchestrator shall レガシーフォーマットとして処理し、エラーを発生させない
4. When 新しいフォーマットで書き込む, the SDD Orchestrator shall `version`フィールドを`3`に更新する
