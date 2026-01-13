# Implementation Plan

## Task 1: SpecMetadata 型定義の変更

- [x] 1.1 (P) renderer/types/index.ts の SpecMetadata 型を変更する
  - phase, updatedAt, approvals フィールドを削除
  - name, path のみを保持する型に変更
  - 既存の参照箇所のコンパイルエラーを確認（修正は後続タスク）
  - _Requirements: 1.1, 1.2_

- [x] 1.2 (P) shared/api/types.ts の SpecMetadata 型定義を同期する
  - renderer版と同じくname, pathのみの定義に変更
  - Remote UI側の型整合性を維持
  - _Requirements: 1.1, 1.2_

## Task 2: fileService.readSpecs の変更

- [x] 2.1 fileService.readSpecs がname/pathのみを返すように修正する
  - spec.json読み込み処理を削除
  - SpecMetadataにphase, updatedAt, approvalsを含めない
  - 戻り値の型が新しいSpecMetadata型と一致することを確認
  - _Requirements: 2.1, 2.2_

## Task 3: specListStore の拡張

- [x] 3.1 specListStore に specJsonMap を追加する
  - specId -> SpecJson のマッピングを保持するstateを追加
  - loadSpecJsons アクションを実装
  - specJsonMap更新時の型安全性を確保
  - _Requirements: 3.2, 5.2_

- [x] 3.2 specListStore のフィルタリングロジックを修正する
  - getSortedFilteredSpecs が specJsonMap.phase を参照するよう変更
  - statusFilter適用時にspecJsonからphaseを取得
  - specJsonMapに存在しないspecはフィルタリング対象外とする
  - _Requirements: 3.1, 3.3_

- [x] 3.3 specListStore のソートロジックを修正する
  - ソート処理が specJsonMap.updated_at を参照するよう変更
  - 名前順、更新日時順、フェーズ順の全ソートオプションで動作確認
  - _Requirements: 5.1, 5.3_

## Task 4: SpecListItem コンポーネントの修正

- [x] 4.1 SpecListItem の props に phase と updatedAt を追加する
  - 既存のspec propからのphase参照を削除
  - 新しいprops経由でphaseとupdatedAtを受け取る
  - フェーズバッジ表示ロジックは既存のものを流用
  - _Requirements: 4.1, 4.2_

## Task 5: Electron版 SpecList の修正

- [x] 5.1 SpecList がSpecListItemにphase propsを渡すように修正する
  - specJsonMapからphaseとupdatedAtを取得
  - SpecListItemへのprops渡しを実装
  - リスト表示時に全specのspecJsonが読み込まれていることを前提
  - _Requirements: 4.3_

## Task 6: specDetailStore の修正

- [x] 6.1 specDetail.metadata がname/pathのみを保持するよう修正する
  - selectSpec時のmetadata構築ロジックを変更
  - phase等の情報はspecDetail.specJsonから取得する設計に変更
  - _Requirements: 6.1, 6.2_

- [x] 6.2 specDetail参照箇所をspecJson.phase参照に変更する
  - specDetail.metadata.phaseを参照していた箇所を特定
  - specDetail.specJson.phaseへの参照に変更
  - 型エラーを解消
  - _Requirements: 6.2, 6.3_

## Task 7: specStoreFacade の修正

- [x] 7.1 specStoreFacade のloadSpecs後にspecJsonsも読み込むよう修正する
  - loadSpecs完了後にloadSpecJsonsを呼び出し
  - specJsonMapの構築タイミングを適切に制御
  - _Requirements: 3.2, 5.2_

## Task 8: Remote UI の修正

- [x] 8.1 (P) webSocketHandler の specs 配信が phase を含むことを確認し、必要に応じて修正する
  - SpecInfo型にphaseが含まれていることを確認
  - specs_updatedイベントでphase情報が配信されることを確認
  - StateProvider.getSpecs（handlers.ts getSpecsForRemote）の実装を確認
  - SpecMetadataからphaseが削除されるため、specJsonからphaseを取得するよう修正する
  - _Requirements: 7.1_

- [x] 8.2 Remote UI の SpecsView を修正する
  - specJsonからphaseを取得してSpecListItemに渡す
  - WebSocket経由で受信するSpecInfoを適切に処理
  - _Requirements: 7.2, 7.3_

