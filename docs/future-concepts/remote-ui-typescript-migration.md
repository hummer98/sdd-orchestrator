# Remote UI TypeScript移行計画

## 概要

`electron-sdd-manager/src/main/remote-ui/` のVanilla JavaScript実装をTypeScriptに移行し、型安全性・開発効率・保守性を向上させる構想。

## 現状分析

### 現在の構成

| ファイル | 行数 | 役割 |
|----------|------|------|
| `app.js` | 622行 | メインアプリケーションロジック |
| `components.js` | 1,694行 | UIコンポーネント（9クラス） |
| `websocket.js` | 339行 | WebSocket接続管理 |
| `logFormatter.js` | ~100行 | ログ出力フォーマット |
| `styles.css` | ~200行 | カスタムスタイル |
| `index.html` | 245行 | エントリーポイント |

**合計**: 約2,900行のJavaScriptコード

### 現在のビルドフロー

```
src/main/remote-ui/*.js, *.html, *.css
         ↓ (copyRemoteUI plugin - vite.config.ts)
dist/main/remote-ui/  ← そのままコピー（変換なし）
         ↓ (HTTP配信)
Mobile Browser
```

**特徴:**
- ビルドステップなし（静的ファイルコピー）
- CDN依存（Tailwind CSS v4）
- フレームワークなし（Vanilla JS）

### なぜVanilla JSが選ばれたか

設計時の意図的な判断（[design.md](../../.kiro/specs/mobile-remote-access/design.md)より）:
- **Non-Goals**: "React/Vue等のフレームワークを使用したモバイルUI"
- **Technology Stack**: "Vanilla JS - フレームワーク不要"、"Tailwind CSS CDN - ビルド不要"

---

## TypeScript移行のメリット・デメリット

### メリット

| 項目 | 説明 |
|------|------|
| **型安全性** | WebSocketメッセージ、コンポーネントProps、イベントハンドラの型チェック |
| **IDE支援** | オートコンプリート、リファクタリング、定義ジャンプ |
| **ドキュメント性** | 型定義がそのまま仕様書として機能 |
| **既存型の再利用** | `SpecStatus`, `BugPhase`等の型をメインアプリと共有 |
| **テスト容易性** | 型定義によりテストケース設計が明確化 |
| **将来のReact移行** | TSXへの段階的移行パスが開ける |

### デメリット

| 項目 | 説明 | 対策 |
|------|------|------|
| **ビルドステップ追加** | コピーだけでなくトランスパイルが必要 | Vite sub-buildで効率化 |
| **設定複雑化** | tsconfig追加、ビルド設定変更 | 最小限の設定で開始 |
| **開発サイクル遅延** | 変更→ビルド→確認のループ追加 | HMR/ウォッチモードで軽減 |
| **CDN Tailwindとの整合** | ビルド時のスタイル処理検討 | CDN継続使用で回避 |

---

## 移行アプローチ

### 選択肢比較

| アプローチ | 説明 | 工数 | リスク |
|------------|------|------|--------|
| **(A) 段階的移行** | JSファイルを1つずつ.tsに変換 | 中 | 低 |
| **(B) 一括移行** | 全ファイルを同時に.ts化 | 中 | 中 |
| **(C) 並行開発** | 新機能はTS、既存はJSのまま | 低 | 高（混在） |
| **(D) React移行同時** | TS化と同時にReact導入 | 高 | 高 |

### 推奨: **(A) 段階的移行**

**理由:**
- 動作確認しながら進められる
- 問題発生時の切り戻しが容易
- 既存テスト（`remote-ui.test.ts`）を活用可能

---

## 実装計画

### Phase 1: ビルド基盤整備（1日）

```
1.1 TypeScript設定追加
    - electron-sdd-manager/tsconfig.remote-ui.json 作成
    - 最小限の厳格設定（strict: false から開始）

1.2 Viteビルド設定更新
    - vite.config.ts の copyRemoteUI プラグインを修正
    - src/main/remote-ui/*.ts → dist/main/remote-ui/*.js へのトランスパイル

1.3 エントリーポイント調整
    - index.html のスクリプト参照を維持（ファイル名は.js）
```

**tsconfig.remote-ui.json (案):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "../../dist/main/remote-ui",
    "strict": false,
    "noEmit": false,
    "declaration": false,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["**/*.test.ts"]
}
```

### Phase 2: 型定義追加（0.5日）

```
2.1 共有型定義ファイル作成
    - src/main/remote-ui/types.ts
    - WebSocketメッセージ型
    - コンポーネントProps型
    - アプリケーション状態型

2.2 既存型のインポート
    - src/shared/types.ts から SpecStatus, BugPhase 等を参照
    - 循環依存に注意
```

**types.ts (案):**
```typescript
// WebSocket Messages
export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp?: number;
}

