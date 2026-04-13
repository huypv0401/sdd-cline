/**
 * TaskExecutionErrorHandler - Handles task execution errors
 *
 * This component is responsible for:
 * - Logging task execution errors
 * - Saving execution state on failure
 * - Prompting user for retry/skip/abort
 *
 * Requirements: 17.2
 */

import * as vscode from "vscode"
import type { Task } from "./types"
import { ErrorLogger } from "./ErrorLogger"

/**
 * User action choices for handling task errors
 */
export type TaskErrorAction = "retry" | "skip" | "abort"

/**
 * TaskExecutionErrorHandler handles errors during task execution
 */
export class TaskExecutionErrorHandler {
	private errorLogger: ErrorLogger

	constructor(specDir: string) {
		this.errorLogger = new ErrorLogger(specDir)
	}

	/**
	 * Handle task execution error with user prompt
	 *
	 * @param task - The task that failed
	 * @param error - The error that occurred
	 * @param saveStateCallback - Callback to save execution state
	 * @returns Promise that resolves to user's chosen action
	 */
	async handleTaskError(
		task: Task,
		error: unknown,
		saveStateCallback?: () => Promise<void>,
	): Promise<TaskErrorAction> {
		const errorMessage = error instanceof Error ? error.message : String(error)

		// Log error
		await this.errorLogger.logError(
			error instanceof Error ? error : new Error(String(error)),
			`Task execution failed: ${task.id} - ${task.description}`,
		)

		// Save execution state if callback provided
		if (saveStateCallback) {
			try {
				await saveStateCallback()
			} catch (saveError) {
				console.error("Failed to save execution state:", saveError)
			}
		}

		// Prompt user for action
		const action = await vscode.window.showErrorMessage(
			`Task ${task.id} failed: ${errorMessage}`,
			{ modal: true },
			"Retry",
			"Skip",
			"Abort",
		)

		switch (action) {
			case "Retry":
				return "retry"
			case "Skip":
				return "skip"
			case "Abort":
			default:
				return "abort"
		}
	}

	/**
	 * Handle task timeout error
	 *
	 * @param task - The task that timed out
	 * @param timeoutMs - The timeout duration in milliseconds
	 * @returns Promise that resolves to user's chosen action
	 */
	async handleTaskTimeout(task: Task, timeoutMs: number): Promise<TaskErrorAction> {
		const timeoutSeconds = Math.round(timeoutMs / 1000)

		// Log timeout
		await this.errorLogger.logError(
			new Error(`Task timeout after ${timeoutSeconds}s`),
			`Task ${task.id} - ${task.description}`,
		)

		// Prompt user for action
		const action = await vscode.window.showWarningMessage(
			`Task ${task.id} timed out after ${timeoutSeconds} seconds. What would you like to do?`,
			{ modal: true },
			"Continue Waiting",
			"Skip",
			"Abort",
		)

		switch (action) {
			case "Continue Waiting":
				return "retry"
			case "Skip":
				return "skip"
			case "Abort":
			default:
				return "abort"
		}
	}

	/**
	 * Show task execution progress
	 *
	 * @param task - The task being executed
	 * @param message - Progress message
	 */
	async showProgress(task: Task, message: string): Promise<void> {
		await vscode.window.setStatusBarMessage(`Task ${task.id}: ${message}`, 3000)
	}

	/**
	 * Show task execution success
	 *
	 * @param task - The task that completed
	 */
	async showSuccess(task: Task): Promise<void> {
		await vscode.window.setStatusBarMessage(`✓ Task ${task.id} completed`, 3000)
	}

	/**
	 * Get error logger instance
	 */
	getErrorLogger(): ErrorLogger {
		return this.errorLogger
	}
}
