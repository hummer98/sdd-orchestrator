# Research & Design Decisions

## Summary
- **Feature**: `deepcode-integration`
- **Discovery Scope**: Extension
- **Key Findings**:
  - DeepCode (HKUDS) はPython 3.13ベースのオープンソースAIエージェントプラットフォーム
  - pip install deepcode-hku でグローバルインストール可能
  - CLIインターフェースは `python cli/main_cli.py` で実行
  - 既存のProviderFactoryパターンを拡張して新しいプロバイダータイプを追加可能

## Research Log

### DeepCode (HKUDS) 調査
- **Context**: 要件で指定されたDeepCode AIエージェントの技術仕様調査
- **Sources Consulted**:
  - [GitHub - HKUDS/DeepCode](https://github.com/HKUDS/DeepCode)
  - [DeepCode PyPI package](https://pypi.org/project/deepcode-hku/)
- **Findings**:
  - Python 3.13が必要
  - `pip install deepcode-hku` でインストール
  - 設定ファイル: `mcp_agent.config.yaml`, `mcp_agent.secrets.yaml`
  - CLIエントリポイント: `python cli/main_cli.py`
  - グローバルインストール先: `~/.deepcode/` を推奨
  - API Key設定が必要（Anthropic/OpenAI/Google）
- **Implications**:
  - インストールスクリプトはPython環境のセットアップを含む必要がある
  - API Key設定はユーザーに別途案内が必要

### 既存プロバイダーアーキテクチャ分析
- **Context**: 新しいプロバイダータイプ追加のための既存実装調査
- **Sources Consulted**:
  - `/electron-sdd-manager/src/main/services/ssh/providerFactory.ts`
  - `/electron-sdd-manager/src/main/services/providerAgentProcess.ts`
  - `/electron-sdd-manager/src/main/services/specManagerService.ts`
- **Findings**:
  - `ProviderType = 'local' | 'ssh'` として定義済み
  - `ProviderFactory` がシングルトンでプロバイダーを管理
  - `createProviderAgentProcess` が非同期でプロバイダー別プロセス生成
  - `getProviderTypeFromPath` でパスからプロバイダータイプを判定
- **Implications**:
  - ProviderType に `'local-deepcode'` を追加
  - DeepCodeProcessProvider を新規実装
  - プロバイダー選択をパスベースから明示的選択に変更

### UI実装パターン分析
- **Context**: プロバイダー選択UIの実装方針調査
- **Sources Consulted**:
  - `/electron-sdd-manager/src/renderer/stores/workflowStore.ts`
  - `/electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx`
- **Findings**:
  - Zustand + persist でLocalStorage永続化
  - CommandPrefix の切り替えUIパターンが参考になる
  - セグメントボタンはTailwind CSSで実装可能
- **Implications**:
  - workflowStoreにexecutionProvider設定を追加
  - persist対象に含めて永続化
  - PhaseExecutionPanelにプロバイダー選択UIを追加

### ツールメニュー拡張分析
- **Context**: DeepCodeインストール機能のメニュー統合
- **Sources Consulted**:
  - `/electron-sdd-manager/src/main/menu.ts`
  - `/electron-sdd-manager/src/main/ipc/channels.ts`
- **Findings**:
  - ツールメニューに既存の「インストール」系メニュー項目あり
  - IPCチャネル経由でレンダラーと通信
  - dialog.showMessageBox でユーザー確認
- **Implications**:
  - 「DeepCodeのインストール」メニュー項目を追加
  - 新しいIPCチャネルを定義
  - インストール進捗表示用のモーダル/パネルが必要

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Provider Strategy Pattern | 既存ProviderFactory拡張 | 既存パターンと一貫性、テスト容易 | DeepCodeのCLI形式が異なる可能性 | 採用 |
| Adapter Pattern | DeepCode用アダプタ層を追加 | 分離度が高い | 複雑度増加 | 不採用 |
| Direct Integration | 直接DeepCodeコマンドを呼び出し | シンプル | 拡張性なし | 不採用 |

## Design Decisions

### Decision: プロバイダー識別子の命名規則
- **Context**: 要件5で `{実行環境}-{エージェント名}` パターンが指定
- **Alternatives Considered**:
  1. `deepcode` - シンプルだがパターン非準拠
  2. `local-deepcode` - パターン準拠
- **Selected Approach**: `local-deepcode` を採用
- **Rationale**: 要件との整合性、将来の `ssh-deepcode` 追加を考慮
- **Trade-offs**: 識別子が長くなる
- **Follow-up**: なし

### Decision: プロバイダー選択UI配置
- **Context**: 要件1でimplエリア内への配置が指定
- **Alternatives Considered**:
  1. PhaseExecutionPanel内にセグメントボタン
  2. WorkflowView右ペイン上部に独立パネル
- **Selected Approach**: PhaseExecutionPanel内に配置
- **Rationale**: 実行操作と視覚的に関連付け
- **Trade-offs**: パネルが縦に長くなる
- **Follow-up**: レイアウト調整が必要な場合はWorkflowViewレベルで検討

### Decision: DeepCodeインストールスクリプト実行方式
- **Context**: 要件2でClaude Codeをサブプロセスとして使用
- **Alternatives Considered**:
  1. Claude Code経由でインストール
  2. 直接シェルコマンド実行
- **Selected Approach**: Claude Code経由
- **Rationale**: 要件との整合性、インタラクティブなエラーハンドリング
- **Trade-offs**: Claude Code依存
- **Follow-up**: インストールスクリプトの詳細設計

### Decision: DeepCodeインストール先
- **Context**: 要件2で `~/.deepcode/` にグローバルインストール
- **Alternatives Considered**:
  1. プロジェクト内にインストール
  2. グローバル（ホームディレクトリ）
- **Selected Approach**: `~/.deepcode/` にグローバルインストール
- **Rationale**: 要件との整合性、複数プロジェクトでの再利用
- **Trade-offs**: システムレベルの依存関係
- **Follow-up**: Python仮想環境の管理方法

## Risks & Mitigations
- DeepCodeのCLI互換性 — バージョン固定、エラーハンドリング強化
- Python環境依存 — インストールスクリプトで環境チェック
- API Key管理 — セキュアな設定ガイドを提供

## References
- [HKUDS/DeepCode GitHub Repository](https://github.com/HKUDS/DeepCode) — 公式リポジトリ
- [deepcode-hku PyPI](https://pypi.org/project/deepcode-hku/) — Pythonパッケージ
