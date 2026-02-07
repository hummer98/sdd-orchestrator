# Design: happy-dom Migration

## Overview

**Purpose**: vitest のユニットテスト DOM 環境を jsdom から happy-dom に移行し、テスト実行速度を改善する。

**Users**: 開発者がユニットテストを実行する際に、Environment 初期化コストの約50%削減（180.58s -> 91.22s）による全体実行時間の16.4%改善（106.93s -> 89.38s）を享受する。

**Impact**: `vitest.config.ts` の環境設定変更、8ファイルのテストコード修正、steering ドキュメントの更新を行う。プロダクションコードへの変更は一切なし。

### Goals

- vitest のデフォルト DOM 環境を happy-dom に変更し、Environment 初期化コストを約50%削減する
- jsdom の非標準的な挙動に依存していた8ファイルのテストコードを標準準拠に修正する
- steering に happy-dom 準拠のテスト記述ルールを追加し、再発を防止する

### Non-Goals

- プロダクションコードの変更
- jsdom パッケージの devDependencies からの完全削除（フォールバック用に残す）
- 既存で失敗している20ファイルの修正
- vitest バージョンアップ
- その他のパフォーマンス最適化施策

## Architecture

### Existing Architecture Analysis

現在の vitest テスト環境構成は以下の通り:

- `vitest.config.ts` で `environment: 'jsdom'` がグローバル設定
- `environmentMatchGlobs` で `src/main/**` は `'node'` 環境に設定済み
- `happy-dom` は既に `devDependencies` に追加済み（`^20.5.0`）
- テストファイルは411ファイル（main: 150, renderer: 111, shared: 101, remote-ui: 47, preload: 2）

本変更はテスト設定とテストコードのみに閉じた変更であり、アーキテクチャの変更は発生しない。

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Testing | happy-dom ^20.5.0 | vitest DOM 環境 | 既に devDependencies に追加済み |
| Testing | jsdom | フォールバック用 DOM 環境 | devDependencies に残置 |
| Testing | Vitest 3.1.4 | テストランナー | 設定変更のみ |

## Requirements Traceability

| Criterion ID | Summary | Components | Implementation Approach |
|--------------|---------|------------|------------------------|
| 1.1 | `environment` を `'happy-dom'` に変更 | vitest.config.ts | 既存設定の値変更 |
| 1.2 | `environmentMatchGlobs` で `src/main/**` が `'node'` のまま | vitest.config.ts | 既存設定の維持確認 |
| 1.3 | `happy-dom` が devDependencies に存在 | package.json | 既に追加済み（変更不要） |
| 2.1 | `Object.assign(navigator, ...)` を `Object.defineProperty` に置換 | 6テストファイル | テストコード修正 |
| 2.2 | `configurable: true` 設定 | 6テストファイル | テストコード修正 |
| 2.3 | 全6ファイル・8箇所の修正 | 6テストファイル | テストコード修正 |
| 2.4 | happy-dom 環境でテスト通過 | 6テストファイル | 修正後の検証 |
| 3.1 | `toHaveStyle` を `element.style.*` 直接比較に置換 | AgentDetailDrawer.test.tsx | テストコード修正 |
| 3.2 | 1ファイル・3箇所の修正 | AgentDetailDrawer.test.tsx | テストコード修正 |
| 3.3 | happy-dom 環境でテスト通過 | AgentDetailDrawer.test.tsx | 修正後の検証 |
| 4.1 | `className.baseVal` を `getAttribute('class')` に置換 | AgentIcon.test.tsx | テストコード修正 |
| 4.2 | 1ファイル・6箇所の修正 | AgentIcon.test.tsx | テストコード修正 |
| 4.3 | happy-dom 環境でテスト通過 | AgentIcon.test.tsx | 修正後の検証 |
| 5.1 | フォールバック時に `// @vitest-environment jsdom` コメント追加 | 該当テストファイル | 条件付き対応 |
| 5.2 | フォールバック対象の理由記録 | vitest-performance-analysis memo | 条件付き対応 |
| 6.1 | tech.md に happy-dom ルール追加 | .kiro/steering/tech.md | steering 更新 |
| 6.2 | ルールが簡潔で参照しやすい形式 | .kiro/steering/tech.md | steering 更新 |
| 7.1 | 全テストスイートが happy-dom 環境で完了 | vitest.config.ts | 全テスト実行 |
| 7.2 | 新たな失敗テストが増加していない | テスト結果 | 検証 |
| 7.3 | 計測結果の記録 | vitest-performance-analysis memo | 結果追記 |

