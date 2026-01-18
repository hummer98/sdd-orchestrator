# デッドコード調査メモ

ソースコード全体を確認し、テストでのみ使用されているコード、または全く使用されていないコード（デッドコード）を調査しました。

## 調査結果

以下のファイルおよび関数が、プロダクションコードで使用されていない、またはテストコードのみで使用されていることが確認されました。

### 1. 完全なデッドコード (プロダクションで未使用)

*   **ファイル:** `electron-sdd-manager/src/renderer/utils/validation.ts`
    *   **内容:**
        *   `validateSpecName`
        *   `validateDescription`
        *   `specNameSchema` (zod)
        *   `descriptionSchema` (zod)
        *   `createSpecSchema` (zod)
    *   **状況:** `validation.test.ts` 以外での使用箇所が見当たりません。

### 2. テスト専用エクスポート (プロダクションコードに含まれるがテストでのみ使用)

*   **ファイル:** `electron-sdd-manager/src/renderer/utils/consoleHook.ts`
    *   **関数:**
        *   `setEnvironment`: テスト環境の設定に使用。
        *   `uninitializeConsoleHook`: テスト後のクリーンアップに使用。
    *   **状況:** プロダクションコード内では使用されていません。コメントにもテスト用である旨が記載されています。

*   **ファイル:** `electron-sdd-manager/src/renderer/utils/noiseFilter.ts`
    *   **変数:** `FILTER_PATTERNS`
    *   **状況:** フィルタリングロジック (`shouldFilter`) 内で使用されていますが、定数配列としての外部エクスポートはテストファイル (`noiseFilter.test.ts`) での内容検証のみに使用されています。

### 3. 内部使用のみのエクスポート (デッドエクスポート)

*   **ファイル:** `electron-sdd-manager/src/renderer/utils/logFormatter.ts`
    *   **関数:** `parseClaudeEvent`
    *   **状況:** 同ファイル内の `formatLogData` から呼び出されていますが、外部ファイルからはインポートされていません。`export` を外して非公開関数にできる可能性があります。

### 4. プレースホルダー/将来のコード

*   **ディレクトリ:** `electron-sdd-manager/src/renderer/electron-specific`
    *   **ファイル:** `index.ts`
    *   **内容:** コメントのみ（将来のコンポーネント移行計画）。
    *   **状況:** どこからもインポートされていません。

## 推奨事項

1.  `electron-sdd-manager/src/renderer/utils/validation.ts` は、将来的に使用予定がない場合は削除するか、バリデーションロジックが必要になるまで退避させることを検討してください。
2.  `consoleHook.ts` のテスト用関数は、テストユーティリティとして分離するのが理想的ですが、内部状態（クロージャ変数）へのアクセスが必要なため、現在のままでも許容範囲かもしれません。ただし、ビルド時に削除されるような工夫（`if (import.meta.env.TEST)` ブロックなど）があるとより良いです。
3.  `noiseFilter.ts` の `FILTER_PATTERNS` は、テストのためにエクスポートされていることが明確であればそのままで問題ありません。
4.  `logFormatter.ts` の `parseClaudeEvent` は `export` を削除しても機能に影響しません。
