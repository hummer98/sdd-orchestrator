/**
 * McpToolRegistry Unit Tests
 * TDD: Testing MCP tool registration, execution, and validation
 * Requirements: 1.4
 *
 * @file mcpToolRegistry.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  McpToolRegistry,
  McpToolDefinition,
  McpToolResult,
  McpToolError,
  ToolHandler,
} from './mcpToolRegistry';

describe('McpToolRegistry', () => {
  let registry: McpToolRegistry;

  beforeEach(() => {
    registry = new McpToolRegistry();
  });

  // ============================================================
  // Task 2.2: Tool Registration Tests
  // ============================================================

  describe('registerTool', () => {
    it('should register a tool with name, description, and schema', () => {
      const schema = z.object({
        name: z.string(),
      });

      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: schema,
        handler,
      });

      const tools = registry.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[0].description).toBe('A test tool');
    });

    it('should register multiple tools', () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'tool1',
        description: 'First tool',
        inputSchema: schema,
        handler,
      });

      registry.registerTool({
        name: 'tool2',
        description: 'Second tool',
        inputSchema: schema,
        handler,
      });

      const tools = registry.getTools();
      expect(tools).toHaveLength(2);
    });

    it('should overwrite tool if registered with same name', () => {
      const schema = z.object({});
      const handler1: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'first' }],
      });
      const handler2: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'second' }],
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'First version',
        inputSchema: schema,
        handler: handler1,
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'Second version',
        inputSchema: schema,
        handler: handler2,
      });

      const tools = registry.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].description).toBe('Second version');
    });
  });

  // ============================================================
  // Task 2.2: Tool List Retrieval Tests
  // ============================================================

  describe('getTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = registry.getTools();
      expect(tools).toEqual([]);
    });

    it('should return tool definitions without handlers', () => {
      const schema = z.object({ name: z.string() });
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: schema,
        handler,
      });

      const tools = registry.getTools();
      expect(tools[0]).toEqual({
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: expect.any(Object),
      });
      // Handler should not be exposed
      expect((tools[0] as unknown as { handler?: unknown }).handler).toBeUndefined();
    });
  });

  // ============================================================
  // Task 2.2: Tool Execution Tests
  // ============================================================

  describe('executeTool', () => {
    it('should execute tool with valid arguments', async () => {
      const schema = z.object({
        message: z.string(),
      });

      const handler: ToolHandler = async (args) => ({
        ok: true,
        content: [{ type: 'text', text: `Hello, ${(args as { message: string }).message}` }],
      });

      registry.registerTool({
        name: 'greet',
        description: 'Greet someone',
        inputSchema: schema,
        handler,
        requiresProject: false, // General utility test - no project needed
      });

      const result = await registry.executeTool('greet', { message: 'World' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content[0].text).toBe('Hello, World');
      }
    });

    it('should return TOOL_NOT_FOUND error for unknown tool', async () => {
      const result = await registry.executeTool('unknown_tool', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TOOL_NOT_FOUND');
        expect(result.error.message).toContain('unknown_tool');
      }
    });

    it('should return INVALID_ARGUMENT error for invalid arguments', async () => {
      const schema = z.object({
        name: z.string().min(1),
        count: z.number().positive(),
      });

      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: schema,
        handler,
        requiresProject: false, // Testing validation - no project needed
      });

      // Invalid: name is empty, count is negative
      const result = await registry.executeTool('test_tool', { name: '', count: -5 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_ARGUMENT');
      }
    });

    it('should handle handler errors gracefully', async () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => {
        throw new Error('Handler failed');
      };

      registry.registerTool({
        name: 'failing_tool',
        description: 'A tool that fails',
        inputSchema: schema,
        handler,
        requiresProject: false, // Testing error handling - no project needed
      });

      const result = await registry.executeTool('failing_tool', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
        expect(result.error.message).toContain('Handler failed');
      }
    });
  });

  // ============================================================
  // Task 2.2: Project Path Management Tests
  // Requirement: 1.4 - Project not selected error handling
  // ============================================================

  describe('setProjectPath', () => {
    it('should set project path', () => {
      registry.setProjectPath('/path/to/project');
      expect(registry.getProjectPath()).toBe('/path/to/project');
    });

    it('should clear project path when set to null', () => {
      registry.setProjectPath('/path/to/project');
      registry.setProjectPath(null);
      expect(registry.getProjectPath()).toBeNull();
    });
  });

  describe('requiresProject flag', () => {
    it('should return NO_PROJECT_SELECTED error when project not set for tool requiring project', async () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'project_tool',
        description: 'A tool requiring project',
        inputSchema: schema,
        handler,
        requiresProject: true,
      });

      // Project not set
      const result = await registry.executeTool('project_tool', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });

    it('should execute tool when project is set and tool requires project', async () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'project_tool',
        description: 'A tool requiring project',
        inputSchema: schema,
        handler,
        requiresProject: true,
      });

      registry.setProjectPath('/path/to/project');
      const result = await registry.executeTool('project_tool', {});

      expect(result.ok).toBe(true);
    });

    it('should execute tool when project is not set but tool does not require project', async () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'general_tool',
        description: 'A general tool',
        inputSchema: schema,
        handler,
        requiresProject: false,
      });

      // Project not set, but tool doesn't require it
      const result = await registry.executeTool('general_tool', {});

      expect(result.ok).toBe(true);
    });
  });

  // ============================================================
  // Task 2.2: Handler Delegation Tests
  // ============================================================

  describe('handler delegation', () => {
    it('should pass validated arguments to handler', async () => {
      const schema = z.object({
        name: z.string(),
        count: z.number().optional().default(1),
      });

      const handlerMock = vi.fn().mockResolvedValue({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: schema,
        handler: handlerMock,
        requiresProject: false, // Testing handler delegation - no project needed
      });

      await registry.executeTool('test_tool', { name: 'test' });

      // For tools without project requirement, handler is called with args only
      expect(handlerMock).toHaveBeenCalledWith({ name: 'test', count: 1 }, undefined);
    });

    it('should pass project path to handler when available', async () => {
      const schema = z.object({});

      const handlerMock = vi.fn().mockResolvedValue({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'project_tool',
        description: 'Project tool',
        inputSchema: schema,
        handler: handlerMock,
        requiresProject: true,
      });

      registry.setProjectPath('/path/to/project');
      await registry.executeTool('project_tool', {});

      expect(handlerMock).toHaveBeenCalledWith({}, '/path/to/project');
    });
  });

  // ============================================================
  // Task 2.2: Error Response Format Tests
  // ============================================================

  describe('error response format', () => {
    it('should return error in MCP-compatible format', async () => {
      const result = await registry.executeTool('unknown', {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(typeof result.error.code).toBe('string');
        expect(typeof result.error.message).toBe('string');
      }
    });
  });

  // ============================================================
  // Task 2.2: Utility Methods Tests
  // ============================================================

  describe('utility methods', () => {
    it('should check if tool exists with hasTool', () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      expect(registry.hasTool('test_tool')).toBe(false);

      registry.registerTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: schema,
        handler,
      });

      expect(registry.hasTool('test_tool')).toBe(true);
      expect(registry.hasTool('nonexistent')).toBe(false);
    });

    it('should return tool count with getToolCount', () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      expect(registry.getToolCount()).toBe(0);

      registry.registerTool({
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: schema,
        handler,
      });
      expect(registry.getToolCount()).toBe(1);

      registry.registerTool({
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: schema,
        handler,
      });
      expect(registry.getToolCount()).toBe(2);
    });

    it('should clear all tools with clearTools', () => {
      const schema = z.object({});
      const handler: ToolHandler = async () => ({
        ok: true,
        content: [{ type: 'text', text: 'success' }],
      });

      registry.registerTool({
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: schema,
        handler,
      });
      registry.registerTool({
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: schema,
        handler,
      });

      expect(registry.getToolCount()).toBe(2);

      registry.clearTools();

      expect(registry.getToolCount()).toBe(0);
      expect(registry.getTools()).toEqual([]);
    });
  });
});
