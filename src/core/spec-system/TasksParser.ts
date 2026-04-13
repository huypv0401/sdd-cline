/**
 * TasksParser - Parses tasks documents into structured task trees
 *
 * This parser extracts tasks from markdown files, building hierarchical
 * task structures with IDs, descriptions, status markers, and parent-child relationships.
 */

import * as fs from "fs"
import { ParsingError, Task, TaskStatus, TaskTree } from "./types"

export class TasksParser {
	/**
	 * Parse tasks document into task tree
	 *
	 * @param filePath - Path to the tasks.md file
	 * @returns TaskTree with hierarchical task structure
	 * @throws ParsingError if the document format is invalid
	 */
	async parse(filePath: string): Promise<TaskTree> {
		const content = await fs.promises.readFile(filePath, "utf-8")
		return this.parseContent(content)
	}

	/**
	 * Parse tasks content into task tree
	 *
	 * @param content - The markdown content of the tasks document
	 * @returns TaskTree with hierarchical task structure
	 * @throws ParsingError if the document format is invalid
	 */
	parseContent(content: string): TaskTree {
		// Normalize line endings and split
		const lines = content.replace(/\r\n/g, "\n").split("\n")
		const rootTasks: Task[] = []
		const taskStack: Task[] = []
		let lineNumber = 0

		for (const line of lines) {
			lineNumber++

			// Match task line: - [status] taskId description
			// Pattern: optional whitespace, dash, space, [status char], optional *, space, task ID (with optional period), space, description
			// Supports formats: "- [ ] 1 Task", "- [ ] 1. Task", "- [ ]* 1.1 Task"
			const match = line.match(/^(\s*)- \[(.)\]\*?\s+([\d.]+)\.?\s+(.+)$/)
			if (!match) {
				// Skip non-task lines (headers, empty lines, etc.)
				continue
			}

			const [, indent, statusChar, rawTaskId, description] = match
			const indentLevel = indent.length / 2 // Assuming 2 spaces per level

			// Remove trailing period from task ID if present
			const taskId = rawTaskId.endsWith(".") ? rawTaskId.slice(0, -1) : rawTaskId

			// Validate indent level is a whole number
			if (indent.length % 2 !== 0) {
				throw new ParsingError(
					`Invalid indentation at line ${lineNumber}. Indentation must be multiples of 2 spaces.`,
					lineNumber,
				)
			}

			const task: Task = {
				id: taskId,
				description: description.trim(),
				status: this.parseStatus(statusChar),
				indentLevel,
				subTasks: [],
			}

			// Determine parent based on indent level
			// Pop tasks from stack until we find the correct parent level
			while (taskStack.length > 0 && taskStack[taskStack.length - 1].indentLevel >= indentLevel) {
				taskStack.pop()
			}

			if (taskStack.length > 0) {
				// This is a sub-task
				const parent = taskStack[taskStack.length - 1]
				task.parentId = parent.id
				parent.subTasks.push(task)
			} else {
				// This is a root-level task
				rootTasks.push(task)
			}

			taskStack.push(task)
		}

		return new TaskTree(rootTasks)
	}

	/**
	 * Pretty print task tree back to markdown
	 *
	 * @param taskTree - TaskTree to format
	 * @returns Formatted markdown string
	 */
	prettyPrint(taskTree: TaskTree): string {
		let output = "# Implementation Plan\n\n"
		output += "## Overview\n\n"
		output += "[Implementation plan overview]\n\n"
		output += "## Tasks\n\n"

		const printTask = (task: Task, indent = 0): void => {
			const indentStr = "  ".repeat(indent)
			const statusChar = this.formatStatus(task.status)
			output += `${indentStr}- [${statusChar}] ${task.id} ${task.description}\n`

			for (const subTask of task.subTasks) {
				printTask(subTask, indent + 1)
			}
		}

		for (const task of taskTree.tasks) {
			printTask(task)
		}

		return output
	}

	/**
	 * Parse status character to TaskStatus enum
	 *
	 * @param char - Status character from markdown
	 * @returns TaskStatus enum value
	 */
	private parseStatus(char: string): TaskStatus {
		switch (char) {
			case " ":
				return TaskStatus.NOT_STARTED
			case "~":
				return TaskStatus.IN_PROGRESS
			case "x":
				return TaskStatus.COMPLETED
			case "-":
				return TaskStatus.FAILED
			default:
				return TaskStatus.NOT_STARTED
		}
	}

	/**
	 * Format TaskStatus enum to status character
	 *
	 * @param status - TaskStatus enum value
	 * @returns Status character for markdown
	 */
	private formatStatus(status: TaskStatus): string {
		switch (status) {
			case TaskStatus.NOT_STARTED:
				return " "
			case TaskStatus.QUEUED:
				return "~"
			case TaskStatus.IN_PROGRESS:
				return "~"
			case TaskStatus.COMPLETED:
				return "x"
			case TaskStatus.FAILED:
				return "-"
		}
	}
}
