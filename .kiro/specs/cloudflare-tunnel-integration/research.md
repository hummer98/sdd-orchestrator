# Research & Design Decisions

## Summary
- **Feature**: `cloudflare-tunnel-integration`
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - cloudflared CLI uses `--token` flag for Named Tunnel run
  - Token from dashboard or `CLOUDFLARE_TUNNEL_TOKEN` environment variable
  - Existing RemoteAccessServer architecture can be extended with CloudflareTunnelManager

## Research Log

### cloudflared CLI Usage

- **Context**: Named Tunnel requires cloudflared binary and tunnel token
- **Sources Consulted**:
  - [Cloudflare Tunnel run parameters](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/cloudflared-parameters/run-parameters/)
  - [GitHub cloudflared](https://github.com/cloudflare/cloudflared)
  - [Homebrew cloudflared formula](https://formulae.brew.sh/formula/cloudflared)
- **Findings**:
  - Named Tunnel run command: `cloudflared tunnel run --token <TOKEN>`
  - Token shown in Cloudflare dashboard when tunnel is created
  - `--url` flag can proxy traffic to local HTTP server
  - Version 2025.4.0+ supports `--token-file` option
- **Implications**:
  - Spawn child process with cloudflared command
  - Parse stdout/stderr for connection status and URL
  - Handle process lifecycle (start/stop with server)

### cloudflared Installation

- **Context**: User needs cloudflared binary installed
- **Sources Consulted**:
  - [Homebrew installation](https://formulae.brew.sh/formula/cloudflared)
  - [Cloudflare downloads](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)
- **Findings**:
  - Homebrew: `brew install cloudflare/cloudflare/cloudflared`
  - MacPorts: `sudo port install cloudflared`
  - Direct download available for Darwin arm64/amd64
  - Binary typically installed to `/usr/local/bin/cloudflared` or `/opt/homebrew/bin/cloudflared`
- **Implications**:
  - Check for cloudflared in PATH and common locations
  - Show installation dialog with platform-specific instructions

### Token Management

- **Context**: Secure handling of Cloudflare Tunnel Token
- **Sources Consulted**:
  - Existing configStore.ts patterns
  - electron-store documentation
- **Findings**:
  - electron-store already used for app configuration (hangThreshold, recentProjects, etc.)
  - Environment variable `CLOUDFLARE_TUNNEL_TOKEN` is common pattern
  - Token should not be logged in plaintext
- **Implications**:
  - Extend ConfigStore with cloudflare settings schema
  - Check env var first, then fall back to stored value
  - Mask token in logs

### Existing Architecture Analysis

- **Context**: How to integrate with current RemoteAccessServer
- **Sources Consulted**:
  - `remoteAccessServer.ts` - HTTP/WebSocket server
  - `remoteAccessHandlers.ts` - IPC handlers
  - `remoteAccessStore.ts` - Renderer state
  - `webSocketHandler.ts` - WebSocket message handling
- **Findings**:
  - RemoteAccessServer manages HTTP server lifecycle
  - Uses port 8765-8775 for local access
  - WebSocketHandler validates private IP only
  - StaticFileServer serves remote UI
  - ServerStartResult includes url, qrCodeDataUrl
- **Implications**:
  - Add CloudflareTunnelManager as parallel component
  - Extend ServerStartResult with tunnelUrl
  - Modify WebSocketHandler IP validation for tunnel requests
  - Extend remoteAccessStore with tunnel state

### Access Token Authentication

- **Context**: App-generated token for remote access authentication
- **Sources Consulted**:
  - Existing authentication patterns in codebase
  - crypto module for secure token generation
- **Findings**:
  - No existing authentication for WebSocket connections
  - Node.js crypto.randomBytes for secure random generation
  - Token length 8-12 characters per requirement
  - Store in electron-store with persistence
- **Implications**:
  - Generate token on first start or explicit refresh
  - Embed in QR code URL as query parameter
  - Validate in WebSocketHandler on connection

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| CloudflareTunnelManager Service | Separate service managing cloudflared process | Clear separation, testable | Process management complexity | Aligns with existing service pattern |
| Inline in RemoteAccessServer | Add tunnel logic directly to existing server | Simpler initial impl | Violates SRP, harder to test | Not recommended |
| Plugin Pattern | Abstract tunnel provider interface | Extensible to other tunnels | Over-engineering for single provider | Future consideration |

**Selected**: CloudflareTunnelManager Service - follows existing service patterns and maintains clear separation of concerns.

## Design Decisions

### Decision: Token Storage Location

- **Context**: Where to store Cloudflare Tunnel Token and access token
- **Alternatives Considered**:
  1. Separate electron-store instance for cloudflare settings
  2. Extend existing ConfigStore schema
  3. File-based storage in project directory
- **Selected Approach**: Extend ConfigStore with new schema fields
- **Rationale**: Follows existing pattern, single source of config truth
- **Trade-offs**: ConfigStore gets larger but remains cohesive
- **Follow-up**: Ensure token not logged in plaintext

### Decision: Access Token Format

- **Context**: Format of app-generated access token
- **Alternatives Considered**:
  1. UUID (36 chars)
  2. Base64 encoded random bytes (variable)
  3. Alphanumeric random string (8-12 chars)
- **Selected Approach**: Alphanumeric random string, 10 characters
- **Rationale**: Short enough for QR code, human-readable, sufficient entropy
- **Trade-offs**: Less entropy than UUID but acceptable for single-user scenario
- **Follow-up**: Validate timing-safe comparison for security

### Decision: cloudflared Binary Detection

- **Context**: How to find cloudflared binary on user's system
- **Alternatives Considered**:
  1. `which cloudflared` shell command
  2. Check common paths directly
  3. Allow custom path in settings
- **Selected Approach**: Combination of which and common paths, with custom path option
- **Rationale**: Covers most installation methods while allowing override
- **Trade-offs**: Platform-specific path checking needed
- **Follow-up**: Test on macOS with Homebrew and direct download

### Decision: Tunnel Connection Lifecycle

- **Context**: When to start/stop cloudflared process
- **Alternatives Considered**:
  1. Start tunnel on server start if enabled
  2. Keep tunnel running always when token configured
  3. Manual tunnel start separate from server
- **Selected Approach**: Start tunnel on server start when "Cloudflare" option enabled
- **Rationale**: User-initiated, tied to server lifecycle
- **Trade-offs**: Slight delay on tunnel establishment
- **Follow-up**: Handle tunnel failure gracefully, allow server to continue

### Decision: WebSocket Authentication for Tunnel

- **Context**: How to validate tunnel connections vs LAN connections
- **Alternatives Considered**:
  1. Token required for all connections
  2. Token only for non-private IP (tunnel) connections
  3. Token always required, embedded in LAN QR code too
- **Selected Approach**: Token always required, embedded in all URLs
- **Rationale**: Consistent security model, simpler implementation
- **Trade-offs**: Extra parameter in LAN access
- **Follow-up**: Ensure token validation is timing-safe

## Risks & Mitigations

- **cloudflared process crash** - Monitor process, restart on failure, fallback to LAN-only
- **Token exposure in logs** - Mask tokens in all log output
- **Tunnel URL parsing failure** - Robust regex parsing of cloudflared stdout
- **Network latency** - Document that tunnel adds latency vs LAN
- **cloudflared not installed** - Clear installation dialog with platform instructions

## References

- [Cloudflare Tunnel run parameters](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/cloudflared-parameters/run-parameters/)
- [Cloudflare Tunnel configuration file](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Homebrew cloudflared](https://formulae.brew.sh/formula/cloudflared)
- [GitHub cloudflared](https://github.com/cloudflare/cloudflared)
