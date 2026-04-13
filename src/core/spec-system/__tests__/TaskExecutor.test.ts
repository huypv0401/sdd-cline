/**
 * Unit tests for TaskExecutor
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import { expect } from "chai"
import { describe, it, beforeEach } from "mocha"
import { TaskExecutor } from "../TaskExecutor"
import { Task, TaskStatus } from "../types"

describe("TaskExecutor", () => {
	let mockController: any
	let taskExecutor: TaskExecutor

	beforeEach(() => {
		// Create a mock controller
		mockController = {
			task: undefined,
			initTask: async (prompt: string) => {
				// Mock implementation
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
			},
		}

		taskExecutor = new TaskExecutor(mockController)
	})

	describe("createTaskPrompt", () => {
		it("should create a prompt with task ID and description", () => {
			const task: Task = {
				id: "1.1",
				description: "Implement feature X",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			// Access private method through any cast for testing
			const prompt = (taskExecutor as any).createTaskPrompt(task)

			expect(prompt).to.include("Execute task 1.1")
			expect(prompt).to.include("Implement feature X")
			expect(prompt).to.include("Task ID: 1.1")
			expect(prompt).to.include("implement this task according to the design document")
		})

		it("should include parent task ID when present", () => {
			const task: Task = {
				id: "1.1.1",
				description: "Sub-task implementation",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 1,
				parentId: "1.1",
				subTasks: [],
			}

			const prompt = (taskExecutor as any).createTaskPrompt(task)

			expect(prompt).to.include("Parent Task: 1.1")
		})

		it("should not include parent task ID when not present", () => {
			const task: Task = {
				id: "1",
				description: "Root task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			const prompt = (taskExecutor as any).createTaskPrompt(task)

			expect(prompt).to.not.include("Parent Task:")
		})

		it("should format prompt with proper structure", () => {
			const task: Task = {
				id: "2.3",
				description: "Test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			const prompt = (taskExecutor as any).createTaskPrompt(task)
			const lines = prompt.split("\n")

			expect(lines[0]).to.include("Execute task 2.3")
			expect(lines[1]).to.equal("")
			expect(lines[2]).to.equal("Context:")
			expect(lines[3]).to.include("Task ID:")
		})
	})

	describe("execute", () => {
		it("should call controller.initTask with task prompt", async () => {
			const task: Task = {
				id: "1",
				description: "Test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			let calledPrompt: string | undefined
			mockController.initTask = async (prompt: string) => {
				calledPrompt = prompt
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
			}

			// Start execution but don't wait for completion
			const executePromise = taskExecutor.execute(task)

			// Simulate task completion
			setTimeout(() => {
				mockController.task.taskState.isCompleted = true
			}, 100)

			const result = await executePromise

			expect(calledPrompt).to.be.a("string")
			expect(calledPrompt).to.include("Execute task 1")
			expect(result.taskId).to.equal("1")
		})

		it("should return success result when task completes", async () => {
			const task: Task = {
				id: "1",
				description: "Test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			// Start execution
			const executePromise = taskExecutor.execute(task)

			// Simulate task completion
			setTimeout(() => {
				mockController.task.taskState.isCompleted = true
			}, 100)

			const result = await executePromise

			expect(result.success).to.be.true
			expect(result.taskId).to.equal("1")
			expect(result.output).to.include("completed successfully")
			expect(result.error).to.be.undefined
		})

		it("should return failure result when task is abandoned", async () => {
			const task: Task = {
				id: "1",
				description: "Test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			// Start execution
			const executePromise = taskExecutor.execute(task)

			// Simulate task abandonment
			setTimeout(() => {
				mockController.task.taskState.abandoned = true
			}, 100)

			const result = await executePromise

			expect(result.success).to.be.false
			expect(result.taskId).to.equal("1")
			expect(result.error).to.include("abandoned")
		})

		it("should return success when task is cleared (completed and removed)", async () => {
			const task: Task = {
				id: "1",
				description: "Test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			// Start execution
			const executePromise = taskExecutor.execute(task)

			// Simulate task completion and clearing
			setTimeout(() => {
				mockController.task = undefined
			}, 100)

			const result = await executePromise

			expect(result.success).to.be.true
			expect(result.taskId).to.equal("1")
		})
	})

	describe("waitForTaskCompletion", () => {
		it("should detect task completion", async () => {
			mockController.task = {
				taskId: "test-task-id",
				taskState: {
					isCompleted: false,
					abandoned: false,
				},
			}

			// Start waiting
			const waitPromise = (taskExecutor as any).waitForTaskCompletion()

			// Simulate completion
			setTimeout(() => {
				mockController.task.taskState.isCompleted = true
			}, 100)

			const result = await waitPromise

			expect(result.success).to.be.true
		})

		it("should detect task abandonment", async () => {
			mockController.task = {
				taskId: "test-task-id",
				taskState: {
					isCompleted: false,
					abandoned: false,
				},
			}

			// Start waiting
			const waitPromise = (taskExecutor as any).waitForTaskCompletion()

			// Simulate abandonment
			setTimeout(() => {
				mockController.task.taskState.abandoned = true
			}, 100)

			const result = await waitPromise

			expect(result.success).to.be.false
			expect(result.error).to.include("abandoned")
		})

		it("should detect task clearing", async () => {
			mockController.task = {
				taskId: "test-task-id",
				taskState: {
					isCompleted: false,
					abandoned: false,
				},
			}

			// Start waiting
			const waitPromise = (taskExecutor as any).waitForTaskCompletion()

			// Simulate task clearing
			setTimeout(() => {
				mockController.task = undefined
			}, 100)

			const result = await waitPromise

			expect(result.success).to.be.true
		})

		it("should timeout after 30 minutes", async function () {
			// Increase test timeout for this specific test
			this.timeout(5000)

			mockController.task = {
				taskId: "test-task-id",
				taskState: {
					isCompleted: false,
					abandoned: false,
				},
			}

			// Mock setTimeout to simulate timeout immediately
			const originalSetTimeout = global.setTimeout
			let timeoutCallback: Function | undefined

			global.setTimeout = ((callback: Function, delay: number) => {
				if (delay === 30 * 60 * 1000) {
					// This is the timeout we're testing
					timeoutCallback = callback
					// Call it immediately for testing
					setTimeout(() => callback(), 100)
					return {} as any
				}
				return originalSetTimeout(callback, delay)
			}) as any

			try {
				const waitPromise = (taskExecutor as any).waitForTaskCompletion()
				const result = await waitPromise

				expect(result.success).to.be.false
				expect(result.error).to.include("timeout")
			} finally {
				// Restore original setTimeout
				global.setTimeout = originalSetTimeout
			}
		})
	})

	describe("integration", () => {
		it("should handle complete task execution flow", async () => {
			const task: Task = {
				id: "1.2.3",
				description: "Integration test task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 2,
				parentId: "1.2",
				subTasks: [],
			}

			let initTaskCalled = false
			mockController.initTask = async (prompt: string) => {
				initTaskCalled = true
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}

				// Simulate async task completion
				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 50)
			}

			const result = await taskExecutor.execute(task)

			expect(initTaskCalled).to.be.true
			expect(result.success).to.be.true
			expect(result.taskId).to.equal("1.2.3")
			expect(result.output).to.be.a("string")
		})

		it("should handle task with no parent", async () => {
			const task: Task = {
				id: "5",
				description: "Root level task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			}

			mockController.initTask = async () => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task = undefined
				}, 50)
			}

			const result = await taskExecutor.execute(task)

			expect(result.success).to.be.true
			expect(result.taskId).to.equal("5")
		})
	})
})
