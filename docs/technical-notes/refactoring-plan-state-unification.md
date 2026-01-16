# State Management Unification Refactoring Plan

## 1. Problem Definition: The "Two Ledgers" Problem

Currently, the application maintains two parallel sets of stores for the same domain data, leading to synchronization issues and "Single Source of Truth" violations.

```mermaid
graph TD
    subgraph "Real World (Main Process)"
        Main[Electron Main Process] -- "DB/Files" --> Files[(Filesystem)]
    end

    subgraph "Renderer Process (UI)"
        UI[UI Component]
        
        subgraph "Renderer Store (Legacy)"
            RA[AgentStore (Local)]
            RB[BugStore (Local)]
            Note1[Rich Logic, Tightly Coupled to Electron]
        end
        
        subgraph "Shared Store (Target)"
            SA[AgentStore (Shared)]
            SB[BugStore (Shared)]
            Note2[Clean Arch, but currently empty/unused]
        end
        
        UI -- "1. Reads Data" --> RA
        UI -- "2. Actions" --> Main
    end

    Main -- "3. Updates" --> RA
    Main -- "3. Updates" --> SA

    %% Problem
    RA -.-> |Sync Issues| SA
```

### Issues
1.  **Duplicate State**: Same data (e.g., list of agents) exists in both `renderer/stores` and `shared/stores`.
2.  **Logic Trap**: Renderer stores contain heavy domain logic mixed with IPC calls, making them hard to test or reuse in Remote UI.
3.  **Sync Bugs**: Fixing a bug in one store doesn't fix it in the other, leading to "I updated the data but the UI didn't change" bugs.

## 2. Target Architecture

**Goal**: Unify state into `src/shared/stores/` as the Single Source of Truth (SSOT). `src/renderer/stores/` should only contain UI-specific state (e.g., scroll position, modal visibility).

```mermaid
graph TD
    subgraph "Real World (Main Process)"
        Main[Electron Main Process]
    end

    subgraph "Renderer Process (UI)"
        UI[UI Component]
        
        subgraph "Shared Store (SSOT)"
            SS[AgentStore (Unified)]
            Note3[Domain Data + Actions via ApiClient]
        end
        
        subgraph "Renderer Store (UI Only)"
            RS[UIStore]
            Note4[Scroll Pos, Modals, etc.]
        end
        
        UI -- "1. Reads Data" --> SS
        UI -- "1. Reads UI State" --> RS
        UI -- "2. Actions (via ApiClient)" --> Main
    end
    
    Main -- "3. Updates" --> SS
```

## 3. Refactoring Roadmap

### Step 1: Enhance Shared Store (The Foundation)
Currently, `shared/stores` are too simple (only fetch lists). We need to move the rich logic from `renderer` to `shared`, but decouple it from `window.electronAPI`.

*   **Action**: Add action methods (`startAgent`, `stopAgent`, etc.) to `SharedAgentStore`.
*   **Method**: Inject `ApiClient` interface into the store so it works in both Electron and Web.
    *   `startAgent(specId, ...)` -> `get().apiClient.startAgent(specId, ...)`

### Step 2: Implement ElectronApiClient (The Bridge)
Create a concrete implementation of `ApiClient` that wraps `window.electronAPI`.

*   **Action**: Create `src/renderer/api/ElectronApiClient.ts`.
*   **Role**: Translates `ApiClient` calls to `window.electronAPI` (IPC) calls.

### Step 3: Transform Renderer Store to Proxy (The Migration)
Don't delete `renderer/stores/agentStore.ts` immediately (too many breaking changes). Instead, rewrite it to simply re-export or wrap the Shared Store.

*   **Before**: Manages its own `agents` array.
*   **After**: 
    ```typescript
    export const useAgentStore = () => {
      const shared = useSharedAgentStore();
      return {
        ...shared,
        // Map legacy method names if needed
      };
    }
    ```

### Step 4: Extract UI State (The Cleanup)
Move purely UI-related state (like `skipPermissions` flag, `useWorktree` flag) out of Domain Stores.

*   **Action**: Create `useSettingsStore` or `useUIStore` in `renderer/stores`.
*   **Action**: Move `skipPermissions`, `isWatching` (if UI concern) to the new UI store.

## 4. Execution Plan (Incremental)

We will tackle one domain at a time to minimize risk.

1.  **Phase 1: AgentStore Unification** (Highest priority, most complex)
2.  **Phase 2: BugStore Unification**
3.  **Phase 3: SpecStore Unification**

## 5. Risk Mitigation
*   **Backward Compatibility**: Keep the `renderer/stores/*` exports available during transition so components don't break.
*   **Type Safety**: Ensure `SharedAgentStore` types strictly match `AgentInfo` used in the app.
