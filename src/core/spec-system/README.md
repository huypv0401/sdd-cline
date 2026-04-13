# Spec System

The Spec System provides structured software development capabilities for Cline, enabling developers to create and manage specifications through requirements, design, and task documents.

## Directory Structure

```
src/core/spec-system/
├── README.md                    # This file
├── index.ts                     # Main exports
├── types.ts                     # Core type definitions
├── __tests__/                   # Test files
│   ├── types.test.ts           # Unit tests for types
│   └── types.property.test.ts  # Property-based tests
└── [future modules]             # Parsers, controllers, etc.
```

## Core Types

### Requirements Types
- `EARSPattern` - Easy Approach to Requirements Syntax patterns
- `AcceptanceCriterion` - Individual acceptance criteria
- `Requirement` - Complete requirement with user story and criteria

### Task Types
- `TaskStatus` - Task execution status enum
- `Task` - Individual task with hierarchy support
- `TaskTree` - Hierarchical task structure with utility methods
- `PBTStatus` - Property-based test status tracking

### Configuration Types
- `SpecConfig` - Spec metadata and configuration

### Execution Types
- `TaskExecution` - Task execution state tracking
- `TaskResult` - Result of task execution

### Webview Types
- `SpecContent` - Content for spec documents
- `ExtensionToWebviewMessage` - Messages from extension to webview
- `WebviewToExtensionMessage` - Messages from webview to extension

### Validation Types
- `ValidationError` - Validation error with location
- `ValidationResult` - Result of validation operation
- `ParsingError` - Error during parsing with line number

## Testing

The spec system uses a dual testing approach:

### Unit Tests
Located in `__tests__/types.test.ts`, these tests verify specific examples and edge cases.

Run with:
```bash
npm run test:unit
```

### Property-Based Tests
Located in `__tests__/types.property.test.ts`, these tests use `fast-check` to verify properties hold across many randomly generated inputs.

Each property test runs 100 iterations by default and includes:
- Task tree consistency properties
- ID uniqueness properties
- Hierarchy preservation properties

## Requirements Traceability

This module implements:
- **Requirement 1.1**: Spec directory structure management
- **Requirement 1.2**: Config file creation with UUID
- **Requirement 1.3**: Core data model definitions
- **Requirement 16.1**: Testing framework setup with fast-check

## Future Modules

The following modules will be added in subsequent tasks:
- `parsers/` - Requirements and tasks document parsers
- `controllers/` - Workflow and orchestration controllers
- `executors/` - Task execution logic
- `validators/` - Validation logic for requirements and tasks
- `webview/` - Webview provider for spec preview
