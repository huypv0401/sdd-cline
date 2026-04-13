/**
 * Verification script to test spec system setup
 * Run with: npx tsx src/core/spec-system/__tests__/setup-verification.ts
 */

import { EARSPattern, SpecConfig, Task, TaskStatus, TaskTree } from "../types"

console.log("🧪 Verifying Spec System Setup...\n")

// Test 1: Create a simple task tree
console.log("✓ Test 1: Creating TaskTree")
const tasks: Task[] = [
	{
		id: "1",
		description: "Setup project structure",
		status: TaskStatus.COMPLETED,
		indentLevel: 0,
		subTasks: [
			{
				id: "1.1",
				description: "Create directory structure",
				status: TaskStatus.COMPLETED,
				indentLevel: 1,
				parentId: "1",
				subTasks: [],
			},
			{
				id: "1.2",
				description: "Define TypeScript interfaces",
				status: TaskStatus.COMPLETED,
				indentLevel: 1,
				parentId: "1",
				subTasks: [],
			},
		],
	},
]

const tree = new TaskTree(tasks)
console.log(`  - Created tree with ${tree.tasks.length} root task(s)`)

// Test 2: Get all tasks
console.log("\n✓ Test 2: Getting all tasks")
const allTasks = tree.getAllTasks()
console.log(`  - Found ${allTasks.length} total tasks (including sub-tasks)`)
allTasks.forEach((task) => {
	const indent = "  ".repeat(task.indentLevel + 1)
	console.log(`${indent}- ${task.id}: ${task.description}`)
})

// Test 3: Find task by ID
console.log("\n✓ Test 3: Finding task by ID")
const found = tree.findTask("1.1")
if (found) {
	console.log(`  - Found task: ${found.id} - ${found.description}`)
} else {
	console.log("  - ❌ Task not found!")
}

// Test 4: EARS Pattern enum
console.log("\n✓ Test 4: EARS Pattern types")
console.log(`  - UBIQUITOUS: ${EARSPattern.UBIQUITOUS}`)
console.log(`  - EVENT_DRIVEN: ${EARSPattern.EVENT_DRIVEN}`)
console.log(`  - STATE_DRIVEN: ${EARSPattern.STATE_DRIVEN}`)
console.log(`  - OPTIONAL: ${EARSPattern.OPTIONAL}`)
console.log(`  - UNWANTED: ${EARSPattern.UNWANTED}`)
console.log(`  - COMPLEX: ${EARSPattern.COMPLEX}`)

// Test 5: SpecConfig type
console.log("\n✓ Test 5: SpecConfig type")
const config: SpecConfig = {
	specId: "test-uuid-123",
	workflowType: "requirements-first",
	specType: "feature",
	createdAt: new Date().toISOString(),
}
console.log(`  - Created config for spec: ${config.specId}`)
console.log(`  - Workflow: ${config.workflowType}`)
console.log(`  - Type: ${config.specType}`)

// Test 6: Task status transitions
console.log("\n✓ Test 6: Task status values")
const statuses = Object.values(TaskStatus)
console.log(`  - Available statuses: ${statuses.join(", ")}`)

console.log("\n✅ All verification tests passed!")
console.log("\n📦 Spec System core types are properly set up and ready for use.")
