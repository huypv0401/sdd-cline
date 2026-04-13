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
// Export all core types
export * from "./types"

// Version information
export const SPEC_SYSTEM_VERSION = "1.0.0"
