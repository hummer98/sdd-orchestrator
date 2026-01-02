# Contributing to SDD Orchestrator

[日本語](CONTRIBUTING-jp.md) | English

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Desktop**: Electron 35
- **State Management**: Zustand
- **Testing**: Vitest + WebdriverIO

## Installation

```bash
# Clone the repository
git clone https://github.com/hummer98/sdd-orchestrator.git
cd sdd-orchestrator

# Setup Electron app
cd electron-sdd-manager
npm install
```

## Development

```bash
# Start development server
npm run dev

# Launch Electron app (in another terminal)
npm run dev:electron
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## Build

```bash
npm run build:electron
```

## Project Structure

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
