# Requirements: Remote UI Artifact Exists Check

## Decision Log

### WebSocket版のartifacts存在チェック実装方針
- **Discussion**: Remote UI（WebSocket API経由）でSpec詳細を取得すると、`artifacts`フィールドが全て`exists: false`でハードコードされており、Artifactタブでrequirements/design/tasks/researchが表示されない問題があった。Electron版（IPC経由）では`ElectronSpecWorkflowApi.getSpecDetail`で各アーティファクトの存在をチェックしている。
- **Conclusion**: `createSpecDetailProvider`内でFileServiceを使用して各アーティファクトファイルの存在をチェックする
- **Rationale**: FileServiceの既存メソッド（`readArtifact`）を活用することで、Electron版と同様のロジックを共有でき、メンテナンス性が向上する

### Bug側の対応
- **Discussion**: Bug詳細（`createBugDetailProvider`）も同様の問題があるか確認した
- **Conclusion**: Bug側は既に`bugService.getBugArtifacts`で正しく実装されているため、今回は変更不要
- **Rationale**: `readBugDetail`がartifacts情報を含む`BugDetail`を返し、`createBugDetailProvider`でそのまま使用されている

### 対象アーティファクト
- **Discussion**: どのアーティファクトファイルを対象とするか
- **Conclusion**: requirements.md, design.md, tasks.md, research.md の4種類（inspectionは別途inspection-*.mdとして動的タブで処理される）
- **Rationale**: `RemoteArtifactEditor`の`SPEC_TABS`定数と一致させる。document-reviewやinspection、追加markdownファイルは既に`specJson`や`markdownFiles`から正しく取得されている

## Introduction

Remote UI（WebSocket API経由）でSpec詳細を取得した際、Artifactタブに基本的なアーティファクト（requirements, design, tasks, research）が表示されない問題を修正する。`createSpecDetailProvider`でハードコードされている`artifacts`フィールドを、実際のファイル存在チェックに基づいて正しく設定する。

## Requirements

### Requirement 1: Spec Artifact存在チェック

**Objective:** Remote UIユーザーとして、Spec詳細画面のArtifactタブでrequirements/design/tasks/researchドキュメントを閲覧したい。これにより、Electron版と同等の機能をRemote UIでも利用できる。

#### Acceptance Criteria

1. When Remote UIがWebSocket経由で`GET_SPEC_DETAIL`リクエストを送信すると、the system shall 各アーティファクトファイル（requirements.md, design.md, tasks.md, research.md）の存在をチェックし、`artifacts`フィールドに正確な`exists`値を設定する

2. If アーティファクトファイルが存在する場合, then the system shall 該当アーティファクトの`exists`を`true`に設定する

3. If アーティファクトファイルが存在しない場合, then the system shall 該当アーティファクトの`exists`を`false`に設定する（`null`ではない）

4. The system shall `FileService`の既存メソッドを使用してファイル存在チェックを行う

5. The system shall アーティファクト存在チェックを並列で実行してパフォーマンスを確保する

### Requirement 2: 既存動作の保持

**Objective:** 開発者として、既存のdocument-review/inspection/追加markdownファイルタブの表示ロジックが影響を受けないことを確認したい。

#### Acceptance Criteria

1. The system shall `specJson.documentReview`から生成されるdocument-reviewタブの表示に影響を与えない

2. The system shall `specJson.inspection`から生成されるinspectionタブの表示に影響を与えない

3. The system shall `markdownFiles`から生成される追加markdownファイルタブの表示に影響を与えない

### Requirement 3: Inspectionアーティファクト対応

**Objective:** Remote UIユーザーとして、inspection report（inspection.md）も正しく表示されるようにしたい。

#### Acceptance Criteria

1. When inspection.mdファイルが存在する場合, then the system shall `artifacts.inspection`の`exists`を`true`に設定する

2. If inspection.mdファイルが存在しない場合, then the system shall `artifacts.inspection`の`exists`を`false`に設定する

## Out of Scope

- Bug詳細のartifacts処理（既に正しく実装済み）
- アーティファクトの`updatedAt`フィールドの設定（ファイル存在チェックのみ）
- アーティファクトの`content`フィールドの設定（別APIで取得）
- Electron版（IPC）のartifacts処理の変更

## Open Questions

- なし（設計フェーズで詳細を決定）
