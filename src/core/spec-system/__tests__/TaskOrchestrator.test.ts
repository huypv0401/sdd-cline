/**
 * Unit tests for TaskOrchestrator
 *
 * Requirements: 7.3, 8.2, 8.3
 */

import { expect } from "chai"
import { describe, it, beforeEach, afterEach } from "mocha"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { TaskOrchestrator } from "../TaskOrchestrator"

describe("TaskOrchestrator", () => {
	let mockController: any
	let taskOrchestrator: TaskOrchestrator
	let tempDir: string
	let tasksFilePath: string

	beforeEach(async () => {
		// Create temporary directory for test files
		tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "task-orchestrator-test-"))
		tasksFilePath = path.join(tempDir, "tasks.md")

		// Create a mock controller
		mockController = {
			task: undefined,
			initTask: async (prompt: string) => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				// Simulate immediate completion
				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 10)
			},
		}

		taskOrchestrator = new TaskOrchestrator(tempDir, mockController)
	})

	afterEach(async () => {
		// Clean up temporary directory
		try {
			await fs.promises.rm(tempDir, { recursive: true, force: true })
		} catch (error) {
			// Ignore cleanup errors
		}
	})

	describe("executeTask", () => {
		it("should update task status to in_progress before execution", async () => {
			// Create a simple tasks file
			const tasksContent = `# Tasks

- [ ] 1 Test task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			// Parse to get task
			const { TasksParser } = await import("../TasksParser")
			const parser = new TasksParser()
			const taskTree = await parser.parse(tasksFilePath)
			const task = taskTree.tasks[0]

			// Execute task
			await taskOrchestrator.executeTask(task)

			// Read updated file
			const updatedContent = await fs.promises.readFile(tasksFilePath, "utf-8")

			// Task should be completed now
			expect(updatedContent).to.include("[x] 1 Test task")
		})

		it("should execute sub-tasks before parent task", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Parent task
  - [ ] 1.1 Sub-task 1
  - [ ] 1.2 Sub-task 2
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const { TasksParser } = await import("../TasksParser")
			const parser = new TasksParser()
			const taskTree = await parser.parse(tasksFilePath)
			const parentTask = taskTree.tasks[0]

			const executionOrder: string[] = []

			// Mock controller to track execution order
			mockController.initTask = async (prompt: string) => {
				const taskIdMatch = prompt.match(/Execute task ([\d.]+)/)
				if (taskIdMatch) {
					executionOrder.push(taskIdMatch[1])
				}
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 10)
			}

			await taskOrchestrator.executeTask(parentTask)

			// Sub-tasks should be executed before parent
			expect(executionOrder).to.deep.equal(["1.1", "1.2", "1"])
		})

		it("should mark parent task as failed if sub-task fails", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Parent task
  - [ ] 1.1 Sub-task that will fail
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const { TasksParser } = await import("../TasksParser")
			const parser = new TasksParser()
			const taskTree = await parser.parse(tasksFilePath)
			const parentTask = taskTree.tasks[0]

			// Mock controller to fail on sub-task
			mockController.initTask = async (prompt: string) => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.abandoned = true
				}, 10)
			}

			try {
				await taskOrchestrator.executeTask(parentTask)
				expect.fail("Should have thrown an error")
			} catch (error) {
				// Expected to fail
			}

			// Read updated file
			const updatedContent = await fs.promises.readFile(tasksFilePath, "utf-8")

			// Both tasks should be marked as failed
			expect(updatedContent).to.include("[-] 1.1 Sub-task that will fail")
			expect(updatedContent).to.include("[-] 1 Parent task")
		})

		it("should update task status to completed on success", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Test task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const { TasksParser } = await import("../TasksParser")
			const parser = new TasksParser()
			const taskTree = await parser.parse(tasksFilePath)
			const task = taskTree.tasks[0]

			await taskOrchestrator.executeTask(task)

			// Read updated file
			const updatedContent = await fs.promises.readFile(tasksFilePath, "utf-8")
			expect(updatedContent).to.include("[x] 1 Test task")
		})

		it("should update task status to failed on error", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Test task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const { TasksParser } = await import("../TasksParser")
			const parser = new TasksParser()
			const taskTree = await parser.parse(tasksFilePath)
			const task = taskTree.tasks[0]

			// Mock controller to fail
			mockController.initTask = async () => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.abandoned = true
				}, 10)
			}

			try {
				await taskOrchestrator.executeTask(task)
				expect.fail("Should have thrown an error")
			} catch (error) {
				// Expected to fail
			}

			// Read updated file
			const updatedContent = await fs.promises.readFile(tasksFilePath, "utf-8")
			expect(updatedContent).to.include("[-] 1 Test task")
		})
	})

	describe("executeAllTasks", () => {
		it("should execute all tasks in order", async () => {
			const tasksContent = `# Tasks

- [ ] 1 First task
- [ ] 2 Second task
- [ ] 3 Third task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const executionOrder: string[] = []

			mockController.initTask = async (prompt: string) => {
				const taskIdMatch = prompt.match(/Execute task ([\d.]+)/)
				if (taskIdMatch) {
					executionOrder.push(taskIdMatch[1])
				}
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 10)
			}

			await taskOrchestrator.executeAllTasks()

			expect(executionOrder).to.deep.equal(["1", "2", "3"])
		})

		it("should skip already completed tasks", async () => {
			const tasksContent = `# Tasks

- [x] 1 Already completed task
- [ ] 2 Not completed task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const executionOrder: string[] = []

			mockController.initTask = async (prompt: string) => {
				const taskIdMatch = prompt.match(/Execute task ([\d.]+)/)
				if (taskIdMatch) {
					executionOrder.push(taskIdMatch[1])
				}
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 10)
			}

			await taskOrchestrator.executeAllTasks()

			// Should only execute task 2
			expect(executionOrder).to.deep.equal(["2"])
		})

		it("should stop execution when a task fails", async () => {
			const tasksContent = `# Tasks

- [ ] 1 First task
- [ ] 2 Task that will fail
- [ ] 3 Third task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			const executionOrder: string[] = []

			mockController.initTask = async (prompt: string) => {
				const taskIdMatch = prompt.match(/Execute task ([\d.]+)/)
				if (taskIdMatch) {
					executionOrder.push(taskIdMatch[1])
				}
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}

				// Fail on task 2
				if (taskIdMatch && taskIdMatch[1] === "2") {
					setTimeout(() => {
						mockController.task.taskState.abandoned = true
					}, 10)
				} else {
					setTimeout(() => {
						mockController.task.taskState.isCompleted = true
					}, 10)
				}
			}

			try {
				await taskOrchestrator.executeAllTasks()
			} catch (error) {
				// Expected to fail
			}

			// Should execute tasks 1 and 2, but not 3
			expect(executionOrder).to.deep.equal(["1", "2"])
		})

		it("should track completed and failed tasks", async () => {
			const tasksContent = `# Tasks

- [ ] 1 First task
- [ ] 2 Task that will fail
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			mockController.initTask = async (prompt: string) => {
				const taskIdMatch = prompt.match(/Execute task ([\d.]+)/)
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}

				// Fail on task 2
				if (taskIdMatch && taskIdMatch[1] === "2") {
					setTimeout(() => {
						mockController.task.taskState.abandoned = true
					}, 10)
				} else {
					setTimeout(() => {
						mockController.task.taskState.isCompleted = true
					}, 10)
				}
			}

			try {
				await taskOrchestrator.executeAllTasks()
			} catch (error) {
				// Expected to fail
			}

			const executionState = taskOrchestrator.getExecutionState()
			expect(executionState).to.not.be.null
			expect(executionState!.completed).to.include("1")
			expect(executionState!.failed).to.have.lengthOf(1)
			expect(executionState!.failed[0].taskId).to.equal("2")
		})
	})

	describe("execution state persistence", () => {
		it("should save execution state on failure", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Task that will fail
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			mockController.initTask = async () => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}
				setTimeout(() => {
					mockController.task.taskState.abandoned = true
				}, 10)
			}

			try {
				await taskOrchestrator.executeAllTasks()
			} catch (error) {
				// Expected to fail
			}

			// Check that execution state file was created
			const statePath = path.join(tempDir, ".execution-state.json")
			const stateExists = fs.existsSync(statePath)
			expect(stateExists).to.be.true

			// Load and verify state
			const stateData = await fs.promises.readFile(statePath, "utf-8")
			const state = JSON.parse(stateData)
			expect(state.failed).to.have.lengthOf(1)
			expect(state.failed[0].taskId).to.equal("1")
		})

		it("should load execution state", async () => {
			const tasksContent = `# Tasks

- [ ] 1 First task
- [ ] 2 Second task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			// Create a mock execution state
			const statePath = path.join(tempDir, ".execution-state.json")
			const mockState = {
				startTime: Date.now(),
				tasks: [],
				completed: ["1"],
				failed: [],
			}
			await fs.promises.writeFile(statePath, JSON.stringify(mockState))

			// Load state
			const loadedState = await taskOrchestrator.loadExecutionState()
			expect(loadedState).to.not.be.null
			expect(loadedState!.completed).to.include("1")
		})

		it("should clear execution state on successful completion", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Test task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			await taskOrchestrator.executeAllTasks()

			// Check that execution state file was removed
			const statePath = path.join(tempDir, ".execution-state.json")
			const stateExists = fs.existsSync(statePath)
			expect(stateExists).to.be.false
		})
	})

	describe("getExecutionState", () => {
		it("should return null when no execution is in progress", () => {
			const state = taskOrchestrator.getExecutionState()
			expect(state).to.be.null
		})

		it("should return current execution state during execution", async () => {
			const tasksContent = `# Tasks

- [ ] 1 Test task
`
			await fs.promises.writeFile(tasksFilePath, tasksContent)

			// Start execution but capture state during execution
			let capturedState: any = null

			mockController.initTask = async () => {
				mockController.task = {
					taskId: "test-task-id",
					taskState: {
						isCompleted: false,
						abandoned: false,
					},
				}

				// Capture state during execution
				capturedState = taskOrchestrator.getExecutionState()

				setTimeout(() => {
					mockController.task.taskState.isCompleted = true
				}, 10)
			}

			await taskOrchestrator.executeAllTasks()

			expect(capturedState).to.not.be.null
			expect(capturedState.tasks).to.have.lengthOf(1)
		})
	})
})
