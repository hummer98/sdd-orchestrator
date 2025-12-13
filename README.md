# SDD Orchestrator

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
- Kiro format (`.kiro/specs/`) compliant

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

## Setup

### Prerequisites

- Node.js 20+
- npm or pnpm

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

## Workflow

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

## Documentation

- [Japanese README](README-jp.md)

## License

[MIT License](LICENSE.md)

## Author

Yuji Yamamoto (rr.yamamoto@gmail.com)

GitHub: [@hummer98](https://github.com/hummer98)
