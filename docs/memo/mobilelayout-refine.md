Remote UI - Smartphone (MobileLayout)
を刷新したいと思います

- DesktopWebと共通化できるところはする
- requritement.mdでレイアウトを図で表現のこと 

# MobileLayout
- Specs/Bugs/(Project)Agentsの下部タブ構成
 
## Specsタブ
- Spec一覧が表示。Desktop版との共用で可。
- フィルタ領域が上部固定で表示（共用可）
- SpecItemをタップしたらSpecDetailPage(新規?)をプッシュナビゲーション

### SpecDetailPage
- 2タブ構成
  - 下部にタブエリアがあり、Spec / Artifact

#### SpecTab
- 上から
  - SpecAgent一覧: 3アイテム分固定の高さ、スクロール可
    - AgentItemをタップしたらAgentDetailDrawerが下から現れてログが見える    
  - SpecWorkflowエリア: メインコンテンツ。スクロールしないと収まらないはず
  - WorflowFooter(自動実行ボタンなど配置などの固定エリア)

#### SpecArtifactTab
- 上部にArtifactファイルのタブ
  - 編集/表示機能等はDesktopWebと共通で可

## Bugsタブ
- Bug一覧が表示。Desktop版の共用で可。
- フィルタ領域が上部固定で表示（共用可）
- BugItemをタップしたらBugDetailPage(新規?）をプッシュナビゲーション

### BugsDetailPage
- 2タブ構成,BugTab/BugArtifactTab

#### BugTab
- 上から
  - BugAgent一覧: 3アイテム分固定の高さ、スクロール可
    - AgentItemをタップしたらAgentDetailDrawerが下から現れてログが見える    
  - BugWorkflowエリア: メインコンテンツ。スクロールしないと収まらないはず
  - BugWorkflowFooter(自動実行ボタンなど配置の固定エリア)

#### BugArtifactTab
- SpecArtifactTabと同様に実装

## (Project)Agentsタブ
- Project Agent一覧が表示
- AgentItemをタップしたらAgentDetailDrawerが下から現れてログを見える

## AgentDetailDrawer
- Spec, Projectどちらのエージェントログも共通で見れるドロワーエリア
- 中のレンダリングはWebで共通にしたいところ