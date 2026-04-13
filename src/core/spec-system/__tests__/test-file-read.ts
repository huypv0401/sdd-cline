/**
 * Test file reading
 */

import * as fs from "fs"
import * as path from "path"

async function test() {
	const tasksFilePath = path.join(process.cwd(), ".kiro/specs/sdd-cline-spec-workflow/tasks.md")

	const content = await fs.promises.readFile(tasksFilePath, "utf-8")
	const lines = content.split("\n")

	console.log(`Total lines: ${lines.length}`)
	console.log(`\nFirst 20 lines that contain "- [":\n`)

	const pattern = /^(\s*)- \[(.)\]\*?\s+([\d.]+)\.?\s+(.+)$/

	let count = 0
	for (let i = 0; i < lines.length && count < 20; i++) {
		const line = lines[i]
		if (line.includes("- [")) {
			count++
			console.log(`Line ${i + 1}: "${line}"`)
			console.log(`  Trimmed: "${line.trim()}"`)
			console.log(`  Match on original: ${pattern.test(line)}`)
			console.log(`  Match on trimmed: ${pattern.test(line.trim())}`)

			const match = line.trim().match(pattern)
			if (match) {
				console.log(`  Task ID: "${match[3]}"`)
			}
			console.log()
		}
	}
}

test()
