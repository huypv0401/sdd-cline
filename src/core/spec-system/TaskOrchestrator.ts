/**
 * TaskOrchestrator - Coordinates task execution with dependency management
 *
 * This component is responsible for:
 * - Parsing tasks.md to determine task hierarchy and dependencies
 * - Executing tasks in correct order with sub-task handling
 * - Updating task status in tasks.md file
 * - Tracking execution history and handling failures
 * - Creating checkpoints before task execution
 * - Saving/loading execution state for resume capability
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.2, 8.3, 11.4, 17.2, 17.5
 */

import * as fs from "fs"
import * as path from "path"
import type { Controller } from "../controller"
import { TaskExecutor } from "./TaskExecutor"
import { TasksParser } from "./TasksParser"
import type { Task, TaskExecution, TaskStatus } from "./types"

/**
 * Execution state file name
 */
const EXECUTION_STATE_FILE = ".execution-state.json"

/**
 * TaskOrchestrator coordinates task execution with dependency management
 */
export class TaskOrchestrator {
	private tasksParser: TasksParser
	private taskExecutor: TaskExecutor
	private currentExecution: TaskExecution | null = null
	private tasksFilePath: string

	constructor(
		private specDir: string,
		private controller: Controller,
	) {
		this.tasksParser = new TasksParser()
		this.taskExecutor = new TaskExecutor(controller)
		this.tasksFilePath = path.join(specDir, "tasks.md")
	}

	/**
	 * Execute all tasks in order
	 *
	 * Requirements: 7.1, 7.2, 7.3
	 */
	async executeAllTasks(): Promise<void> {
		// Parse tasks document
		const taskTree = await this.tasksParser.parse(this.tasksFilePath)
		const allTasks = taskTree.getAllTasks()

		// Initialize execution state
		this.currentExecution = {
			startTime: Date.now(),
			tasks: allTasks,
			completed: [],
			failed: [],
		}

		// Save initial execution state
		await this.saveExecutionState()

		try {
			// Execute tasks in order
			for (const task of allTasks) {
				// Skip already completed tasks (for resume capability)
				if (task.status === "completed") {
					this.currentExecution.completed.push(task.id)
					continue
				}

				// Execute the task
				await this.executeTask(task)

				// Stop if task failed
				if (task.status === "failed") {
					break
				}
			}
		} finally {
			// Clear execution state on completion
			await this.clearExecutionState()
		}
	}

	/**
	 * Execute a single task
	 *
	 * Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 8.2, 8.3
	 */
	async executeTask(task: Task): Promise<void> {
		try {
			// Create checkpoint before task execution (Requirement 11.4)
			await this.createCheckpoint(task)

			// Update status to in_progress (Requirement 8.2)
			await this.updateTaskStatus(task.id, "in_progress")

			// If task has sub-tasks, execute them first (Requirement 7.3)
			if (task.subTasks && task.subTasks.length > 0) {
				for (const subTask of task.subTasks) {
					await this.executeTask(subTask)

					// If sub-task failed, mark parent as failed and stop
					if (subTask.status === "failed") {
						await this.updateTaskStatus(task.id, "failed")
						return
					}
				}
			}

			// Execute the task (Requirement 7.4)
			const result = await this.taskExecutor.execute(task)

			// Update status based on result (Requirement 7.5, 8.3)
			if (result.success) {
				await this.updateTaskStatus(task.id, "completed")
				this.currentExecution?.completed.push(task.id)
			} else {
				await this.updateTaskStatus(task.id, "failed")
				this.currentExecution?.failed.push({
					taskId: task.id,
					error: result.error || "Unknown error",
				})

				// Save execution state on failure (Requirement 17.2)
				await this.saveExecutionState()

				throw new Error(`Task ${task.id} failed: ${result.error}`)
			}
		} catch (error) {
			// Track execution history and log errors (Requirement 7.6)
			const errorMessage = error instanceof Error ? error.message : String(error)

			await this.updateTaskStatus(task.id, "failed")
			this.currentExecution?.failed.push({
				taskId: task.id,
				error: errorMessage,
			})

			// Save execution state on failure (Requirement 17.2)
			await this.saveExecutionState()

			// Re-throw to stop execution chain (Requirement 7.7)
			throw error
		}
	}

	/**
	 * Update task status in tasks.md file
	 *
	 * Requirements: 7.5, 8.2, 8.3, 8.5, 8.6
	 */
	private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
		// Parse tasks document
		const taskTree = await this.tasksParser.parse(this.tasksFilePath)

