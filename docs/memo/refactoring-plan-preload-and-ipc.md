# Refactoring Plan: Preload Tests and IPC Handlers

This document outlines the strategy for refactoring `src/preload/index.test.ts` and `src/main/ipc/handlers.ts` to improve maintainability, readability, and reduce merge conflicts.

## 1. Overview & Motivation

Both files have become "God Files" with excessive lines of code (>2000 lines), leading to:
- **Low Readability:** Difficult to navigate and understand specific features.
- **High Conflict Risk:** Multiple developers touching the same file for unrelated features.
- **Cognitive Load:** Hard to isolate context when debugging or adding features.

The goal is to decompose these files into domain-specific modules without changing the runtime behavior.

---

## 2. Refactoring `src/preload/index.test.ts`

### Current Status
- Single file ~2400 lines.
- Tests all exposed APIs (`electronAPI`) in one place.
- Mocks are defined globally at the top.

### Strategy: "Split Tests First"
We will split the test file *before* touching the implementation (`src/preload/index.ts`). This ensures we have a safety net.

### Proposed Structure
Create a `__tests__` directory within `src/preload/`.

```text
src/preload/
├── index.ts          (Implementation remains untouched for now)
└── __tests__/
    ├── setup.ts      (Shared mocks and setup)
    ├── agent.test.ts (Agent management: start, stop, resume, logs)
    ├── ssh.test.ts   (SSH remote features)
    ├── config.test.ts (Configuration & Settings)
    ├── mcp.test.ts   (MCP Server integration)
    ├── file-system.test.ts (File operations, dialogs)
    └── integration.test.ts (General exposure checks)
```

### Execution Steps
1.  **Create Directory:** `mkdir -p src/preload/__tests__`
2.  **Extract Mocks:** Move common `vi.mock` calls to a setup file or helper function to be reused.
3.  **Migrate by Domain:**
    - Move `describe('startAgent', ...)` and related tests to `agent.test.ts`.
    - Move `describe('sshConnect', ...)` to `ssh.test.ts`.
    - (Repeat for other domains).
4.  **Verify:** Run `npm run test` (or `vitest`) to ensure all tests pass.
5.  **Cleanup:** Remove `src/preload/index.test.ts` once empty.

---

## 3. Refactoring `src/main/ipc/handlers.ts`

### Current Status
- Single file ~3300 lines.
- Imports almost every service in the application.
- Registers all IPC listeners (`ipcMain.handle`, `ipcMain.on`) in one massive sequence.

### Strategy: "Domain-Based Handler Registration"
We will create a specialized directory for IPC handlers and delegate registration.

### Proposed Structure

```text
src/main/ipc/
├── channels.ts       (Existing: Channel definitions)
├── handlers.ts       (Main entry point: imports and calls specific registers)
└── domain/           (New directory for specific handlers)
    ├── specHandlers.ts
    ├── agentHandlers.ts
    ├── bugHandlers.ts
    ├── fileHandlers.ts
    ├── configHandlers.ts
    ├── sshHandlers.ts
    └── ...
```

### Implementation Pattern

**1. Define a Registrar Type:**
Each domain handler file should export a function that takes necessary dependencies.

```typescript
// src/main/ipc/domain/agentHandlers.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import { AgentService } from '../../services/agentService'; // Example dependency

export function registerAgentHandlers(agentService: AgentService) {
  ipcMain.handle(IPC_CHANNELS.START_AGENT, async (_, ...args) => {
    return agentService.startAgent(...);
  });
  
  ipcMain.handle(IPC_CHANNELS.STOP_AGENT, async (_, agentId) => {
    return agentService.stopAgent(agentId);
  });
}
```

**2. Update Main `handlers.ts`:**
The main file becomes a lightweight orchestrator.

```typescript
// src/main/ipc/handlers.ts
import { registerAgentHandlers } from './domain/agentHandlers';
import { registerSpecHandlers } from './domain/specHandlers';
// ... imports

export function registerIpcHandlers() {
  // Initialize Services
  const agentService = new AgentService();
  const specService = new SpecManagerService();
  
  // Register Domain Handlers
  registerAgentHandlers(agentService);
  registerSpecHandlers(specService);
  // ...
}
```

### Execution Steps
1.  **Create Directory:** `mkdir -p src/main/ipc/domain`
2.  **Incremental Extraction:**
    - Pick a self-contained domain (e.g., `ssh` or `mcp`).
    - Create `src/main/ipc/domain/xxxHandlers.ts`.
    - Move the relevant `ipcMain.handle` calls from `handlers.ts` to the new file.
    - Export a registration function.
    - Call the registration function in `handlers.ts`.
3.  **Verify:** Test the feature manually or via E2E tests to ensure IPC still works.
4.  **Repeat:** Continue until `handlers.ts` is just a list of imports and initializations.

## 4. Prioritization

1.  **High Priority:** `src/preload/index.test.ts`
    - Lower risk, immediate benefit for developer DX.
    - Prerequisite for safe changes in preload logic.

2.  **Medium Priority:** `src/main/ipc/handlers.ts`
    - High architectural value.
    - Do this incrementally to avoid breaking the app.

## 5. Future Considerations
- **`webSocketHandler.ts`**: Apply a similar "Domain-Based" splitting strategy after IPC handlers are cleaned up.
- **`specManagerService.ts`**: Refactor by extracting sub-services (e.g., `SpecParser`, `SpecWriter`) and injecting them.
