# Requirements: Git View Source Mode

## Decision Log

### 表示対象の状態
- **Discussion**: sourceモードで表示するファイル内容について、ワーキングディレクトリの現在の内容（変更後）、HEADの内容（変更前）、または両方の切り替えが必要か検討
- **Conclusion**: ワーキングディレクトリの現在の内容（変更後）を表示
- **Rationale**: ユーザーが編集中のファイルを確認するユースケースが主であり、変更後の状態を見たいケースが多い

### シンタックスハイライトライブラリ
- **Discussion**: Shiki（VSCode互換）、highlight.js（軽量）、Prism.js（拡張性）を候補として検討
- **Conclusion**: 既存のrefractor（Prism.jsベース）を活用
- **Rationale**: プロジェクトに既にrefractorが導入されており、追加依存なしで実装可能

### モード切替UI
- **Discussion**: 3ボタン並列、ドロップダウン、Source専用トグル追加を検討
- **Conclusion**: 3つボタン並列（Unified | Split | Source）
- **Rationale**: 視認性が高く、現在の2ボタン構成からの自然な拡張

### 変更箇所ハイライト
- **Discussion**: sourceモードで純粋なソース表示のみか、変更箇所をハイライトするか検討
- **Conclusion**: 変更箇所を背景色で表示（追加行：緑系、変更行のガター表示）
- **Rationale**: 差分ビューアーとしての機能を維持しつつ、ファイル全体のコンテキストを把握可能

### Markdownレンダリング
- **Discussion**: Markdownファイルの表示方法について検討
- **Conclusion**: Markdownとしてレンダリング表示（既存の@uiw/react-md-editorを活用）
- **Rationale**: ドキュメントファイルの可読性向上。コードブロックもrefractorでシンタックスハイライト

### 画像表示
- **Discussion**: 画像ファイルの表示方法と拡大縮小機能について検討
- **Conclusion**: react-zoom-pan-pinchを採用し、ピンチ/パン/ズーム対応
- **Rationale**: タッチ対応で軽量、直感的な操作性

### バイナリファイル
- **Discussion**: バイナリファイルの扱いについて確認
- **Conclusion**: 現在と同様「表示できません」メッセージを表示
- **Rationale**: バイナリファイルのテキスト表示は意味がなく、画像形式は別途対応

## Introduction

GitViewコンポーネントに新しい「Source」表示モードを追加する。現在のUnified/Split差分表示に加え、ファイル全体をシンタックスハイライト付きで閲覧できる機能を提供する。Markdownファイルはレンダリング表示、画像ファイルは拡大縮小可能なビューアーで表示し、変更箇所は背景色でハイライトする。

## Requirements

### Requirement 1: Sourceモードの追加

**Objective:** ユーザーとして、差分だけでなくファイル全体をシンタックスハイライト付きで確認したい。変更箇所のコンテキストを把握しやすくするため。

#### Acceptance Criteria
1. When ユーザーが「Source」ボタンをクリックした時, the system shall ワーキングディレクトリのファイル全内容をシンタックスハイライト付きで表示する
2. The system shall ファイル拡張子に基づいて適切な言語のシンタックスハイライトを適用する
3. The system shall 行番号を表示する
4. The system shall 差分情報に基づき変更行を背景色（追加行：緑系）でハイライトする
5. The system shall 変更行にガターマークを表示する

### Requirement 2: モード切替UI

**Objective:** ユーザーとして、Unified/Split/Sourceの3つのモードを直感的に切り替えたい。

#### Acceptance Criteria
1. The system shall 3つのボタン（Unified | Split | Source）を並列表示する
2. When ユーザーがいずれかのボタンをクリックした時, the system shall 該当モードに切り替える
3. The system shall 現在選択中のモードを視覚的に区別する（アクティブ状態）
4. The system shall モード状態をgitViewStoreで管理する（diffMode: 'unified' | 'split' | 'source'）

### Requirement 3: Markdownレンダリング

**Objective:** ユーザーとして、Markdownファイルをレンダリングされた状態で確認したい。ドキュメントの可読性を向上させるため。

#### Acceptance Criteria
1. When 選択ファイルの拡張子が.mdまたは.markdownの時, the system shall Markdownとしてレンダリング表示する
2. The system shall コードブロック（```言語名）をシンタックスハイライト付きで表示する
3. The system shall 既存の@uiw/react-md-editorのプレビュー機能を活用する
4. The system shall 変更行のハイライトをMarkdownレンダリング内でも表示する（可能な範囲で）

### Requirement 4: 画像表示

**Objective:** ユーザーとして、画像ファイルをGitView内で直接確認・拡大縮小したい。

#### Acceptance Criteria
1. When 選択ファイルが画像形式（SVG, PNG, JPG/JPEG, GIF, WebP, ICO）の時, the system shall 画像としてプレビュー表示する
2. The system shall ピンチ操作による拡大縮小をサポートする
3. The system shall パン（ドラッグによる移動）操作をサポートする
4. The system shall ホイールによるズーム操作をサポートする
5. The system shall react-zoom-pan-pinchライブラリを使用する

### Requirement 5: ファイル内容取得API

**Objective:** Rendererプロセスからワーキングディレクトリのファイル内容を取得するため。

#### Acceptance Criteria
1. The system shall 新しいIPC API `readFileContent(projectPath, filePath)` を提供する
2. The system shall ファイルの絶対パスを受け取り、内容を文字列またはBase64で返す
3. If ファイルが存在しない時, then the system shall 適切なエラーを返す
4. The system shall 画像ファイルの場合はBase64エンコードされたデータを返す

### Requirement 6: バイナリファイル対応

**Objective:** バイナリファイル選択時に適切なメッセージを表示する。

#### Acceptance Criteria
1. If 選択ファイルがバイナリファイル（画像以外）の時, then the system shall 「バイナリファイルは表示できません」メッセージを表示する
2. The system shall 画像形式のバイナリは画像ビューアーで表示する（Requirement 4）

## Out of Scope

- HEADの内容（変更前）の表示切り替え機能
- 複数ファイルの同時表示
- ファイル編集機能
- 差分のインラインコメント機能
- 画像の差分表示（Before/After比較）
- Remote UI対応（Electron専用ファイルシステムアクセス機能）

## Open Questions

- Markdownレンダリング内での変更行ハイライトは、レンダリング後のDOM構造によっては完全な対応が困難な可能性がある。設計フェーズで実現可能性を検討する。
