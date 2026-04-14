/**
 * Spec System - Core module for structured software development
 *
 * This module provides the foundation for the SDD Cline Spec Workflow,
 * enabling structured development through requirements, design, and task documents.
 */

// Export SpecSystem
export { SpecSystem } from "./SpecSystem"
// Export ConfigManager
export { ConfigManager } from "./ConfigManager"
// Export RequirementsParser
export { RequirementsParser } from "./RequirementsParser"
// Export TasksParser
export { TasksParser } from "./TasksParser"
// Export WorkflowController
export { WorkflowController } from "./WorkflowController"
// Export TaskExecutor
export { TaskExecutor } from "./TaskExecutor"
// Export TaskOrchestrator
export { TaskOrchestrator } from "./TaskOrchestrator"
// Export SpecPreviewProvider
export { SpecPreviewProvider } from "./SpecPreviewProvider"
// Export error handlers
export { FileSystemErrorHandler } from "./FileSystemErrorHandler"
export { ParsingErrorHandler } from "./ParsingErrorHandler"
export { TaskExecutionErrorHandler } from "./TaskExecutionErrorHandler"
export { ValidationErrorHandler } from "./ValidationErrorHandler"
export { BackupManager } from "./BackupManager"
export { StatePersistence } from "./StatePersistence"
export { ErrorLogger } from "./ErrorLogger"
// Export validators
export { EARSPatternValidator } from "./EARSPatternValidator"
export { INCOSERulesValidator } from "./INCOSERulesValidator"
export { TasksFormatValidator } from "./TasksFormatValidator"
// Export all core types
export * from "./types"

// Version information
export const SPEC_SYSTEM_VERSION = "1.0.0"
