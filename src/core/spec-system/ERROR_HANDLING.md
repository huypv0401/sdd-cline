# Error Handling System

This document describes the error handling and recovery system for the SDD Cline Spec Workflow.

## Overview

The error handling system provides comprehensive error management across all spec workflow operations, including:

- File system operations
- Document parsing
- Task execution
- Validation
- State persistence
- Automatic backups

## Components

### 1. FileSystemErrorHandler

Handles file I/O errors gracefully with user-friendly messages.

**Features:**
- Handles common Node.js error codes (ENOENT, EACCES, ENOSPC, etc.)
- Validates file permissions before write operations
- Provides context-specific error messages

**Usage:**
```typescript
import { FileSystemErrorHandler } from './FileSystemErrorHandler'

const handler = new FileSystemErrorHandler()

try {
  await fs.promises.readFile(filePath)
} catch (error) {
  await handler.handleFileError(error, 'reading spec file')
}

// Validate permissions before writing
const canWrite = await handler.validateFilePermissions(filePath)
if (!canWrite) {
  // Handle permission error
}
```

**Requirements:** 17.1

### 2. ParsingErrorHandler

Handles parsing errors with editor integration and diagnostics.

**Features:**
- Highlights problematic lines in editor
- Shows diagnostics in Problems panel
- Includes line numbers in error messages
- Integrates with VSCode diagnostic collection

**Usage:**
```typescript
import { ParsingErrorHandler } from './ParsingErrorHandler'
import { ParsingError } from './types'

const handler = new ParsingErrorHandler()

try {
  const result = parser.parse(content)
} catch (error) {
  if (error instanceof ParsingError) {
    await handler.handleParsingError(error)
  }
}

// Clear diagnostics when done
handler.clearDiagnostics()

// Dispose when no longer needed
handler.dispose()
```

**Requirements:** 17.4

### 3. TaskExecutionErrorHandler

Handles task execution errors with user interaction.

**Features:**
- Logs task execution errors
- Saves execution state on failure
- Prompts user for retry/skip/abort actions
- Handles task timeouts
- Shows progress and success messages

**Usage:**
```typescript
import { TaskExecutionErrorHandler } from './TaskExecutionErrorHandler'

const handler = new TaskExecutionErrorHandler(specDir)

try {
  await executeTask(task)
  await handler.showSuccess(task)
} catch (error) {
  const action = await handler.handleTaskError(
    task,
    error,
    async () => await saveExecutionState()
  )
  
  switch (action) {
    case 'retry':
      // Retry the task
      break
    case 'skip':
      // Skip to next task
      break
    case 'abort':
      // Abort execution
      break
  }
}
```

**Requirements:** 17.2

### 4. ValidationErrorHandler

Handles validation errors with diagnostics.

**Features:**
- Groups errors by file
- Creates diagnostics for each error
- Shows summary in Problems panel
- Supports clearing diagnostics per file or all

**Usage:**
```typescript
import { ValidationErrorHandler } from './ValidationErrorHandler'
import type { ValidationError } from './types'

const handler = new ValidationErrorHandler()

const errors: ValidationError[] = [
  {
    file: '/path/to/requirements.md',
    line: 10,
    message: 'Invalid EARS pattern'
  }
]

await handler.handleValidationErrors(errors)

// Clear diagnostics
handler.clearDiagnostics()

// Dispose when done
handler.dispose()
```

**Requirements:** 12.4, 12.5

### 5. BackupManager

Manages file backups before destructive operations.

**Features:**
- Backs up files with timestamps
- Restores from backup on failure
- Lists and manages backups
- Automatic cleanup of old backups

**Usage:**
```typescript
import { BackupManager } from './BackupManager'

const backupManager = new BackupManager(specDir)

// Backup before operation
const backupPath = await backupManager.backupBeforeOperation(filePath)

try {
  // Perform destructive operation
  await fs.promises.writeFile(filePath, newContent)
} catch (error) {
  // Restore from backup on failure
  await backupManager.restoreFromBackup(backupPath, filePath)
  throw error
}

// List backups for a file
const backups = await backupManager.listBackups('tasks.md')

// Cleanup old backups (older than 7 days)
await backupManager.cleanupOldBackups()
```

