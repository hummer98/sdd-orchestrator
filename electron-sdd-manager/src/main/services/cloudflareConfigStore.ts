/**
 * Cloudflare Config Store Service
 * Handles Cloudflare-related configuration persistence
 * Requirements: 2.2, 2.3, 2.5, 3.2, 4.5, 5.1, 5.3, 5.4
 */

import Store from 'electron-store';

/**
 * Cloudflare settings returned by getAllSettings()
 * Does not expose the actual token values for security
 */
export interface CloudflareSettings {
  /** Whether a tunnel token is available */
  hasTunnelToken: boolean;
  /** Source of the tunnel token: 'env', 'stored', or 'none' */
  tunnelTokenSource: 'env' | 'stored' | 'none';
  /** The access token (can be exposed as it's app-generated) */
  accessToken: string | null;
  /** Whether to publish to Cloudflare */
  publishToCloudflare: boolean;
  /** Custom cloudflared binary path */
  cloudflaredPath: string | null;
}

/**
 * Schema for the Cloudflare config store
 */
interface CloudflareConfigSchema {
  tunnelToken: string | null;
  accessToken: string | null;
  publishToCloudflare: boolean;
  cloudflaredPath: string | null;
}

const schema = {
  tunnelToken: {
    type: ['string', 'null'],
    default: null,
  },
  accessToken: {
    type: ['string', 'null'],
    default: null,
  },
  publishToCloudflare: {
    type: 'boolean',
    default: false,
  },
  cloudflaredPath: {
    type: ['string', 'null'],
    default: null,
  },
} as const;

/**
 * CloudflareConfigStore
 *
 * Manages Cloudflare Tunnel related configuration with persistence.
 * Prioritizes environment variable CLOUDFLARE_TUNNEL_TOKEN over stored value.
 *
 * @example
 * const store = getCloudflareConfigStore();
 * const token = store.getTunnelToken(); // Returns env var or stored value
 * store.setPublishToCloudflare(true);
 */
export class CloudflareConfigStore {
  private store: Store<CloudflareConfigSchema>;

  constructor(store?: Store<CloudflareConfigSchema>) {
    this.store =
      store ?? new Store<CloudflareConfigSchema>({
        name: 'cloudflare-config',
        schema: schema as unknown as Store.Schema<CloudflareConfigSchema>,
      });
  }

  /**
   * Get Tunnel Token
   * Prioritizes environment variable CLOUDFLARE_TUNNEL_TOKEN over stored value
   * Requirements: 2.3
   */
  getTunnelToken(): string | null {
    const envToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    if (envToken) {
      return envToken;
    }
    return this.store.get('tunnelToken', null);
  }

  /**
   * Set Tunnel Token
   * Requirements: 2.2
   */
  setTunnelToken(token: string): void {
    this.store.set('tunnelToken', token);
  }

  /**
   * Get Access Token
   * Requirements: 3.2
   */
  getAccessToken(): string | null {
    return this.store.get('accessToken', null);
  }

  /**
   * Set Access Token
   * Requirements: 3.2
   */
  setAccessToken(token: string): void {
    this.store.set('accessToken', token);
  }

  /**
   * Get Publish to Cloudflare setting
   * Requirements: 5.1
   */
  getPublishToCloudflare(): boolean {
    const value = this.store.get('publishToCloudflare', false);
    return value ?? false;
  }

  /**
   * Set Publish to Cloudflare setting
   * Requirements: 5.1
   */
  setPublishToCloudflare(enabled: boolean): void {
    this.store.set('publishToCloudflare', enabled);
  }

  /**
   * Get custom cloudflared binary path
   * Requirements: 4.5
   */
  getCloudflaredPath(): string | null {
    return this.store.get('cloudflaredPath', null);
  }

  /**
   * Set custom cloudflared binary path
   * Requirements: 4.5
   */
  setCloudflaredPath(path: string | null): void {
    if (path === null) {
      this.store.delete('cloudflaredPath');
    } else {
      this.store.set('cloudflaredPath', path);
    }
  }

  /**
   * Reset all Cloudflare settings except Tunnel Token
   * Requirements: 5.4
   */
  resetCloudflareSettings(): void {
    this.store.delete('accessToken');
    this.store.delete('publishToCloudflare');
    this.store.delete('cloudflaredPath');
  }

  /**
   * Get masked Tunnel Token for secure logging
   * Requirements: 2.5
   * Shows first 4 and last 2 characters, masks the rest
   */
  getMaskedTunnelToken(): string | null {
    const token = this.getTunnelToken();
    if (!token) {
      return null;
    }

    if (token.length <= 6) {
      return '***';
    }

    const first = token.slice(0, 4);
    const last = token.slice(-2);
    return `${first}***${last}`;
  }

  /**
   * Check if Tunnel Token is sourced from environment variable
   */
  isTunnelTokenFromEnv(): boolean {
    return !!process.env.CLOUDFLARE_TUNNEL_TOKEN;
  }

  /**
   * Get all Cloudflare settings
   * Does not expose actual token values for security
   */
  getAllSettings(): CloudflareSettings {
    const envToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    const storedToken = this.store.get('tunnelToken', null);

    let hasTunnelToken: boolean;
    let tunnelTokenSource: 'env' | 'stored' | 'none';

    if (envToken) {
      hasTunnelToken = true;
      tunnelTokenSource = 'env';
    } else if (storedToken) {
      hasTunnelToken = true;
      tunnelTokenSource = 'stored';
    } else {
      hasTunnelToken = false;
      tunnelTokenSource = 'none';
    }

    return {
      hasTunnelToken,
      tunnelTokenSource,
      accessToken: this.store.get('accessToken', null),
      publishToCloudflare: this.store.get('publishToCloudflare', false),
      cloudflaredPath: this.store.get('cloudflaredPath', null),
    };
  }
}

// Singleton instance
let cloudflareConfigStore: CloudflareConfigStore | null = null;

export function getCloudflareConfigStore(): CloudflareConfigStore {
  if (!cloudflareConfigStore) {
    cloudflareConfigStore = new CloudflareConfigStore();
  }
  return cloudflareConfigStore;
}
