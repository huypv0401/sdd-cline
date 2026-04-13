/**
 * Unit tests for core spec system types
 */

import { expect } from "chai"
import { describe, it } from "mocha"
import { EARSPattern, Task, TaskStatus, TaskTree } from "../types"

describe("Spec System Types", () => {
	describe("TaskTree", () => {
		it("should create a task tree with tasks", () => {
			const tasks: Task[] = [
				{
					id: "1",
					description: "First task",
					status: TaskStatus.NOT_STARTED,
					indentLevel: 0,
					subTasks: [],
				},
			]

			const tree = new TaskTree(tasks)

			expect(tree.tasks).to.have.lengthOf(1)
			expect(tree.tasks[0].id).to.equal("1")
		})

		it("should get all tasks in depth-first order", () => {
			const tasks: Task[] = [
				{
					id: "1",
					description: "Parent task",
					status: TaskStatus.NOT_STARTED,
					indentLevel: 0,
					subTasks: [
						{
							id: "1.1",
							description: "Child task",
							status: TaskStatus.NOT_STARTED,
							indentLevel: 1,
							parentId: "1",
							subTasks: [],
						},
					],
				},
				{
					id: "2",
					description: "Second parent",
					status: TaskStatus.NOT_STARTED,
					indentLevel: 0,
					subTasks: [],
				},
			]

			const tree = new TaskTree(tasks)
			const allTasks = tree.getAllTasks()

			expect(allTasks).to.have.lengthOf(3)
			expect(allTasks[0].id).to.equal("1")
			expect(allTasks[1].id).to.equal("1.1")
			expect(allTasks[2].id).to.equal("2")
		})

		it("should find task by ID", () => {
			const tasks: Task[] = [
				{
					id: "1",
					description: "Parent task",
					status: TaskStatus.NOT_STARTED,
					indentLevel: 0,
					subTasks: [
						{
							id: "1.1",
							description: "Child task",
							status: TaskStatus.NOT_STARTED,
							indentLevel: 1,
							parentId: "1",
							subTasks: [],
						},
					],
				},
			]

			const tree = new TaskTree(tasks)
			const found = tree.findTask("1.1")

			expect(found).to.not.be.undefined
			expect(found?.id).to.equal("1.1")
			expect(found?.description).to.equal("Child task")
		})

		it("should return undefined for non-existent task ID", () => {
			const tasks: Task[] = [
				{
					id: "1",
					description: "Task",
					status: TaskStatus.NOT_STARTED,
					indentLevel: 0,
					subTasks: [],
				},
			]

			const tree = new TaskTree(tasks)
			const found = tree.findTask("999")

			expect(found).to.be.undefined
		})
	})

	describe("EARSPattern", () => {
		it("should have all expected pattern types", () => {
			expect(EARSPattern.UBIQUITOUS).to.equal("ubiquitous")
			expect(EARSPattern.EVENT_DRIVEN).to.equal("event-driven")
			expect(EARSPattern.STATE_DRIVEN).to.equal("state-driven")
			expect(EARSPattern.OPTIONAL).to.equal("optional")
			expect(EARSPattern.UNWANTED).to.equal("unwanted")
			expect(EARSPattern.COMPLEX).to.equal("complex")
		})
	})

	describe("TaskStatus", () => {
		it("should have all expected status values", () => {
			expect(TaskStatus.NOT_STARTED).to.equal("not_started")
			expect(TaskStatus.QUEUED).to.equal("queued")
			expect(TaskStatus.IN_PROGRESS).to.equal("in_progress")
			expect(TaskStatus.COMPLETED).to.equal("completed")
			expect(TaskStatus.FAILED).to.equal("failed")
		})
	})
})
