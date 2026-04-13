/**
 * Simple regex test
 */

const testLines = [
	"- [x] 1. Setup project structure and core types",
	"  - [x] 2.1 Implement config file creation and loading",
	"  - [ ]* 2.4 Write unit tests for ConfigManager",
	"- [ ] 4. Implement TasksParser",
	"  - [-] 4.1 Implement tasks document parsing",
]

const pattern = /^(\s*)- \[(.)\]\*?\s+([\d.]+)\.?\s+(.+)$/

console.log("Testing regex pattern:\n")

for (const line of testLines) {
	console.log(`Line: "${line}"`)
	const match = line.match(pattern)
	if (match) {
		console.log(`  ✅ Matched:`)
		console.log(`    Indent: "${match[1]}" (${match[1].length} chars)`)
		console.log(`    Status: "${match[2]}"`)
		console.log(`    Task ID: "${match[3]}"`)
		console.log(`    Description: "${match[4]}"`)
	} else {
		console.log(`  ❌ No match`)
	}
	console.log()
}