### Coverage Validation Checklist

- [x] Every criterion ID from requirements.md appears in the table above
- [x] Each criterion has specific component names (not generic references)
- [x] Implementation approach distinguishes "reuse existing" vs "new implementation"
- [x] User-facing criteria specify concrete UI components (not just "shared components")

## Components and Interfaces

本フィーチャーは新しいコンポーネントやインターフェースを導入しない。全て既存ファイルの修正であり、修正対象は以下の3カテゴリに分類される。

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|-----------------|-----------|
| vitest.config.ts | Config | DOM環境設定を happy-dom に変更 | 1.1, 1.2 | happy-dom (P0) | - |
| Clipboard Mock 修正 (6ファイル) | Test | navigator.clipboard モックを標準準拠に修正 | 2.1, 2.2, 2.3, 2.4 | - | - |
| CSS vh Assertion 修正 (1ファイル) | Test | computed style 依存を element.style 直接比較に修正 | 3.1, 3.2, 3.3 | - | - |
| SVG className 修正 (1ファイル) | Test | className.baseVal を getAttribute に修正 | 4.1, 4.2, 4.3 | - | - |
| tech.md Steering 更新 | Docs | happy-dom テストルール追加 | 6.1, 6.2 | - | - |

### Config Layer

#### vitest.config.ts 変更

| Field | Detail |
|-------|--------|
| Intent | デフォルト DOM 環境を jsdom から happy-dom に切り替える |
| Requirements | 1.1, 1.2, 1.3 |

**変更内容**:
- `environment: 'jsdom'` を `environment: 'happy-dom'` に変更
- `environmentMatchGlobs` の `['src/main/**/*.test.ts', 'node']` は維持

### Test Layer: 修正パターン

3種類の修正パターンは全て機械的な置換であり、テスト対象の振る舞い検証ロジックは変更しない。

#### Pattern A: navigator.clipboard Mock 修正

| Field | Detail |
|-------|--------|
| Intent | `Object.assign(navigator, { clipboard: ... })` を `Object.defineProperty` に置換 |
| Requirements | 2.1, 2.2, 2.3, 2.4 |

**修正対象ファイルと箇所数**:

| File | Occurrences |
|------|-------------|
| `src/shared/components/agent/AgentLogPanel.test.tsx` | 1 |
| `src/renderer/components/AgentLogPanel.test.tsx` | 1 |
| `src/renderer/components/RemoteAccessPanel.test.tsx` | 3 |
| `src/renderer/components/McpSettingsPanel.test.tsx` | 1 |
| `src/renderer/components/InstallCloudflaredDialog.test.tsx` | 1 |
| `src/renderer/components/BugListItem.test.tsx` | 1 |

**修正パターン（型定義のみ）**:

```typescript
// Before: Object.assign は happy-dom で navigator.clipboard が getter-only のため TypeError
// After: Object.defineProperty で明示的に上書き
interface ClipboardMockReplacement {
  method: 'Object.defineProperty';
  target: typeof navigator;
  property: 'clipboard';
  descriptor: {
    value: { writeText: MockFunction };
    configurable: true;  // テスト後のクリーンアップを保証
  };
}
```

**Preconditions**: テストファイル内で `Object.assign(navigator, { clipboard: ... })` パターンが使用されていること
**Postconditions**: `Object.defineProperty` に置換済み、`configurable: true` が設定されていること
**Invariants**: テスト対象の振る舞い検証ロジックは変更しない

