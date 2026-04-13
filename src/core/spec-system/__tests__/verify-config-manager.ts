/**
 * Simple verification script for ConfigManager
 * Run with: npx tsx src/core/spec-system/__tests__/verify-config-manager.ts
 */

import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { ConfigManager } from "../ConfigManager"
import { SpecConfig } from "../types"

async function verify() {
	console.log("🧪 Verifying ConfigManager implementation...")

	const configManager = new ConfigManager()
	const testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "spec-verify-"))

	try {
		// Test 1: Generate spec ID
		console.log("\n✓ Test 1: Generate spec ID")
		const specId = configManager.generateSpecId()
		console.log(`  Generated ID: ${specId}`)
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(specId)) {
			throw new Error("Invalid UUID format")
		}
		console.log("  ✅ UUID format is valid")

		// Test 2: Create config
		console.log("\n✓ Test 2: Create config file")
		const config: SpecConfig = {
			specId: configManager.generateSpecId(),
			workflowType: "requirements-first",
			specType: "feature",
			createdAt: new Date().toISOString(),
		}
		await configManager.createConfig(testDir, config)
		const configPath = path.join(testDir, ".config.kiro")
		if (!fs.existsSync(configPath)) {
			throw new Error("Config file was not created")
		}
		console.log("  ✅ Config file created successfully")

		// Test 3: Load config
		console.log("\n✓ Test 3: Load config file")
		const loaded = await configManager.loadConfig(testDir)
		if (loaded.specId !== config.specId) {
			throw new Error("Loaded specId does not match")
		}
		if (loaded.workflowType !== config.workflowType) {
			throw new Error("Loaded workflowType does not match")
		}
		if (loaded.specType !== config.specType) {
			throw new Error("Loaded specType does not match")
		}
		console.log("  ✅ Config loaded successfully")
		console.log(`  Loaded config: ${JSON.stringify(loaded, null, 2)}`)

		// Test 4: Validate config
		console.log("\n✓ Test 4: Validate config")
		const isValid = configManager.validateConfig(loaded)
		if (!isValid) {
			throw new Error("Valid config failed validation")
		}
		console.log("  ✅ Config validation passed")

		// Test 5: Validate invalid config
		console.log("\n✓ Test 5: Validate invalid config")
		const invalidConfig = { specId: "123" }
		const isInvalid = configManager.validateConfig(invalidConfig)
		if (isInvalid) {
			throw new Error("Invalid config passed validation")
		}
		console.log("  ✅ Invalid config correctly rejected")

		// Test 6: Load non-existent config
		console.log("\n✓ Test 6: Load non-existent config")
		const nonExistentDir = path.join(testDir, "non-existent")
		try {
			await configManager.loadConfig(nonExistentDir)
			throw new Error("Should have thrown error for non-existent config")
		} catch (error) {
			if (error instanceof Error && error.message.includes("Config file not found")) {
				console.log("  ✅ Correctly threw error for non-existent config")
			} else {
				throw error
			}
		}

		console.log("\n🎉 All tests passed!")
		console.log("\n✅ ConfigManager implementation is working correctly")
	} catch (error) {
		console.error("\n❌ Test failed:", error)
		process.exit(1)
	} finally {
		// Cleanup
		await fs.promises.rm(testDir, { recursive: true, force: true })
	}
}

verify()