**Requirements:** 17.3

### 6. StatePersistence

Manages execution state persistence for resume capability.

**Features:**
- Saves execution state to `.execution-state.json`
- Loads execution state on resume
- Prompts user to resume incomplete execution
- Tracks completed and failed tasks
- Provides progress summary

**Usage:**
```typescript
import { StatePersistence } from './StatePersistence'

const persistence = new StatePersistence(specDir)

// Check for incomplete execution
if (await persistence.hasExecutionState()) {
  const shouldResume = await persistence.promptResumeExecution()
  
  if (shouldResume) {
    const state = await persistence.loadExecutionState()
    // Resume from state
  } else {
    await persistence.clearExecutionState()
  }
}

// Save execution state
await persistence.saveExecutionState({
  startTime: Date.now(),
  tasks: allTasks,
  completed: [],
  failed: []
})

// Mark task as completed
await persistence.markTaskCompleted(taskId)

// Mark task as failed
await persistence.markTaskFailed(taskId, errorMessage)

// Get progress summary
const summary = await persistence.getProgressSummary()
```

**Requirements:** 17.2, 17.5

### 7. ErrorLogger

Logs errors to file with timestamps and context.

**Features:**
- Logs to `.error-log.txt`
- Includes timestamp, context, and stack trace
- Retrieves recent errors
- Log rotation for large files
- Supports logging messages (not just errors)

**Usage:**
```typescript
import { ErrorLogger } from './ErrorLogger'

const logger = new ErrorLogger(specDir)

// Log an error
try {
  await someOperation()
} catch (error) {
  await logger.logError(
    error instanceof Error ? error : new Error(String(error)),
    'Task execution failed'
  )
}

// Log a message
await logger.logMessage('Task started', 'Task 1.1')

// Get recent errors
const recentErrors = await logger.getRecentErrors(10)

// Clear log
await logger.clearLog()

// Rotate log if too large
await logger.rotateLogIfNeeded(1024 * 1024) // 1MB
```

**Requirements:** 17.1

## Integration with Existing Components

### TaskOrchestrator Integration

The TaskOrchestrator already has basic error handling. To integrate the new error handlers:

```typescript
import { TaskExecutionErrorHandler } from './TaskExecutionErrorHandler'
import { StatePersistence } from './StatePersistence'
import { BackupManager } from './BackupManager'

export class TaskOrchestrator {
  private errorHandler: TaskExecutionErrorHandler
  private statePersistence: StatePersistence
  private backupManager: BackupManager
  
  constructor(specDir: string, controller: Controller) {
    // ... existing code ...
    this.errorHandler = new TaskExecutionErrorHandler(specDir)
    this.statePersistence = new StatePersistence(specDir)
    this.backupManager = new BackupManager(specDir)
  }
  
  async executeTask(task: Task): Promise<void> {
    try {
      // Backup tasks.md before execution
      await this.backupManager.backupBeforeOperation(this.tasksFilePath)
      
      // ... existing execution code ...
      
    } catch (error) {
      // Handle error with user prompt
      const action = await this.errorHandler.handleTaskError(
        task,
        error,
        async () => await this.statePersistence.saveExecutionState(this.currentExecution!)
      )
      
      if (action === 'retry') {
        return await this.executeTask(task)
      } else if (action === 'skip') {
        await this.updateTaskStatus(task.id, 'failed')
        return
      } else {
        throw error
      }
    }
  }
}
```

### Parser Integration

Integrate ParsingErrorHandler with parsers:

