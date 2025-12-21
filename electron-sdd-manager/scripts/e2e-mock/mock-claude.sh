#!/bin/bash
# =============================================================================
# Mock Claude CLI for E2E Testing
# =============================================================================
# This script emulates Claude CLI's stream-json output format for E2E tests.
# It parses the command arguments to determine which phase is being executed
# and returns appropriate mock responses.
#
# NEW: Also generates actual files (requirements.md, design.md, tasks.md) and
# updates spec.json to simulate real Claude CLI behavior for E2E testing.
#
# Usage:
#   E2E_MOCK_CLAUDE_COMMAND=/path/to/mock-claude.sh
#
# Supported phases:
#   - /kiro:spec-requirements, /spec-manager:requirements
#   - /kiro:spec-design, /spec-manager:design
#   - /kiro:spec-tasks, /spec-manager:tasks
#   - /kiro:spec-impl, /spec-manager:impl
#   - /kiro:validate-gap, /kiro:validate-design, /kiro:validate-impl
#   - /kiro:spec-status, /spec-manager:status
#   - /kiro:document-review, /kiro:document-review-reply
# =============================================================================

set -e

# Generate a unique session ID
SESSION_ID="mock-session-$(date +%s)-$$"

# Parse arguments to determine the phase
PHASE=""
FEATURE_NAME=""

for arg in "$@"; do
  case "$arg" in
    /kiro:spec-requirements*|/spec-manager:requirements*)
      PHASE="requirements"
      ;;
    /kiro:spec-design*|/spec-manager:design*)
      PHASE="design"
      ;;
    /kiro:spec-tasks*|/spec-manager:tasks*)
      PHASE="tasks"
      ;;
    /kiro:spec-impl*|/spec-manager:impl*)
      PHASE="impl"
      ;;
    /kiro:validate-gap*)
      PHASE="validate-gap"
      ;;
    /kiro:validate-design*)
      PHASE="validate-design"
      ;;
    /kiro:validate-impl*)
      PHASE="validate-impl"
      ;;
    /kiro:spec-status*|/spec-manager:status*)
      PHASE="status"
      ;;
    /kiro:document-review-reply*)
      PHASE="document-review-reply"
      ;;
    /kiro:document-review*)
      PHASE="document-review"
      ;;
    --resume)
      PHASE="resume"
      ;;
  esac
done

# Extract feature name from command arguments
# The feature name is typically the word after the slash command
CAPTURE_NEXT=false
for arg in "$@"; do
  if $CAPTURE_NEXT; then
    FEATURE_NAME="$arg"
    CAPTURE_NEXT=false
    continue
  fi
  # If this argument contains a slash command, the next non-flag argument is the feature name
  if [[ "$arg" =~ ^/kiro:|^/spec-manager: ]]; then
    # Check if feature name is part of this argument (space-separated in quotes)
    if [[ "$arg" =~ \  ]]; then
      FEATURE_NAME=$(echo "$arg" | cut -d' ' -f2-)
    else
      CAPTURE_NEXT=true
    fi
  fi
done

# Default feature name if not found
if [ -z "$FEATURE_NAME" ]; then
  FEATURE_NAME="test-feature"
fi

# Default to unknown if no phase detected
if [ -z "$PHASE" ]; then
  PHASE="unknown"
fi

# Simulate processing delay (configurable via env var)
MOCK_DELAY=${E2E_MOCK_CLAUDE_DELAY:-0.5}
sleep "$MOCK_DELAY"

# =============================================================================
# File Generation Functions
# =============================================================================

# Get the spec directory path from current working directory
# The cwd is the project root, so spec path is .kiro/specs/{feature_name}/
get_spec_dir() {
  echo "$(pwd)/.kiro/specs/${FEATURE_NAME}"
}

