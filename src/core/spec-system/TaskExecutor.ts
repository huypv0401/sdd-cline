/**
 * TaskExecutor - Executes individual tasks using Cline's controller
 *
 * This component is responsible for:
 * - Creating task prompts from task descriptions
 * - Executing tasks using Controller.initTask() in "act" mode
 * - Monitoring task completion
 * - Returning execution results
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import type { Controller } from "../controller"
import type { Task, TaskResult } from "./types"

/**
 * TaskExecutor executes individual tasks using Cline's controller
 */
export class TaskExecutor {
	constructor(private controller: Controller) {}

	/**
	 * Execute a single task
	 *
	 * Requirements: 10.2, 10.3
	 */
	async execute(task: Task): Promise<TaskResult> {
		// Create task prompt from task description
		const prompt = this.createTaskPrompt(task)

		// Initialize Cline task in "act" mode
		await this.controller.initTask(prompt)

		// Wait for task completion
		const result = await this.waitForTaskCompletion()

		return {
			taskId: task.id,
			success: result.success,
			output: result.output,
			error: result.error,
		}
	}

	/**
	 * Create task prompt from task description
	 *
	 * Requirements: 10.2
	 */
	private createTaskPrompt(task: Task): string {
		const lines = [
			`Execute task ${task.id}: ${task.description}`,
			"",
			"Context:",
			`- Task ID: ${task.id}`,
		]

		if (task.parentId) {
			lines.push(`- Parent Task: ${task.parentId}`)
		}

		lines.push("", "Please implement this task according to the design document.")

		return lines.join("\n")
	}

	/**
	 * Wait for task completion and detect success/failure
	 *
	 * Requirements: 10.4
	 */
	private async waitForTaskCompletion(): Promise<{
		success: boolean
		output: string
		error?: string
	}> {
		// Monitor controller task state
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				const task = this.controller.task

				if (!task) {
					// Task completed and was cleared
					clearInterval(checkInterval)
					resolve({
						success: true,
						output: "Task completed successfully",
					})
					return
				}

				// Check if task is in a terminal state
				const state = task.taskState

				// Task completed successfully
				if (state.isCompleted) {
					clearInterval(checkInterval)
					resolve({
						success: true,
						output: "Task completed successfully",
					})
					return
				}

				// Task failed or was abandoned
				if (state.abandoned) {
					clearInterval(checkInterval)
					resolve({
						success: false,
						output: "",
						error: "Task was abandoned",
					})
					return
				}
			}, 1000) // Check every second

			// Set timeout to prevent infinite waiting
			setTimeout(() => {
				clearInterval(checkInterval)
				resolve({
					success: false,
					output: "",
					error: "Task execution timeout",
				})
			}, 30 * 60 * 1000) // 30 minute timeout
		})
	}
}
