/**
 * tRPC Context definition
 * Requirements: 2.4
 *
 * Defines the context type shared across all tRPC procedures.
 * Initially empty; extensible for future needs (auth, DB connections, etc.).
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Context {}

export function createContext(): Context {
  return {};
}
