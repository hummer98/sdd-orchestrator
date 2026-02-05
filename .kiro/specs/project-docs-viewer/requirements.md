# Requirements: Project Docs Viewer

## Decision Log

### docs フォルダの場所
- **Discussion**: プロジェクト内のどの docs フォルダを対象とするか
- **Conclusion**: プロジェクトルートの `docs/` フォルダ
- **Rationale**: 一般的な慣習に従い、`{project-root}/docs/` を対象とする

### 表示するファイルの種類
- **Discussion**: Markdown のみか、他の形式も含めるか
- **Conclusion**: `.md`, `.pdf`, `.html` を対象とする
- **Rationale**: ドキュメントとして一般的に使用される形式をサポート

### サブフォルダの表示形式
- **Discussion**: フラットリスト、パス付きフラット、ツリー構造の選択肢
- **Conclusion**: ツリー構造（フォルダの展開/折りたたみ可能）
- **Rationale**: サブフォルダ対応が要件であり、階層構造を直感的に把握できるツリー表示が最適

### ツリー状態の保持
- **Discussion**: ツリーの開閉状態をどこに保持するか
- **Conclusion**: オンメモリ保持（永続化不要）
- **Rationale**: セッション中の操作性を担保しつつ、実装をシンプルに保つ

### セクションの表示順
- **Discussion**: CLAUDE.md、Steering Files、docs の表示順序
- **Conclusion**: 1. CLAUDE.md → 2. Steering Files → 3. Docs
- **Rationale**: 既存の表示順を維持し、新規セクションは最後に追加

### 選択ファイルの保持
- **Discussion**: タブ切り替え時のファイル選択状態
- **Conclusion**: オンメモリで保持し、Projectタブに戻った際に復元
- **Rationale**: ユーザビリティ向上のため、タブ移動しても作業中ファイルを維持

## Introduction

Projectsタブのファイル閲覧機能に `docs/` フォルダを追加する機能。サブフォルダを含む階層構造をツリー表示し、`.md`, `.pdf`, `.html` ファイルの閲覧を可能にする。

## Requirements

### Requirement 1: docs フォルダのファイル一覧取得

**Objective:** ユーザーとして、プロジェクトの docs フォルダ内のドキュメントファイルを一覧表示したい。これにより、プロジェクトドキュメントに素早くアクセスできる。

#### Acceptance Criteria

1. When プロジェクトが選択されている状態で PROJECT_FILE_LIST が呼ばれた場合, the system shall `docs/` フォルダ内の `.md`, `.pdf`, `.html` ファイルを再帰的に取得し、階層構造を保持して返す
2. If `docs/` フォルダが存在しない場合, then the system shall 空の配列を返し、エラーを発生させない
3. The system shall ファイル名でアルファベット順にソートする（フォルダ内）
4. The system shall 隠しファイル（`.` で始まるファイル/フォルダ）を除外する

### Requirement 2: ツリー構造 UI 表示

**Objective:** ユーザーとして、docs フォルダ内のファイルを階層的なツリー構造で閲覧したい。これにより、フォルダ構成を直感的に把握できる。

#### Acceptance Criteria

1. The system shall docs セクションをツリー構造で表示し、フォルダノードとファイルノードを区別する
2. When フォルダノードがクリックされた場合, the system shall そのフォルダを展開/折りたたみする
3. When ファイルノードがクリックされた場合, the system shall そのファイルをエディタ領域に表示する
4. The system shall フォルダアイコン（展開時/折りたたみ時で異なる）とファイルアイコンを表示する
5. The system shall インデントによりネストレベルを視覚的に示す

### Requirement 3: ツリー展開状態のオンメモリ保持

**Objective:** ユーザーとして、ツリーの展開/折りたたみ状態がセッション中は維持されてほしい。これにより、毎回同じフォルダを開き直す手間を省ける。

#### Acceptance Criteria

1. The system shall 各フォルダの展開/折りたたみ状態をオンメモリ（React state/store）で保持する
2. When ユーザーがタブを切り替えて戻ってきた場合, the system shall 以前の展開状態を復元する
3. When アプリを再起動した場合, the system shall 展開状態はリセットされる（永続化不要）
4. The system shall 初期状態ではすべてのフォルダを折りたたんだ状態で表示する

### Requirement 4: 選択ファイルのオンメモリ保持

**Objective:** ユーザーとして、タブを切り替えた後も選択していたファイルが表示されていてほしい。これにより、作業の継続性が保たれる。

#### Acceptance Criteria

1. The system shall 現在選択中のファイルパスをオンメモリで保持する
2. When ユーザーが Spec/Bug タブに移動後、Project タブに戻った場合, the system shall 以前選択していたファイルを引き続き表示する
3. If 選択していたファイルが存在しなくなった場合, then the system shall 選択をクリアし、初期状態（ファイル未選択）を表示する
4. The system shall 選択ファイルの保持は既存の projectEditorStore の機能を活用する

### Requirement 5: セクション表示順序

**Objective:** ユーザーとして、一貫した順序でセクションが表示されてほしい。これにより、目的のファイルを素早く見つけられる。

#### Acceptance Criteria

1. The system shall 以下の順序でセクションを表示する:
   1. CLAUDE.md
   2. Steering Files
   3. Docs
2. The system shall 各セクションにヘッダー（タイトルとアイコン）を表示する
3. If docs フォルダが空または存在しない場合, then the system shall Docs セクションを「ファイルなし」状態で表示する

### Requirement 6: ファイル表示対応

**Objective:** ユーザーとして、.md, .pdf, .html ファイルを適切に表示したい。これにより、様々な形式のドキュメントを閲覧できる。

#### Acceptance Criteria

1. When `.md` ファイルが選択された場合, the system shall 既存のエディタ機能でテキスト表示する
2. When `.pdf` ファイルが選択された場合, the system shall PDF ビューア（iframe または専用コンポーネント）で表示する
3. When `.html` ファイルが選択された場合, the system shall HTML プレビュー（サンドボックス化された iframe）で表示する
4. The system shall ファイル形式に応じて適切なアイコンを表示する（ツリー内）

## Out of Scope

- ファイルの新規作成・削除機能
- docs フォルダ外のファイル閲覧
- ファイル編集・保存機能（閲覧のみ）
- ツリー展開状態の永続化（localStorage/electron-store）
- 選択ファイルの永続化
- Remote UI 対応（Electron版のみ先行実装）
- 検索機能

## Open Questions

- PDF/HTML ビューア実装時のセキュリティ考慮事項（iframe のサンドボックス設定等）は設計フェーズで詳細化
