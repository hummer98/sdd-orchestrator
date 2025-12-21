# internal-webserver-sync アーキテクチャ

## 全体構成（3層アーキテクチャ）

```mermaid
graph TB
    subgraph Renderer["Electron Renderer (React)"]
        WV[WorkflowView]
        SL[SpecList]
        BL[BugList]
        API[window.electronAPI]

        WV --> API
        SL --> API
        BL --> API
    end

    subgraph Main["Electron Main Process"]
        subgraph Handlers["remoteAccessHandlers.ts"]
            SP[StateProvider<br/>getSpecs / getBugs]
            WC[WorkflowController<br/>executePhase / executeBugPhase]
        end

        WSH[WebSocketHandler<br/>routeMessage / broadcast]
        RAS[RemoteAccessServer<br/>HTTP + WebSocket :8765]
        SMS[SpecManagerService<br/>startAgent / stopAgent]

        SP --> WSH
        WC --> WSH
        WSH --> RAS
        WC --> SMS
    end

    subgraph RemoteUI["Remote UI (Vanilla JS)"]
        WSM[WebSocketManager<br/>connect / send]
        APP[App]
        RSL[SpecList]
        RBL[BugList]
        LOG[LogViewer]

        WSM --> APP
        APP --> RSL
        APP --> RBL
        APP --> LOG
    end

    API <-->|IPC| Handlers
    RAS <-->|WebSocket| WSM
```

## データフロー

### 1. 初期接続時（INIT）

```mermaid
sequenceDiagram
    participant RU as Remote UI
    participant WSH as WebSocketHandler
    participant SP as StateProvider
    participant SMS as SpecManagerService

    RU->>WSH: WebSocket接続
    activate WSH

    WSH->>SP: getProjectPath()
    SP-->>WSH: projectPath

    WSH->>SP: getSpecs()
    SP-->>WSH: specs[]

    WSH->>SP: getBugs()
    SP-->>WSH: bugs[]

    WSH->>WSH: LogBuffer.getAll()

    WSH->>RU: INIT {project, specs, bugs, logs}
    deactivate WSH
```

### 2. バグフェーズ実行フロー

```mermaid
sequenceDiagram
    participant RU as Remote UI
    participant WSH as WebSocketHandler
    participant WC as WorkflowController
    participant SMS as SpecManagerService
    participant Agent as Claude Agent

    RU->>WSH: EXECUTE_BUG_PHASE<br/>{bugName, phase:'fix'}
    activate WSH

    WSH->>WC: executeBugPhase(bugName, 'fix')
    activate WC

    WC->>SMS: startAgent({phase: 'bug-fix'})
    activate SMS

    SMS->>Agent: spawn process
    SMS-->>WC: {agentId}
    deactivate SMS

    WC-->>WSH: Result<AgentInfo>
    deactivate WC

    WSH->>RU: BUG_PHASE_STARTED<br/>{agentId}
    deactivate WSH

    loop リアルタイム出力
        Agent->>SMS: stdout/stderr
        SMS->>WSH: onOutput callback
        WSH->>RU: AGENT_OUTPUT<br/>{agentId, stream, data}
    end

    Agent->>SMS: exit(code)
    SMS->>WSH: onStatusChange callback
    WSH->>RU: AGENT_STATUS<br/>{agentId, status}
    WSH->>RU: BUGS_UPDATED<br/>{bugs[]}
```

### 3. 状態同期（ブロードキャスト）

```mermaid
sequenceDiagram
    participant ER as Electron Renderer
    participant Main as Main Process
    participant RU as Remote UI

    Note over Main: Spec/Bug変更検出

    Main->>Main: StateProvider.getSpecs()

    par ブロードキャスト
        Main->>ER: SPECS_UPDATED
        Main->>RU: SPECS_UPDATED
    end

    Note over ER,RU: 両方のUIが同一データで同期
```

## コンポーネント構成

```mermaid
graph LR
    subgraph "Main Process"
        RAS[RemoteAccessServer]
        WSH[WebSocketHandler]
        SP[StateProvider]
        WC[WorkflowController]
        SMS[SpecManagerService]
        LB[LogBuffer]

        RAS --> WSH
        WSH --> SP
        WSH --> WC
        WC --> SMS
        WSH --> LB
    end

    subgraph "Interfaces"
        SP -.->|implements| ISP[StateProvider Interface]
        WC -.->|implements| IWC[WorkflowController Interface]
    end
```

## WebSocketメッセージ一覧

```mermaid
graph LR
    subgraph "Client → Server"
        GET_SPECS[GET_SPECS]
        GET_BUGS[GET_BUGS]
        EXEC_PHASE[EXECUTE_PHASE]
        EXEC_BUG[EXECUTE_BUG_PHASE]
        EXEC_VAL[EXECUTE_VALIDATION]
        STOP[STOP_WORKFLOW]
        INPUT[AGENT_INPUT]
    end

    subgraph "Server → Client"
        INIT[INIT]
        SPECS_UPD[SPECS_UPDATED]
        BUGS_UPD[BUGS_UPDATED]
        AGENT_OUT[AGENT_OUTPUT]
        AGENT_ST[AGENT_STATUS]
        PHASE_COMP[PHASE_COMPLETED]
        ERROR[ERROR]
    end
```

## ファイル構成

```mermaid
graph TB
    subgraph "Main Process Files"
        RAH[remoteAccessHandlers.ts<br/>IPC↔WSブリッジ]
        RAS[remoteAccessServer.ts<br/>HTTP/WSサーバー]
        WSH[webSocketHandler.ts<br/>メッセージルーティング]
        SMS[specManagerService.ts<br/>エージェント管理]
    end

    subgraph "Remote UI Files"
        HTML[index.html<br/>HTMLレイアウト]
        APP[app.js<br/>アプリロジック]
        WS[websocket.js<br/>WS接続管理]
        COMP[components.js<br/>UIコンポーネント]
        CSS[styles.css<br/>スタイリング]
    end

    RAH --> RAS
    RAS --> WSH
    WSH --> SMS

    HTML --> APP
    APP --> WS
    APP --> COMP
```

## 設計原則

| 原則 | 適用 |
|------|------|
| **SSOT** | Main Processが唯一の状態管理元 |
| **疎結合** | StateProvider/WorkflowControllerインターフェースで抽象化 |
| **リアルタイム** | WebSocketでエージェント出力をストリーミング |
| **同期** | broadcast()でRenderer/Remote UI両方に同一データ配信 |

## 通信ポート

| ポート | 用途 |
|--------|------|
| 8765 | デフォルト（HTTP + WebSocket） |
| 8766-8775 | フォールバック（自動探索） |

## セキュリティ

- **IP制限**: Private IP (192.168.*, 10.*, 172.16-31.*) のみ許可
- **最大接続数**: 10クライアント
- **レート制限**: 設定可能（デフォルト無効）