# Update spec.json with new phase status
update_spec_json() {
  local spec_dir="$1"
  local phase="$2"
  local spec_json="${spec_dir}/spec.json"

  if [ ! -f "$spec_json" ]; then
    return
  fi

  # Use Python for JSON manipulation (available on macOS)
  python3 - "$spec_json" "$phase" << 'PYTHON_SCRIPT'
import json
import sys
from datetime import datetime

spec_json_path = sys.argv[1]
phase = sys.argv[2]

try:
    with open(spec_json_path, 'r') as f:
        data = json.load(f)

    # Update phase status
    phase_map = {
        'requirements': 'requirements-generated',
        'design': 'design-generated',
        'tasks': 'tasks-generated',
        'impl': 'implementation-in-progress'
    }

    if phase in phase_map:
        data['phase'] = phase_map[phase]

    # Update approvals.{phase}.generated = true
    if phase in ['requirements', 'design', 'tasks']:
        if 'approvals' not in data:
            data['approvals'] = {}
        if phase not in data['approvals']:
            data['approvals'][phase] = {}
        data['approvals'][phase]['generated'] = True

    # Update timestamp
    data['updated_at'] = datetime.utcnow().isoformat() + 'Z'

    with open(spec_json_path, 'w') as f:
        json.dump(data, f, indent=2)

except Exception as e:
    print(f"Error updating spec.json: {e}", file=sys.stderr)
PYTHON_SCRIPT
}

# Generate requirements.md
generate_requirements() {
  local spec_dir="$1"
  local output_file="${spec_dir}/requirements.md"

  cat > "$output_file" << EOF
# Requirements

## Functional Requirements

### 1. Core Feature Requirements

- **REQ-001**: The system shall provide the requested feature functionality
  - Acceptance Criteria: Feature is accessible and functional
  - Priority: High

- **REQ-002**: The system shall handle edge cases gracefully
  - Acceptance Criteria: No crashes on invalid input
  - Priority: Medium

- **REQ-003**: The system shall maintain data consistency
  - Acceptance Criteria: All operations are atomic
  - Priority: High

### 2. User Interface Requirements

- **REQ-UI-001**: The interface shall be responsive and intuitive
  - Acceptance Criteria: UI responds within 200ms
  - Priority: Medium

## Non-Functional Requirements

### 1. Performance Requirements

- **REQ-NFR-001**: The system shall respond within 500ms
  - Measurement: 95th percentile response time
  - Priority: High

### 2. Security Requirements

- **REQ-NFR-002**: The system shall validate all user inputs
  - Acceptance Criteria: XSS and injection attacks are prevented
  - Priority: High

---
_Generated by Mock Claude CLI for E2E Testing_
EOF

  update_spec_json "$spec_dir" "requirements"
}

