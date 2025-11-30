# Requirements Document

## Introduction

本ドキュメントは、SDD Manager Electronアプリケーションの左ペイン（サイドバー）UIリファクタリングに関する要件を定義する。主な変更点は以下の通り：

1. プロジェクト選択UIをメニューバーのみに移行
2. 新規仕様作成ボタンを+アイコン化
3. ディレクトリチェック表示の最適化（正常時非表示、エラー時バナー表示）
4. グローバルAgent領域の追加（specに紐づかないエージェント一覧）
5. CreateSpecDialogを説明のみ入力に変更し、/spec-manager:initを起動する実装

## Requirements

### Requirement 1: プロジェクト選択のメニューバー移行

**Objective:** As a ユーザー, I want プロジェクト選択をメニューバーから行う, so that サイドバーのスペースを有効活用し、より多くの仕様を一覧表示できる

#### Acceptance Criteria

1. When ユーザーがメニューバーの「ファイル」メニューを開く, the SDD Manager shall プロジェクト選択オプションを表示する
2. When ユーザーがメニューバーからプロジェクトを選択する, the SDD Manager shall 選択されたプロジェクトを読み込み、仕様一覧を更新する
3. The SDD Manager shall 現在選択中のプロジェクト名をウィンドウタイトルまたはヘッダーに表示する
4. The SDD Manager shall サイドバーからProjectSelectorコンポーネントを削除する

### Requirement 2: 新規仕様作成ボタンのアイコン化

**Objective:** As a ユーザー, I want 新規仕様作成ボタンをコンパクトな+アイコンで表示, so that サイドバーのスペースを節約しつつ直感的に操作できる

#### Acceptance Criteria

1. The SDD Manager shall 仕様一覧ヘッダーに+アイコンボタンを表示する
2. When ユーザーが+アイコンボタンをクリックする, the SDD Manager shall 新規仕様作成ダイアログを表示する
3. When +アイコンボタンにマウスをホバーする, the SDD Manager shall 「新規仕様を作成」というツールチップを表示する
4. While プロジェクトが選択されていない, the SDD Manager shall +アイコンボタンを無効化（disabled）状態で表示する

### Requirement 3: ディレクトリチェック表示の最適化

**Objective:** As a ユーザー, I want ディレクトリチェックを正常時は非表示にしエラー時のみ表示, so that 通常操作時のUIがクリーンになり、問題発生時のみ注意を引くことができる

#### Acceptance Criteria

1. While .kiro、specs、steeringディレクトリがすべて存在する, the SDD Manager shall ディレクトリチェック領域を非表示にする
2. If いずれかの必須ディレクトリが存在しない, the SDD Manager shall サイドバー上部にエラーバナーを表示する
3. When エラーバナーが表示される, the SDD Manager shall 不足しているディレクトリの名前を一覧表示する
4. When エラーバナーをクリックする, the SDD Manager shall 初期化オプション（.kiroを初期化ボタン等）を展開表示する
5. If spec-managerファイルが不足している, the SDD Manager shall エラーバナー内にインストールオプションを表示する

### Requirement 4: グローバルAgent領域の追加

**Objective:** As a ユーザー, I want specに紐づかないグローバルなエージェントを一覧で確認, so that プロジェクト全体で実行中のすべてのエージェントを把握できる

#### Acceptance Criteria

1. The SDD Manager shall 仕様一覧の下部にグローバルAgent領域を表示する
2. The SDD Manager shall specに紐づかない（specIdがnullまたはundefinedの）エージェントをグローバルAgent領域に表示する
3. While グローバルエージェントが存在しない, the SDD Manager shall グローバルAgent領域を折りたたみまたは非表示にする
4. When グローバルエージェントをクリックする, the SDD Manager shall そのエージェントのログパネルを表示する
5. The SDD Manager shall 各グローバルエージェントの実行状態（running/stopped/error）をアイコンで表示する
6. When グローバルエージェントの状態が変化する, the SDD Manager shall リアルタイムでUI表示を更新する

### Requirement 5: CreateSpecDialogの簡略化とspec-manager連携

**Objective:** As a ユーザー, I want 仕様作成時は説明のみ入力してspec-managerに処理を委譲, so that 仕様名の自動生成など高度な初期化処理を利用できる

#### Acceptance Criteria

1. When CreateSpecDialogが表示される, the SDD Manager shall 説明（description）入力フィールドのみを表示する
2. The SDD Manager shall 仕様名（name）入力フィールドをCreateSpecDialogから削除する
3. When ユーザーが作成ボタンをクリックする, the SDD Manager shall 入力された説明を引数として/spec-manager:initコマンドを起動する
4. While /spec-manager:initが実行中, the SDD Manager shall ローディング状態をダイアログに表示する
5. When /spec-manager:initが完了する, the SDD Manager shall 作成された仕様を仕様一覧に追加し、ダイアログを閉じる
6. If /spec-manager:initがエラーを返す, the SDD Manager shall エラーメッセージをダイアログ内に表示する

### Requirement 6: サイドバーレイアウトの再構成

**Objective:** As a ユーザー, I want サイドバーが効率的に整理されている, so that 限られた画面スペースで必要な情報にアクセスしやすくなる

#### Acceptance Criteria

1. The SDD Manager shall サイドバーを上から順に「エラーバナー（存在時のみ）」「仕様一覧ヘッダー」「仕様一覧」「グローバルAgent領域」の構成で表示する
2. The SDD Manager shall 仕様一覧がスクロール可能な領域として表示する
3. The SDD Manager shall グローバルAgent領域をサイドバー下部に固定表示する
4. While サイドバーの高さが不足する, the SDD Manager shall 仕様一覧領域のみをスクロールさせ、グローバルAgent領域は常に表示する
5. The SDD Manager shall 仕様一覧ヘッダーに仕様件数と+アイコンボタンを並べて表示する
