# Specification Review Report #1

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 3 |
| WARNING | 6 |
| INFO | 4 |

全体的にドキュメント間の整合性は高く、Requirements → Design → Tasks のトレーサビリティが確保されている。しかし、ドキュメント間のデータ不一致（チャンネル数、プロシージャ配置）、Remote UIへの間接的影響の詳細化不足、Subscription統合テストの具体性不足が重要な課題として検出された。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。全12要件がDesignのRequirements Traceabilityテーブルに反映されている。

**検出された不一致**:

| # | 不一致内容 | Requirements | Design | 影響 |
|---|-----------|-------------|--------|------|
| 1 | `GET_INITIAL_PROJECT_PATH`の配置先 | Req 1: 記載なし（system系4チャンネルのみ） | research.md: `system.getInitialProjectPath`としてsystem routerに配置 / design.md: `projectRouter`に`getInitialProjectPath`も定義 | 重複定義の可能性 |
| 2 | `GET_APP_PATH`の移行先 | Req 1.1: `GET_APP_PATH → system.getAppPath`を明記 | research.md system routerマッピング: `GET_APP_PATH`が欠落（`GET_INITIAL_PROJECT_PATH`が代わりに含まれる） | research.mdのマッピングテーブル不整合 |
| 3 | Req 9のチャンネル数 | SSH関連の具体的チャンネル数が未定義 | sshHandlers.tsのチャンネル数が「N/A」 | 合計219への影響不明 |

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。各DesignコンポーネントにTaskが対応している。

**検出された不一致**:

| # | 不一致内容 | Design | Tasks | 影響 |
|---|-----------|--------|-------|------|
| 1 | configルータープロシージャ数 | 22プロシージャ（Service Interface） | Task 3.1: 「全24プロシージャ」と記載 | 数値不一致（2プロシージャ差分: `getBugsWorktreeDefault`, `setBugsWorktreeDefault`がresearch.mdで追加されているが、design.mdのService Interfaceに未反映） |
| 2 | projectルータープロシージャ数 | 9プロシージャ（Service Interface、`getIsE2ETest`含む） | Task 4.1: 「全8プロシージャ」と記載しつつ9個列挙 | テキストと実際の列挙が不一致 |
| 3 | fileルータープロシージャ数 | design.md未定義（research.md参照） | Task 4.2: 「全11プロシージャ」 | design.mdにfileRouterのService Interface定義なし |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| systemRouter拡張 | ✅ 定義済み | Task 2.1-2.3 | ✅ |
| configRouter | ✅ Service Interface定義済み | Task 3.1-3.3 | ✅ |
| projectRouter | ✅ Service Interface定義済み | Task 4.1, 4.3-4.4 | ✅ |
| fileRouter | ⚠️ design.mdに詳細なし（research.md参照） | Task 4.2, 4.3-4.4 | ⚠️ |
| specRouter | ⚠️ 「同じパターン」記載のみ | Task 5.1, 5.3-5.4 | ⚠️ |
| bugRouter | ⚠️ 「同じパターン」記載のみ | Task 5.2, 5.3-5.4 | ⚠️ |
| agentRouter | ⚠️ 「同じパターン」記載のみ | Task 6.1-6.3 | ⚠️ |
| autoExecutionRouter | ⚠️ 「同じパターン」記載のみ | Task 7.1-7.3 | ⚠️ |
| gitRouter | ⚠️ 「同じパターン」記載のみ | Task 8.1-8.3 | ⚠️ |
| eventsRouter | ✅ Subscription Interface定義済み | Task 9.1-9.3 | ✅ |
| cloudflare/install/mcp/schedule/miscRouter | ⚠️ 「同じパターン」記載のみ | Task 10.1-10.7 | ⚠️ |
| Zodスキーマ群 | ✅ ファイル配置定義済み | 各タスクに含む | ✅ |
| レガシー撤廃 | ✅ Impact Analysis Contract完備 | Task 11.1-11.5 | ✅ |
| E2Eテスト | ✅ Verification Contract定義済み | Task 12.1-12.2 | ✅ |
| ドキュメント更新 | ✅ 対象ファイル明記 | Task 13.1-13.4 | ✅ |

