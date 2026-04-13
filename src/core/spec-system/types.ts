/**
 * Core type definitions for the Spec System
 *
 * This module defines the fundamental data structures used throughout
 * the spec workflow system, including requirements, tasks, and configuration.
 */

// ============================================================================
// EARS Pattern Types
// ============================================================================

/**
 * Easy Approach to Requirements Syntax (EARS) pattern types
 * Used to classify acceptance criteria based on their structure
 */
export enum EARSPattern {
	/** THE system SHALL [action] - Always active requirements */
	UBIQUITOUS = "ubiquitous",
	/** WHEN [event] THEN system SHALL [action] - Event-triggered requirements */
	EVENT_DRIVEN = "event-driven",
	/** WHILE [state] THE system SHALL [action] - State-dependent requirements */
	STATE_DRIVEN = "state-driven",
	/** WHERE [condition] THE system SHALL [action] - Optional feature requirements */
	OPTIONAL = "optional",
	/** IF [condition] THEN system SHALL [action] - Unwanted behavior requirements */
	UNWANTED = "unwanted",
	/** Requirements that don't fit standard EARS patterns */
	COMPLEX = "complex",
}

// ============================================================================
// Requirements Types
// ============================================================================

/**
 * Represents a single acceptance criterion within a requirement
 */
export interface AcceptanceCriterion {
	/** Unique identifier (e.g., "1.1", "1.2") */
	id: string
	/** The criterion text */
	text: string
	/** The EARS pattern this criterion follows */
	earsPattern: EARSPattern
}

/**
 * Represents a complete requirement with user story and acceptance criteria
 */
export interface Requirement {
	/** Unique identifier (e.g., "1", "2") */
	id: string
	/** User story in "As a... I want... so that..." format */
	userStory: string
	/** List of acceptance criteria for this requirement */
	acceptanceCriteria: AcceptanceCriterion[]
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task execution status
 */
export enum TaskStatus {
	NOT_STARTED = "not_started",
	QUEUED = "queued",
	IN_PROGRESS = "in_progress",
	COMPLETED = "completed",
	FAILED = "failed",
}

/**
 * Property-Based Test status tracking
 */
export interface PBTStatus {
	/** Test execution status */
	status: "passed" | "failed" | "not_run" | "unexpected_pass"
	/** Failing example from PBT library (if test failed) */
	failingExample?: string
}

/**
 * Represents a single task in the implementation plan
 */
export interface Task {
	/** Unique identifier (e.g., "1", "1.1", "1.1.1") */
	id: string
	/** Task description */
	description: string
	/** Current execution status */
	status: TaskStatus
	/** Indentation level (0 for root tasks) */
	indentLevel: number
	/** Parent task ID (if this is a sub-task) */
	parentId?: string
	/** Sub-tasks of this task */
	subTasks: Task[]
	/** Property-based test status (if applicable) */
	pbtStatus?: PBTStatus
}

/**
 * Represents a hierarchical tree of tasks
 */
export class TaskTree {
	constructor(public tasks: Task[]) {}

	/**
	 * Get all tasks in depth-first order
	 */
	getAllTasks(): Task[] {
		const result: Task[] = []

		const traverse = (tasks: Task[]) => {
			for (const task of tasks) {
				result.push(task)
				if (task.subTasks.length > 0) {
					traverse(task.subTasks)
				}
			}
		}

		traverse(this.tasks)
		return result
	}

	/**
	 * Find a task by its ID
	 */
	findTask(taskId: string): Task | undefined {
		const search = (tasks: Task[]): Task | undefined => {
			for (const task of tasks) {
				if (task.id === taskId) {
					return task
				}
				if (task.subTasks.length > 0) {
					const found = search(task.subTasks)
					if (found) return found
				}
			}
			return undefined
		}

		return search(this.tasks)
	}
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Spec configuration stored in .config.kiro file
 */
export interface SpecConfig {
	/** Unique identifier for this spec (UUID) */
	specId: string
	/** Workflow type used to create this spec */
	workflowType: "requirements-first" | "design-first"
	/** Type of spec (feature, bugfix, or refactor) */
	specType: "feature" | "bugfix" | "refactor"
	/** ISO timestamp when spec was created */
	createdAt: string
	/** ISO timestamp when spec was last modified */
	lastModified?: string
}

// ============================================================================
// Task Execution Types
// ============================================================================

/**
 * Task execution state for tracking progress
 */
export interface TaskExecution {
	/** When execution started */
	startTime: number
	/** All tasks to be executed */
	tasks: Task[]
	/** IDs of completed tasks */
	completed: string[]
	/** Failed tasks with error information */
	failed: Array<{
		taskId: string
		error: string
	}>
}

/**
 * Result of executing a single task
 */
export interface TaskResult {
	/** ID of the executed task */
	taskId: string
	/** Whether execution succeeded */
	success: boolean
	/** Output from task execution */
	output: string
	/** Error message (if failed) */
	error?: string
}

// ============================================================================
// Webview Message Types
// ============================================================================

/**
 * Content for all three spec documents
 */
export interface SpecContent {
	requirements: string
	design: string
	tasks: string
}

/**
 * Messages sent from extension to webview
 */
export type ExtensionToWebviewMessage =
	| {
			type: "loadContent"
			content: SpecContent
	  }
	| {
			type: "switchTab"
			tab: "requirements" | "design" | "tasks"
	  }
	| {
			type: "updateTaskStatus"
			taskId: string
			status: TaskStatus
	  }
	| {
			type: "taskExecutionProgress"
			taskId: string
			progress: number
			message: string
	  }
	| {
			type: "taskExecutionStarted"
			taskId: string
	  }
	| {
			type: "allTasksExecutionStarted"
	  }
	| {
			type: "restoreScroll"
			position: number
	  }

/**
 * Messages sent from webview to extension
 */
export type WebviewToExtensionMessage =
	| {
			type: "switchTab"
			tab: "requirements" | "design" | "tasks"
	  }
	| {
			type: "executeTask"
			taskId: string
	  }
	| {
			type: "executeAllTasks"
	  }
	| {
			type: "cancelExecution"
	  }
	| {
			type: "refreshContent"
	  }
	| {
			type: "saveScroll"
			tab: string
			position: number
	  }

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation error with location information
 */
export interface ValidationError {
	/** File where error occurred */
	file: string
	/** Line number (if applicable) */
	line?: number
	/** Error message */
	message: string
}

/**
 * Result of validation operation
 */
export interface ValidationResult {
	/** Whether validation passed */
	valid: boolean
	/** List of validation errors */
	errors: ValidationError[]
}

// ============================================================================
// Parser Error Types
// ============================================================================

/**
 * Error thrown during parsing with line number information
 */
export class ParsingError extends Error {
	constructor(
		message: string,
		public line?: number,
		public file?: string,
	) {
		super(message)
		this.name = "ParsingError"
	}
}
