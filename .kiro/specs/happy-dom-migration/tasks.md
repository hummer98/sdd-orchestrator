# Implementation Plan

## Task 1. vitest設定の環境変更
- [x] 1.1 (P) vitest.config.ts のデフォルト DOM 環境を happy-dom に切り替える
  - `environment` の値を `'jsdom'` から `'happy-dom'` に変更する
  - `environmentMatchGlobs` の `src/main/**` が `'node'` のまま維持されていることを確認する
  - `happy-dom` が `devDependencies` に存在することを確認する（既に追加済み）
  - _Requirements: 1.1, 1.2, 1.3_
  - _Verify: Grep "environment.*happy-dom" in vitest.config.ts_

## Task 2. navigator.clipboard モックの標準準拠修正
- [x] 2.1 (P) shared/components/agent/AgentLogPanel テストの clipboard モック修正
  - `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty(navigator, 'clipboard', { value: ..., configurable: true })` に置換する
  - テスト後のクリーンアップが可能な `configurable: true` を設定する
  - 修正後に happy-dom 環境でテストが通ることを検証する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/shared/components/agent/AgentLogPanel.test.tsx_

- [x] 2.2 (P) renderer/components/AgentLogPanel テストの clipboard モック修正
  - `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty` パターンに置換する（1箇所）
  - `configurable: true` を設定する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/renderer/components/AgentLogPanel.test.tsx_

- [x] 2.3 (P) renderer/components/RemoteAccessPanel テストの clipboard モック修正
  - 3箇所の `Object.assign(navigator, { clipboard: ... })` を全て `Object.defineProperty` パターンに置換する
  - 各箇所で `configurable: true` を設定する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/renderer/components/RemoteAccessPanel.test.tsx_

- [x] 2.4 (P) renderer/components/McpSettingsPanel テストの clipboard モック修正
  - `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty` パターンに置換する（1箇所）
  - `configurable: true` を設定する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/renderer/components/McpSettingsPanel.test.tsx_

- [x] 2.5 (P) renderer/components/InstallCloudflaredDialog テストの clipboard モック修正
  - `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty` パターンに置換する（1箇所）
  - `configurable: true` を設定する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/renderer/components/InstallCloudflaredDialog.test.tsx_

- [x] 2.6 (P) renderer/components/BugListItem テストの clipboard モック修正
  - `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty` パターンに置換する（1箇所）
  - `configurable: true` を設定する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: Object.defineProperty_
  - _Verify: Grep "Object.defineProperty.*navigator.*clipboard" in src/renderer/components/BugListItem.test.tsx_

## Task 3. CSS vh 単位 assertion の標準準拠修正
- [x] 3.1 (P) remote-ui/components/AgentDetailDrawer テストの vh assertion 修正
  - 3箇所の `toHaveStyle({ height: 'Xvh' })` を `element.style.height` の直接比較（`toBe('Xvh')`）に置換する
  - 対象の値: 50vh, 90vh, 25vh
  - computed style の実装差異に依存しない標準的な検証方法を使用する
  - 修正後に happy-dom 環境でテストが通ることを検証する
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: element.style.height, toBe_
  - _Verify: Grep "\.style\.height.*toBe" in src/remote-ui/components/AgentDetailDrawer.test.tsx_

## Task 4. SVG className.baseVal アクセスの標準準拠修正
- [x] 4.1 (P) shared/components/ui/AgentIcon テストの SVG クラス名取得修正
  - 6箇所の `svgs[N].className.baseVal` を `svgs[N].getAttribute('class')` に置換する
  - DOM 標準 API を使用することで環境非依存にする
  - 修正後に happy-dom 環境でテストが通ることを検証する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: getAttribute('class')_
  - _Verify: Grep "getAttribute.*class" in src/shared/components/ui/AgentIcon.test.tsx_

## Task 5. Steering ドキュメントの更新
- [x] 5.1 (P) tech.md の Testing セクションに happy-dom テスト記述ルールを追加する
  - DOM 環境が happy-dom であることを明記する
  - `navigator.clipboard` モックは `Object.defineProperty` を使用し、`Object.assign` を禁止するルールを追加する
  - CSS 相対単位（vh, vw 等）のテストは `element.style.*` を使用し、`toHaveStyle` での相対単位文字列比較を禁止するルールを追加する
  - SVG 要素のクラス名は `getAttribute('class')` を使用し、`className.baseVal` を禁止するルールを追加する
  - フォールバックが必要な場合の `// @vitest-environment jsdom` コメントの使い方を記載する
  - 簡潔で参照しやすい形式にする
  - _Requirements: 6.1, 6.2_

## Task 6. 全テスト実行による性能検証
- [x] 6.1 全テストスイートを happy-dom 環境で実行し、性能改善を確認する
  - 全テストスイート（411ファイル）が happy-dom 環境で完了することを検証する
  - 新たな失敗テストが増加していないことを確認する
  - 修正困難な互換性問題が見つかった場合は `// @vitest-environment jsdom` でフォールバックし、理由を記録する
  - 計測結果を `docs/memo/vitest-performance-analysis-20260207.md` に追記する
  - Task 1〜4 の完了後に実行する（全修正が適用された状態で検証する必要があるため (P) 不可）
  - _Requirements: 5.1, 5.2, 7.1, 7.2, 7.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `environment` を `'happy-dom'` に変更 | 1.1 | Infrastructure |
| 1.2 | `environmentMatchGlobs` で `src/main/**` が `'node'` のまま | 1.1 | Infrastructure |
| 1.3 | `happy-dom` が devDependencies に存在 | 1.1 | Infrastructure |
| 2.1 | `Object.assign` を `Object.defineProperty` に置換 | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Feature |
| 2.2 | `configurable: true` 設定 | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Feature |
| 2.3 | 全6ファイル・8箇所の修正 | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Feature |
| 2.4 | happy-dom 環境でテスト通過 | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 | Feature |
| 3.1 | `toHaveStyle` を `element.style.*` 直接比較に置換 | 3.1 | Feature |
| 3.2 | 1ファイル・3箇所の修正 | 3.1 | Feature |
| 3.3 | happy-dom 環境でテスト通過 | 3.1 | Feature |
| 4.1 | `className.baseVal` を `getAttribute('class')` に置換 | 4.1 | Feature |
| 4.2 | 1ファイル・6箇所の修正 | 4.1 | Feature |
| 4.3 | happy-dom 環境でテスト通過 | 4.1 | Feature |
| 5.1 | フォールバック時の jsdom コメント追加 | 6.1 | Feature |
| 5.2 | フォールバック対象の理由記録 | 6.1 | Feature |
| 6.1 | tech.md に happy-dom ルール追加 | 5.1 | Feature |
| 6.2 | ルールが簡潔で参照しやすい形式 | 5.1 | Feature |
| 7.1 | 全テストスイートが happy-dom 環境で完了 | 6.1 | Feature |
| 7.2 | 新たな失敗テストが増加していない | 6.1 | Feature |
| 7.3 | 計測結果の記録 | 6.1 | Feature |
