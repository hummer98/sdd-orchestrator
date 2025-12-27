# SDD Orchestrator

[日本語](README-jp.md) | English

A desktop application for managing and executing Spec-Driven Development (SDD) workflows.

Automates and visualizes the software development lifecycle by coordinating with AI agents such as Claude Code.

## Overview

SDD Orchestrator is a tool for managing the lifecycle of software specifications (Specs).

- **Requirements**: Define functional requirements in EARS format
- **Design**: Create technical design documents
- **Tasks**: Generate and manage implementation tasks
- **Implementation**: Execute implementation using TDD methodology

## Key Features

- Visualization and management of Spec lifecycle
- Automated execution via AI agents
- Dependency management across multiple Specs
- Human-AI collaborative workflow
- Document review system with issue tracking and resolution workflow
- Kiro format (`.kiro/specs/`) compliant
- Remote access via smartphone with Cloudflare Tunnel support

## Architecture

```
┌─────────────────────────────────────────┐
│         SDD Orchestrator GUI            │
├─────────────────────────────────────────┤
│  Spec List │ Editor │ Workflow Status   │
├─────────────────────────────────────────┤
│         Agent Orchestration             │
├─────────────────────────────────────────┤
│  Claude Code / AI Agent Integration     │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Desktop**: Electron 35
- **State Management**: Zustand
- **Testing**: Vitest + WebdriverIO

## Quick Start

### Prerequisites

- macOS (Apple Silicon)
- Claude Code (AI agent)

### 1. Install SDD Orchestrator

Download the latest `.zip` or `.dmg` from [Releases](https://github.com/hummer98/sdd-orchestrator/releases) and launch the application.

### 2. Open Your Project

Launch SDD Orchestrator and select your project directory.

### 3. Install Command Set

Click the "Install Commands" button in the GUI to install `/kiro:*` slash commands in your project.

What gets installed:
- **Slash commands**: placed in `.claude/commands/kiro/`
- **Agents**: placed in `.claude/agents/`
- **Settings**: merged into `.claude/settings.json`

### 4. Create Your First Spec

Run the following in Claude Code:

```
/kiro:spec-init "feature description"
```

## Workflow

### Setting Up a New Project

1. **Launch SDD Orchestrator** and select your project directory
2. **Install Commands**: Click "Install Commands" button in the GUI
3. **Create Your First Spec**: Run `/kiro:spec-init "feature description"` in Claude Code
4. **Start Development**: Follow the SDD Phases below

### SDD Phases

1. **spec-init**: Initialize new specification
2. **spec-requirements**: Generate requirements definition
3. **spec-design**: Create technical design
4. **spec-tasks**: Generate implementation tasks
5. **spec-impl**: Implement using TDD

### Validation

- **validate-gap**: Gap analysis against existing codebase
- **validate-design**: Design review
- **validate-impl**: Implementation verification

### Document Review

- **document-review**: Review spec documents for consistency and completeness
- **document-review-reply**: Generate responses to review issues
- Issue tracking and resolution workflow integrated into GUI

### Bug Fix (Lightweight Workflow)

For small-scale bug fixes without requiring full SDD process:

1. **bug-create**: Create bug report
2. **bug-analyze**: Investigate root cause
3. **bug-fix**: Implement fix
4. **bug-verify**: Verify resolution
5. **bug-status**: Check progress

**When to use:**
- **Small bugs**: Bug Fix workflow (lightweight & fast)
- **Complex bugs requiring design changes**: Full SDD workflow

## Remote Access with Cloudflare Tunnel

SDD Orchestrator supports remote access from outside your LAN using Cloudflare Tunnel.

### Features

- **Named Tunnel Connection**: Secure connection via Cloudflare Named Tunnel
- **Dual Access**: Supports both LAN and Tunnel access simultaneously
- **Token Authentication**: Security ensured by app-generated access tokens
- **QR Code Support**: Easy smartphone connection via URL+token embedded QR code

### Prerequisites

To use the Cloudflare Tunnel feature, you need to install the `cloudflared` binary.

#### macOS

```bash
# Homebrew
brew install cloudflared

# MacPorts
sudo port install cloudflared
```

#### Other Platforms

Download from the [official Cloudflare download page](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

### Basic Usage

1. **Configure Tunnel Token**
   - Enter Cloudflare Tunnel Token in the app settings
   - Or set the `CLOUDFLARE_TUNNEL_TOKEN` environment variable

2. **Start Remote Server**
   - Check "Publish to Cloudflare" in Remote Access Panel
   - Click the Start Server button

3. **Connect**
   - Use the displayed Tunnel URL or QR code to connect
   - Access token is automatically authenticated

For detailed setup instructions, see [Cloudflare Tunnel Setup Guide](docs/guides/cloudflare-tunnel-setup.md).

## Architecture

```
┌─────────────────────────────────────────┐
│         SDD Orchestrator GUI            │
├─────────────────────────────────────────┤
│  Spec List │ Editor │ Workflow Status   │
├─────────────────────────────────────────┤
│         Agent Orchestration             │
├─────────────────────────────────────────┤
│  Claude Code / AI Agent Integration     │
└─────────────────────────────────────────┘
```

## For Developers

### Installation

```bash
# Clone the repository
git clone https://github.com/hummer98/sdd-orchestrator.git
cd sdd-orchestrator

# Setup Electron app
cd electron-sdd-manager
npm install
```

### Development

```bash
# Start development server
npm run dev

# Launch Electron app (in another terminal)
npm run dev:electron
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

### Build

```bash
npm run build:electron
```

### Project Structure

```
sdd-orchestrator/
├── .kiro/
│   ├── steering/     # Project settings (product.md, tech.md)
│   └── specs/        # Specification documents
├── electron-sdd-manager/  # Electron app
│   ├── src/
│   │   ├── renderer/     # React frontend
│   │   └── main/         # Electron main process
│   └── test/
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## ToDo

- **エスカレーション機能**: エージェントが処理できない問題を人間にエスカレーションする仕組みの実装

## License

[MIT License](LICENSE.md)

## Author

Yuji Yamamoto (rr.yamamoto@gmail.com)

GitHub: [@hummer98](https://github.com/hummer98)