**注記**: 「同じパターン」とされるルーター群はdesign.mdで意図的に省略されている（「configRouter/projectRouterと同じパターンに従う」との記載あり）。research.mdに詳細マッピングがあるため、設計情報は参照可能だが、design.md単体での完全性は低い。

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 4チャンネルtRPC移行 | 2.1 | Feature | ✅ |
| 1.2 | Zodスキーマ定義 | 2.1 | Feature | ✅ |
| 1.3 | Rendererフック置換 | 2.2 | Feature | ✅ |
| 1.4 | 統合テスト | 2.3 | Integration Test | ✅ |
| 1.5 | レガシーハンドラ削除 | 2.3 | Cleanup | ✅ |
| 1.6 | preload API削除 | 2.3 | Cleanup | ✅ |
| 2.1 | config router作成 | 3.1 | Feature | ✅ |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature | ✅ |
| 2.3 | Zodスキーマ | 3.1 | Feature | ✅ |
| 2.4 | configHandlers削除 | 3.3 | Cleanup | ✅ |
| 2.5 | 統合テスト | 3.3 | Integration Test | ✅ |
| 3.1 | project/file router作成 | 4.1, 4.2 | Feature | ✅ |
| 3.2 | Project/File全チャンネル移行 | 4.1, 4.2, 4.3 | Feature | ✅ |
| 3.3 | Zodスキーマ | 4.1, 4.2 | Feature | ✅ |
| 3.4 | projectHandlers/fileHandlers削除 | 4.4 | Cleanup | ✅ |
| 3.5 | projectFileHandlers削除 | 4.4 | Cleanup | ✅ |
| 3.6 | 統合テスト | 4.4 | Integration Test | ✅ |
| 4.1 | spec/bug router作成 | 5.1, 5.2 | Feature | ✅ |
| 4.2 | Spec/Bug全チャンネル移行 | 5.1, 5.2, 5.3 | Feature | ✅ |
| 4.3 | Zodスキーマ | 5.1, 5.2 | Feature | ✅ |
| 4.4 | specHandlers/bugHandlers/worktreeHandlers削除 | 5.4 | Cleanup | ✅ |
| 4.5 | convertWorktreeHandlers削除 | 5.4 | Cleanup | ✅ |
| 4.6 | 統合テスト | 5.4 | Integration Test | ✅ |
| 5.1 | agent router作成 | 6.1 | Feature | ✅ |
| 5.2 | Agent全チャンネル移行 | 6.1, 6.2 | Feature | ✅ |
| 5.3 | Zodスキーマ | 6.1 | Feature | ✅ |
| 5.4 | agentHandlers削除 | 6.3 | Cleanup | ✅ |
| 5.5 | 統合テスト | 6.3 | Integration Test | ✅ |
| 6.1 | autoExecution router作成 | 7.1 | Feature | ✅ |
| 6.2 | AutoExecution全チャンネル移行 | 7.1, 7.2 | Feature | ✅ |
| 6.3 | Zodスキーマ | 7.1 | Feature | ✅ |
| 6.4 | autoExecution/bugAutoExecutionHandlers削除 | 7.3 | Cleanup | ✅ |
| 6.5 | 統合テスト | 7.3 | Integration Test | ✅ |
| 7.1 | git router作成 | 8.1 | Feature | ✅ |
| 7.2 | Git/Worktree全チャンネル移行 | 8.1, 8.2 | Feature | ✅ |
| 7.3 | Zodスキーマ | 8.1 | Feature | ✅ |
| 7.4 | gitHandlers/worktreeHandlers削除 | 8.3 | Cleanup | ✅ |
| 7.5 | 統合テスト | 8.3 | Integration Test | ✅ |
| 8.1 | tRPC Subscription設定 | 9.1 | Feature | ✅ |
| 8.2 | 全イベント通知移行 | 9.1 | Feature | ✅ |
| 8.3 | ipcRenderer.onリスナー削除 | 9.2 | Cleanup | ✅ |
| 8.4 | Subscriptionフック使用 | 9.2 | Feature | ✅ |
| 8.5 | 統合テスト | 9.3 | Integration Test | ✅ |
| 9.1 | 残りドメイン全移行 | 10.1-10.6 | Feature | ✅ |
| 9.2 | Zodスキーマ | 10.1-10.5 | Feature | ✅ |
| 9.3 | 対応ハンドラ削除 | 10.7 | Cleanup | ✅ |
| 9.4 | 統合テスト | 10.7 | Integration Test | ✅ |
| 10.1 | preload/index.ts最小化 | 11.1 | Cleanup | ✅ |
| 10.2 | channels.ts削除 | 11.2 | Cleanup | ✅ |
| 10.3 | handlers.ts等削除 | 11.2 | Cleanup | ✅ |
| 10.4 | electron.d.ts削除 | 11.3 | Cleanup | ✅ |
| 10.5 | contextBridge削除 | 11.1 | Cleanup | ✅ |
| 10.6 | window.electronAPI参照全削除 | 11.4 | Cleanup | ✅ |
| 10.7 | TypeScript/テストpass | 11.5 | Integration Test | ✅ |
| 10.8 | 全統合テストpass | 11.5 | Integration Test | ✅ |
| 11.1 | E2E/人間テストチェックリスト | 12.1, 12.2 | Feature | ✅ |
| 11.2 | 自動化可能項目のE2Eテスト | 12.1 | Integration Test | ✅ |
| 11.3 | 人間テスト項目文書化 | 12.2 | Feature | ✅ |
| 12.1 | tech.md更新 | 13.1 | Infrastructure | ✅ |
| 12.2 | structure.md更新 | 13.2 | Infrastructure | ✅ |
| 12.3 | 計画書ステータス更新 | 13.3 | Infrastructure | ✅ |
| 12.4 | tRPC API追加手順文書化 | 13.4 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Infrastructureのみのcriterionはドキュメント更新系（12.x）のみで適切

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | 全ルーター | 各ドメインTask X.3/X.4の統合テスト | ✅ |
| Zodスキーマバリデーション | Zodスキーマ群 | 各ルーターテスト内 | ✅ |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | ⚠️ |
| Context DI | DD-006 | Task 1.2（テストヘルパー） | ✅ |
| Renderer Subscription接続 | Subscription移行フロー | なし | ❌ CRITICAL |
| IpcApiClient → tRPC移行完全性 | IpcApiClient段階的廃止 | Task 11.4 | ✅ |
| Remote UI WebSocketApiClient影響 | DD-005 | なし | ⚠️ |