# Generate design.md
generate_design() {
  local spec_dir="$1"
  local output_file="${spec_dir}/design.md"

  cat > "$output_file" << EOF
# Technical Design

## Overview

This document describes the technical design for the ${FEATURE_NAME} feature.

## Architecture

### Component Structure

\`\`\`
┌─────────────────────────────────────────┐
│              Main Module                │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Component A │  │   Component B   │   │
│  │ (Core Logic)│  │ (State Manager) │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │         Component C              │   │
│  │      (Data Layer)                │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
\`\`\`

### Components

1. **Component A (Core Logic)**
   - Handles business logic
   - Processes user requests
   - Validates input data

2. **Component B (State Manager)**
   - Manages application state
   - Handles state transitions
   - Provides state subscriptions

3. **Component C (Data Layer)**
   - Database interactions
   - Caching layer
   - Data validation

## Data Flow

1. User initiates action through UI
2. Request is validated by Component A
3. State is updated via Component B
4. Data is persisted through Component C
5. Response is returned to user

## Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend | React | Component-based architecture |
| State | Zustand | Lightweight state management |
| Backend | Node.js | JavaScript ecosystem |
| Database | SQLite | Simple local storage |

## Requirements Traceability

| Requirement | Design Component |
|-------------|------------------|
| REQ-001 | Component A |
| REQ-002 | Component A, C |
| REQ-UI-001 | Frontend Layer |

---
_Generated by Mock Claude CLI for E2E Testing_
EOF

  update_spec_json "$spec_dir" "design"
}

# Generate tasks.md
generate_tasks() {
  local spec_dir="$1"
  local output_file="${spec_dir}/tasks.md"

  cat > "$output_file" << EOF
# Implementation Tasks

## Task 1: Setup Infrastructure

- [ ] 1.1 Create project structure
- [ ] 1.2 Configure build system
- [ ] 1.3 Set up testing framework

## Task 2: Implement Core Components

- [ ] 2.1 Implement Component A (Core Logic)
  - Create main module
  - Add input validation
  - Implement business logic

- [ ] 2.2 Implement Component B (State Manager)
  - Set up state store
  - Add state transitions
  - Implement subscriptions

- [ ] 2.3 Implement Component C (Data Layer)
  - Database schema design
  - CRUD operations
  - Caching implementation

## Task 3: Implement UI Layer

- [ ] 3.1 Create UI components
- [ ] 3.2 Connect to state manager
- [ ] 3.3 Add user interactions

## Task 4: Testing

- [ ] 4.1 Write unit tests
- [ ] 4.2 Write integration tests
- [ ] 4.3 Write E2E tests

## Task 5: Documentation

- [ ] 5.1 Update README
- [ ] 5.2 Add API documentation
- [ ] 5.3 Create user guide

---
_Generated by Mock Claude CLI for E2E Testing_
EOF

  update_spec_json "$spec_dir" "tasks"
}

# =============================================================================
# Main Output Generation
# =============================================================================

# Output init message (always first)
echo '{"type":"system","subtype":"init","session_id":"'"$SESSION_ID"'","tools":[],"mcp_servers":[],"model":"claude-sonnet-4-20250514","cwd":"'"$(pwd)"'"}'

# Phase-specific responses
case "$PHASE" in
  requirements)
    # Generate actual file and update spec.json
    SPEC_DIR=$(get_spec_dir)
    if [ -d "$SPEC_DIR" ]; then
      generate_requirements "$SPEC_DIR"
    fi

    echo '{"type":"assistant","message":{"id":"msg_mock_req","type":"message","role":"assistant","content":[{"type":"text","text":"## Requirements generated for '"$FEATURE_NAME"'\n\n### Functional Requirements\n- REQ-001: The system shall provide the requested feature\n- REQ-002: The system shall handle edge cases\n\n### Non-Functional Requirements\n- REQ-NFR-001: Performance shall meet standards\n\n✅ Requirements file created at .kiro/specs/'"$FEATURE_NAME"'/requirements.md"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":100,"output_tokens":200}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":1234,"num_turns":1,"total_cost_usd":0.001,"session_id":"'"$SESSION_ID"'"}'
    ;;

  design)
    # Generate actual file and update spec.json
    SPEC_DIR=$(get_spec_dir)
    if [ -d "$SPEC_DIR" ]; then
      generate_design "$SPEC_DIR"
    fi

    echo '{"type":"assistant","message":{"id":"msg_mock_design","type":"message","role":"assistant","content":[{"type":"text","text":"## Technical Design for '"$FEATURE_NAME"'\n\n### Architecture\n- Component A: Handles core logic\n- Component B: Manages state\n\n### Data Flow\n1. User initiates action\n2. System processes request\n3. Result returned to user\n\n✅ Design file created at .kiro/specs/'"$FEATURE_NAME"'/design.md"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":150,"output_tokens":250}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":2345,"num_turns":1,"total_cost_usd":0.002,"session_id":"'"$SESSION_ID"'"}'
    ;;

  tasks)
    # Generate actual file and update spec.json
    SPEC_DIR=$(get_spec_dir)
    if [ -d "$SPEC_DIR" ]; then
      generate_tasks "$SPEC_DIR"
    fi

    echo '{"type":"assistant","message":{"id":"msg_mock_tasks","type":"message","role":"assistant","content":[{"type":"text","text":"## Implementation Tasks for '"$FEATURE_NAME"'\n\n### Task 1: Setup infrastructure\n- [ ] Create base files\n- [ ] Configure dependencies\n\n### Task 2: Implement core logic\n- [ ] Write main function\n- [ ] Add error handling\n\n### Task 3: Add tests\n- [ ] Unit tests\n- [ ] Integration tests\n\n✅ Tasks file created at .kiro/specs/'"$FEATURE_NAME"'/tasks.md"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":200,"output_tokens":300}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":1567,"num_turns":1,"total_cost_usd":0.0015,"session_id":"'"$SESSION_ID"'"}'
    ;;

  impl)
    echo '{"type":"assistant","message":{"id":"msg_mock_impl","type":"message","role":"assistant","content":[{"type":"text","text":"## Implementation Complete\n\nI have implemented the requested changes:\n\n1. Created new files\n2. Modified existing code\n3. Added tests\n\nAll tests pass."}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":300,"output_tokens":400}}}'
    sleep 0.3
    echo '{"type":"result","subtype":"success","duration_ms":5678,"num_turns":3,"total_cost_usd":0.005,"session_id":"'"$SESSION_ID"'"}'
    ;;

  validate-gap|validate-design|validate-impl)
    echo '{"type":"assistant","message":{"id":"msg_mock_validate","type":"message","role":"assistant","content":[{"type":"text","text":"## Validation Report\n\n### Status: PASSED\n\nAll checks completed successfully:\n- Code quality: OK\n- Test coverage: OK\n- Design alignment: OK"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":250,"output_tokens":200}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":2000,"num_turns":1,"total_cost_usd":0.002,"session_id":"'"$SESSION_ID"'"}'
    ;;

  status)
    echo '{"type":"assistant","message":{"id":"msg_mock_status","type":"message","role":"assistant","content":[{"type":"text","text":"## Spec Status: '"$FEATURE_NAME"'\n\n| Phase | Status |\n|-------|--------|\n| Requirements | Complete |\n| Design | Complete |\n| Tasks | Complete |\n| Implementation | In Progress |"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":100,"output_tokens":100}}}'
    sleep 0.1
    echo '{"type":"result","subtype":"success","duration_ms":500,"num_turns":1,"total_cost_usd":0.0005,"session_id":"'"$SESSION_ID"'"}'
    ;;

  document-review)
    echo '{"type":"assistant","message":{"id":"msg_mock_review","type":"message","role":"assistant","content":[{"type":"text","text":"## Document Review\n\nReview completed. Found 0 issues.\n\nAll documents are consistent and well-structured."}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":200,"output_tokens":150}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":1500,"num_turns":1,"total_cost_usd":0.0015,"session_id":"'"$SESSION_ID"'"}'
    ;;

  document-review-reply)
    echo '{"type":"assistant","message":{"id":"msg_mock_reply","type":"message","role":"assistant","content":[{"type":"text","text":"## Review Reply Generated\n\nResponse to review comments has been prepared."}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":150,"output_tokens":100}}}'
    sleep 0.2
    echo '{"type":"result","subtype":"success","duration_ms":1000,"num_turns":1,"total_cost_usd":0.001,"session_id":"'"$SESSION_ID"'"}'
    ;;

  resume)
    echo '{"type":"assistant","message":{"id":"msg_mock_resume","type":"message","role":"assistant","content":[{"type":"text","text":"Continuing from previous session..."}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":50,"output_tokens":50}}}'
    sleep 0.1
    echo '{"type":"result","subtype":"success","duration_ms":500,"num_turns":1,"total_cost_usd":0.0005,"session_id":"'"$SESSION_ID"'"}'
    ;;

  *)
    echo '{"type":"assistant","message":{"id":"msg_mock_unknown","type":"message","role":"assistant","content":[{"type":"text","text":"Mock response for unknown command"}],"model":"claude-sonnet-4-20250514","stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":10}}}'
    echo '{"type":"result","subtype":"success","duration_ms":100,"num_turns":1,"total_cost_usd":0.0001,"session_id":"'"$SESSION_ID"'"}'
    ;;
esac

exit 0
