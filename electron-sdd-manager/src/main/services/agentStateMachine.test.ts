/**
 * Tests for AgentStateMachine
 * Requirements: 2.1, 2.2, 2.3, 2.4, 9.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentStateMachine, VALID_TRANSITIONS } from './agentStateMachine';
import type { AgentState } from './agentLifecycleTypes';

describe('AgentStateMachine', () => {
  let stateMachine: AgentStateMachine;

  beforeEach(() => {
    stateMachine = new AgentStateMachine('spawning');
  });

  describe('initialization', () => {
    it('should initialize with the given state', () => {
      expect(stateMachine.getCurrentState()).toBe('spawning');
    });
  });

  describe('getCurrentState', () => {
    it('should return the current state', () => {
      expect(stateMachine.getCurrentState()).toBe('spawning');
    });
  });

  describe('isTerminal', () => {
    it('should return false for non-terminal states', () => {
      const nonTerminalStates: AgentState[] = [
        'spawning',
        'running',
        'timed_out',
        'stopping',
        'killing',
      ];

      for (const state of nonTerminalStates) {
        const sm = new AgentStateMachine(state);
        expect(sm.isTerminal()).toBe(false);
      }
    });

    it('should return true for terminal state', () => {
      const sm = new AgentStateMachine('terminal');
      expect(sm.isTerminal()).toBe(true);
    });

    it('should return false for final states before terminal', () => {
      const finalStates: AgentState[] = ['completed', 'failed', 'stopped', 'interrupted'];

      for (const state of finalStates) {
        const sm = new AgentStateMachine(state);
        expect(sm.isTerminal()).toBe(false);
      }
    });
  });

  describe('canTransition', () => {
    it('should allow valid transitions from spawning', () => {
      expect(stateMachine.canTransition('running')).toBe(true);
      expect(stateMachine.canTransition('failed')).toBe(true);
    });

    it('should reject invalid transitions from spawning', () => {
      expect(stateMachine.canTransition('completed')).toBe(false);
      expect(stateMachine.canTransition('stopping')).toBe(false);
      expect(stateMachine.canTransition('terminal')).toBe(false);
    });

    it('should allow valid transitions from running', () => {
      stateMachine.transition('running');
      expect(stateMachine.canTransition('timed_out')).toBe(true);
      expect(stateMachine.canTransition('completed')).toBe(true);
      expect(stateMachine.canTransition('failed')).toBe(true);
      expect(stateMachine.canTransition('interrupted')).toBe(true);
      expect(stateMachine.canTransition('stopping')).toBe(true);
    });

    it('should reject invalid transitions from running', () => {
      stateMachine.transition('running');
      expect(stateMachine.canTransition('spawning')).toBe(false);
      expect(stateMachine.canTransition('killing')).toBe(false);
      expect(stateMachine.canTransition('stopped')).toBe(false);
      expect(stateMachine.canTransition('terminal')).toBe(false);
    });
  });

  describe('transition', () => {
    it('should successfully transition when valid', () => {
      const result = stateMachine.transition('running');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('running');
    });

    it('should fail transition when invalid', () => {
      const result = stateMachine.transition('completed');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('spawning');
    });

    it('should log warning on invalid transition', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      stateMachine.transition('completed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log info on successful transition', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      stateMachine.transition('running');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not transition from terminal state', () => {
      const sm = new AgentStateMachine('terminal');
      expect(sm.transition('running')).toBe(false);
      expect(sm.getCurrentState()).toBe('terminal');
    });
  });

  describe('state transition flows', () => {
    it('should allow complete success flow: spawning -> running -> completed -> terminal', () => {
      expect(stateMachine.transition('running')).toBe(true);
      expect(stateMachine.transition('completed')).toBe(true);
      expect(stateMachine.transition('terminal')).toBe(true);
      expect(stateMachine.isTerminal()).toBe(true);
    });

    it('should allow timeout flow: running -> timed_out -> stopping -> stopped -> terminal', () => {
      stateMachine.transition('running');
      expect(stateMachine.transition('timed_out')).toBe(true);
      expect(stateMachine.transition('stopping')).toBe(true);
      expect(stateMachine.transition('stopped')).toBe(true);
      expect(stateMachine.transition('terminal')).toBe(true);
    });

    it('should allow kill flow: stopping -> killing -> stopped -> terminal', () => {
      stateMachine.transition('running');
      stateMachine.transition('stopping');
      expect(stateMachine.transition('killing')).toBe(true);
      expect(stateMachine.transition('stopped')).toBe(true);
      expect(stateMachine.transition('terminal')).toBe(true);
    });

    it('should allow interrupted flow: running -> interrupted -> terminal', () => {
      stateMachine.transition('running');
      expect(stateMachine.transition('interrupted')).toBe(true);
      expect(stateMachine.transition('terminal')).toBe(true);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should have valid transitions for all states', () => {
      const allStates: AgentState[] = [
        'spawning',
        'running',
        'timed_out',
        'stopping',
        'killing',
        'completed',
        'failed',
        'stopped',
        'interrupted',
        'terminal',
      ];

      for (const state of allStates) {
        expect(VALID_TRANSITIONS[state]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true);
      }
    });

    it('should have terminal state with no valid transitions', () => {
      expect(VALID_TRANSITIONS.terminal).toEqual([]);
    });
  });
});
