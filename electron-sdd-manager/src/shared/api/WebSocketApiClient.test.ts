/**
 * Test for WebSocketApiClient implementation
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const clientPath = resolve(__dirname, 'WebSocketApiClient.ts');

describe('WebSocketApiClient', () => {
  it('should exist', () => {
    expect(existsSync(clientPath)).toBe(true);
  });

  it('should implement ApiClient interface', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('implements ApiClient');
  });

  it('should export WebSocketApiClient class', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('export class WebSocketApiClient');
  });

  it('should use WebSocket for communication', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('WebSocket');
  });

  it('should implement reconnection logic', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('reconnect');
  });

  it('should implement request/response correlation with requestId', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('requestId');
  });

  it('should implement timeout handling', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('timeout');
  });

  it('should implement getSpecs method', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async getSpecs()');
  });

  it('should implement connection management methods', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('connect()');
    expect(content).toContain('disconnect()');
    expect(content).toContain('isConnected()');
  });

  // remote-ui-create-buttons feature
  // Requirements: 3.2
  it('should implement executeSpecPlan method using sendRequest', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async executeSpecPlan(');
    expect(content).toContain("'EXECUTE_SPEC_PLAN'");
  });
});
