# Requirements: Submit Shortcut Key

## Decision Log

### 対象コンポーネントの範囲
- **Discussion**: Project-Ask、Spec-Ask、新規Spec/Bug作成画面が対象として挙げられた。調査の結果、5つのダイアログコンポーネントが特定された。
- **Conclusion**: AskAgentDialog、CreateSpecDialog、CreateBugDialog、CreateSpecDialogRemote、CreateBugDialogRemoteの5つ全てを対象とする
- **Rationale**: ユーザーが挙げた画面を全てカバーするため

### ショートカットキーの仕様
- **Discussion**: macOSとWindows/Linuxで異なるモディファイアキーを使用する必要がある
- **Conclusion**: macOSは⌘+Enter、Windows/LinuxはCtrl+Enterを使用
- **Rationale**: 各プラットフォームの標準的なショートカットキーパターンに従う

### 改行との競合回避
- **Discussion**: テキストエリアでEnterキーは改行に使われるため、送信ショートカットとの競合を考慮する必要がある。案A（⌘/Ctrl+Enter送信、Enter改行）と案B（Enter送信、Shift+Enter改行）を検討
- **Conclusion**: 案Aを採用（⌘/Ctrl+Enterで送信、Enterは改行）
- **Rationale**: 一般的なIDEパターンと一致し、複数行入力が自然にできる

### 共通フックの作成
- **Discussion**: 5つのコンポーネントで同じロジックを重複させるか、共通化するか
- **Conclusion**: 共通フック `useSubmitShortcut` を作成する
- **Rationale**: DRY原則に従い、保守性を向上させる

### フックの配置場所
- **Discussion**: 対象コンポーネントが shared/、renderer/、remote-ui/ に分散している
- **Conclusion**: `shared/hooks/` に配置する
- **Rationale**: 全ての対象コンポーネントからアクセス可能な共通の場所

### IME対応
- **Discussion**: 日本語入力中の変換確定Enterで誤送信する可能性がある
- **Conclusion**: `isComposing` チェックを入れる
- **Rationale**: 既存の AgentInputPanel と同様のパターンで、日本語入力時の誤送信を防止

## Introduction

ダイアログ画面（Project-Ask、Spec-Ask、新規Spec/Bug作成など）において、キーボードショートカット（⌘+Enter / Ctrl+Enter）で実行ボタンを押せるようにする機能。これにより、マウス操作なしでフォーム送信が可能となり、ユーザーの入力効率が向上する。

## Requirements

### Requirement 1: キーボードショートカットによるフォーム送信

**Objective:** ユーザーとして、ダイアログのテキストエリアで⌘+Enter（macOS）またはCtrl+Enter（Windows/Linux）を押すことで、実行ボタンを押したのと同じ動作をしたい。これにより、キーボードから手を離さずにフォームを送信できる。

#### Acceptance Criteria
1. When ユーザーがmacOSでテキストエリアにフォーカスがある状態で⌘+Enterを押す, the system shall フォームを送信する
2. When ユーザーがWindows/Linuxでテキストエリアにフォーカスがある状態でCtrl+Enterを押す, the system shall フォームを送信する
3. When ユーザーがEnterキーのみを押す, the system shall テキストエリアに改行を挿入する（送信しない）
4. When 送信ボタンが無効状態（disabled）の場合にショートカットが押される, the system shall 何も実行しない

### Requirement 2: 対象コンポーネントへの適用

**Objective:** ユーザーとして、全てのダイアログ形式の入力画面で統一されたショートカットを使用したい。これにより、画面ごとに異なる操作を覚える必要がなくなる。

#### Acceptance Criteria
1. The system shall AskAgentDialog（Project-Ask、Spec-Ask用）でショートカットを有効にする
2. The system shall CreateSpecDialog（Electron版新規Spec作成）でショートカットを有効にする
3. The system shall CreateBugDialog（Electron版新規Bug作成）でショートカットを有効にする
4. The system shall CreateSpecDialogRemote（Web版新規Spec作成）でショートカットを有効にする
5. The system shall CreateBugDialogRemote（Web版新規Bug作成）でショートカットを有効にする

### Requirement 3: IME入力との互換性

**Objective:** 日本語入力ユーザーとして、IMEでの変換確定時に意図せずフォームが送信されないようにしたい。これにより、日本語入力中でも安心してショートカットを使用できる。

#### Acceptance Criteria
1. When IME変換中（isComposing=true）にショートカットキーが押される, the system shall フォーム送信を実行しない
2. When IME変換が確定した後にショートカットキーが押される, the system shall フォーム送信を実行する

### Requirement 4: 共通フックによる実装

**Objective:** 開発者として、キーボードショートカット機能を再利用可能な形で実装したい。これにより、将来的に他のダイアログにも容易に適用できる。

#### Acceptance Criteria
1. The system shall `shared/hooks/` に `useSubmitShortcut` フックを配置する
2. The system shall フックが以下のパラメータを受け取れるようにする：送信関数、無効状態フラグ
3. The system shall フックがテキストエリア用の `onKeyDown` ハンドラを返す

## Out of Scope

- 既存の AgentInputPanel のキーボード操作の変更（現在はEnterで送信、Alt+Enterで改行）
- ダイアログ以外の画面（検索バー、設定画面など）へのショートカット適用
- ショートカットキーのカスタマイズ機能
- ショートカットキーのヒント表示（UIへの視覚的なガイダンス）

## Open Questions

- なし（設計フェーズで解決予定の技術的詳細を除く）
