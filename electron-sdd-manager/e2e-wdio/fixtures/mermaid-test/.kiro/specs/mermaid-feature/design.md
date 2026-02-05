# Design Document

## Overview

This design document includes Mermaid diagrams for testing the Mermaid preview functionality.

## Architecture

The system architecture is shown below:

```mermaid
graph TD
    A[User] --> B[ArtifactEditor]
    B --> C[MDEditor]
    C --> D[MermaidCodeRenderer]
    D --> E[MermaidService]
    E --> F[mermaid.render]
```

## Sequence Diagram

The rendering flow:

```mermaid
sequenceDiagram
    participant User
    participant Editor
    participant Renderer
    participant Service

    User->>Editor: Input Mermaid code
    Editor->>Renderer: Render preview
    Renderer->>Service: render(code, id, darkMode)
    Service-->>Renderer: SVG or Error
    Renderer-->>Editor: Display result
```

## Regular Code Block

This is a regular TypeScript code block (should NOT be rendered as Mermaid):

```typescript
function hello(): string {
  return 'Hello, World!';
}
```

## Components

- MermaidService: Handles Mermaid rendering
- MermaidCodeRenderer: React component for code blocks
