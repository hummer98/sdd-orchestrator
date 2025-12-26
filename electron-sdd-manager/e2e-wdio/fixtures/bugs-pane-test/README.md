# Bugs Pane Integration Test Fixture

This directory contains test fixtures for E2E testing of the bugs-pane-integration feature.

## Structure

```
.kiro/
  bugs/
    test-bug/
      report.md       # Test bug report
      analysis.md     # Test analysis
  specs/
    test-feature/
      spec.json       # Test spec configuration
      requirements.md # Test requirements
  steering/
    product.md        # Product overview
  sdd-orchestrator.json
```

## Purpose

Used to verify:
- Bug selection and 3-pane coordination
- Tab switching state persistence
- Bug workflow view display
- Bug artifact editor display
