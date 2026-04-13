/**
 * Debug script to understand why parser isn't matching
 */

import * as fs from "fs"
import * as path from "path"

async function debug() {
	const tasksFilePath = path.join(process.cwd(), ".kiro/specs/sdd-cline-spec-workflow/tasks.md")

	const content = await fs.promises.readFile(tasksFilePath, "utf-8")
	const lines = content.split("\n")

	console.log("Testing regex patterns on actual file lines:\n")

	// Original pattern
	const pattern1 = /^(\s*)- \[(.)\]\*?\s+([\d.]+)\.?\s+(.+)$/
	// Alternative pattern
	const pattern2 = /^- \[(.)\] ([\d.]+)\.?\s+(.+)$/

	let matchCount1 = 0
	let matchCount2 = 0

	for (let i = 0; i < Math.min(100, lines.length); i++) {
		const line = lines[i]

		if (line.includes("- [")) {
			console.log(`\nLine ${i + 1}: "${line}"`)
			console.log(`  Length: ${line.length}`)
			console.log(`  Starts with: "${line.substring(0, 10)}"`)
			console.log(
				`  Char codes: ${Array.from(line.substring(0, 10))
					.map((c) => c.charCodeAt(0))
					.join(", ")}`,
			)

			const match1 = line.match(pattern1)
			const match2 = line.match(pattern2)

			if (match1) {
				console.log(`  ✅ Pattern 1 matched:`, match1.slice(1))
				matchCount1++
			} else {
				console.log(`  ❌ Pattern 1 did not match`)
			}

			if (match2) {
				console.log(`  ✅ Pattern 2 matched:`, match2.slice(1))
				matchCount2++
			} else {
				console.log(`  ❌ Pattern 2 did not match`)
			}
		}
	}

	console.log(`\n\nSummary:`)
	console.log(`Pattern 1 matches: ${matchCount1}`)
	console.log(`Pattern 2 matches: ${matchCount2}`)
}

debug()
