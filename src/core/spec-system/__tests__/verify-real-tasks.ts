/**
 * Verification script to test TasksParser with real tasks.md file
 * Run with: npx tsx src/core/spec-system/__tests__/verify-real-tasks.ts
 */

import * as path from "path"
import { TasksParser } from "../TasksParser"

async function testRealTasksFile() {
	console.log("🧪 Testing TasksParser with real tasks.md file...\n")

	const parser = new TasksParser()
	const tasksFilePath = path.join(process.cwd(), ".kiro/specs/sdd-cline-spec-workflow/tasks.md")

	try {
		console.log(`Reading tasks file: ${tasksFilePath}`)
		const taskTree = await parser.parse(tasksFilePath)

		console.log("\n📊 Parse Results:")
		console.log(`- Root tasks: ${taskTree.tasks.length}`)

		const allTasks = taskTree.getAllTasks()
		console.log(`- Total tasks (including subtasks): ${allTasks.length}`)

		// Count tasks by status
		const statusCounts = {
			not_started: 0,
			in_progress: 0,
			completed: 0,
			failed: 0,
			queued: 0,
		}

		for (const task of allTasks) {
			statusCounts[task.status]++
		}

		console.log("\n📈 Task Status Distribution:")
		console.log(`- Not Started: ${statusCounts.not_started}`)
		console.log(`- In Progress: ${statusCounts.in_progress}`)
		console.log(`- Completed: ${statusCounts.completed}`)
		console.log(`- Failed: ${statusCounts.failed}`)
		console.log(`- Queued: ${statusCounts.queued}`)

		// Show first few tasks
		console.log("\n📝 First 5 Root Tasks:")
		for (let i = 0; i < Math.min(5, taskTree.tasks.length); i++) {
			const task = taskTree.tasks[i]
			console.log(
				`  ${i + 1}. [${task.status}] ${task.id} ${task.description.substring(0, 50)}${task.description.length > 50 ? "..." : ""}`,
			)
			if (task.subTasks.length > 0) {
				console.log(`     └─ ${task.subTasks.length} subtask(s)`)
			}
		}

		// Test finding specific task
		console.log("\n🔍 Testing findTask method:")
		const task41 = taskTree.findTask("4.1")
		if (task41) {
			console.log(`  Found task 4.1: "${task41.description}"`)
			console.log(`  Status: ${task41.status}`)
			console.log(`  Indent Level: ${task41.indentLevel}`)
			console.log(`  Parent ID: ${task41.parentId || "none (root task)"}`)
			console.log(`  Subtasks: ${task41.subTasks.length}`)
		} else {
			console.log("  ❌ Could not find task 4.1")
		}

		// Test round-trip
		console.log("\n🔄 Testing round-trip (parse → print → parse):")
		const printed = parser.prettyPrint(taskTree)
		const reparsed = parser.parseContent(printed)

		const allTasksOriginal = taskTree.getAllTasks()
		const allTasksReparsed = reparsed.getAllTasks()

		if (allTasksOriginal.length === allTasksReparsed.length) {
			console.log(`  ✅ Task count preserved: ${allTasksOriginal.length}`)

			let allMatch = true
			for (let i = 0; i < allTasksOriginal.length; i++) {
				if (
					allTasksOriginal[i].id !== allTasksReparsed[i].id ||
					allTasksOriginal[i].status !== allTasksReparsed[i].status ||
					allTasksOriginal[i].indentLevel !== allTasksReparsed[i].indentLevel
				) {
					allMatch = false
					console.log(`  ❌ Mismatch at task ${i}: ${allTasksOriginal[i].id}`)
					break
				}
			}

			if (allMatch) {
				console.log("  ✅ All task properties preserved through round-trip")
			}
		} else {
			console.log(`  ❌ Task count mismatch: ${allTasksOriginal.length} → ${allTasksReparsed.length}`)
		}

		console.log("\n✅ Successfully parsed and validated real tasks.md file!")
		process.exit(0)
	} catch (error) {
		console.error("\n❌ Error:", error.message)
		if (error.stack) {
			console.error("\nStack trace:")
			console.error(error.stack)
		}
		process.exit(1)
	}
}

// Run test
testRealTasksFile()
