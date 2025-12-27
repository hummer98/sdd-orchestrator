# Requirements Document

## Project Description (Input)
ArtifactEditorにテキスト内検索機能を追加する。エディタ内のテキストをCtrl+Fのようなショートカットで検索でき、マッチした箇所をハイライト表示する機能。

## Introduction

ArtifactEditorはSDD OrchestratorにおいてSpec/Bugドキュメント（requirements.md、design.md、tasks.md等）を閲覧・編集するための中核コンポーネントである。本機能では、エディタ内のテキスト検索機能を追加し、大規模なドキュメントでも目的の情報に素早くアクセスできるようにする。

キーボードショートカット（Ctrl+F / Cmd+F）で検索UIを呼び出し、入力した検索語句に対してマッチ箇所をハイライト表示する。マッチ間のナビゲーション機能により、効率的なドキュメント探索を実現する。

## Requirements

### Requirement 1: 検索UIの表示・非表示

**Objective:** As a ユーザー, I want キーボードショートカットで検索バーを呼び出したい, so that 素早く検索を開始できる

#### Acceptance Criteria
1. When ユーザーがArtifactEditor上でCtrl+F（macOSではCmd+F）を押下した場合, the ArtifactEditor shall 検索バーを表示する
2. When 検索バーが表示されている状態でEscapeキーを押下した場合, the ArtifactEditor shall 検索バーを非表示にし、ハイライトをクリアする
3. When 検索バーが表示された場合, the ArtifactEditor shall 検索入力フィールドに自動的にフォーカスを設定する
4. While 検索バーが表示されている状態, the ArtifactEditor shall 閉じるボタン（×アイコン）を表示する
5. When ユーザーが閉じるボタンをクリックした場合, the ArtifactEditor shall 検索バーを非表示にし、ハイライトをクリアする

### Requirement 2: テキスト検索の実行

**Objective:** As a ユーザー, I want 検索語句を入力してドキュメント内を検索したい, so that 目的の情報を素早く見つけられる

#### Acceptance Criteria
1. When ユーザーが検索バーに文字を入力した場合, the ArtifactEditor shall エディタ内のテキストに対してリアルタイムに検索を実行する
2. When 検索語句がドキュメント内に存在する場合, the ArtifactEditor shall マッチした全ての箇所をハイライト表示する
3. When 検索語句がドキュメント内に存在しない場合, the ArtifactEditor shall マッチ件数を0として表示する
4. While 検索が実行されている状態, the ArtifactEditor shall 現在のマッチ件数を「N件中M件目」形式で表示する
5. When 検索バーの入力が空になった場合, the ArtifactEditor shall 全てのハイライトをクリアする

### Requirement 3: マッチ箇所間のナビゲーション

**Objective:** As a ユーザー, I want マッチ箇所を順番に移動したい, so that 複数のマッチを効率的に確認できる

#### Acceptance Criteria
1. When ユーザーが「次へ」ボタンをクリックまたはEnterキーを押下した場合, the ArtifactEditor shall 次のマッチ箇所にスクロールし、現在位置を更新する
2. When ユーザーが「前へ」ボタンをクリックまたはShift+Enterを押下した場合, the ArtifactEditor shall 前のマッチ箇所にスクロールし、現在位置を更新する
3. When 最後のマッチ箇所で「次へ」が実行された場合, the ArtifactEditor shall 最初のマッチ箇所に循環移動する
4. When 最初のマッチ箇所で「前へ」が実行された場合, the ArtifactEditor shall 最後のマッチ箇所に循環移動する
5. While マッチ箇所間を移動している状態, the ArtifactEditor shall 現在アクティブなマッチ箇所を他のマッチ箇所と視覚的に区別して表示する

### Requirement 4: ハイライト表示

**Objective:** As a ユーザー, I want マッチ箇所が視覚的に目立つように表示されてほしい, so that 検索結果を素早く認識できる

#### Acceptance Criteria
1. The ArtifactEditor shall マッチ箇所を背景色で強調表示する
2. The ArtifactEditor shall 現在アクティブなマッチ箇所を、他のマッチ箇所と異なる色で強調表示する
3. While プレビューモードで表示している状態, the ArtifactEditor shall Markdownレンダリング後のコンテンツに対してもハイライトを適用する
4. While 編集モードで表示している状態, the ArtifactEditor shall ソーステキストに対してハイライトを適用する

### Requirement 5: 検索オプション

**Objective:** As a ユーザー, I want 検索条件をカスタマイズしたい, so that より精度の高い検索ができる

#### Acceptance Criteria
1. The ArtifactEditor shall 大文字・小文字を区別するオプション（Case Sensitive）を提供する
2. When 大文字・小文字区別オプションが有効な場合, the ArtifactEditor shall 大文字・小文字を厳密に区別して検索する
3. When 大文字・小文字区別オプションが無効な場合, the ArtifactEditor shall 大文字・小文字を区別せずに検索する（デフォルト動作）
