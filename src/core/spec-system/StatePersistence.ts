/**
 * StatePersistence - Manages execution state persistence
 *
 * This component is responsible for:
 * - Saving execution state to .execution-state.json
 * - Loading execution state on resume
 * - Prompting user to resume incomplete execution
 *
 * Requirements: 17.2, 17.5
 */

import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"
import type { TaskExecution } from "./types"

/**
 * Execution state file name
 */
const EXECUTION_STATE_FILE = ".execution-state.json"

/**
 * StatePersistence manages saving and loading execution state
 */
export class StatePersistence {
	private stateFilePath: string

	constructor(private specDir: string) {
		this.stateFilePath = path.join(specDir, EXECUTION_STATE_FILE)
	}

	/**
	 * Save execution state to file
	 *
	 * @param state - The execution state to save
	 */
	async saveExecutionState(state: TaskExecution): Promise<void> {
		try {
			const stateData = JSON.stringify(state, null, 2)
			await fs.promises.writeFile(this.stateFilePath, stateData, "utf-8")
		} catch (error) {
			console.error("Failed to save execution state:", error)
			throw new Error(`Failed to save execution state: ${error}`)
		}
	}

	/**
	 * Load execution state from file
	 *
	 * @returns Promise that resolves to the execution state, or null if not found
	 */
	async loadExecutionState(): Promise<TaskExecution | null> {
		try {
			const stateData = await fs.promises.readFile(this.stateFilePath, "utf-8")
			return JSON.parse(stateData) as TaskExecution
		} catch (error) {
			// File doesn't exist or is invalid
			return null
		}
	}

	/**
	 * Check if execution state exists
	 *
	 * @returns Promise that resolves to true if state file exists
	 */
	async hasExecutionState(): Promise<boolean> {
		try {
			await fs.promises.access(this.stateFilePath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Clear execution state file
	 */
	async clearExecutionState(): Promise<void> {
		try {
			await fs.promises.unlink(this.stateFilePath)
		} catch (error) {
			// File doesn't exist, ignore
		}
	}

	/**
	 * Prompt user to resume incomplete execution
	 *
	 * @returns Promise that resolves to true if user wants to resume
	 */
	async promptResumeExecution(): Promise<boolean> {
		const state = await this.loadExecutionState()

		if (!state) {
			return false
		}

		// Calculate progress
		const totalTasks = state.tasks.length
		const completedTasks = state.completed.length
		const failedTasks = state.failed.length
		const remainingTasks = totalTasks - completedTasks - failedTasks

		// Show prompt
		const action = await vscode.window.showInformationMessage(
			`Found incomplete task execution. ${completedTasks} completed, ${failedTasks} failed, ${remainingTasks} remaining. Resume?`,
			{ modal: true },
			"Resume",
			"Start Fresh",
		)

		return action === "Resume"
	}

	/**
	 * Get execution state file path
	 */
	getStateFilePath(): string {
		return this.stateFilePath
	}

	/**
	 * Get execution progress summary
	 *
	 * @returns Promise that resolves to progress summary, or null if no state exists
	 */
	async getProgressSummary(): Promise<{
		total: number
		completed: number
		failed: number
		remaining: number
		startTime: number
	} | null> {
		const state = await this.loadExecutionState()

		if (!state) {
			return null
		}

		const total = state.tasks.length
		const completed = state.completed.length
		const failed = state.failed.length
		const remaining = total - completed - failed

		return {
			total,
			completed,
			failed,
			remaining,
			startTime: state.startTime,
		}
	}

	/**
	 * Update execution state with new completed task
	 *
	 * @param taskId - ID of the completed task
	 */
	async markTaskCompleted(taskId: string): Promise<void> {
		const state = await this.loadExecutionState()

		if (!state) {
			return
		}

		// Add to completed list if not already there
		if (!state.completed.includes(taskId)) {
			state.completed.push(taskId)
		}

		// Remove from failed list if present
		state.failed = state.failed.filter((f) => f.taskId !== taskId)

		await this.saveExecutionState(state)
	}

	/**
	 * Update execution state with new failed task
	 *
	 * @param taskId - ID of the failed task
	 * @param error - Error message
	 */
	async markTaskFailed(taskId: string, error: string): Promise<void> {
		const state = await this.loadExecutionState()

		if (!state) {
			return
		}

		// Add to failed list if not already there
		const existingFailure = state.failed.find((f) => f.taskId === taskId)
		if (!existingFailure) {
			state.failed.push({ taskId, error })
		}

		// Remove from completed list if present
		state.completed = state.completed.filter((id) => id !== taskId)

		await this.saveExecutionState(state)
	}
}
