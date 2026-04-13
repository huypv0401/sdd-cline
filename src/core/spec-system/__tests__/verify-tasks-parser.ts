/**
 * Verification script for TasksParser implementation
 * Run with: npx tsx src/core/spec-system/__tests__/verify-tasks-parser.ts
 */

import { TasksParser } from "../TasksParser"
import { TaskStatus } from "../types"

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`)
	}
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`)
	}
}

async function runTests() {
	console.log("🧪 Testing TasksParser implementation...\n")

	const parser = new TasksParser()
	let testsPassed = 0
	let testsFailed = 0

	// Test 1: Parse flat task list
	try {
		console.log("Test 1: Parse flat task list")
		const content = `# Implementation Plan

## Tasks

- [ ] 1 First task
- [ ] 2 Second task
- [ ] 3 Third task
`
		const taskTree = parser.parseContent(content)

		assertEqual(taskTree.tasks.length, 3, "Should have 3 root tasks")
		assertEqual(taskTree.tasks[0].id, "1", "First task ID should be 1")
		assertEqual(taskTree.tasks[0].description, "First task", "First task description")
		assertEqual(taskTree.tasks[0].status, TaskStatus.NOT_STARTED, "First task status")
		assertEqual(taskTree.tasks[0].indentLevel, 0, "First task indent level")
		assertEqual(taskTree.tasks[0].subTasks.length, 0, "First task should have no subtasks")

		console.log("✅ Test 1 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 1 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 2: Parse nested tasks
	try {
		console.log("Test 2: Parse nested tasks with hierarchy")
		const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
  - [ ] 1.2 Another child
- [ ] 2 Second parent
`
		const taskTree = parser.parseContent(content)

		assertEqual(taskTree.tasks.length, 2, "Should have 2 root tasks")
		assertEqual(taskTree.tasks[0].subTasks.length, 2, "First task should have 2 children")
		assertEqual(taskTree.tasks[0].subTasks[0].id, "1.1", "First child ID")
		assertEqual(taskTree.tasks[0].subTasks[0].parentId, "1", "First child parent ID")
		assertEqual(taskTree.tasks[0].subTasks[0].indentLevel, 1, "First child indent level")
		assertEqual(taskTree.tasks[0].subTasks[0].subTasks.length, 1, "First child should have 1 grandchild")
		assertEqual(taskTree.tasks[0].subTasks[0].subTasks[0].id, "1.1.1", "Grandchild ID")
		assertEqual(taskTree.tasks[0].subTasks[0].subTasks[0].parentId, "1.1", "Grandchild parent ID")

		console.log("✅ Test 2 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 2 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 3: Parse different status markers
	try {
		console.log("Test 3: Parse different status markers")
		const content = `- [ ] 1 Not started
- [~] 2 In progress
- [x] 3 Completed
- [-] 4 Failed
`
		const taskTree = parser.parseContent(content)

		assertEqual(taskTree.tasks[0].status, TaskStatus.NOT_STARTED, "NOT_STARTED status")
		assertEqual(taskTree.tasks[1].status, TaskStatus.IN_PROGRESS, "IN_PROGRESS status")
		assertEqual(taskTree.tasks[2].status, TaskStatus.COMPLETED, "COMPLETED status")
		assertEqual(taskTree.tasks[3].status, TaskStatus.FAILED, "FAILED status")

		console.log("✅ Test 3 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 3 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 4: Pretty print
	try {
		console.log("Test 4: Pretty print task tree")
		const content = `- [ ] 1 Parent task
  - [ ] 1.1 Child task
- [x] 2 Completed task
`
		const taskTree = parser.parseContent(content)
		const output = parser.prettyPrint(taskTree)

		assert(output.includes("# Implementation Plan"), "Should include header")
		assert(output.includes("## Tasks"), "Should include tasks section")
		assert(output.includes("- [ ] 1 Parent task"), "Should include parent task")
		assert(output.includes("  - [ ] 1.1 Child task"), "Should include indented child task")
		assert(output.includes("- [x] 2 Completed task"), "Should include completed task")

		console.log("✅ Test 4 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 4 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 5: Round-trip preservation
	try {
		console.log("Test 5: Round-trip preservation (parse → print → parse)")
		const content = `- [ ] 1 Setup project
  - [ ] 1.1 Create directory
  - [x] 1.2 Initialize config
- [~] 2 Implement features
  - [x] 2.1 Parser
  - [ ] 2.2 Pretty printer
`
		const taskTree1 = parser.parseContent(content)
		const printed = parser.prettyPrint(taskTree1)
		const taskTree2 = parser.parseContent(printed)

		const allTasks1 = taskTree1.getAllTasks()
		const allTasks2 = taskTree2.getAllTasks()

		assertEqual(allTasks2.length, allTasks1.length, "Should have same number of tasks")

		for (let i = 0; i < allTasks1.length; i++) {
			assertEqual(allTasks2[i].id, allTasks1[i].id, `Task ${i} ID should match`)
			assertEqual(allTasks2[i].description, allTasks1[i].description, `Task ${i} description should match`)
			assertEqual(allTasks2[i].status, allTasks1[i].status, `Task ${i} status should match`)
			assertEqual(allTasks2[i].indentLevel, allTasks1[i].indentLevel, `Task ${i} indent level should match`)
			assertEqual(allTasks2[i].parentId, allTasks1[i].parentId, `Task ${i} parent ID should match`)
		}

		console.log("✅ Test 5 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 5 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 6: TaskTree helper methods
	try {
		console.log("Test 6: TaskTree helper methods (getAllTasks, findTask)")
		const content = `- [ ] 1 Parent
  - [ ] 1.1 Child
    - [ ] 1.1.1 Grandchild
  - [ ] 1.2 Another child
- [ ] 2 Second parent
`
		const taskTree = parser.parseContent(content)

		// Test getAllTasks
		const allTasks = taskTree.getAllTasks()
		assertEqual(allTasks.length, 5, "Should have 5 tasks total")
		assertEqual(allTasks[0].id, "1", "First task in depth-first order")
		assertEqual(allTasks[1].id, "1.1", "Second task in depth-first order")
		assertEqual(allTasks[2].id, "1.1.1", "Third task in depth-first order")
		assertEqual(allTasks[3].id, "1.2", "Fourth task in depth-first order")
		assertEqual(allTasks[4].id, "2", "Fifth task in depth-first order")

		// Test findTask
		const task1 = taskTree.findTask("1")
		assert(task1 !== undefined, "Should find task 1")
		assertEqual(task1?.id, "1", "Found task should have correct ID")

		const task111 = taskTree.findTask("1.1.1")
		assert(task111 !== undefined, "Should find task 1.1.1")
		assertEqual(task111?.id, "1.1.1", "Found task should have correct ID")

		const taskNotFound = taskTree.findTask("999")
		assert(taskNotFound === undefined, "Should not find non-existent task")

		console.log("✅ Test 6 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 6 failed:", error.message, "\n")
		testsFailed++
	}

	// Test 7: Skip non-task lines
	try {
		console.log("Test 7: Skip non-task lines")
		const content = `# Implementation Plan

This is a description.

## Phase 1: Setup

Some text here.

- [ ] 1 First task

More text.

- [ ] 2 Second task
`
		const taskTree = parser.parseContent(content)

		assertEqual(taskTree.tasks.length, 2, "Should only parse task lines")
		assertEqual(taskTree.tasks[0].id, "1", "First task ID")
		assertEqual(taskTree.tasks[1].id, "2", "Second task ID")

		console.log("✅ Test 7 passed\n")
		testsPassed++
	} catch (error) {
		console.error("❌ Test 7 failed:", error.message, "\n")
		testsFailed++
	}

	// Summary
	console.log("\n" + "=".repeat(50))
	console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`)
	console.log("=".repeat(50))

	if (testsFailed === 0) {
		console.log("\n✅ All tests passed! TasksParser implementation is correct.")
		process.exit(0)
	} else {
		console.log("\n❌ Some tests failed. Please review the implementation.")
		process.exit(1)
	}
}

// Run tests
runTests().catch((error) => {
	console.error("Fatal error running tests:", error)
	process.exit(1)
})
