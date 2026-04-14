# Validation Logic Usage Guide

This document explains how to use the validation logic implemented in Task 17.

## Overview

The validation system consists of three validators:

1. **EARSPatternValidator** - Validates acceptance criteria against EARS patterns
2. **INCOSERulesValidator** - Validates requirements against INCOSE quality rules
3. **TasksFormatValidator** - Validates tasks document format

## Usage

### 1. Validating Requirements

#### Using RequirementsParser (Recommended)

```typescript
import { RequirementsParser } from './RequirementsParser'

const parser = new RequirementsParser()

// Parse requirements document
const requirements = parser.parse(requirementsContent)

// Validate against both EARS patterns and INCOSE rules
const validationResult = parser.validate(requirements, 'requirements.md')

if (!validationResult.valid) {
  console.error('Validation errors found:')
  for (const error of validationResult.errors) {
    console.error(`- ${error.message}`)
  }
}
```

#### Using Individual Validators

```typescript
import { RequirementsParser } from './RequirementsParser'
import { EARSPatternValidator } from './EARSPatternValidator'
import { INCOSERulesValidator } from './INCOSERulesValidator'

const parser = new RequirementsParser()
const requirements = parser.parse(requirementsContent)

// Validate EARS patterns only
const earsValidator = new EARSPatternValidator()
const earsResult = earsValidator.validate(requirements, 'requirements.md')

// Validate INCOSE rules only
const incoseValidator = new INCOSERulesValidator()
const incoseResult = incoseValidator.validate(requirements, 'requirements.md')
```

### 2. Validating Tasks

#### Using TasksParser (Recommended)

```typescript
import { TasksParser } from './TasksParser'

const parser = new TasksParser()

// Parse tasks document
const taskTree = await parser.parse('path/to/tasks.md')

// Validate tasks format
const validationResult = parser.validate(taskTree, 'tasks.md')

if (!validationResult.valid) {
  console.error('Validation errors found:')
  for (const error of validationResult.errors) {
    console.error(`- ${error.message}`)
  }
}
```

#### Using TasksFormatValidator Directly

```typescript
import { TasksParser } from './TasksParser'
import { TasksFormatValidator } from './TasksFormatValidator'

const parser = new TasksParser()
const taskTree = await parser.parse('path/to/tasks.md')

const validator = new TasksFormatValidator()
const result = validator.validate(taskTree, 'tasks.md')
```

## Validation Rules

### EARS Pattern Validation

The validator checks that each acceptance criterion matches one of six EARS patterns:

1. **UBIQUITOUS**: `THE system SHALL [action]`
2. **EVENT_DRIVEN**: `WHEN [event] THEN system SHALL [action]`
3. **STATE_DRIVEN**: `WHILE [state] THE system SHALL [action]`
4. **OPTIONAL**: `WHERE [condition] THE system SHALL [action]`
5. **UNWANTED**: `IF [condition] THEN system SHALL [action]`
6. **COMPLEX**: Requirements that don't fit standard patterns (flagged as invalid)

### INCOSE Rules Validation

The validator checks three quality dimensions:

#### 1. Clarity
- No ambiguous words (maybe, possibly, might, etc.)
- No vague quantifiers (some, many, few, etc.)
- Minimum length requirements

#### 2. Testability
- Must include "SHALL" keyword
- No subjective terms (user-friendly, fast, intuitive, etc.)

#### 3. Completeness
- No placeholders (TBD, TODO, [...], etc.)
- Must have clear subject (system, user, application, etc.)
- Must have clear action verb

### Tasks Format Validation

The validator checks:

1. **Task ID Format**: Must be numeric with dots (e.g., "1", "1.1", "1.1.1")
2. **Status Markers**: Must be valid (`[ ]`, `[~]`, `[x]`, `[-]`)
3. **Indentation**: Must be consistent (multiples of 2 spaces)
4. **Parent-Child Relationships**: Child IDs must start with parent ID
5. **Description**: Must not be empty and have minimum length

## Integration with Workflow

The validation logic can be integrated into the workflow at several points:

### 1. During Requirements Generation

```typescript
// In WorkflowController.generateRequirements()
const parser = new RequirementsParser()
const requirements = parser.parse(generatedContent)
const validationResult = parser.validate(requirements, requirementsPath)

if (!validationResult.valid) {
  // Show validation errors to user
  // Offer to regenerate or manually fix
}
```

### 2. Before User Approval

```typescript
// In WorkflowController.waitForApproval()
const validationResult = parser.validate(requirements, requirementsPath)

if (!validationResult.valid) {
  vscode.window.showWarningMessage(
    `Found ${validationResult.errors.length} validation errors. Review before approving.`
  )
}
```

### 3. On File Save

```typescript
// In file watcher
vscode.workspace.onDidSaveTextDocument(async (document) => {
  if (document.fileName.endsWith('requirements.md')) {
    const parser = new RequirementsParser()
    const requirements = parser.parse(document.getText())
    const result = parser.validate(requirements, document.fileName)
    
    // Show diagnostics in Problems panel
    if (!result.valid) {
      showValidationDiagnostics(result.errors)
    }
  }
})
```

## Error Handling

Validation errors include:

- **file**: Path to the file with the error
- **line**: Line number (optional, if available)
- **message**: Descriptive error message

Example error handling:

```typescript
const result = parser.validate(requirements, 'requirements.md')

if (!result.valid) {
  // Group errors by type
  const earErrors = result.errors.filter(e => e.message.includes('EARS'))
  const incoseErrors = result.errors.filter(e => !e.message.includes('EARS'))
  
  console.log(`EARS Pattern Errors: ${earErrors.length}`)
  console.log(`INCOSE Quality Errors: ${incoseErrors.length}`)
  
  // Show in UI
  for (const error of result.errors) {
    vscode.window.showErrorMessage(error.message)
  }
}
```

## Testing

The validators are tested in `__tests__/validators.test.ts` with comprehensive test cases covering:

- Valid requirements and tasks
- Invalid EARS patterns
- INCOSE rule violations
- Task format errors
- Edge cases

Run tests with:

```bash
npm test -- src/core/spec-system/__tests__/validators.test.ts
```

## Future Enhancements

Potential improvements for the validation system:

1. **Line Number Tracking**: Add line numbers to all validation errors
2. **Auto-Fix Suggestions**: Provide suggestions for fixing common errors
3. **Configurable Rules**: Allow users to customize validation rules
4. **Severity Levels**: Distinguish between errors, warnings, and info
5. **Batch Validation**: Validate multiple files at once
6. **Performance Optimization**: Cache validation results for large documents
