/**
 * TasksFormatValidator - Validates tasks document format
 *
 * This validator checks that tasks follow the correct format:
 * - Task IDs are numeric with dots (e.g., "1", "1.1", "1.1.1")
 * - Status markers are valid ([ ], [~], [x], [-])
 * - Indentation is consistent (multiples of 2 spaces)
 */

import { Task, TaskTree, ValidationError, ValidationResult } from "./types"

export class TasksFormatValidator {
	/**
	 * Validate tasks document format
	 *
	 * @param taskTree - TaskTree to validate
	 * @param filePath - Path to the tasks file (for error reporting)
	 * @returns ValidationResult with any errors found
	 */
	validate(taskTree: TaskTree, filePath: string): ValidationResult {
		const errors: ValidationError[] = []

		// Validate all tasks recursively
		this.validateTasks(taskTree.tasks, filePath, errors, 0)

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Recursively validate tasks and their sub-tasks
	 */
	private validateTasks(tasks: Task[], filePath: string, errors: ValidationError[], expectedIndentLevel: number): void {
		for (const task of tasks) {
			// Validate task ID format
			this.validateTaskId(task, filePath, errors)

			// Validate status marker
			this.validateStatusMarker(task, filePath, errors)

			// Validate indentation
			this.validateIndentation(task, filePath, errors, expectedIndentLevel)

			// Validate description
			this.validateDescription(task, filePath, errors)

			// Recursively validate sub-tasks
			if (task.subTasks.length > 0) {
				this.validateTasks(task.subTasks, filePath, errors, expectedIndentLevel + 1)
			}
		}
	}

	/**
	 * Validate task ID format (numeric with dots)
	 */
	private validateTaskId(task: Task, filePath: string, errors: ValidationError[]): void {
		// Task ID should match pattern: number or number.number or number.number.number etc.
		const taskIdPattern = /^\d+(\.\d+)*$/

		if (!taskIdPattern.test(task.id)) {
			errors.push({
				file: filePath,
				message: `Task ID "${task.id}" has invalid format. Task IDs must be numeric with dots (e.g., "1", "1.1", "1.1.1")`,
			})
		}

		// Validate parent-child ID relationship
		if (task.parentId) {
			// Child ID should start with parent ID
			if (!task.id.startsWith(task.parentId + ".")) {
				errors.push({
					file: filePath,
					message: `Task ID "${task.id}" does not match parent ID "${task.parentId}". Child IDs should start with parent ID followed by a dot.`,
				})
			}

			// Child ID should have exactly one more level than parent
			const parentLevels = task.parentId.split(".").length
			const childLevels = task.id.split(".").length
			if (childLevels !== parentLevels + 1) {
				errors.push({
					file: filePath,
					message: `Task ID "${task.id}" has incorrect nesting level. Expected ${parentLevels + 1} levels, got ${childLevels}`,
				})
			}
		}
	}

	/**
	 * Validate status marker
	 */
	private validateStatusMarker(task: Task, filePath: string, errors: ValidationError[]): void {
		// Valid status values are defined in TaskStatus enum
		const validStatuses = ["not_started", "queued", "in_progress", "completed", "failed"]

		if (!validStatuses.includes(task.status)) {
			errors.push({
				file: filePath,
				message: `Task "${task.id}" has invalid status: "${task.status}". Valid statuses are: ${validStatuses.join(", ")}`,
			})
		}
	}

	/**
	 * Validate indentation consistency
	 */
	private validateIndentation(task: Task, filePath: string, errors: ValidationError[], expectedIndentLevel: number): void {
		// Indentation level should match expected level based on hierarchy
		if (task.indentLevel !== expectedIndentLevel) {
			errors.push({
				file: filePath,
				message: `Task "${task.id}" has incorrect indentation level. Expected ${expectedIndentLevel}, got ${task.indentLevel}`,
			})
		}

		// Indentation level should be non-negative
		if (task.indentLevel < 0) {
			errors.push({
				file: filePath,
				message: `Task "${task.id}" has negative indentation level: ${task.indentLevel}`,
			})
		}
	}

	/**
	 * Validate task description
	 */
	private validateDescription(task: Task, filePath: string, errors: ValidationError[]): void {
		// Description should not be empty
		if (!task.description || task.description.trim().length === 0) {
			errors.push({
				file: filePath,
				message: `Task "${task.id}" has empty description`,
			})
		}

		// Description should have minimum length
		if (task.description.trim().length < 3) {
			errors.push({
				file: filePath,
				message: `Task "${task.id}" has description that is too short (minimum 3 characters)`,
			})
		}

		// Description should not contain only whitespace
		if (task.description.trim() !== task.description) {
			// This is just a warning, not an error - we'll skip this check
			// as it's too strict for practical use
		}
	}
}
