/**
 * AgentStateMachine - Manages agent state transitions
 * Requirements: 2.1, 2.2, 2.3, 2.4, 9.4
 *
 * Ensures only valid state transitions occur and provides
 * traceability through logging.
 */

import type { AgentState } from './agentLifecycleTypes';

/**
 * Valid state transitions map
 * Requirement: 2.2
 */
export const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  spawning: ['running', 'failed'],
  running: ['timed_out', 'completed', 'failed', 'interrupted', 'stopping'],
  timed_out: ['stopping'],
  stopping: ['killing', 'stopped'],
  killing: ['stopped'],
  completed: ['terminal'],
  failed: ['terminal'],
  stopped: ['terminal'],
  interrupted: ['terminal'],
  terminal: [],
};

/**
 * Agent State Machine
 * Manages state transitions with validation and logging
 */
export class AgentStateMachine {
  private currentState: AgentState;
  private readonly agentId?: string;

  /**
   * Create a new state machine
   * @param initialState - Initial state
   * @param agentId - Optional agent ID for logging
   */
  constructor(initialState: AgentState, agentId?: string) {
    this.currentState = initialState;
    this.agentId = agentId;
  }

  /**
   * Get current state
   * Requirement: 2.1
   */
  getCurrentState(): AgentState {
    return this.currentState;
  }

  /**
   * Check if current state is terminal
   * Requirement: 2.4
   */
  isTerminal(): boolean {
    return this.currentState === 'terminal';
  }

  /**
   * Check if transition to next state is valid
   * Requirement: 2.2
   * @param nextState - Target state
   * @returns true if transition is valid
   */
  canTransition(nextState: AgentState): boolean {
    const validNextStates = VALID_TRANSITIONS[this.currentState];
    return validNextStates.includes(nextState);
  }

  /**
   * Attempt to transition to next state
   * Requirement: 2.2, 2.3, 9.4
   * @param nextState - Target state
   * @returns true if transition succeeded
   */
  transition(nextState: AgentState): boolean {
    const canTransition = this.canTransition(nextState);

    if (!canTransition) {
      // Requirement: 2.3 - Log invalid transitions
      const agentInfo = this.agentId ? ` [${this.agentId}]` : '';
      console.warn(
        `[AgentStateMachine]${agentInfo} Invalid transition: ${this.currentState} -> ${nextState}`
      );
      return false;
    }

    const oldState = this.currentState;
    this.currentState = nextState;

    // Requirement: 2.3 - Log successful transitions
    const agentInfo = this.agentId ? ` [${this.agentId}]` : '';
    console.log(`[AgentStateMachine]${agentInfo} Transitioned: ${oldState} -> ${nextState}`);

    return true;
  }
}
