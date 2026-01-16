# Requirements: Remote UI Vanilla版削除

## Decision Log

### 作業範囲の決定
- **Discussion**: 新機能追加を含めるか、純粋な移行作業のみにするか
- **Conclusion**: 純粋な移行作業のみ（配信元切り替え + vanillaJS版削除 + ビルドパイプライン確認）
- **Rationale**: `remote-ui-react-migration` specでReact版は完全実装済み。残っているのは未実施のクリーンアップ作業のみ

### 背景
- **Discussion**: なぜvanillaJS版が残っているか
- **Conclusion**: `remote-ui-react-migration` specのタスク9.3/12.1が「最終統合時に実施予定」として完了マークされたが、実際には未実施のまま
- **Rationale**: inspection-2.mdで「React版が安定稼働確認後に削除推奨」と記載され、段階的移行として保留されていた

### E2Eテストの対応
- **Discussion**: E2Eテスト（remote-webserver.e2e.spec.ts）がvanillaJS版のdata-testidを使用している。React版移行後にテストが壊れる可能性
- **Conclusion**: E2Eテストをスコープに含める。React版で不足しているdata-testidがあれば追加し、テストが通ることを確認
- **Rationale**: 移行後にE2Eテストが壊れたままでは品質保証ができない。期待値レベルの変更は修正、バグか仕様変更か判断がつかない場合はエスカレーション

## Introduction

`remote-ui-react-migration` specで実装済みのReact版Remote UIへの完全移行を完了させる。現在`src/main/remote-ui/`に残存するvanillaJS版を削除し、`remoteAccessServer.ts`の配信元をReact版ビルド出力（`dist/remote-ui/`）に切り替える。

## Requirements

### Requirement 1: 配信元の切り替え

**Objective:** Remote UIサーバーがReact版を配信するようにする

#### Acceptance Criteria
1. When Remote UIサーバーが起動する, the system shall `dist/remote-ui/`から静的ファイルを配信する
2. When 開発モードで起動する, the system shall 適切なパスからReact版ビルド出力を参照する
3. If React版ビルド出力が存在しない, then the system shall エラーメッセージを出力する（vanillaJS版へのフォールバックなし）

### Requirement 2: vanillaJS版の完全削除

**Objective:** 混乱の原因となるvanillaJS版コードを完全に削除する

#### Acceptance Criteria
1. When この仕様が完了した時, the system shall `src/main/remote-ui/`ディレクトリが存在しない状態である
2. When この仕様が完了した時, the system shall vanillaJS版への参照（インポート、パス指定）がコードベースに存在しない

### Requirement 3: ビルドパイプラインの確認

**Objective:** 本番ビルドにReact版Remote UIが含まれることを確認する

#### Acceptance Criteria
1. When `npm run build`を実行する, the system shall `dist/remote-ui/`にReact版ビルド出力を生成する
2. When Electronアプリをパッケージングする, the system shall React版Remote UIを含める

### Requirement 4: E2Eテストの互換性確保

**Objective:** 既存のRemote UI E2Eテストが移行後も正常に動作することを確認する

#### Acceptance Criteria
1. When `remote-webserver.e2e.spec.ts`を実行する, the system shall 全テストがPASSする
2. If React版コンポーネントにdata-testid属性が不足している, then the system shall 必要なdata-testid属性を追加する
3. If テスト期待値がReact版の出力と異なる, then the system shall テスト期待値を修正する（仕様変更ではなく実装差異の場合）
4. If テスト失敗がバグか仕様変更か判断できない, then the system shall ユーザーにエスカレーションする

## Out of Scope

- React版UIへの機能追加
- レスポンシブデザインの改善
- 新しいWebSocketメッセージタイプの追加
- 新規E2Eテストの追加（既存テストの互換性確保のみ）

## Open Questions

- なし（作業範囲が明確）