**Validation Results**:
- [x] 各ルーターに統合テストタスクが存在
- [ ] Subscription（electron-trpc IPC経由）のEnd-to-Endテスト方法が未定義
- [ ] Remote UIへの間接的影響（ApiClientインターフェース変更）のテスト戦略が未定義

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **`GET_INITIAL_PROJECT_PATH`の二重定義** | research.md: system routerに配置 | design.md: projectRouterのService Interfaceに`getInitialProjectPath`定義 | CRITICAL |
| 2 | **configプロシージャ数** | design.md Service Interface: 22プロシージャ | research.md: 24チャンネル（`getBugsWorktreeDefault`, `setBugsWorktreeDefault`追加）/ tasks.md: 「全24プロシージャ」 | WARNING |
| 3 | **projectプロシージャ数** | design.md Service Interface: 9個 | tasks.md Task 4.1: 「全8プロシージャ」と記載しつつ9個を列挙 | WARNING |
| 4 | **sshHandlersチャンネル数** | requirements.md Req 9: 「SSH関連」（チャンネル数未記載） | research.md: 「N/A」 | WARNING |
| 5 | **全チャンネル数219の検証** | requirements.md: 219チャンネル | research.mdの合計: 計算すると約188+N/A（SSH）。219との差分不明 | WARNING |
| 6 | **Req 1の対象チャンネル** | requirements.md: `GET_APP_VERSION`, `GET_PLATFORM`, `GET_APP_PATH`, `GET_NODE_ENV` | research.md system router: `GET_APP_VERSION`, `GET_PLATFORM`, `GET_INITIAL_PROJECT_PATH`, `GET_NODE_ENV`（`GET_APP_PATH`なし） | CRITICAL |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **Subscription接続のライフサイクル管理テスト**: BrowserWindowクローズ時のSubscription cleanup動作の検証方法が未定義 | WARNING | メモリリーク、ゴースト接続の可能性 |
| 2 | **コンテキスト生成のパフォーマンス**: DD-006のFollow-upで指摘されているが、テストや検証タスクなし | INFO | 大量の並行リクエスト時のパフォーマンス劣化 |
| 3 | **並行移行時のTypeScript互換性**: 移行中間状態でレガシーIPC型とtRPC型が共存する際の型衝突回避策が未記載 | INFO | 実装中の型エラー |
| 4 | **electron-trpc Subscriptionの同時接続数制限**: 複数のSubscriptionを同一BrowserWindowで使用する場合のIPC帯域影響 | INFO | Agent大量実行時のイベント遅延 |
| 5 | **Remote UI ApiClientインターフェースの整理方針**: IpcApiClient固有メソッド削除後のApiClient型の具体的な変更内容が未定義 | WARNING | Task 11.4実施時の設計判断が曖昧 |

