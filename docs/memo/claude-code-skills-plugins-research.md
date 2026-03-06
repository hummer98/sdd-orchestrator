# Claude Code Skills / Plugins 調査レポート

**調査日**: 2026-02-13
**目的**: Electron, React, TypeScript開発を支援するClaude Code向けのSkills, Plugins, MCPサーバーの調査

---

## 1. エコシステム概要

Claude Codeの拡張は3つの仕組みで提供されている：

| 仕組み | 説明 | インストール |
|--------|------|-------------|
| **Skills** | SKILL.md + スクリプト。タスク文脈に応じて自動発動 | `.claude/skills/` にファイル配置 |
| **Plugins** | Skills + Commands + Agents + Hooks + MCPを束ねたパッケージ | `/plugin install name@marketplace` |
| **MCP Servers** | 外部ツール・データソースとの接続 | `.mcp.json` で設定 |

---

## 2. フロントエンド開発向けPlugins（公式・準公式）

### 2.1 Frontend Design（推奨度: ★★★）

- **提供元**: Anthropic公式
- **URL**: https://claude.com/blog/improving-frontend-design-through-skills
- **インストール**: `/plugin install frontend-design@claude-plugins-official`
- **概要**: AIが生成するUIの品質を大幅に改善。「AI slop」（ありきたりなAIデザイン）を避け、意図的なタイポグラフィ・スペーシング・カラー選択を行う
- **対象**: React + Tailwind CSSのコンポーネント作成
- **当プロジェクトへの有用性**: Remote UIのコンポーネント改善に活用可能

### 2.2 Playwright（推奨度: ★★★）

- **提供元**: 公式Plugin
- **インストール**: `/plugin install playwright@claude-plugins-official`
- **概要**: 自然言語でブラウザ自動操作。テスト・スクリーンショット・フォーム操作
- **当プロジェクトへの有用性**: 既にMCPとして導入済み。Pluginに切り替えるメリットは限定的

### 2.3 Context7（推奨度: ★★☆）

- **提供元**: 公式Plugin
- **インストール**: `/plugin install context7@claude-plugins-official`
- **概要**: ライブラリのリアルタイムドキュメント取得。React, TypeScript, Electronの最新API情報を常に参照
- **当プロジェクトへの有用性**: 既にMCPとして導入済み

### 2.4 Figma MCP（推奨度: ★★☆）

- **提供元**: Figma公式
- **インストール**: `/plugin install figma@claude-plugins-official`
- **概要**: FigmaデザインファイルからReactコンポーネントコードを直接生成
- **当プロジェクトへの有用性**: Figmaベースのデザインワークフロー導入時に有用

### 2.5 Chrome DevTools MCP（推奨度: ★★☆）

- **インストール**: `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`
- **概要**: ライブブラウザセッションへのデバッグアクセス。ネットワークリクエスト・コンソールエラーのリアルタイム検査
- **当プロジェクトへの有用性**: Remote UIデバッグ時に活用可能

### 2.6 Code Review（推奨度: ★★☆）

- **インストール**: `/plugin install code-review@claude-plugins-official`
- **概要**: 複数の専門エージェントによるPRレビュー。信頼度スコア付き
- **当プロジェクトへの有用性**: PR品質向上に直結

### 2.7 Security Guidance（推奨度: ★★☆）

- **インストール**: `/plugin install security-guidance@claude-plugins-official`
- **概要**: ファイル編集前にセキュリティ脆弱性をスキャン。XSS・コマンドインジェクション等を検出
- **当プロジェクトへの有用性**: Electronアプリのセキュリティ向上

---

## 3. コミュニティSkills

### 3.1 electron-scaffold（推奨度: ★★★）

- **URL**: https://claude-plugins.dev/skills/@chrisvoncsefalvay/claude-skills/electron-scaffold
- **概要**: プロダクション対応のElectronアプリケーション生成
  - セキュリティハードニング（Context Isolation, CSP, サンドボックス）
  - IPC通信パターン（バリデーション付き）
  - Auto-update（electron-updater）
  - マルチプラットフォームパッケージング
- **当プロジェクトへの有用性**: 新規Electronプロジェクト立ち上げ時。既存プロジェクトへの部分適用も可能

### 3.2 ui-skills（推奨度: ★★★）

- **URL**: https://github.com/ibelick/ui-skills (⭐ 629)
- **インストール**: `npx skills add ibelick/ui-skills`
- **スキル一覧**:
  - `baseline-ui` — UIスタンダード確立
  - `fixing-accessibility` — キーボードナビゲーション・ラベル・フォーカス管理
  - `fixing-metadata` — メタタグ・OGP最適化
  - `fixing-motion-performance` — アニメーション性能最適化
- **当プロジェクトへの有用性**: Remote UIのアクセシビリティ・品質向上に直結

### 3.3 ui-ux-pro-max-skill（推奨度: ★★☆）

- **URL**: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (⭐ 16.9k)
- **概要**: 完全なデザインシステム生成（カラー・フォント・レイアウト）
- **当プロジェクトへの有用性**: UIデザインの一貫性確保

### 3.4 web-quality-skills（推奨度: ★★☆）

