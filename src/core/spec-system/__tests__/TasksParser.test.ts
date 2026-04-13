/**
 * Unit tests for TasksParser
 */

import { expect } from "chai"
import { beforeEach, describe, it } from "mocha"
import { TasksParser } from "../TasksParser"
import { TaskStatus } from "../types"

describe("TasksParser", () => {
	let parser: TasksParser

	beforeEach(() => {
		parser = new TasksParser()
	})

	describe("parseContent", () => {
		it("should parse a flat task list", () => {
			const content = `# Implementation Plan

## Tasks

- [ ] 1 First task
- [ ] 2 Second task
- [ ] 3 Third task
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks).to.have.lengthOf(3)
			expect(taskTree.tasks[0].id).to.equal("1")
			expect(taskTree.tasks[0].description).to.equal("First task")
			expect(taskTree.tasks[0].status).to.equal(TaskStatus.NOT_STARTED)
			expect(taskTree.tasks[0].indentLevel).to.equal(0)
			expect(taskTree.tasks[0].subTasks).to.have.lengthOf(0)
		})

		it("should parse nested tasks with correct hierarchy", () => {
			const content = `# Implementation Plan

## Tasks

- [ ] 1 Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
  - [ ] 1.2 Another child
- [ ] 2 Second parent
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks).to.have.lengthOf(2)

			// Check parent task
			expect(taskTree.tasks[0].id).to.equal("1")
			expect(taskTree.tasks[0].subTasks).to.have.lengthOf(2)

			// Check first child
			expect(taskTree.tasks[0].subTasks[0].id).to.equal("1.1")
			expect(taskTree.tasks[0].subTasks[0].parentId).to.equal("1")
			expect(taskTree.tasks[0].subTasks[0].indentLevel).to.equal(1)
			expect(taskTree.tasks[0].subTasks[0].subTasks).to.have.lengthOf(1)

			// Check grandchild
			expect(taskTree.tasks[0].subTasks[0].subTasks[0].id).to.equal("1.1.1")
			expect(taskTree.tasks[0].subTasks[0].subTasks[0].parentId).to.equal("1.1")
			expect(taskTree.tasks[0].subTasks[0].subTasks[0].indentLevel).to.equal(2)

			// Check second child
			expect(taskTree.tasks[0].subTasks[1].id).to.equal("1.2")
			expect(taskTree.tasks[0].subTasks[1].parentId).to.equal("1")
		})

		it("should parse NOT_STARTED status", () => {
			const content = `- [ ] 1 Task with not started status`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].status).to.equal(TaskStatus.NOT_STARTED)
		})

		it("should parse IN_PROGRESS status", () => {
			const content = `- [~] 1 Task with in progress status`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].status).to.equal(TaskStatus.IN_PROGRESS)
		})

		it("should parse COMPLETED status", () => {
			const content = `- [x] 1 Task with completed status`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].status).to.equal(TaskStatus.COMPLETED)
		})

		it("should parse FAILED status", () => {
			const content = `- [-] 1 Task with failed status`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].status).to.equal(TaskStatus.FAILED)
		})

		it("should handle mixed status markers", () => {
			const content = `
- [ ] 1 Not started
- [~] 2 In progress
- [x] 3 Completed
- [-] 4 Failed
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].status).to.equal(TaskStatus.NOT_STARTED)
			expect(taskTree.tasks[1].status).to.equal(TaskStatus.IN_PROGRESS)
			expect(taskTree.tasks[2].status).to.equal(TaskStatus.COMPLETED)
			expect(taskTree.tasks[3].status).to.equal(TaskStatus.FAILED)
		})

		it("should skip non-task lines", () => {
			const content = `# Implementation Plan

This is a description paragraph.

## Phase 1: Setup

Some text here.

- [ ] 1 First task

More text.

- [ ] 2 Second task
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks).to.have.lengthOf(2)
			expect(taskTree.tasks[0].id).to.equal("1")
			expect(taskTree.tasks[1].id).to.equal("2")
		})

		it("should handle empty content", () => {
			const content = `# Implementation Plan

## Tasks
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks).to.have.lengthOf(0)
		})

		it("should handle task descriptions with special characters", () => {
			const content = `- [ ] 1 Task with "quotes" and 'apostrophes'
- [ ] 2 Task with (parentheses) and [brackets]
- [ ] 3 Task with symbols: @#$%^&*
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].description).to.equal("Task with \"quotes\" and 'apostrophes'")
			expect(taskTree.tasks[1].description).to.equal("Task with (parentheses) and [brackets]")
			expect(taskTree.tasks[2].description).to.equal("Task with symbols: @#$%^&*")
		})

		it("should handle complex task IDs", () => {
			const content = `
- [ ] 1 Task one
  - [ ] 1.1 Task one point one
    - [ ] 1.1.1 Task one point one point one
    - [ ] 1.1.2 Task one point one point two
  - [ ] 1.2 Task one point two
- [ ] 2 Task two
  - [ ] 2.1 Task two point one
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].id).to.equal("1")
			expect(taskTree.tasks[0].subTasks[0].id).to.equal("1.1")
			expect(taskTree.tasks[0].subTasks[0].subTasks[0].id).to.equal("1.1.1")
			expect(taskTree.tasks[0].subTasks[0].subTasks[1].id).to.equal("1.1.2")
			expect(taskTree.tasks[0].subTasks[1].id).to.equal("1.2")
			expect(taskTree.tasks[1].id).to.equal("2")
			expect(taskTree.tasks[1].subTasks[0].id).to.equal("2.1")
		})

		it("should throw error for invalid indentation", () => {
			const content = `- [ ] 1 Parent task
 - [ ] 1.1 Child with odd indentation
`

			expect(() => parser.parseContent(content)).to.throw(/Invalid indentation/)
		})
	})

	describe("prettyPrint", () => {
		it("should format flat task list back to markdown", () => {
			const content = `- [ ] 1 First task
- [ ] 2 Second task
`

			const taskTree = parser.parseContent(content)
			const output = parser.prettyPrint(taskTree)

			expect(output).to.include("# Implementation Plan")
			expect(output).to.include("## Tasks")
			expect(output).to.include("- [ ] 1 First task")
			expect(output).to.include("- [ ] 2 Second task")
		})

		it("should format nested tasks with correct indentation", () => {
			const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
`

			const taskTree = parser.parseContent(content)
			const output = parser.prettyPrint(taskTree)

			expect(output).to.include("- [ ] 1 Parent task")
			expect(output).to.include("  - [ ] 1.1 Child task")
			expect(output).to.include("    - [ ] 1.1.1 Grandchild task")
		})

		it("should preserve status markers", () => {
			const content = `- [ ] 1 Not started
- [~] 2 In progress
- [x] 3 Completed
- [-] 4 Failed
`

			const taskTree = parser.parseContent(content)
			const output = parser.prettyPrint(taskTree)

			expect(output).to.include("- [ ] 1 Not started")
			expect(output).to.include("- [~] 2 In progress")
			expect(output).to.include("- [x] 3 Completed")
			expect(output).to.include("- [-] 4 Failed")
		})

		it("should handle empty task tree", () => {
			const content = ``

			const taskTree = parser.parseContent(content)
			const output = parser.prettyPrint(taskTree)

			expect(output).to.include("# Implementation Plan")
			expect(output).to.include("## Tasks")
		})
	})

	describe("TaskTree helper methods", () => {
		it("getAllTasks should return tasks in depth-first order", () => {
			const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
  - [ ] 1.2 Another child
- [ ] 2 Second parent
`

			const taskTree = parser.parseContent(content)
			const allTasks = taskTree.getAllTasks()

			expect(allTasks).to.have.lengthOf(5)
			expect(allTasks[0].id).to.equal("1")
			expect(allTasks[1].id).to.equal("1.1")
			expect(allTasks[2].id).to.equal("1.1.1")
			expect(allTasks[3].id).to.equal("1.2")
			expect(allTasks[4].id).to.equal("2")
		})

		it("findTask should locate task by ID", () => {
			const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
  - [ ] 1.2 Another child
- [ ] 2 Second parent
`

			const taskTree = parser.parseContent(content)

			const task1 = taskTree.findTask("1")
			expect(task1).to.not.be.undefined
			expect(task1?.id).to.equal("1")

			const task111 = taskTree.findTask("1.1.1")
			expect(task111).to.not.be.undefined
			expect(task111?.id).to.equal("1.1.1")

			const task2 = taskTree.findTask("2")
			expect(task2).to.not.be.undefined
			expect(task2?.id).to.equal("2")
		})

		it("findTask should return undefined for non-existent task", () => {
			const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
`

			const taskTree = parser.parseContent(content)

			const task = taskTree.findTask("999")
			expect(task).to.be.undefined
		})
	})

	describe("round-trip preservation", () => {
		it("should preserve task structure through parse-print-parse cycle", () => {
			const content = `- [ ] 1 Setup project structure
  - [ ] 1.1 Create directory structure
  - [ ] 1.2 Initialize configuration
- [~] 2 Implement core features
  - [x] 2.1 Implement parser
    - [x] 2.1.1 Write unit tests
    - [x] 2.1.2 Implement parsing logic
  - [ ] 2.2 Implement pretty printer
- [ ] 3 Write tests
  - [ ] 3.1 Unit tests
  - [ ] 3.2 Integration tests
`

			const taskTree1 = parser.parseContent(content)
			const printed = parser.prettyPrint(taskTree1)
			const taskTree2 = parser.parseContent(printed)

			// Compare structure
			expect(taskTree2.tasks).to.have.lengthOf(taskTree1.tasks.length)

			const allTasks1 = taskTree1.getAllTasks()
			const allTasks2 = taskTree2.getAllTasks()

			expect(allTasks2).to.have.lengthOf(allTasks1.length)

			for (let i = 0; i < allTasks1.length; i++) {
				expect(allTasks2[i].id).to.equal(allTasks1[i].id)
				expect(allTasks2[i].description).to.equal(allTasks1[i].description)
				expect(allTasks2[i].status).to.equal(allTasks1[i].status)
				expect(allTasks2[i].indentLevel).to.equal(allTasks1[i].indentLevel)
				expect(allTasks2[i].parentId).to.equal(allTasks1[i].parentId)
			}
		})
	})

	describe("PBT status tracking", () => {
		it("should parse PBT status metadata", () => {
			const content = `- [ ] 1 Write property test
  _PBT: status=passed_
- [ ] 2 Another test
  _PBT: status=failed, failingExample="counterexample: x=5"_
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].pbtStatus).to.not.be.undefined
			expect(taskTree.tasks[0].pbtStatus?.status).to.equal("passed")
			expect(taskTree.tasks[0].pbtStatus?.failingExample).to.be.undefined

			expect(taskTree.tasks[1].pbtStatus).to.not.be.undefined
			expect(taskTree.tasks[1].pbtStatus?.status).to.equal("failed")
			expect(taskTree.tasks[1].pbtStatus?.failingExample).to.equal("counterexample: x=5")
		})

		it("should parse all PBT status types", () => {
			const content = `- [ ] 1 Test passed
  _PBT: status=passed_
- [ ] 2 Test failed
  _PBT: status=failed_
- [ ] 3 Test not run
  _PBT: status=not_run_
- [ ] 4 Test unexpected pass
  _PBT: status=unexpected_pass_
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].pbtStatus?.status).to.equal("passed")
			expect(taskTree.tasks[1].pbtStatus?.status).to.equal("failed")
			expect(taskTree.tasks[2].pbtStatus?.status).to.equal("not_run")
			expect(taskTree.tasks[3].pbtStatus?.status).to.equal("unexpected_pass")
		})

		it("should handle PBT status with nested tasks", () => {
			const content = `- [ ] 1 Parent task
  _PBT: status=passed_
  - [ ] 1.1 Child task
    _PBT: status=failed, failingExample="error"_
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].pbtStatus?.status).to.equal("passed")
			expect(taskTree.tasks[0].subTasks[0].pbtStatus?.status).to.equal("failed")
			expect(taskTree.tasks[0].subTasks[0].pbtStatus?.failingExample).to.equal("error")
		})

		it("should pretty print PBT status metadata", () => {
			const content = `- [ ] 1 Write property test
  _PBT: status=passed_
- [ ] 2 Another test
  _PBT: status=failed, failingExample="counterexample: x=5"_
`

			const taskTree = parser.parseContent(content)
			const output = parser.prettyPrint(taskTree)

			expect(output).to.include("- [ ] 1 Write property test")
			expect(output).to.include("  _PBT: status=passed_")
			expect(output).to.include("- [ ] 2 Another test")
			expect(output).to.include('  _PBT: status=failed, failingExample="counterexample: x=5"_')
		})

		it("should preserve PBT status through round-trip", () => {
			const content = `- [ ] 1 Write property test
  _PBT: status=passed_
- [ ] 2 Another test
  _PBT: status=failed, failingExample="counterexample: x=5"_
- [ ] 3 Nested test
  - [ ] 3.1 Sub-test
    _PBT: status=unexpected_pass_
`

			const taskTree1 = parser.parseContent(content)
			const printed = parser.prettyPrint(taskTree1)
			const taskTree2 = parser.parseContent(printed)

			const allTasks1 = taskTree1.getAllTasks()
			const allTasks2 = taskTree2.getAllTasks()

			expect(allTasks2).to.have.lengthOf(allTasks1.length)

			for (let i = 0; i < allTasks1.length; i++) {
				if (allTasks1[i].pbtStatus) {
					expect(allTasks2[i].pbtStatus).to.not.be.undefined
					expect(allTasks2[i].pbtStatus?.status).to.equal(allTasks1[i].pbtStatus?.status)
					expect(allTasks2[i].pbtStatus?.failingExample).to.equal(allTasks1[i].pbtStatus?.failingExample)
				} else {
					expect(allTasks2[i].pbtStatus).to.be.undefined
				}
			}
		})

		it("should handle escaped quotes in failing examples", () => {
			const content = `- [ ] 1 Test with quotes
  _PBT: status=failed, failingExample="error: \\"quoted text\\""_
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].pbtStatus?.failingExample).to.equal('error: "quoted text"')
		})

		it("should handle tasks without PBT status", () => {
			const content = `- [ ] 1 Regular task without PBT
- [ ] 2 Task with PBT
  _PBT: status=passed_
- [ ] 3 Another regular task
`

			const taskTree = parser.parseContent(content)

			expect(taskTree.tasks[0].pbtStatus).to.be.undefined
			expect(taskTree.tasks[1].pbtStatus).to.not.be.undefined
			expect(taskTree.tasks[2].pbtStatus).to.be.undefined
		})
	})
})