### 2.2 Operational Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **ロールバック手順の具体化**: Rollback Triggersは定義されているが、具体的なロールバック手順（gitの操作、中間状態の復元方法）が未記載 | INFO |
| 2 | **移行進捗のモニタリング**: 各Phase完了後の健全性確認手順（テスト実行コマンド、チェック項目）がTaskレベルで統一されていない | WARNING |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **SSH関連のチャンネル数とプロシージャ定義**: research.mdで「N/A」、design.mdで「misc routerに含める」とあるが、具体的なプロシージャ一覧なし | research.md, design.md | 実装時にSSHプロシージャの設計が必要になる |
| 2 | **Open Question 1: Subscriptionの実装方式**: requirements.mdで「調査が必要」とされているが、research.mdで「electron-trpc 0.7.1がサポート済み」と回答済み → Open Questionの更新漏れ | requirements.md | Open Questionがクローズされていない |
| 3 | **`GET_APP_PATH`の正確な移行先**: Req 1で明記されているが、research.mdのsystem routerマッピングに含まれていない。`app.getPath()`の具体的なAPIか`app.getAppPath()`か | requirements.md, research.md | 実装時の混乱 |
| 4 | **Menu EventsのSubscription化**: design.mdで「Electron Menuの`click`ハンドラとの統合が必要」とRisks指摘あるが、具体的な実装アプローチ未記載 | design.md | Task 9.1の実装方針が不明確 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 良好。tRPC移行はSteering文書の設計原則と整合している。

- **tech.md**: 現在のIPC設計パターン（channels.ts + handlers.ts + preload）をtRPCに置き換える変更は、tech.md更新タスク（Task 13.1）で対応予定
- **structure.md**: `src/main/ipc/`ディレクトリの削除と`src/main/trpc/`への移行は、structure.md更新タスク（Task 13.2）で対応予定
- **design-principles.md**: 「ルーターは既存Serviceの薄いアダプター」方針（DD-002）はKISS原則に準拠。不要な抽象層を導入しない判断は適切

**注意点**:
- structure.mdの「IPC Pattern」セクションは移行完了後に削除が必要（Task 13.2に含まれる）
- tech.mdの「Remote UI アーキテクチャ」セクション内の`IpcApiClient`記述も更新が必要（明示的タスク化されていない）

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| **Remote UI（WebSocketApiClient）への影響** | IpcApiClient削除に伴いApiClientインターフェースの変更が必要 | Design DD-005で認識済み、ただし具体的な型変更タスクが不十分 |
| **既存テストの影響** | レガシーIPCモック使用中のテストが全て失敗する | Task 11.5で最終検証予定 |
| **shared/stores のIPC依存** | Store内の`window.electronAPI`呼び出しをtRPCに置換する必要あり | 各ドメインTask X.2/X.3で対応 |

### 4.3 Migration Requirements

- **段階的移行**: ドメイン単位での移行はDesign DD-001で定義済み。各Phase独立でTypeScript/テストpassを維持する方針は適切
- **データ移行**: 不要（IPCチャンネルの置換のみ、データモデルに変更なし）
- **後方互換性**: 移行中はレガシーIPC/tRPC共存。最終Phase（Task 11）で完全撤廃

## 5. Recommendations

### Critical Issues (Must Fix)

