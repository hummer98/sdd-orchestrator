# Requirements: Project Agent Release Footer

## Decision Log

### ボタンの表示条件
- **Discussion**: releaseボタンを常に表示するか、条件付き（release.md存在時のみ等）で表示するか
- **Conclusion**: 常に表示
- **Rationale**: リリース操作はプロジェクト全体で頻繁に使う機能であり、条件判定なしで即座にアクセスできることが望ましい

### ボタンの動作方式
- **Discussion**: 専用IPC APIを追加するか、既存のProject Ask方式を流用するか
- **Conclusion**: Project Ask方式を流用し、`/release`をプロンプトとしてAgentを起動
- **Rationale**: 既存のAsk Agent機能を再利用することで実装がシンプルになり、Agent管理（実行状態、ログ）も統一される

### フッターの配置
- **Discussion**: Agent Listの下に固定するか、パネル全体の最下部（スクロール追従）にするか
- **Conclusion**: Agent Listの下に固定（リストがスクロールしてもフッターは固定位置）
- **Rationale**: 常にアクセス可能な位置にボタンを配置することで、長いAgent Listでもスクロールせずに操作できる

### アイコン選定
- **Discussion**: どのアイコンを使用するか（Bot, Rocket, Package, Tag等）
- **Conclusion**: lucide-reactの`Bot`アイコンを使用
- **Rationale**: ユーザーの要望に合致し、Agent起動を示す視覚的な一貫性がある

### disabled時の挙動
- **Discussion**: release実行中のボタン状態をどうするか
- **Conclusion**: disabled状態にし、マウスオーバー時にツールチップで理由を表示
- **Rationale**: ユーザーに現在の状態と操作不可の理由を明確に伝え、UXを向上させる

## Introduction

ProjectAgentPanelの下部に固定フッターエリアを追加し、「release」ボタンを配置する。このボタンをクリックすると、`/release`コマンドがProject Ask方式でAgentとして起動される。これにより、プロジェクトのリリース操作へのアクセスが容易になる。

**Remote UI対応**: 不要（Electron専用機能）

## Requirements

### Requirement 1: ProjectAgentFooterコンポーネント作成

**Objective:** システムとして、ProjectAgentPanelにフッターエリアを提供し、リリース操作へのアクセスを集約したい

#### Acceptance Criteria
1. The system shall `ProjectAgentFooter.tsx`コンポーネントを作成する
2. The component shall 以下のpropsを受け取る:
   - `onRelease: () => void` - releaseボタンのクリックハンドラ
   - `isReleaseRunning: boolean` - release Agentが実行中かどうか
3. The component shall `p-4 border-t`のスタイルでフッターエリアとして表示される
4. The component shall 既存のWorkflowFooter（BugWorkflowFooter, SpecWorkflowFooter）と同様の視覚的デザインを持つ

### Requirement 2: releaseボタンの配置

**Objective:** 開発者として、フッターエリアからリリース操作を開始したい

#### Acceptance Criteria
1. The system shall Botアイコンと「release」テキストを含むボタンを表示する
2. The button shall `flex-1`スタイルで横幅いっぱいに広がる
3. When ボタンがクリックされたとき, the system shall `onRelease`ハンドラを呼び出す
4. The button shall lucide-reactの`Bot`アイコンを使用する

### Requirement 3: disabled状態の制御

**Objective:** システムとして、release Agent実行中は重複起動を防止したい

#### Acceptance Criteria
1. When `isReleaseRunning`がtrueのとき, the button shall disabled状態になる
2. When disabled状態のボタンにマウスオーバーしたとき, the system shall ツールチップで「release実行中」と表示する
3. The disabled button shall 視覚的にdisabledであることが分かるスタイルを適用する

### Requirement 4: ProjectAgentPanelへの統合

**Objective:** システムとして、ProjectAgentPanelにProjectAgentFooterを統合したい

#### Acceptance Criteria
1. The system shall ProjectAgentPanelのAgent List下部にProjectAgentFooterを配置する
2. The footer shall 固定位置に表示される（Agent Listがスクロールしてもフッターは固定）
3. The system shall Agent Listとフッターの間で適切なレイアウト分割を行う（flex構造）

### Requirement 5: release Agent起動ハンドラ

**Objective:** システムとして、releaseボタンクリック時にAgentを起動したい

#### Acceptance Criteria
1. The system shall `handleRelease`ハンドラをProjectAgentPanelに追加する
2. When ハンドラが呼ばれたとき, the system shall `/release`をプロンプトとしてAsk Agentを起動する
3. The Agent shall 既存のProject Ask機能と同じ方式で起動される
4. The system shall Agent起動後、Agent Listに表示される

### Requirement 6: release Agent実行状態の判定

**Objective:** システムとして、release Agentが実行中かどうかを判定したい

#### Acceptance Criteria
1. The system shall 現在実行中のAgentリストから`release`関連のAgentを検出する
2. When `/release`プロンプトで起動されたAgentが実行中のとき, the system shall `isReleaseRunning`をtrueとする
3. The 判定 shall Agent Listの状態（runningAgents等）を参照して行う

## Out of Scope

- release.mdの存在チェックや自動生成機能
- 複数プロジェクト間でのrelease操作
- releaseボタンの表示/非表示の設定機能
- フッターへの追加ボタン（将来の拡張として検討可能）

## Open Questions

- release Agent実行中の判定ロジックの詳細（Agent名やプロンプト内容での判定方法）
- ツールチップの実装方法（既存のTooltipコンポーネントの有無）