		// Find and update task
		const task = taskTree.findTask(taskId)
		if (task) {
			task.status = status
		}

		// Pretty print back to file
		const updatedContent = this.tasksParser.prettyPrint(taskTree)
		await fs.promises.writeFile(this.tasksFilePath, updatedContent)

		// Notify UI of status changes (Requirement 8.6)
		this.notifyStatusChange(taskId, status)
	}

	/**
	 * Update PBT status for a task
	 *
	 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
	 */
	async updatePBTStatus(
		taskId: string,
		pbtStatus: "passed" | "failed" | "not_run" | "unexpected_pass",
		failingExample?: string,
	): Promise<void> {
		// Parse tasks document
		const taskTree = await this.tasksParser.parse(this.tasksFilePath)

		// Find and update task
		const task = taskTree.findTask(taskId)
		if (task) {
			task.pbtStatus = {
				status: pbtStatus,
				failingExample,
			}
		}

		// Pretty print back to file (will persist PBT status)
		const updatedContent = this.tasksParser.prettyPrint(taskTree)
		await fs.promises.writeFile(this.tasksFilePath, updatedContent)

		// Notify UI of PBT status change
		this.notifyPBTStatusChange(taskId, pbtStatus, failingExample)
	}

	/**
	 * Create checkpoint before task execution
	 *
	 * Requirements: 11.4
	 */
	private async createCheckpoint(task: Task): Promise<void> {
		// TODO: Integrate with Cline's checkpoint system
		// For now, this is a placeholder that logs the checkpoint creation
		console.log(`Creating checkpoint before executing task ${task.id}`)
	}

	/**
	 * Save execution state to file
	 *
	 * Requirements: 17.2, 17.5
	 */
	private async saveExecutionState(): Promise<void> {
		if (!this.currentExecution) {
			return
		}

		const statePath = path.join(this.specDir, EXECUTION_STATE_FILE)
		const stateData = JSON.stringify(this.currentExecution, null, 2)
		await fs.promises.writeFile(statePath, stateData)
	}

	/**
	 * Load execution state from file
	 *
	 * Requirements: 17.2, 17.5
	 */
	async loadExecutionState(): Promise<TaskExecution | null> {
		const statePath = path.join(this.specDir, EXECUTION_STATE_FILE)

		try {
			const stateData = await fs.promises.readFile(statePath, "utf-8")
			return JSON.parse(stateData) as TaskExecution
		} catch (error) {
			// File doesn't exist or is invalid
			return null
		}
	}

	/**
	 * Clear execution state file
	 *
	 * Requirements: 17.2, 17.5
	 */
	private async clearExecutionState(): Promise<void> {
		const statePath = path.join(this.specDir, EXECUTION_STATE_FILE)

		try {
			await fs.promises.unlink(statePath)
		} catch (error) {
			// File doesn't exist, ignore
		}
	}

	/**
	 * Resume execution from last successful task
	 *
	 * Requirements: 17.5
	 */
	async resumeExecution(): Promise<void> {
		// Load execution state
		const state = await this.loadExecutionState()
		if (!state) {
			throw new Error("No execution state found to resume")
		}

		// Restore execution state
		this.currentExecution = state

		// Continue execution from where we left off
		await this.executeAllTasks()
	}

	/**
	 * Get current execution state
	 *
	 * Requirements: 8.7
	 */
	getExecutionState(): TaskExecution | null {
		return this.currentExecution
	}

	/**
	 * Notify UI of status changes
	 *
	 * Requirements: 8.6
	 */
	private notifyStatusChange(taskId: string, status: TaskStatus): void {
		// TODO: Send message to webview
		// This will be implemented when integrating with SpecPreviewProvider
		console.log(`Task ${taskId} status changed to ${status}`)
	}

	/**
	 * Notify UI of PBT status changes
	 *
	 * Requirements: 9.2, 9.3, 9.4, 9.6
	 */
	private notifyPBTStatusChange(
		taskId: string,
		status: "passed" | "failed" | "not_run" | "unexpected_pass",
		failingExample?: string,
	): void {
		// TODO: Send message to webview
		// This will be implemented when integrating with SpecPreviewProvider
		console.log(`Task ${taskId} PBT status changed to ${status}`)
		if (failingExample) {
			console.log(`Failing example: ${failingExample}`)
		}
	}
}
