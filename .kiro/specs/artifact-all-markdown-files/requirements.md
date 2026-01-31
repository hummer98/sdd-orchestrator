# Requirements: Artifact全Markdownファイル表示

## Decision Log

### 表示対象の範囲
- **Discussion**: specフォルダ直下のみか、サブディレクトリも含めるか
- **Conclusion**: specフォルダ直下の*.mdファイルのみを対象とする
- **Rationale**: サブディレクトリを含めると表示が煩雑になる可能性があり、現状の用途では直下のファイルで十分

### 表示順序
- **Discussion**: 固定タブとその他のファイルの表示順序をどうするか
- **Conclusion**:
  1. 固定タブ（requirements, design, tasks）を先頭に配置
  2. その他の*.mdファイルをファイル名のアルファベット順にソート
- **Rationale**: 既存のワークフローを尊重しつつ、追加ファイルは予測可能な順序で表示する

### ファイルフィルタリング
- **Discussion**: 一時ファイルや特定パターンのファイルを除外するか
- **Conclusion**: すべての*.mdファイルを無条件で表示する
- **Rationale**: シンプルさを優先。ユーザーが意図的に配置したファイルはすべて表示する価値がある

## Introduction

現在、Artifactエディタのタブは固定タブ（requirements.md, design.md, tasks.md, research.md）と動的タブ（document-review, inspection）のみを表示している。本機能により、specフォルダ直下に配置されたすべての*.mdファイルがタブとして表示されるようになり、ユーザーが任意のドキュメントを追加・編集できる柔軟性を提供する。

## Requirements

### Requirement 1: Markdownファイルの自動検出

**Objective:** As a ユーザー, I want specフォルダ直下のすべての*.mdファイルをタブとして表示できるようにしたい, so that 任意のドキュメントを追加・編集できる

#### Acceptance Criteria
1. When specが選択されている場合, the system shall specフォルダ直下の*.mdファイルをすべて検出する
2. The system shall サブディレクトリ内の*.mdファイルは対象外とする
3. The system shall 検出されたファイルをタブとして表示する
4. The system shall ファイルの存在/非存在をリアルタイムで反映する（ファイル追加/削除時にタブが更新される）

### Requirement 2: タブの表示順序

**Objective:** As a ユーザー, I want 固定タブが先頭に表示され、その他のファイルが予測可能な順序で表示される, so that 必要なドキュメントを素早く見つけられる

#### Acceptance Criteria
1. The system shall 以下の順序でタブを表示する
   - 第1グループ: requirements.md（存在する場合）
   - 第2グループ: design.md（存在する場合）
   - 第3グループ: tasks.md（存在する場合）
   - 第4グループ: research.md（存在する場合）
   - 第5グループ: document-review-*.md（ラウンド番号順）
   - 第6グループ: inspection-*.md（ラウンド番号順）
   - 第7グループ: その他の*.mdファイル（ファイル名のアルファベット順）
2. The system shall 各グループ内での順序を一貫して保持する

### Requirement 3: ファイル内容の読み書き

**Objective:** As a ユーザー, I want 検出されたすべての*.mdファイルを既存のエディタで編集できる, so that 統一されたUIで作業できる

#### Acceptance Criteria
1. When 任意の*.mdタブをクリックした場合, the system shall そのファイルの内容を読み込んで表示する
2. The system shall 既存のArtifactEditorと同じ編集機能を提供する（編集モード、プレビューモード、検索機能）
3. When ユーザーが内容を変更して保存ボタンを押した場合, the system shall ファイルに変更を書き込む
4. The system shall 未保存の変更がある状態でタブを切り替えようとした場合、確認ダイアログを表示する

### Requirement 4: API拡張

**Objective:** As a システム, I want specフォルダ内の*.mdファイル一覧を取得できる, so that 動的タブを構築できる

#### Acceptance Criteria
1. The system shall specIdを受け取り、そのspecフォルダ直下の*.mdファイル一覧を返すIPC APIを提供する
2. The system shall ファイル名のみを返す（拡張子.mdを含む）
3. If specが存在しない場合, then the system shall エラーを返す
4. The system shall Remote UI（WebSocket経由）でも同等のAPIを提供する

### Requirement 5: SpecDetail型の拡張

**Objective:** As a システム, I want SpecDetail型にMarkdownファイル一覧を含める, so that UIコンポーネントが必要な情報にアクセスできる

#### Acceptance Criteria
1. The system shall SpecDetail型に `markdownFiles?: string[]` フィールドを追加する
2. When getSpecDetailが呼び出された場合, the system shall markdownFilesフィールドにspecフォルダ直下の*.mdファイル一覧を設定する
3. The system shall 固定ファイル（requirements.md, design.md, tasks.md, research.md）を除外しない（すべての*.mdを含める）

### Requirement 6: 既存機能との互換性

**Objective:** As a 開発者, I want 既存のタブ機能が壊れないようにしたい, so that 後方互換性を保てる

#### Acceptance Criteria
1. The system shall 既存の固定タブ（requirements, design, tasks, research）の動作を変更しない
2. The system shall 既存の動的タブ（document-review, inspection）の動作を変更しない
3. The system shall BugPaneのArtifactEditorにも同様の機能を提供する（bugフォルダ直下の*.mdを検出）
4. If specフォルダに*.mdファイルが1つも存在しない場合, then the system shall 「表示可能なアーティファクトがありません」メッセージを表示する

### Requirement 7: パフォーマンス

**Objective:** As a ユーザー, I want ファイル一覧の取得が高速である, so that UIの応答性が損なわれない

#### Acceptance Criteria
1. The system shall ファイル一覧の取得を100ms以内に完了する（通常のSSD環境）
2. The system shall ファイル数が100個を超える場合でも、レンダリングがブロックされない
3. The system shall ファイルウォッチャーによるリアルタイム更新は、既存のspecsWatcherServiceを活用する（新規ウォッチャーを追加しない）

## Out of Scope

- サブディレクトリ内の*.mdファイルの検出（将来的に必要であれば別specで対応）
- *.md以外のファイル形式のサポート（.txt, .rst等）
- タブの並び替え機能（ドラッグ&ドロップ）
- タブのグループ化機能（折りたたみ可能なセクション）
- ファイル名の変更機能（エディタ内でのリネーム）
- 一時ファイルの自動除外（`*.tmp.md`等）

## Open Questions

- ファイルウォッチャーの実装方法: 既存のspecsWatcherServiceを拡張するか、新規ウォッチャーを追加するか（設計フェーズで検討）
- Remote UI対応の優先度: Electron版と同時にRemote UI版も実装するか、段階的に実装するか（タスク分割時に決定）
- エラーハンドリング: ファイル読み込み失敗時の挙動（既存のArtifactEditorのエラー表示を踏襲）