1. **`GET_INITIAL_PROJECT_PATH`の配置先矛盾を解消する** (Section 1.6 #1)
   - research.mdではsystem routerに配置、design.mdではprojectRouterに配置されている
   - **推奨**: プロジェクトに関するAPIはprojectRouterに統一し、research.mdのsystem routerマッピングから削除する

2. **Req 1の`GET_APP_PATH` vs `GET_INITIAL_PROJECT_PATH`の矛盾を解消する** (Section 1.6 #6)
   - requirements.mdは`GET_APP_PATH`を明記しているが、research.mdのsystem routerには含まれていない
   - **推奨**: requirements.mdの4チャンネル定義とresearch.mdのマッピングを統一する。`GET_APP_PATH`が実在するチャンネルか確認し、存在しない場合はrequirements.mdを修正

3. **Subscription End-to-End テスト戦略の明確化** (Section 1.5)
   - electron-trpc IPC経由のSubscription配信をテストする具体的な方法が未定義
   - **推奨**: Task 9.3に「electron-trpc IPC経由のSubscription配信テスト方法」の具体的なアプローチ（テスト用BrowserWindowモック or callerベーステスト）を記載する

### Warnings (Should Address)

1. **configプロシージャ数の統一** (Section 1.6 #2): design.md Service Interfaceに`getBugsWorktreeDefault`/`setBugsWorktreeDefault`を追加、またはresearch.mdとtasks.mdの数を修正
2. **projectプロシージャ数の表記修正** (Section 1.6 #3): Task 4.1の「全8プロシージャ」を「全9プロシージャ」に修正
3. **SSH関連チャンネルの具体化** (Section 3 #1): SSHプロシージャ一覧をresearch.mdに追加し、全チャンネル数219との整合性を検証
4. **全チャンネル数219の検証** (Section 1.6 #5): research.mdのハンドラ別チャンネル数を再計算し、219チャンネルとの整合性を確認
5. **tech.md Remote UIセクションの更新タスク追加** (Section 4.1): `IpcApiClient`記述の更新をTask 13.1に含めるか、別タスクとして追加
6. **Open Questionのクローズ** (Section 3 #2): requirements.mdのOpen Question 1（Subscription実装方式）をresearch.mdの調査結果で解決済みと更新

### Suggestions (Nice to Have)

1. **design.mdの省略ルーター詳細化**: 「同じパターンに従う」とされるルーター群について、少なくともプロシージャ数とService依存関係の一覧テーブルをdesign.mdに追加すると、design.md単体での参照性が向上する
2. **Menu EventsのSubscription化アプローチ**: Electron MenuのclickハンドラからEventEmitterを経由してSubscriptionに変換するパターンの具体的な実装例をdesign.mdに追記
3. **移行進捗チェックリスト**: 各Phase完了後に実行するコマンド一覧（`npm run build && npm run typecheck && vitest run`）をtasks.mdの各Taskに統一的に記載
4. **Subscription同時接続数のベンチマーク**: eventsRouterの約35個のSubscriptionが同時接続される場合のIPC帯域影響を、パイロット段階で簡易検証

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | `GET_INITIAL_PROJECT_PATH`配置先矛盾 | system/project routerのどちらに配置するか決定し、research.md/design.mdを統一 | research.md, design.md |
| CRITICAL | `GET_APP_PATH` vs `GET_INITIAL_PROJECT_PATH`矛盾 | 実在チャンネルを確認し、requirements.md/research.mdを修正 | requirements.md, research.md |
| CRITICAL | Subscription E2Eテスト戦略未定義 | Task 9.3にテスト方法の具体的アプローチを追記 | tasks.md, design.md |
| WARNING | configプロシージャ数不一致 | design.md Service Interfaceを24に拡張 or tasks.md修正 | design.md or tasks.md |
| WARNING | projectプロシージャ数表記ミス | Task 4.1の「全8」を「全9」に修正 | tasks.md |
| WARNING | SSH関連チャンネル具体化 | SSHプロシージャ一覧追加、219チャンネル検証 | research.md |
| WARNING | tech.md Remote UIセクション更新漏れ | Task 13.1にIpcApiClient記述更新を含める | tasks.md |
| WARNING | 全チャンネル数219検証 | research.mdチャンネル数再計算 | research.md |
| WARNING | Open Question未クローズ | requirements.md Open Question 1を解決済みに更新 | requirements.md |
| INFO | 省略ルーター詳細化 | design.mdにプロシージャ数テーブル追加 | design.md |
| INFO | Menu Events実装例追記 | design.md eventsRouterに実装パターン追記 | design.md |
| INFO | 移行進捗チェックリスト統一 | tasks.mdの各Task末尾に検証コマンド追記 | tasks.md |
| INFO | Subscription帯域ベンチマーク | Task 9.1にベンチマーク検証を追記 | tasks.md |

---

_This review was generated by the document-review command._