#### Pattern B: CSS vh Unit Assertion 修正

| Field | Detail |
|-------|--------|
| Intent | `toHaveStyle({ height: 'Xvh' })` を `element.style.height` 直接比較に置換 |
| Requirements | 3.1, 3.2, 3.3 |

**修正対象**: `src/remote-ui/components/AgentDetailDrawer.test.tsx` (3箇所: 50vh, 90vh, 25vh)

**修正パターン（型定義のみ）**:

```typescript
// Before: toHaveStyle は computed style を比較。happy-dom は vh をピクセル計算するため文字列不一致
// After: inline style を直接比較（computed style の実装差異を回避）
interface VhAssertionReplacement {
  before: 'expect(element).toHaveStyle({ height: string })';
  after: 'expect(element.style.height).toBe(string)';
}
```

**Preconditions**: `toHaveStyle` で CSS 相対単位（vh, vw 等）を文字列比較しているテストがあること
**Postconditions**: `element.style.height` の直接比較に置換済みであること

#### Pattern C: SVG className.baseVal 修正

| Field | Detail |
|-------|--------|
| Intent | `svgs[N].className.baseVal` を `svgs[N].getAttribute('class')` に置換 |
| Requirements | 4.1, 4.2, 4.3 |

**修正対象**: `src/shared/components/ui/AgentIcon.test.tsx` (6箇所)

**修正パターン（型定義のみ）**:

```typescript
// Before: SVGElement.className は SVGAnimatedString であり、baseVal アクセスが必要
//         happy-dom では SVGAnimatedString の実装が異なる
// After: getAttribute('class') は DOM標準であり、全環境で動作
interface SvgClassNameReplacement {
  before: 'element.className.baseVal';
  after: "element.getAttribute('class')";
}
```

**Preconditions**: SVG 要素の `className.baseVal` でクラス名を取得しているテストがあること
**Postconditions**: `getAttribute('class')` に置換済みであること

### Docs Layer: Steering 更新

#### .kiro/steering/tech.md 更新

| Field | Detail |
|-------|--------|
| Intent | Testing セクションに happy-dom 準拠のテスト記述ルールを追加 |
| Requirements | 6.1, 6.2 |

**追加内容**:
- DOM 環境が happy-dom であること
- `navigator.clipboard` モックは `Object.defineProperty` を使用（`Object.assign` 禁止）
- CSS 相対単位（vh, vw 等）のテストは `element.style.*` を使用（`toHaveStyle` での相対単位文字列比較禁止）
- SVG 要素のクラス名は `getAttribute('class')` を使用（`className.baseVal` 禁止）
- フォールバック時の `// @vitest-environment jsdom` コメントの使い方

## Testing Strategy

### Unit Tests

本フィーチャーのテスト戦略はシンプルであり、修正した全テストが happy-dom 環境で通過することが検証基準となる。

- 修正対象の8テストファイル全てが happy-dom 環境でパスすること
- 既存の passing テストに新たな失敗が発生していないこと
- 全テストスイート（411ファイル）の実行が完了すること

### Performance Verification

- 全テスト実行の Duration が jsdom 環境（106.93s）と比較して改善していること
- Environment 累計が jsdom（180.58s）から約50%削減されていること
- 計測結果を `docs/memo/vitest-performance-analysis-20260207.md` に記録すること

## Design Decisions

### DD-001: happy-dom をデフォルト DOM 環境に採用

| Field | Detail |
|-------|--------|
| Status | Accepted |
| Context | vitest の全テスト実行で Environment 初期化コストが累計 180.58s を占め、最大のオーバーヘッドとなっている。`docs/memo/vitest-performance-analysis-20260207.md` の検証で happy-dom が jsdom より軽量であることが実証済み |
| Decision | `vitest.config.ts` の `environment` を `'jsdom'` から `'happy-dom'` に変更する |
| Rationale | Environment コストが 180.58s -> 91.22s（-49.5%）に半減し、全体 Duration が 106.93s -> 89.38s（-16.4%）に改善する。7ファイルの互換性問題は全て修正可能 |
| Alternatives Considered | (1) jsdom のまま維持 -- 改善なし。(2) テストファイル単位で happy-dom を指定 -- 管理コストが高く、全体的な改善効果が限定的 |
| Consequences | 8ファイルのテストコード修正が必要。jsdom はフォールバック用に devDependencies に残す |