- **URL**: https://github.com/addyosmani/web-quality-skills (⭐ 250)
- **概要**: Lighthouseメトリクスに基づくWeb品質最適化
- **当プロジェクトへの有用性**: Remote UIのパフォーマンス最適化

### 3.5 secondsky/claude-skills（推奨度: ★★☆）

- **URL**: https://github.com/secondsky/claude-skills
- **インストール**: `/plugin marketplace add https://github.com/secondsky/claude-skills`
- **概要**: 167のプロダクション対応スキル群
- **注目スキル**:
  - `tailwind-v4-shadcn` — Tailwind CSS v4 + shadcnコンポーネント
  - `tanstack-query` — データフェッチングパターン
  - `turborepo` — モノレポ最適化
- **当プロジェクトへの有用性**: 個別のスキルを選択的にインストール可能

### 3.6 shadcn/ui MCP（推奨度: ★★☆）

- **URL**: https://www.shadcn.io/mcp/claude-code
- **概要**: shadcn/uiコンポーネントの正確なTypeScript props・ドキュメントを提供
- **当プロジェクトへの有用性**: shadcn/ui使用時のコンポーネント実装精度向上

---

## 4. 構成テンプレート・リファレンス

### 4.1 claude-code-showcase（推奨度: ★★★）

- **URL**: https://github.com/ChrisWiles/claude-code-showcase
- **概要**: Claude Code設定の包括的サンプル集
  - Skills: testing-patterns, graphql-schema, core-components
  - Agents: code-reviewer（TypeScript strictモードチェック含む）
  - Hooks: PreToolUse/PostToolUse/UserPromptSubmitの実装例
  - Commands: /ticket, /onboard, /pr-review
  - GitHub Actions: PR自動レビュー、定期コード品質チェック
- **当プロジェクトへの有用性**: Hooks・Agentsの設計パターンとして参考になる

### 4.2 everything-claude-code（推奨度: ★★☆）

- **URL**: https://github.com/affaan-m/everything-claude-code
- **概要**: Anthropicハッカソン入賞者のバトルテスト済み設定集
  - Skills: frontend-patterns, e2e-testing (Playwright)
  - Agents: code-reviewer, build-error-resolver, e2e-runner
  - Commands: /tdd, /e2e, /code-review, /build-fix
- **当プロジェクトへの有用性**: TDD・E2Eワークフローの構成例として参考になる

### 4.3 electron-pro サブエージェント（推奨度: ★★☆）

- **URL**: https://github.com/VoltAgent/awesome-claude-code-subagents
- **概要**: Electron 27+特化のサブエージェント定義
  - プロセス分離戦略、IPC通信パターン
  - セキュリティ境界定義
  - 起動3秒以内、アイドル200MB以下のパフォーマンス目標
  - コード署名・Notarization・Auto-update
- **当プロジェクトへの有用性**: Electronセキュリティ・パフォーマンス指針として参考になる

---

## 5. Awesome Lists（キュレーション）

| リポジトリ | 説明 |
|-----------|------|
| [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 103+ スキル・プラグインのキュレーションリスト |
| [awesome-claude-code](https://github.com/jmanhype/awesome-claude-code) | プラグイン・MCPサーバー・エディタ統合のまとめ |
| [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 300+ エージェントスキル。公式チーム・コミュニティ両方 |
| [awesome-claude-plugins](https://github.com/ComposioHQ/awesome-claude-plugins) | プラグインシステムの拡張一覧 |
| [Claude Code Resource List](https://www.scriptbyai.com/claude-code-resource-list/) | 2026年版 総合リソースリスト |

---

## 6. 当プロジェクトへの推奨導入順位

### 即導入推奨（効果が高くリスクが低い）

| # | 名称 | 理由 |
|---|------|------|
| 1 | **ui-skills** | アクセシビリティ・UI品質向上。フレームワーク非依存で安全 |
| 2 | **Frontend Design** | UIコンポーネント生成品質の底上げ。公式Plugin |
| 3 | **electron-scaffold** | Electronセキュリティパターンのナレッジとして活用 |

### 検討推奨（ワークフロー改善）

| # | 名称 | 理由 |
|---|------|------|
| 4 | **Code Review Plugin** | PR品質の自動チェック |
| 5 | **Security Guidance** | Electronセキュリティスキャン |
| 6 | **claude-code-showcase** のHooksパターン | PostToolUseでの自動lint/format |

### 参考（部分的に取り込み可能）

| # | 名称 | 理由 |
|---|------|------|
| 7 | **shadcn/ui MCP** | shadcn利用時のコンポーネント精度向上 |
| 8 | **tailwind-v4-shadcn skill** | Tailwind v4移行時に活用 |
| 9 | **electron-pro subagent** | セキュリティ・パフォーマンスの指針として参考 |

---

## 7. 注意事項

- **Plugin機能はClaude Code v2.2+で利用可能**。`/plugin` コマンドが使えない場合はCLIのアップデートが必要
- **Skills（SKILL.md）は互換性が広い**。Plugin非対応でもSkillsファイルは手動配置で使える
- **MCP Serversは既存設定との競合に注意**。Context7やPlaywrightは既に導入済みのため重複回避
- コミュニティ製Skillsは品質にばらつきがある。導入前にSKILL.mdの中身を確認すること
