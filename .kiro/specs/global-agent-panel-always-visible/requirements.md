# Requirements Document

## Introduction

本ドキュメントは、グローバルエージェント欄の表示改善に関する要件を定義する。現状、グローバルエージェントが0件の場合にパネルが完全に非表示となり、ユーザーがグローバルエージェントの存在を認識できない問題がある。また、リサイズ機能とサイズの永続化も不足している。本機能では、グローバルエージェント欄を常に表示し、リサイズ位置の記憶機能を追加することで、ユーザビリティを向上させる。

## Requirements

### Requirement 1: グローバルエージェント欄の常時表示

**Objective:** ユーザーとして、グローバルエージェントが0件でもパネルを表示したい。これにより、グローバルエージェントの存在と追加方法を認識できる。

#### Acceptance Criteria

1. When GlobalAgentPanelがレンダリングされる, the GlobalAgentPanel shall グローバルエージェントの件数に関わらずパネルを表示する
2. While グローバルエージェントが0件である, the GlobalAgentPanel shall パネルを非表示にせず表示を維持する
3. The GlobalAgentPanel shall `return null`による完全非表示を行わない

### Requirement 2: 空状態メッセージの表示

**Objective:** ユーザーとして、グローバルエージェントが0件の場合に適切なメッセージを確認したい。これにより、現在の状態を理解し、エージェントの追加方法を知ることができる。

#### Acceptance Criteria

1. When グローバルエージェントが0件である, the GlobalAgentPanel shall 「グローバルエージェントなし」等の空状態メッセージを表示する
2. The 空状態メッセージ shall ユーザーが次のアクションを理解できる内容である
3. While グローバルエージェントが1件以上存在する, the GlobalAgentPanel shall 空状態メッセージを非表示にし、エージェントリストを表示する

### Requirement 3: グローバルエージェント欄のリサイズ機能

**Objective:** ユーザーとして、グローバルエージェント欄の高さをリサイズしたい。これにより、画面スペースを効率的に使用できる。

#### Acceptance Criteria

1. The GlobalAgentPanel shall リサイズハンドルを持つ
2. When ユーザーがリサイズハンドルをドラッグする, the GlobalAgentPanel shall パネルの高さをドラッグに追従して変更する
3. The GlobalAgentPanel shall 最小高さの制限を持ち、パネルが見えなくなるまで縮小されることを防ぐ
4. The GlobalAgentPanel shall 最大高さの制限を持ち、他のパネルが見えなくなることを防ぐ

### Requirement 4: リサイズ位置の永続化

**Objective:** ユーザーとして、グローバルエージェント欄のリサイズ位置を記憶させたい。これにより、アプリ再起動後も同じレイアウトで作業を再開できる。

#### Acceptance Criteria

1. When ユーザーがグローバルエージェント欄のサイズを変更する, the アプリケーション shall 変更後のサイズをレイアウト設定に保存する
2. When アプリケーションが起動する, the GlobalAgentPanel shall 保存されたレイアウト設定からサイズを復元する
3. If レイアウト設定が存在しない, then the GlobalAgentPanel shall デフォルトのサイズで表示する
4. The レイアウト設定 shall 既存のレイアウト永続化機能（layoutConfig）と統合される
5. When ユーザーがレイアウトリセットを実行する, the GlobalAgentPanel shall デフォルトのサイズにリセットされる

### Requirement 5: 既存機能との分離

**Objective:** 開発者として、グローバルエージェント欄の設定を他のパネル設定と混同しないようにしたい。これにより、保守性とコードの明確性が向上する。

#### Acceptance Criteria

1. The グローバルエージェント欄の高さ設定 shall 右サイドバーのAgentListPanel用のagentListHeightとは別の設定値として管理される
2. The レイアウト設定 shall グローバルエージェント欄専用のプロパティ（例: globalAgentPanelHeight）を持つ
3. When グローバルエージェント欄のサイズが変更される, the アプリケーション shall 他のパネルのレイアウト設定に影響を与えない
