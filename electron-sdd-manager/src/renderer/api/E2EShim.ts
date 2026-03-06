/**
 * E2E Shim for window.electronAPI
 *
 * Re-exposes legacy IPC methods via tRPC for E2E tests.
 * This file is only initialized when window.isE2E is true.
 */
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

export function initializeE2EShim(): void {
  if (typeof window === 'undefined') return;

  const client = getVanillaClient();

  (window as any).electronAPI = {
    // Project operations
    selectProject: async (path: string) => {
      return await client.project.selectProject.mutate({ projectPath: path });
    },
    getInitialSelectResult: async () => {
      return await client.project.getInitialSelectResult.query();
    },
    clearInitialSelectResult: async () => {
      // Logic handled internally by getInitialSelectResult in router
      return Promise.resolve();
    },

    // Remote Server operations
    startRemoteServer: async (preferredPort?: number) => {
      const result = await client.misc.startRemoteServer.mutate({ preferredPort });
      // Legacy format conversion
      if (result.ok) {
        return {
          ok: true,
          value: {
            accessToken: result.value.accessToken,
            localIp: result.value.localIp,
            port: result.value.port,
            qrCodeDataUrl: result.value.qrCodeDataUrl,
            tunnelQrCodeDataUrl: result.value.tunnelQrCodeDataUrl,
            tunnelUrl: result.value.tunnelUrl,
            url: result.value.url,
          }
        };
      }
      return result;
    },
    stopRemoteServer: async () => {
      return await client.misc.stopRemoteServer.mutate();
    },
    getRemoteServerStatus: async () => {
      const status = await client.misc.getRemoteServerStatus.query();
      // Legacy format conversion: tests expect isRunning (bool), tRPC returns running (bool)
      return {
        isRunning: status.running,
        port: status.port,
        url: status.url,
        clientCount: status.clientCount,
        accessToken: status.accessToken,
      };
    },

    // Agent operations
    executeProjectCommand: async (_projectPath: string, command: string, title: string) => {
      return await client.spec.executeProjectCommand.mutate({ specId: '', command, title });
    },
    startAgent: async (specId: string, phase: string, engineId: string, args: string[], worktreeCwd?: string) => {
      return await client.agent.start.mutate({ specId, phase, engineId, args, worktreeCwd } as any);
    },
    stopAgent: async (agentId: string) => {
      return await client.agent.stop.mutate({ agentId });
    },

    // Spec operations
    readSpecJson: async (specPath: string) => {
      const specName = specPath.split('/').pop() || specPath;
      return await client.file.readSpecJson.query({ specName });
    },

    // Artifact operations
    readArtifact: async (path: string) => {
      const parts = path.split('/');
      const filename = parts.pop() || '';
      const name = parts.pop() || '';
      return await client.file.readArtifact.query({ name, filename, entityType: 'spec' });
    },

    // Event listeners (Subscribers)
    onProjectSelected: (callback: (result: any) => void) => {
      const sub = client.events.onMenuOpenProject.subscribe(undefined, {
        onData: (data: { projectPath: string }) => {
          if (!data) return;
          callback({ success: true, projectPath: data.projectPath });
        },
      });
      return () => sub.unsubscribe();
    },
    onAgentStatusChange: (callback: (agentId: string, status: string) => void) => {
      const sub = client.events.onAgentStatusChange.subscribe(undefined, {
        onData: (data: { agentId: string; status: string }) => {
          if (!data) return;
          callback(data.agentId, data.status);
        },
      });
      return () => sub.unsubscribe();
    },
    onAgentLog: (callback: (agentId: string, log: any) => void) => {
      const sub = client.events.onAgentLog.subscribe(undefined, {
        onData: (data: { agentId: string; parsedLog: any }) => {
          if (!data) return;
          callback(data.agentId, data.parsedLog);
        },
      });
      return () => sub.unsubscribe();
    },
    onAgentOutput: (callback: (agentId: string, stream: string, data: string) => void) => {
      const sub = client.events.onAgentOutput.subscribe(undefined, {
        onData: (data: { agentId: string; stream: string; data: string }) => {
          if (!data) return;
          callback(data.agentId, data.stream, data.data);
        },
      });
      return () => sub.unsubscribe();
    },

    // --- Auto Execution operations ---
    updateSpecJson: async (specName: string, updates: Record<string, unknown>) => {
      return await client.spec.updateSpecJson.mutate({ specName, updates });
    },
    autoExecutionReset: async () => {
      return await client.autoExecution.reset.mutate();
    },
    setMockEnv: async (key: string, value: string) => {
      return await client.autoExecution.setMockEnv.mutate({ key, value });
    },

    // --- Metrics operations ---
    getSpecMetrics: async (specId: string) => {
      return await client.misc.getSpecMetrics.query({ specId });
    },
    recordHumanSession: async (data: { specId: string; start: string; end: string; ms: number }) => {
      return await client.misc.recordHumanSession.mutate(data);
    },

    // --- Cloudflare operations ---
    getCloudflareSettings: async () => {
      return await client.cloudflare.getSettings.query();
    },
    checkCloudflareBinary: async () => {
      return await client.cloudflare.checkBinary.query();
    },
    setCloudflarePublishToCloudflare: async (enabled: boolean) => {
      return await client.cloudflare.setPublishToCloudflare.mutate({ enabled });
    },
    refreshCloudflareAccessToken: async () => {
      return await client.cloudflare.refreshAccessToken.mutate();
    },
    onCloudflareTunnelStatusChanged: (callback: (status: Record<string, unknown>) => void) => {
      const sub = client.events.onCloudflareTunnelStatusChanged.subscribe(undefined, {
        onData: (data: Record<string, unknown>) => {
          if (!data) return;
          callback(data);
        },
      });
      return () => sub.unsubscribe();
    },

    // Bug Auto Execution operations removed (github-issue-integration)
  };

  console.info('[E2EShim] window.electronAPI has been re-exposed for E2E tests');
}
