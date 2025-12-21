/**
 * WebSocket Connection Manager
 * Handles WebSocket connection with auto-reconnect support
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

/**
 * WebSocket connection manager with exponential backoff reconnection
 */
class WebSocketManager {
  constructor() {
    /** @type {WebSocket|null} */
    this.socket = null;

    /** @type {string} */
    this.url = this.getWebSocketUrl();

    /** @type {boolean} */
    this.isConnected = false;

    /** @type {boolean} */
    this.isReconnecting = false;

    /** @type {number} */
    this.reconnectAttempts = 0;

    /** @type {number} */
    this.maxReconnectAttempts = 5;

    /** @type {number} */
    this.baseReconnectDelay = 1000; // 1 second

    /** @type {number|null} */
    this.reconnectTimeout = null;

    /** @type {Map<string, Function[]>} */
    this.eventHandlers = new Map();

    /** @type {boolean} */
    this.manuallyDisconnected = false;
  }

  /**
   * Get WebSocket URL based on current page URL
   * @returns {string}
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('[WS] Already connected or connecting');
      return;
    }

    this.manuallyDisconnected = false;

    try {
      console.log(`[WS] Connecting to ${this.url}...`);
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => this.handleOpen();
      this.socket.onclose = (event) => this.handleClose(event);
      this.socket.onerror = (error) => this.handleError(error);
      this.socket.onmessage = (event) => this.handleMessage(event);
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.manuallyDisconnected = true;
    this.clearReconnectTimeout();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.isConnected = false;
    this.isReconnecting = false;
    this.emit('disconnected', { manual: true });
  }

  /**
   * Handle WebSocket open event
   * Task 4.1: Include GET_BUGS in initial state request
   */
  handleOpen() {
    console.log('[WS] Connected');
    this.isConnected = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.clearReconnectTimeout();

    this.emit('connected');

    // Request initial state (specs and bugs)
    this.send({ type: 'GET_SPECS' });
    this.send({ type: 'GET_BUGS' });
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event
   */
  handleClose(event) {
    console.log(`[WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
    this.isConnected = false;

    if (!this.manuallyDisconnected) {
      this.emit('disconnected', { manual: false });
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   * @param {Event} error
   */
  handleError(error) {
    console.error('[WS] Error:', error);
    this.emit('error', error);
  }

  /**
   * Handle incoming WebSocket message
   * @param {MessageEvent} event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('[WS] Received:', message.type);

      // Emit specific message type event
      this.emit(message.type, message.payload);

      // Also emit generic message event
      this.emit('message', message);
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.manuallyDisconnected) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      this.isReconnecting = false;
      this.emit('reconnectFailed');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: delay,
    });

    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Manual reconnect (reset attempts)
   */
  manualReconnect() {
    this.reconnectAttempts = 0;
    this.manuallyDisconnected = false;
    this.clearReconnectTimeout();
    this.connect();
  }

  /**
   * Send message to server
   * @param {Object} message
   */
  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send message: not connected');
      return false;
    }

    try {
      const data = JSON.stringify({
        ...message,
        timestamp: Date.now(),
      });
      this.socket.send(data);
      console.log('[WS] Sent:', message.type);
      return true;
    } catch (error) {
      console.error('[WS] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Register event handler
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Remove event handler
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all registered handlers
   * @param {string} event
   * @param {any} data
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WS] Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Get current connection state
   * @returns {{ isConnected: boolean, isReconnecting: boolean, reconnectAttempts: number }}
   */
  getState() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // ============================================================
  // Task 4.2: New message sending functions for bug/validation/review
  // ============================================================

  /**
   * Request bugs list from server
   */
  requestBugs() {
    return this.send({ type: 'GET_BUGS' });
  }

  /**
   * Execute a bug phase (analyze/fix/verify)
   * @param {string} bugName - Name of the bug
   * @param {string} phase - Phase to execute ('analyze' | 'fix' | 'verify')
   */
  executeBugPhase(bugName, phase) {
    return this.send({
      type: 'EXECUTE_BUG_PHASE',
      payload: { bugName, phase },
    });
  }

  /**
   * Execute validation (gap/design)
   * @param {string} specId - Spec ID
   * @param {string} type - Validation type ('gap' | 'design')
   */
  executeValidation(specId, type) {
    return this.send({
      type: 'EXECUTE_VALIDATION',
      payload: { specId, type },
    });
  }

  /**
   * Execute document review
   * @param {string} specId - Spec ID
   */
  executeDocumentReview(specId) {
    return this.send({
      type: 'EXECUTE_DOCUMENT_REVIEW',
      payload: { specId },
    });
  }
}

// Export singleton instance
window.wsManager = new WebSocketManager();