export interface InitPayload {
  project: string;
  specs: SpecData[];
  bugs: BugData[];
  logs: LogEntry[];
}

// Component Props
export interface SpecCardProps {
  spec: SpecData;
  isSelected: boolean;
  onClick: () => void;
}

// Application State
export interface AppState {
  projectPath: string | null;
  specs: SpecData[];
  bugs: BugData[];
  selectedSpec: SpecData | null;
  selectedBug: BugData | null;
  agents: AgentInfo[];
}
```

### Phase 3: ファイル別移行（2-3日）

移行順序（依存関係の少ない順）:

```
3.1 websocket.ts（最初）
    - 外部依存なし
    - 型定義の効果が最も大きい
    - WSMessage型の導入

3.2 logFormatter.ts
    - シンプルなユーティリティ
    - 型定義追加のみ

3.3 components.ts
    - 最大のファイル
    - クラスごとに段階的に型追加
    - DOM要素の型アサーション

3.4 app.ts（最後）
    - 全体を統合
    - 他ファイルの型を活用
```

### Phase 4: 厳格化・最適化（1日）

```
4.1 strict: true 有効化
    - null/undefinedチェック強化
    - 型推論の改善

4.2 バンドル最適化
    - 複数ファイルの単一バンドル化（オプション）
    - Tree shakingの検討

4.3 テスト更新
    - remote-ui.test.ts の型定義活用
    - 型ベースのテストケース追加
```

---

## ビルド設定変更案

### vite.config.ts 修正

```typescript
import { build } from 'vite';

function buildRemoteUI() {
  return {
    name: 'build-remote-ui',
    async closeBundle() {
      // TypeScriptをビルド
      await build({
        configFile: false,
        root: resolve(__dirname, 'src/main/remote-ui'),
        build: {
          outDir: resolve(__dirname, 'dist/main/remote-ui'),
          emptyOutDir: false,
          lib: {
            entry: {
              app: 'app.ts',
              components: 'components.ts',
              websocket: 'websocket.ts',
              logFormatter: 'logFormatter.ts',
            },
            formats: ['es'],
          },
          rollupOptions: {
            output: {
              entryFileNames: '[name].js',
            },
          },
        },
      });

      // 静的ファイル（HTML, CSS）をコピー
      copyStaticFiles();
    },
  };
}
```

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| ビルド失敗でモバイルUI使用不可 | 高 | CIでのビルドテスト必須化 |
| 型定義の過度な複雑化 | 中 | シンプルな型から開始、段階的に厳格化 |
| CDN Tailwindとの相性問題 | 低 | CDN継続使用、ビルド時は触れない |
| 開発ループ遅延 | 中 | ウォッチモード設定、HMR検討 |

---

## 将来の拡張オプション

### オプション1: React移行

TypeScript化完了後、段階的にReact化:
```
Phase A: App.tsxを作成、既存コンポーネントをラップ
Phase B: 個別コンポーネントをReact化
Phase C: Tailwind CSS v4 CDN → PostCSS統合
```

### オプション2: 共有コンポーネント

メインアプリ（React）とremote-uiで共通ロジック共有:
```
src/shared/
  ├── types.ts        # 既存
  ├── utils/          # 共通ユーティリティ
  └── hooks/          # React hooks (メインアプリ用)
```

### オプション3: Viteプレビューサーバー

開発時のHMR対応:
```
npm run dev:remote-ui  # localhost:5174でプレビュー
```

---

## 推定工数

| Phase | タスク | 工数 |
|-------|--------|------|
| 1 | ビルド基盤整備 | 4-6時間 |
| 2 | 型定義追加 | 2-3時間 |
| 3 | ファイル別移行 | 8-12時間 |
| 4 | 厳格化・最適化 | 4-6時間 |
| **合計** | | **18-27時間（2-3日）** |

---

## 結論

### 推奨

**現時点では移行しない**ことを推奨。

**理由:**
1. 現在のコードベースは安定して動作している
2. 約2,900行のコードに対して2-3日の工数は投資対効果が限定的
3. 新機能追加や大規模変更のタイミングで再検討が適切

### 移行を検討すべきタイミング

- 大規模なUI機能追加が予定される場合
- WebSocketメッセージ型の不一致バグが頻発する場合
- React移行を決定した場合（前提としてTS化が必要）
- 新規メンバーがremote-uiを修正する機会が増えた場合

---

## 参考資料

- [mobile-remote-access/design.md](../../.kiro/specs/mobile-remote-access/design.md) - 元の設計ドキュメント
- [vite.config.ts](../../electron-sdd-manager/vite.config.ts) - 現在のビルド設定
- [remote-ui.test.ts](../../electron-sdd-manager/src/main/remote-ui/remote-ui.test.ts) - 既存テスト
