# Requirements: Project Config Editor

## Decision Log

### UI配置パターン
- **Discussion**: Steering/CLAUDE.mdの編集機能をどこに配置するか。Option A（Projectタブ追加）、Option B（ヘッダーアイコン）、Option C（ProjectAgentPanel拡張）を検討。
- **Conclusion**: Option A - 左サイドバーに「Project」タブを追加
- **Rationale**: Specs/Bugs/Projectという明確な3カテゴリ分離で概念的に整合。既存のタブパターンとの一貫性を維持。

### ファイル編集機能
- **Discussion**: 読み取り専用か編集可能か
- **Conclusion**: 編集可能（手動保存方式）
- **Rationale**: Steeringファイルは頻繁に更新される可能性があり、UI内で編集できると便利

### 保存方式
- **Discussion**: 自動保存か手動保存か
- **Conclusion**: 手動保存（⌘+S）
- **Rationale**: 設定ファイルの意図しない変更を防ぐため、明示的な保存操作を要求

### ファイル一覧の表示形式
- **Discussion**: フラットリストかグループ分けか
- **Conclusion**: グループ分け（CLAUDE.md / Steering Files の2セクション）
- **Rationale**: ファイルの種類を明確に区別し、視認性を向上

### 外部変更の検知
- **Discussion**: 外部エディタでファイルが変更された場合の挙動
- **Conclusion**: 通知のみ（ユーザーがリロードを選択）
- **Rationale**: ユーザーの編集内容を自動で上書きしない安全な方式

### 新規ファイル作成機能
- **Discussion**: 新しいSteeringファイルを作成する機能の要否
- **Conclusion**: 不要（既存ファイルの表示/編集のみ）
- **Rationale**: 初期実装のスコープを限定。必要に応じて将来追加可能

### 右パネルの扱い
- **Discussion**: Projectビュー選択時の右パネルの表示
- **Conclusion**: 右パネルは非表示
- **Rationale**: Steeringファイル編集にワークフローやAgent一覧は不要

### プラットフォーム対応
- **Discussion**: Desktop版のみかMobile版も対応するか
- **Conclusion**: Desktop / Mobile両対応
- **Rationale**: Remote UIでも設定確認・編集のニーズがある

## Introduction

SDD OrchestratorのUIに「Project」タブを追加し、プロジェクト設定ファイル（CLAUDE.md、Steeringファイル）の表示・編集機能を提供する。これにより、Specs/Bugs以外のプロジェクトレベルの設定をUI内で一元管理できるようになる。

## Requirements

### Requirement 1: Projectタブの追加

**Objective:** ユーザーとして、左サイドバーからProjectタブを選択できるようにしたい。プロジェクト設定ファイルにアクセスするため。

#### Acceptance Criteria
1. When ユーザーが左サイドバーを表示したとき、the system shall 「Specs」「Bugs」「Project」の3つのタブを表示する
2. When ユーザーがProjectタブをクリックしたとき、the system shall Projectビューに切り替える
3. The system shall Projectタブのアクティブ状態を視覚的に示す（既存タブと同様のスタイル）

### Requirement 2: プロジェクトファイル一覧の表示

**Objective:** ユーザーとして、プロジェクト設定ファイルの一覧を確認したい。編集対象ファイルを選択するため。

#### Acceptance Criteria
1. When Projectタブが選択されたとき、the system shall 左ペインにファイル一覧を表示する
2. The system shall ファイル一覧を2つのグループに分けて表示する:
   - 「CLAUDE.md」セクション: プロジェクトルートのCLAUDE.md
   - 「Steering Files」セクション: `.kiro/steering/*.md` のファイル一覧
3. The system shall 各ファイルをファイル名で表示する
4. If CLAUDE.mdが存在しない場合、the system shall 該当セクションを非表示にするか、「ファイルなし」と表示する
5. If `.kiro/steering/` ディレクトリが存在しない、または空の場合、the system shall 「Steeringファイルなし」と表示する

### Requirement 3: ファイル選択とエディタ表示

**Objective:** ユーザーとして、ファイルを選択してメインパネルで内容を確認・編集したい。

#### Acceptance Criteria
1. When ユーザーがファイル一覧からファイルをクリックしたとき、the system shall メインパネルにArtifactEditorでファイル内容を表示する
2. The system shall 選択中のファイルを視覚的にハイライト表示する
3. When Projectビューが表示されたとき、the system shall 右パネル（RightSidebar）を非表示にする
4. The system shall エディタ上でファイル内容を編集可能にする

### Requirement 4: ファイルの保存

**Objective:** ユーザーとして、編集したファイルを保存したい。変更を永続化するため。

#### Acceptance Criteria
1. When ユーザーが⌘+S（Mac）/ Ctrl+S（Windows）を押したとき、the system shall 現在編集中のファイルを保存する
2. The system shall 保存成功時にトースト通知を表示する
3. If 保存に失敗した場合、the system shall エラーメッセージを表示する
4. The system shall 未保存の変更がある場合、視覚的なインジケーター（例: ファイル名横のドット）を表示する

### Requirement 5: 外部変更の検知と通知

**Objective:** ユーザーとして、外部でファイルが変更された場合に通知を受けたい。編集内容との競合を防ぐため。

#### Acceptance Criteria
1. While ファイルがエディタで開かれている間、the system shall ファイルの外部変更を監視する
2. When 外部でファイルが変更されたとき、the system shall ユーザーに通知を表示する
3. The system shall 通知内で「リロード」または「無視」の選択肢を提供する
4. When ユーザーが「リロード」を選択したとき、the system shall ファイル内容を再読み込みしてエディタを更新する
5. When ユーザーが「無視」を選択したとき、the system shall 現在の編集内容を維持する

### Requirement 6: Mobile対応

**Objective:** ユーザーとして、モバイルデバイスからもプロジェクト設定を確認・編集したい。

#### Acceptance Criteria
1. The system shall モバイル版（Remote UI）のボトムタブバーに「Project」タブを追加する
2. When モバイルでProjectタブが選択されたとき、the system shall ファイル一覧を表示する
3. When モバイルでファイルが選択されたとき、the system shall 詳細ページとしてエディタを表示する
4. The system shall モバイル詳細ページに戻るボタンを表示する

## Out of Scope

- 新規Steeringファイルの作成機能
- ファイルの削除機能
- ファイルのリネーム機能
- `.kiro/steering/` 以外のサブディレクトリ内ファイルの表示
- Markdown以外のファイル形式への対応
- ファイル差分表示（diff view）
- Git連携（変更履歴の表示等）

## Open Questions

- ArtifactEditorの再利用可否: 既存のRemoteArtifactEditorをそのまま使用できるか、Project用に調整が必要か設計フェーズで検討
- ファイル監視の実装方式: 既存のchokidar watcherを拡張するか、新規watcherを追加するか設計フェーズで検討
