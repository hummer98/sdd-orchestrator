# Requirements: Markdown Mermaid Preview

## Decision Log

### 対象スコープ
- **Discussion**: Spec/Bugアーティファクトのみか、Git差分ビューアも含めるか、全Markdownプレビュー箇所か
- **Conclusion**: すべてのMarkdownプレビュー箇所を対象とする
- **Rationale**: アプリケーション全体で一貫したUXを提供するため

### レンダリング方式
- **Discussion**: リアルタイムレンダリング vs 保存時レンダリング
- **Conclusion**: リアルタイムレンダリングを採用
- **Rationale**: 編集中に即座にフィードバックを得られる標準的な方式。debounce処理で負荷対策可能

### エラー表示方式
- **Discussion**: エラー時の表示方法（メッセージのみ/生コードのみ/両方）
- **Conclusion**: エラーメッセージと生コードの両方を表示
- **Rationale**: ユーザーがエラー内容を把握しつつ、元の記法も確認できデバッグしやすい

### サポートする図の種類
- **Discussion**: 優先的にサポートする図の種類を限定するか
- **Conclusion**: Mermaidがサポートする全種類をサポート
- **Rationale**: 技術的制約がなく、design.md等で様々な図が利用される可能性がある

### Remote UI対応
- **Discussion**: Electron版のみか、Remote UI（Web版）も対応するか
- **Conclusion**: Remote UIも対応する
- **Rationale**: コード共有率が高く、両方同時対応が効率的

## Introduction

SDD OrchestratorのMarkdownプレビュー機能にMermaid記法のレンダリングサポートを追加する。これにより、design.md等に記述されたフローチャート、シーケンス図、状態遷移図などをプレビューモードで視覚的に確認できるようになる。

## Requirements

### Requirement 1: Mermaidレンダリング基盤

**Objective:** As a 開発者, I want MarkdownプレビューでMermaid図がレンダリングされる, so that 設計ドキュメントの図を視覚的に確認できる

#### Acceptance Criteria
1. When Markdownコンテンツに ```` ```mermaid ```` コードブロックが含まれる場合, the system shall Mermaid図としてレンダリングして表示する
2. The system shall フローチャート、シーケンス図、状態遷移図、ER図、クラス図、ガントチャート等、Mermaidがサポートする全種類の図をレンダリングできる
3. When エディタでMermaidブロックを編集した場合, the system shall プレビューをリアルタイムで更新する（debounce処理による適切な遅延は許容）

### Requirement 2: エラーハンドリング

**Objective:** As a 開発者, I want Mermaid記法にエラーがある場合でも適切なフィードバックを得る, so that 記法の問題を特定して修正できる

#### Acceptance Criteria
1. If Mermaid記法にシンタックスエラーがある場合, then the system shall エラーメッセージを表示する
2. If Mermaid記法にエラーがある場合, then the system shall 元のコードブロック（生のMermaidコード）も表示する
3. The system shall エラーがあっても他のMarkdownコンテンツのレンダリングに影響を与えない

### Requirement 3: 対象コンポーネント

**Objective:** As a 開発者, I want アプリケーション全体で一貫してMermaidをレンダリングできる, so that どの画面でも同じ体験を得られる

#### Acceptance Criteria
1. The system shall ArtifactEditor（Spec/Bugアーティファクト）のプレビューモードでMermaidをレンダリングする
2. The system shall ArtifactPreview（アーティファクト一覧の展開プレビュー）でMermaidをレンダリングする
3. The system shall ProjectFileEditor（プロジェクトファイルエディタ）のプレビューでMermaidをレンダリングする
4. The system shall MarkdownViewer（Git差分ビューア等）でMermaidをレンダリングする
5. The system shall Remote UI版の対応コンポーネント（RemoteArtifactEditor等）でもMermaidをレンダリングする

### Requirement 4: パフォーマンス

**Objective:** As a 開発者, I want Mermaidレンダリングがアプリケーションのパフォーマンスに悪影響を与えない, so that 快適に編集作業ができる

#### Acceptance Criteria
1. The system shall 大きなMermaid図のレンダリング中も、エディタの入力操作がブロックされない
2. The system shall 複数のMermaidブロックが含まれるドキュメントでも適切にレンダリングする

## Out of Scope

- Mermaid図のエクスポート機能（PNG/SVG等への出力）
- Mermaid図の編集支援（シンタックスハイライト、補完等）はエディタ側の機能として別途検討
- Mermaid以外の図表記法（PlantUML等）のサポート
- Mermaidのバージョン固定やバージョン選択機能

## Open Questions

- `@uiw/react-md-editor` のMermaidプラグイン（`@uiw/react-md-editor/esm/plugins/mermaid`）を使用するか、独自実装するかは設計フェーズで決定
- ダークモード時のMermaid図のテーマ設定（自動切り替え等）は設計フェーズで検討