```typescript
import { ParsingErrorHandler } from './ParsingErrorHandler'
import { ParsingError } from './types'

export class RequirementsParser {
  private errorHandler: ParsingErrorHandler
  
  constructor() {
    this.errorHandler = new ParsingErrorHandler()
  }
  
  parse(content: string): Requirement[] {
    try {
      // ... parsing logic ...
      
      if (invalidFormat) {
        throw new ParsingError(
          'Invalid requirement format',
          lineNumber,
          filePath
        )
      }
      
    } catch (error) {
      if (error instanceof ParsingError) {
        await this.errorHandler.handleParsingError(error)
      }
      throw error
    }
  }
  
  dispose(): void {
    this.errorHandler.dispose()
  }
}
```

### File Operations Integration

Integrate FileSystemErrorHandler with file operations:

```typescript
import { FileSystemErrorHandler } from './FileSystemErrorHandler'
import { BackupManager } from './BackupManager'

export class WorkflowController {
  private fsErrorHandler: FileSystemErrorHandler
  private backupManager: BackupManager
  
  constructor(context: vscode.ExtensionContext) {
    // ... existing code ...
    this.fsErrorHandler = new FileSystemErrorHandler()
  }
  
  async writeSpecFile(filePath: string, content: string): Promise<void> {
    try {
      // Validate permissions
      const canWrite = await this.fsErrorHandler.validateFilePermissions(filePath)
      if (!canWrite) {
        throw new Error('No write permission')
      }
      
      // Backup if file exists
      if (await this.fsErrorHandler.pathExists(filePath)) {
        await this.backupManager.backupBeforeOperation(filePath)
      }
      
      // Write file
      await fs.promises.writeFile(filePath, content)
      
    } catch (error) {
      await this.fsErrorHandler.handleFileError(error, 'writing spec file')
      throw error
    }
  }
}
```

## Error Recovery Strategies

### 1. Automatic Backup and Restore

All destructive file operations should be wrapped with backup/restore:

```typescript
const backupPath = await backupManager.backupBeforeOperation(filePath)
try {
  await performDestructiveOperation(filePath)
} catch (error) {
  await backupManager.restoreFromBackup(backupPath, filePath)
  throw error
}
```

### 2. State Persistence for Resume

Long-running operations should save state periodically:

```typescript
// Before starting
if (await persistence.hasExecutionState()) {
  const shouldResume = await persistence.promptResumeExecution()
  if (shouldResume) {
    const state = await persistence.loadExecutionState()
    // Resume from state
  }
}

// During execution
await persistence.saveExecutionState(currentState)

// On completion
await persistence.clearExecutionState()
```

### 3. User Interaction for Errors

Give users control over error handling:

```typescript
const action = await errorHandler.handleTaskError(task, error)
switch (action) {
  case 'retry':
    // Retry the operation
    break
  case 'skip':
    // Skip and continue
    break
  case 'abort':
    // Stop execution
    break
}
```

## Best Practices

1. **Always validate permissions** before file operations
2. **Backup before destructive operations** (writes, deletes)
3. **Save state on errors** for resume capability
4. **Log all errors** with context for debugging
5. **Show user-friendly messages** instead of raw error messages
6. **Provide recovery options** (retry, skip, abort)
7. **Clean up resources** (dispose handlers, clear diagnostics)
8. **Rotate logs** to prevent unbounded growth

## File Structure

```
.sddcline/{spec-name}/
├── .config.kiro              # Spec configuration
├── requirements.md           # Requirements document
├── design.md                 # Design document
├── tasks.md                  # Tasks document
├── .execution-state.json     # Execution state (temporary)
├── .error-log.txt           # Error log
└── .backups/                # Backup directory
    ├── tasks.md.backup.1234567890
    ├── requirements.md.backup.1234567891
    └── ...
```

## Testing

Each error handler should be tested for:

1. **Error handling**: Correct error messages and user prompts
2. **File operations**: Backup, restore, cleanup
3. **State management**: Save, load, clear
4. **Diagnostics**: Proper VSCode integration
5. **Edge cases**: Missing files, invalid permissions, corrupted state

See `__tests__/` directory for test examples.