- [x] 8.3 Remote UI の shared/stores/specStore を修正する
  - specJsonMap相当の仕組みが必要か検討
  - 設計判断: Remote UIはWebSocket経由でphase付きSpecInfoを受信するため、specJsonMap相当の仕組みは不要と想定
  - 検討の結果、追加実装が必要な場合はサブタスクを追加する
  - Remote UIでのフィルタリング/ソートが正しく動作することを確認
  - _Requirements: 7.3_

## Task 9: 既存テストの更新

- [x] 9.1 (P) SpecMetadata を使用するテストデータを新型定義に対応させる
  - テストファイル内のSpecMetadataモックを修正
  - phase, updatedAt, approvalsを削除
  - name, pathのみのモックデータに変更
  - _Requirements: 8.1_

- [x] 9.2 specListStore のフィルタリング/ソートテストを更新する
  - specJsonMapを使用するテストケースを追加
  - フィルタリング・ソートが正しく動作することを検証
  - _Requirements: 8.2_

- [x] 9.3 SpecListItem のテストを更新する
  - phase props を渡すテストケースに修正
  - フェーズバッジの正しい表示を検証
  - _Requirements: 8.1, 8.2_

## Task 10: 統合テストと最終確認

- [x] 10.1 TypeScript コンパイルが通ることを確認する
  - 全ファイルでコンパイルエラーがないことを確認
  - 型定義の変更が正しく反映されていることを確認
  - _Requirements: 1.3_

- [x] 10.2 全テストがPASSすることを確認する
  - npm run test:run で全ユニットテストを実行
  - 失敗するテストがあれば修正
  - _Requirements: 8.3_

- [x] 10.3 Electron版とRemote UI版の動作確認を行う
  - Spec一覧表示でフェーズバッジが正しく表示されることを確認
  - フィルタリング・ソートが正しく動作することを確認
  - Spec選択後にspecDetailが正しく更新されることを確認
  - _Requirements: 4.3, 7.2, 7.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | SpecMetadata型をname/pathのみに変更 | 1.1, 1.2 | Infrastructure |
| 1.2 | phase, updatedAt, approvalsを削除 | 1.1, 1.2 | Infrastructure |
| 1.3 | TypeScriptコンパイル通過 | 10.1 | Infrastructure |
| 2.1 | readSpecsがname/pathのみ返す | 2.1 | Infrastructure |
| 2.2 | 戻り値型の一致 | 2.1 | Infrastructure |
| 3.1 | フィルタリングがspecJson.phaseを参照 | 3.2 | Feature |
| 3.2 | specJson取得の仕組み実装 | 3.1, 7.1 | Infrastructure |
| 3.3 | 既存フィルタリング機能の正常動作 | 3.2, 9.2 | Feature |
| 4.1 | SpecListItemがphaseをpropsで受け取る | 4.1 | Feature |
| 4.2 | フェーズバッジの正しい表示 | 4.1, 9.3 | Feature |
| 4.3 | Electron版とRemote UI版の正常動作 | 5.1, 10.3 | Feature |
| 5.1 | ソート処理がspecJson.updated_atを参照 | 3.3 | Feature |
| 5.2 | specJson取得の仕組み実装 | 3.1, 7.1 | Infrastructure |
| 5.3 | 既存ソート機能の正常動作 | 3.3, 9.2 | Feature |
| 6.1 | specDetail.metadataがname/pathのみ | 6.1 | Infrastructure |
| 6.2 | phase等はspecDetail.specJsonから取得 | 6.1, 6.2 | Feature |
| 6.3 | Spec選択時・ファイル変更時の正しい更新 | 6.2, 10.3 | Feature |
| 7.1 | WebSocket APIでphase送信 | 8.1 | Infrastructure |
| 7.2 | Remote UI SpecListItemの正しい表示 | 8.2, 10.3 | Feature |
| 7.3 | Remote UIフィルタリングの正常動作 | 8.2, 8.3, 10.3 | Feature |
| 8.1 | テストが新型定義に対応 | 9.1, 9.3 | Infrastructure |
| 8.2 | フィルタリング・ソートテスト更新 | 9.2, 9.3 | Infrastructure |
| 8.3 | 全テストPASS | 10.2 | Infrastructure |

### Coverage Validation Checklist

- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 3.1), not container tasks (e.g., 3)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
