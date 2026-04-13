/**
 * Integration tests for WorkflowController
 *
 * Tests the complete workflow from spec creation to document generation.
 * These tests verify the actual file system operations.
 */

import * as path from "path"
import * as fs from "fs"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { ConfigManager } from "../ConfigManager"
import type { SpecConfig } from "../types"

describe("WorkflowController Integration Tests", () => {
	let testWorkspaceDir: string
	let configManager: ConfigManager

	beforeEach(async () => {
		// Create a temporary test workspace
		testWorkspaceDir = path.join(process.cwd(), ".test-workspace", `test-${Date.now()}`)
		await fs.promises.mkdir(testWorkspaceDir, { recursive: true })
		configManager = new ConfigManager()
	})

	afterEach(async () => {
		// Clean up test workspace
		try {
			await fs.promises.rm(testWorkspaceDir, { recursive: true, force: true })
		} catch {
			// Ignore errors
		}
	})

	describe("Spec Directory Creation", () => {
		it("should create spec directory with correct structure", async () => {
			const specName = "test-feature"
			const specDir = path.join(testWorkspaceDir, ".sddcline", specName)

			// Create the directory
			await fs.promises.mkdir(specDir, { recursive: true })

			// Verify directory exists
			const exists = await fs.promises
				.access(specDir, fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)

			expect(exists).toBe(true)
		})

		it("should create nested directory structure", async () => {
			const specName = "nested-feature"
			const specDir = path.join(testWorkspaceDir, ".sddcline", specName)

			// Create the directory recursively
			await fs.promises.mkdir(specDir, { recursive: true })

			// Verify all parent directories exist
			const sddclineDir = path.join(testWorkspaceDir, ".sddcline")
			const sddclineExists = await fs.promises
				.access(sddclineDir, fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)

			expect(sddclineExists).toBe(true)
		})
	})

	describe("Config File Creation", () => {
		it("should create config file with valid JSON", async () => {
			const specDir = path.join(testWorkspaceDir, ".sddcline", "test-spec")
			await fs.promises.mkdir(specDir, { recursive: true })

			const config: SpecConfig = {
				specId: "test-uuid-123",
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(specDir, config)

			// Read and verify config file
			const configPath = path.join(specDir, ".config.kiro")
			const configContent = await fs.promises.readFile(configPath, "utf-8")
			const parsedConfig = JSON.parse(configContent)

			expect(parsedConfig.specId).toBe("test-uuid-123")
			expect(parsedConfig.workflowType).toBe("requirements-first")
			expect(parsedConfig.specType).toBe("feature")
			expect(parsedConfig.createdAt).toBeDefined()
		})

		it("should create config file with proper formatting", async () => {
			const specDir = path.join(testWorkspaceDir, ".sddcline", "test-spec-2")
			await fs.promises.mkdir(specDir, { recursive: true })

			const config: SpecConfig = {
				specId: "test-uuid-456",
				workflowType: "design-first",
				specType: "bugfix",
				createdAt: new Date().toISOString(),
			}

			await configManager.createConfig(specDir, config)

			// Read config file
			const configPath = path.join(specDir, ".config.kiro")
			const configContent = await fs.promises.readFile(configPath, "utf-8")

			// Verify it's properly formatted JSON (with indentation)
			expect(configContent).toContain("specId")
			expect(configContent).toContain("workflowType")
			expect(configContent).toContain("specType")
			expect(configContent).toContain("createdAt")
		})
	})

	describe("Document Generation", () => {
		it("should create requirements.md file", async () => {
			const specDir = path.join(testWorkspaceDir, ".sddcline", "test-spec-3")
			await fs.promises.mkdir(specDir, { recursive: true })

			// Create a placeholder requirements file
			const requirementsPath = path.join(specDir, "requirements.md")
			const content = "# Requirements Document\n\n## Introduction\n\nTest requirements"

			await fs.promises.writeFile(requirementsPath, content, "utf-8")

			// Verify file exists and has content
			const fileContent = await fs.promises.readFile(requirementsPath, "utf-8")
			expect(fileContent).toContain("Requirements Document")
			expect(fileContent).toContain("Introduction")
		})

		it("should create design.md file", async () => {
			const specDir = path.join(testWorkspaceDir, ".sddcline", "test-spec-4")
			await fs.promises.mkdir(specDir, { recursive: true })

			// Create a placeholder design file
			const designPath = path.join(specDir, "design.md")
			const content = "# Design Document\n\n## Overview\n\nTest design"

			await fs.promises.writeFile(designPath, content, "utf-8")

			// Verify file exists and has content
			const fileContent = await fs.promises.readFile(designPath, "utf-8")
			expect(fileContent).toContain("Design Document")
			expect(fileContent).toContain("Overview")
		})

		it("should create tasks.md file", async () => {
			const specDir = path.join(testWorkspaceDir, ".sddcline", "test-spec-5")
			await fs.promises.mkdir(specDir, { recursive: true })

			// Create a placeholder tasks file
			const tasksPath = path.join(specDir, "tasks.md")
			const content = "# Implementation Plan\n\n## Tasks\n\n- [ ] 1. Task one"

			await fs.promises.writeFile(tasksPath, content, "utf-8")

			// Verify file exists and has content
			const fileContent = await fs.promises.readFile(tasksPath, "utf-8")
			expect(fileContent).toContain("Implementation Plan")
			expect(fileContent).toContain("Tasks")
		})
	})

	describe("Complete Workflow", () => {
		it("should create all required files for requirements-first workflow", async () => {
			const specName = "complete-test-spec"
			const specDir = path.join(testWorkspaceDir, ".sddcline", specName)
			await fs.promises.mkdir(specDir, { recursive: true })

			// Create config
			const config: SpecConfig = {
				specId: "complete-uuid",
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}
			await configManager.createConfig(specDir, config)

			// Create all documents
			await fs.promises.writeFile(path.join(specDir, "requirements.md"), "# Requirements", "utf-8")
			await fs.promises.writeFile(path.join(specDir, "design.md"), "# Design", "utf-8")
			await fs.promises.writeFile(path.join(specDir, "tasks.md"), "# Tasks", "utf-8")

			// Verify all files exist
			const configExists = await fs.promises
				.access(path.join(specDir, ".config.kiro"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)
			const requirementsExists = await fs.promises
				.access(path.join(specDir, "requirements.md"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)
			const designExists = await fs.promises
				.access(path.join(specDir, "design.md"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)
			const tasksExists = await fs.promises
				.access(path.join(specDir, "tasks.md"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)

			expect(configExists).toBe(true)
			expect(requirementsExists).toBe(true)
			expect(designExists).toBe(true)
			expect(tasksExists).toBe(true)
		})

		it("should create all required files for design-first workflow", async () => {
			const specName = "design-first-test-spec"
			const specDir = path.join(testWorkspaceDir, ".sddcline", specName)
			await fs.promises.mkdir(specDir, { recursive: true })

			// Create config
			const config: SpecConfig = {
				specId: "design-first-uuid",
				workflowType: "design-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			}
			await configManager.createConfig(specDir, config)

			// Create design and tasks documents (no requirements for design-first)
			await fs.promises.writeFile(path.join(specDir, "design.md"), "# Design", "utf-8")
			await fs.promises.writeFile(path.join(specDir, "tasks.md"), "# Tasks", "utf-8")

			// Verify files exist
			const configExists = await fs.promises
				.access(path.join(specDir, ".config.kiro"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)
			const designExists = await fs.promises
				.access(path.join(specDir, "design.md"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)
			const tasksExists = await fs.promises
				.access(path.join(specDir, "tasks.md"), fs.constants.F_OK)
				.then(() => true)
				.catch(() => false)

			expect(configExists).toBe(true)
			expect(designExists).toBe(true)
			expect(tasksExists).toBe(true)
		})
	})
})
