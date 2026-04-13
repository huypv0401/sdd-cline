/**
 * Property-based tests for core spec system types
 *
 * These tests use fast-check to verify properties hold across
 * many randomly generated inputs.
 */

import { expect } from "chai"
import * as fc from "fast-check"
import { describe, it } from "mocha"
import { Task, TaskStatus, TaskTree } from "../types"

describe("Spec System Property Tests", () => {
	describe("TaskTree Properties", () => {
		/**
		 * Property: Finding a task by ID should always return the same task
		 * if it exists in the tree
		 */
		it("should consistently find tasks by ID", () => {
			fc.assert(
				fc.property(taskTreeArbitrary(), (tree) => {
					const allTasks = tree.getAllTasks()

					// For each task in the tree, finding it by ID should return the same task
					for (const task of allTasks) {
						const found = tree.findTask(task.id)
						expect(found).to.not.be.undefined
						expect(found?.id).to.equal(task.id)
						expect(found?.description).to.equal(task.description)
					}
				}),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: getAllTasks should return all tasks including nested ones
		 */
		it("should return all tasks including nested sub-tasks", () => {
			fc.assert(
				fc.property(taskTreeArbitrary(), (tree) => {
					const allTasks = tree.getAllTasks()

					// Count tasks manually
					const countTasks = (tasks: Task[]): number => {
						let count = 0
						for (const task of tasks) {
							count += 1 + countTasks(task.subTasks)
						}
						return count
					}

					const expectedCount = countTasks(tree.tasks)
					expect(allTasks).to.have.lengthOf(expectedCount)
				}),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: Task IDs should be unique within a tree
		 */
		it("should have unique task IDs", () => {
			fc.assert(
				fc.property(taskTreeArbitrary(), (tree) => {
					const allTasks = tree.getAllTasks()
					const ids = allTasks.map((t) => t.id)
					const uniqueIds = new Set(ids)

					expect(uniqueIds.size).to.equal(ids.length)
				}),
				{ numRuns: 100 },
			)
		})
	})
})

// ============================================================================
// Arbitraries (Generators) for Property Tests
// ============================================================================

/**
 * Generate arbitrary task IDs (e.g., "1", "1.1", "1.1.1")
 */
function taskIdArbitrary(depth = 0): fc.Arbitrary<string> {
	if (depth === 0) {
		return fc.integer({ min: 1, max: 10 }).map((n) => n.toString())
	}
	return fc.tuple(taskIdArbitrary(depth - 1), fc.integer({ min: 1, max: 5 })).map(([parentId, n]) => `${parentId}.${n}`)
}

/**
 * Generate arbitrary tasks with optional sub-tasks
 */
function taskArbitrary(depth = 0, maxDepth = 3): fc.Arbitrary<Task> {
	const baseTask = fc.record({
		id: taskIdArbitrary(depth),
		description: fc.string({ minLength: 5, maxLength: 50 }),
		status: fc.constantFrom(...Object.values(TaskStatus)),
		indentLevel: fc.constant(depth),
		subTasks: fc.constant([] as Task[]),
	})

	if (depth >= maxDepth) {
		return baseTask
	}

	return baseTask.chain((task) => {
		return fc.array(taskArbitrary(depth + 1, maxDepth), { maxLength: 2 }).map((subTasks) => {
			// Set parent IDs for sub-tasks
			for (const subTask of subTasks) {
				subTask.parentId = task.id
			}
			return { ...task, subTasks }
		})
	})
}

/**
 * Generate arbitrary task trees
 */
function taskTreeArbitrary(): fc.Arbitrary<TaskTree> {
	return fc.array(taskArbitrary(0, 2), { minLength: 1, maxLength: 5 }).map((tasks) => {
		// Ensure unique IDs by prefixing with index
		tasks.forEach((task, i) => {
			task.id = `${i + 1}`
			// Update sub-task IDs recursively
			const updateSubTaskIds = (parentTask: Task, prefix: string) => {
				parentTask.subTasks.forEach((subTask, j) => {
					subTask.id = `${prefix}.${j + 1}`
					subTask.parentId = parentTask.id
					updateSubTaskIds(subTask, subTask.id)
				})
			}
			updateSubTaskIds(task, task.id)
		})
		return new TaskTree(tasks)
	})
}
