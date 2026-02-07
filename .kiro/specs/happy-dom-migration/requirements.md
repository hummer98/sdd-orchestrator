# Requirements: happy-dom Migration

## Decision Log

### DOM環境の選定
- **Discussion**: vitest のユニットテスト（411ファイル）で jsdom → happy-dom への移行を検討。実測で Environment 累計が 180.58s → 91.22s に半減し、全体 Duration が 106.93s → 89.38s（-16.4%）に改善。ただし7ファイル（56テスト）が新たに失敗。
- **Conclusion**: happy-dom に移行する。失敗テストはテスト側の非標準的な書き方が原因であり修正可能。
- **Rationale**: happy-dom の方がブラウザ仕様に忠実（`navigator.clipboard` が getter-only、CSS `vh` をピクセル計算）。テスト側を標準準拠に修正することで、jsdom/happy-dom どちらでも動く品質の高いテストになる。

### 互換性修正方針
- **Discussion**: 失敗は3パターンに分類。(1) `Object.assign(navigator, ...)` による clipboard モック、(2) `toHaveStyle` で `vh` 単位を文字列比較、(3) SVG の `className.baseVal` アクセス。いずれも jsdom の「緩さ」に依存した書き方。
- **Conclusion**: DOM実装に依存しない標準的な書き方に修正。修正後は jsdom でも happy-dom でも動く。
- **Rationale**: happy-dom 固有のワークアラウンドではなく、標準準拠の修正を行うことで将来の環境変更にも耐える。

### フォールバック方針
- **Discussion**: 修正困難なケースが見つかった場合の対処。
- **Conclusion**: ファイル単位で `// @vitest-environment jsdom` コメントにより jsdom にフォールバックする。
- **Rationale**: vitest の環境制御コメント機能を活用し、移行を段階的に進められる。

### Steering更新
- **Discussion**: 将来のテスト作成時に同じ非互換パターンが再発生することを防止する必要がある。
- **Conclusion**: `.kiro/steering/tech.md` の Testing セクションに happy-dom 準拠のテスト記述ルールを追加する。
- **Rationale**: テストを書く際に参照される steering に明記することで、AI/人間ともに同じパターンを踏まない。

## Introduction

vitest のユニットテスト DOM 環境を jsdom から happy-dom に移行し、テスト実行速度を約17秒（16.4%）改善する。移行に伴い、jsdom の非標準的な挙動に依存していたテストコード（8ファイル）を標準準拠の書き方に修正する。また、steering に happy-dom 準拠のテスト記述ルールを追加し、再発を防止する。

## Requirements

### Requirement 1: vitest.config.ts の環境変更

**Objective:** 開発者として、テスト実行速度を改善したい。DOM環境を happy-dom に変更することで、Environment 初期化コストを約50%削減する。

#### Acceptance Criteria
1. `vitest.config.ts` の `environment` が `'happy-dom'` に変更されていること
2. `environmentMatchGlobs` で `src/main/**` が `'node'` のままであること
3. `happy-dom` が `devDependencies` に追加されていること（既に追加済み）

### Requirement 2: `navigator.clipboard` モックの修正

**Objective:** テストコードが DOM 実装に依存せず、どの環境でも動作するようにする。

#### Acceptance Criteria
1. `Object.assign(navigator, { clipboard: ... })` パターンが全て `Object.defineProperty` に置換されていること
2. 置換後のコードが `configurable: true` を設定していること（テスト後のクリーンアップを可能にするため）
3. 修正対象の全6ファイル・8箇所が修正されていること:
   - `src/shared/components/agent/AgentLogPanel.test.tsx` (1箇所)
   - `src/renderer/components/AgentLogPanel.test.tsx` (1箇所)
   - `src/renderer/components/RemoteAccessPanel.test.tsx` (3箇所)
   - `src/renderer/components/McpSettingsPanel.test.tsx` (1箇所)
   - `src/renderer/components/InstallCloudflaredDialog.test.tsx` (1箇所)
   - `src/renderer/components/BugListItem.test.tsx` (1箇所)
4. 修正後のテストが happy-dom 環境で全て通ること

### Requirement 3: CSS `vh` 単位 assertion の修正

**Objective:** CSS相対単位のテストが computed style の実装差異に依存しないようにする。

#### Acceptance Criteria
1. `toHaveStyle({ height: 'Xvh' })` パターンが `element.style.height` の直接比較に置換されていること
2. 修正対象の1ファイル・3箇所が修正されていること:
   - `src/remote-ui/components/AgentDetailDrawer.test.tsx` (3箇所: 50vh, 90vh, 25vh)
3. 修正後のテストが happy-dom 環境で全て通ること

### Requirement 4: SVG `className.baseVal` アクセスの修正

**Objective:** SVG要素のクラス名取得が DOM 実装に依存しないようにする。

#### Acceptance Criteria
1. `svgs[N].className.baseVal` パターンが `svgs[N].getAttribute('class')` に置換されていること
2. 修正対象の1ファイル・6箇所が修正されていること:
   - `src/shared/components/ui/AgentIcon.test.tsx` (6箇所)
3. 修正後のテストが happy-dom 環境で全て通ること

### Requirement 5: フォールバック対応

**Objective:** 修正困難な互換性問題が発見された場合に、ファイル単位で jsdom にフォールバックできるようにする。

#### Acceptance Criteria
1. 修正不可能な互換性問題がある場合、該当テストファイルの先頭に `// @vitest-environment jsdom` コメントを追加すること
2. フォールバック対象ファイルがある場合、`docs/memo/vitest-performance-analysis-20260207.md` に理由を記録すること

### Requirement 6: Steering 更新

**Objective:** 将来のテスト作成時に jsdom 固有の挙動に依存したコードが書かれることを防止する。

#### Acceptance Criteria
1. `.kiro/steering/tech.md` の Testing セクションに以下のルールが追加されていること:
   - DOM環境が happy-dom であること
   - `navigator.clipboard` のモックは `Object.defineProperty` を使うこと（`Object.assign` 禁止）
   - CSS相対単位（vh, vw 等）のテストは `element.style.*` を使うこと（`toHaveStyle` での相対単位文字列比較禁止）
   - SVG要素のクラス名は `getAttribute('class')` を使うこと（`className.baseVal` 禁止）
   - フォールバックが必要な場合の `// @vitest-environment jsdom` コメントの使い方
2. ルールが簡潔で参照しやすい形式であること

### Requirement 7: 性能検証

**Objective:** happy-dom 移行後の性能改善を確認する。

#### Acceptance Criteria
1. 全テストスイートの実行が happy-dom 環境で完了すること
2. 新たな失敗テストが増加していないこと（既存失敗 + フォールバック対象を除く）
3. `docs/memo/vitest-performance-analysis-20260207.md` に最終的な計測結果が記録されていること

## Out of Scope

- プロダクションコードの変更
- jsdom の完全削除（フォールバック用に `devDependencies` に残す）
- 既存で失敗している20ファイルの修正（一覧は `docs/memo/vitest-performance-analysis-20260207.md` を参照）
- vitest バージョンアップ
- その他のパフォーマンス最適化施策

## Open Questions

- なし（調査で全パターンが特定済み）
