/**
 * Unit tests for ConfigManager
 */

import { expect } from "chai"
import * as fs from "fs"
import { afterEach, beforeEach, describe, it } from "mocha"
import * as os from "os"
import * as path from "path"
import { ConfigManager } from "../ConfigManager"
import { SpecConfig } from "../types"

describe("ConfigManager", () => {
	let configManager: ConfigManager
	let testDir: string

	beforeEach(async () => {
		configManager = new ConfigManager()
		// Create a temporary directory for tests
		testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "spec-test-"))
	})

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.promises.rm(testDir, { recursive: true, force: true })
		} catch (error) {
			// Ignore cleanup errors
		}
	})

	describe("generateSpecId", () => {
		it("should generate a valid UUID", () => {
			const specId = configManager.generateSpecId()

			expect(specId).to.be.a("string")
			expect(specId).to.have.lengthOf(36)
			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			expect(specId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
		})

		it("should generate unique IDs", () => {
			const id1 = configManager.generateSpecId()
			const id2 = configManager.generateSpecId()

			expect(id1).to.not.equal(id2)
		})
	})

	describe("createConfig", () => {
		it("should create a config file with valid data", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			const configPath = path.join(testDir, ".config.kiro")
			const exists = fs.existsSync(configPath)
			expect(exists).to.be.true

			const content = await fs.promises.readFile(configPath, "utf-8")
			const parsed = JSON.parse(content)
			expect(parsed.specId).to.equal(config.specId)
			expect(parsed.workflowType).to.equal("requirements-first")
			expect(parsed.specType).to.equal("feature")
		})

		it("should format JSON with proper indentation", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "design-first",
				specType: "bugfix",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			const configPath = path.join(testDir, ".config.kiro")
			const content = await fs.promises.readFile(configPath, "utf-8")

			// Check that JSON is formatted with 2-space indentation
			expect(content).to.include("\n  ")
		})

		it("should throw error if directory does not exist", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			const nonExistentDir = path.join(testDir, "non-existent")

			try {
				await configManager.createConfig(nonExistentDir, config)
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Failed to create config file")
			}
		})
	})

	describe("loadConfig", () => {
		it("should load a valid config file", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)
			const loaded = await configManager.loadConfig(testDir)

			expect(loaded.specId).to.equal(config.specId)
			expect(loaded.workflowType).to.equal(config.workflowType)
			expect(loaded.specType).to.equal(config.specType)
			expect(loaded.createdAt).to.equal(config.createdAt)
		})

		it("should load config with lastModified field", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "design-first",
				specType: "refactor",
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)
			const loaded = await configManager.loadConfig(testDir)

			expect(loaded.lastModified).to.equal(config.lastModified)
		})

		it("should throw error if config file does not exist", async () => {
			try {
				await configManager.loadConfig(testDir)
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Config file not found")
			}
		})

		it("should throw error if config file has invalid JSON", async () => {
			const configPath = path.join(testDir, ".config.kiro")
			await fs.promises.writeFile(configPath, "invalid json {", "utf-8")

			try {
				await configManager.loadConfig(testDir)
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Failed to load config")
			}
		})

		it("should throw error if config has invalid format", async () => {
			const invalidConfig = {
				specId: "123",
				// Missing required fields
			}

			const configPath = path.join(testDir, ".config.kiro")
			await fs.promises.writeFile(configPath, JSON.stringify(invalidConfig), "utf-8")

			try {
				await configManager.loadConfig(testDir)
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Invalid config format")
			}
		})

		it("should recreate config with defaults when missing and recreateIfInvalid is true", async () => {
			const loaded = await configManager.loadConfig(testDir, true)

			expect(loaded.specId).to.be.a("string")
			expect(loaded.specId).to.have.lengthOf(36)
			expect(loaded.workflowType).to.equal("requirements-first")
			expect(loaded.specType).to.equal("feature")
			expect(loaded.createdAt).to.be.a("string")

			// Verify file was created
			const configPath = path.join(testDir, ".config.kiro")
			const exists = fs.existsSync(configPath)
			expect(exists).to.be.true
		})

		it("should recreate config with defaults when invalid and recreateIfInvalid is true", async () => {
			const invalidConfig = {
				specId: "123",
				// Missing required fields
			}

			const configPath = path.join(testDir, ".config.kiro")
			await fs.promises.writeFile(configPath, JSON.stringify(invalidConfig), "utf-8")

			const loaded = await configManager.loadConfig(testDir, true)

			expect(loaded.specId).to.be.a("string")
			expect(loaded.specId).to.have.lengthOf(36)
			expect(loaded.workflowType).to.equal("requirements-first")
			expect(loaded.specType).to.equal("feature")
			expect(loaded.createdAt).to.be.a("string")
		})

		it("should recreate config with defaults when JSON is invalid and recreateIfInvalid is true", async () => {
			const configPath = path.join(testDir, ".config.kiro")
			await fs.promises.writeFile(configPath, "invalid json {", "utf-8")

			const loaded = await configManager.loadConfig(testDir, true)

			expect(loaded.specId).to.be.a("string")
			expect(loaded.specId).to.have.lengthOf(36)
			expect(loaded.workflowType).to.equal("requirements-first")
			expect(loaded.specType).to.equal("feature")
			expect(loaded.createdAt).to.be.a("string")
		})
	})

	describe("updateConfig", () => {
		it("should update existing config with new values", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			// Update config
			await configManager.updateConfig(testDir, {
				specType: "bugfix",
			})

			const loaded = await configManager.loadConfig(testDir)

			expect(loaded.specId).to.equal(config.specId)
			expect(loaded.workflowType).to.equal("requirements-first")
			expect(loaded.specType).to.equal("bugfix")
			expect(loaded.createdAt).to.equal(config.createdAt)
			expect(loaded.lastModified).to.be.a("string")
		})

		it("should set lastModified timestamp on update", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			const beforeUpdate = Date.now()
			await configManager.updateConfig(testDir, {
				specType: "refactor",
			})
			const afterUpdate = Date.now()

			const loaded = await configManager.loadConfig(testDir)

			expect(loaded.lastModified).to.be.a("string")
			const lastModifiedTime = new Date(loaded.lastModified!).getTime()
			expect(lastModifiedTime).to.be.at.least(beforeUpdate)
			expect(lastModifiedTime).to.be.at.most(afterUpdate)
		})

		it("should throw error if config does not exist", async () => {
			try {
				await configManager.updateConfig(testDir, {
					specType: "bugfix",
				})
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Config file not found")
			}
		})

		it("should throw error if update would make config invalid", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			try {
				await configManager.updateConfig(testDir, {
					workflowType: "invalid-workflow" as any,
				})
				expect.fail("Should have thrown an error")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
				expect((error as Error).message).to.include("Updated config would be invalid")
			}
		})

		it("should preserve existing fields when updating", async () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "design-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(testDir, config)

			await configManager.updateConfig(testDir, {
				specType: "bugfix",
			})

			const loaded = await configManager.loadConfig(testDir)

			expect(loaded.specId).to.equal(config.specId)
			expect(loaded.workflowType).to.equal("design-first")
			expect(loaded.createdAt).to.equal(config.createdAt)
		})
	})

	describe("validateConfig", () => {
		it("should validate a correct config", () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.true
		})

		it("should validate config with lastModified", () => {
			const config: SpecConfig = {
				specId: configManager.generateSpecId(),
				workflowType: "design-first",
				specType: "bugfix",
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.true
		})

		it("should reject config with missing specId", () => {
			const config = {
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.false
		})

		it("should reject config with empty specId", () => {
			const config = {
				specId: "",
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.false
		})

		it("should reject config with invalid workflowType", () => {
			const config = {
				specId: configManager.generateSpecId(),
				workflowType: "invalid-workflow",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.false
		})

		it("should reject config with invalid specType", () => {
			const config = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "invalid-type",
				createdAt: new Date().toISOString(),
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.false
		})

		it("should reject config with missing createdAt", () => {
			const config = {
				specId: configManager.generateSpecId(),
				workflowType: "requirements-first",
				specType: "feature",
			}

			const isValid = configManager.validateConfig(config)
			expect(isValid).to.be.false
		})

		it("should reject null config", () => {
			const isValid = configManager.validateConfig(null)
			expect(isValid).to.be.false
		})

		it("should reject non-object config", () => {
			const isValid = configManager.validateConfig("not an object")
			expect(isValid).to.be.false
		})
	})
})