### DD-002: テスト修正は標準準拠アプローチを採用

| Field | Detail |
|-------|--------|
| Status | Accepted |
| Context | happy-dom で失敗する7ファイルのテストは、jsdom の「緩い」実装に依存した非標準的な書き方が原因 |
| Decision | happy-dom 固有のワークアラウンドではなく、DOM 標準に準拠した書き方に修正する |
| Rationale | 標準準拠の修正は jsdom でも happy-dom でも動作し、将来の環境変更にも耐える。3パターン全てが機械的に置換可能 |
| Alternatives Considered | (1) happy-dom 固有の API に合わせる -- 環境ロックイン。(2) 失敗ファイルを `// @vitest-environment jsdom` でフォールバック -- 修正不要だが根本解決にならない |
| Consequences | 修正後のテストコードはブラウザ標準に準拠し、テスト品質が向上する |

### DD-003: ファイル単位フォールバック機構の設計

| Field | Detail |
|-------|--------|
| Status | Accepted |
| Context | 今回特定された7ファイルは全て修正可能だが、将来的に修正困難な互換性問題が発見される可能性がある |
| Decision | vitest の `// @vitest-environment jsdom` コメント機能をフォールバック手段として用意する |
| Rationale | vitest の標準機能であり、追加実装不要。ファイル単位で粒度が細かく、移行を段階的に進められる |
| Alternatives Considered | (1) `environmentMatchGlobs` でパターン指定 -- 個別ファイル対応に不向き。(2) カスタム環境プラグイン -- 過剰な複雑性 |
| Consequences | フォールバック使用時は理由を performance analysis memo に記録するルールとする |

## Integration & Deprecation Strategy (結合・廃止戦略)

### 変更が必要な既存ファイル

| File | Change Type | Description |
|------|-------------|-------------|
| `electron-sdd-manager/vitest.config.ts` | 設定変更 | `environment: 'jsdom'` -> `'happy-dom'` |
| `src/shared/components/agent/AgentLogPanel.test.tsx` | テスト修正 | clipboard mock パターン置換 |
| `src/renderer/components/AgentLogPanel.test.tsx` | テスト修正 | clipboard mock パターン置換 |
| `src/renderer/components/RemoteAccessPanel.test.tsx` | テスト修正 | clipboard mock パターン置換 (3箇所) |
| `src/renderer/components/McpSettingsPanel.test.tsx` | テスト修正 | clipboard mock パターン置換 |
| `src/renderer/components/InstallCloudflaredDialog.test.tsx` | テスト修正 | clipboard mock パターン置換 |
| `src/renderer/components/BugListItem.test.tsx` | テスト修正 | clipboard mock パターン置換 |
| `src/remote-ui/components/AgentDetailDrawer.test.tsx` | テスト修正 | CSS vh assertion 置換 (3箇所) |
| `src/shared/components/ui/AgentIcon.test.tsx` | テスト修正 | SVG className.baseVal 置換 (6箇所) |
| `.kiro/steering/tech.md` | ドキュメント更新 | Testing セクションに happy-dom ルール追加 |
| `docs/memo/vitest-performance-analysis-20260207.md` | ドキュメント更新 | 最終計測結果の追記 |

### 削除対象ファイル

なし。

### Interface Changes & Impact Analysis (インターフェース変更と影響分析)

本フィーチャーはインターフェースの変更を含まない。全変更はテスト設定・テストコード・ドキュメントに限定され、プロダクションコードのメソッドシグネチャやAPIインターフェースへの影響はない。
