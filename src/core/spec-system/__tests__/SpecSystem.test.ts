/**
 * Unit tests for SpecSystem
 *
 * Tests spec name validation, spec existence checking, and workflow routing.
 * Validates: Requirements 1.4, 1.5
 */

import * as fs from "fs"
import * as path from "path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"
import { SpecSystem } from "../SpecSystem"

// Helper type for accessing private methods in tests
type SpecSystemPrivate = {
	validateSpecName: (name: string) => boolean
	specExists: (specName: string) => Promise<boolean>
	extractSpecName: (filePath: string) => string | undefined
	promptWorkflowType: () => Promise<"requirements-first" | "design-first" | undefined>
	promptSpecName: () => Promise<string | undefined>
}

// Mock vscode module
vi.mock("vscode", () => ({
	window: {
		showQuickPick: vi.fn(),
		showInputBox: vi.fn(),
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		withProgress: vi.fn(),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: {
					fsPath: "/test/workspace",
				},
			},
		],
	},
	ProgressLocation: {
		Notification: 15,
	},
}))

describe("SpecSystem", () => {
	let specSystem: SpecSystem
	let mockContext: vscode.ExtensionContext

	beforeEach(() => {
		// Create mock extension context
		// biome-ignore lint/suspicious/noExplicitAny: Test mocking requires any for VSCode types
		mockContext = {
			subscriptions: [],
			workspaceState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			extensionPath: "/test/extension",
			extensionUri: {} as vscode.Uri,
			environmentVariableCollection: {} as any,
			extensionMode: 3,
			storageUri: undefined,
			storagePath: undefined,
			globalStorageUri: {} as vscode.Uri,
			globalStoragePath: "/test/global",
			logUri: {} as vscode.Uri,
			logPath: "/test/log",
			asAbsolutePath: vi.fn((relativePath: string) => `/test/extension/${relativePath}`),
			secrets: {} as any,
			extension: {} as vscode.Extension<any>,
		}

		specSystem = new SpecSystem(mockContext)

		// Reset all mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("validateSpecName", () => {
		it("should accept valid kebab-case names", () => {
			// Access private method through type assertion
			const validate = (specSystem as any).validateSpecName.bind(specSystem)

			expect(validate("my-feature")).toBe(true)
			expect(validate("user-authentication")).toBe(true)
			expect(validate("feature-123")).toBe(true)
			expect(validate("a")).toBe(true)
			expect(validate("123")).toBe(true)
			expect(validate("my-feature-name-123")).toBe(true)
		})

		it("should reject invalid names", () => {
			const validate = (specSystem as any).validateSpecName.bind(specSystem)

			// Uppercase letters
			expect(validate("MyFeature")).toBe(false)
			expect(validate("my-Feature")).toBe(false)

			// Underscores
			expect(validate("my_feature")).toBe(false)

			// Spaces
			expect(validate("my feature")).toBe(false)

			// Starting with hyphen
			expect(validate("-my-feature")).toBe(false)

			// Ending with hyphen
			expect(validate("my-feature-")).toBe(false)

			// Consecutive hyphens
			expect(validate("my--feature")).toBe(false)

			// Empty string
			expect(validate("")).toBe(false)

			// Special characters
			expect(validate("my-feature!")).toBe(false)
			expect(validate("my@feature")).toBe(false)
		})
	})

	describe("specExists", () => {
		it("should return true if spec directory exists", async () => {
			// Mock fs.promises.access to succeed
			vi.spyOn(fs.promises, "access").mockResolvedValue(undefined)

			const exists = await (specSystem as any).specExists("test-spec")

			expect(exists).toBe(true)
			expect(fs.promises.access).toHaveBeenCalledWith(
				path.join("/test/workspace", ".sddcline", "test-spec"),
				fs.constants.F_OK,
			)
		})

		it("should return false if spec directory does not exist", async () => {
			// Mock fs.promises.access to fail
			vi.spyOn(fs.promises, "access").mockRejectedValue(new Error("ENOENT"))

			const exists = await (specSystem as any).specExists("test-spec")

			expect(exists).toBe(false)
		})

		it("should throw error if no workspace folder is open", async () => {
			// Mock no workspace folders
			;(vscode.workspace as any).workspaceFolders = undefined

			await expect((specSystem as any).specExists("test-spec")).rejects.toThrow("No workspace folder open")
		})
	})

	describe("extractSpecName", () => {
		it("should extract spec name from valid path", () => {
			const extractSpecName = (specSystem as any).extractSpecName.bind(specSystem)

			const testCases = [
				{
					path: "/workspace/.sddcline/my-feature/requirements.md",
					expected: "my-feature",
				},
				{
					path: "/workspace/.sddcline/user-auth/design.md",
					expected: "user-auth",
				},
				{
					path: "C:\\workspace\\.sddcline\\test-spec\\tasks.md",
					expected: "test-spec",
				},
			]

			for (const testCase of testCases) {
				const result = extractSpecName(testCase.path)
				expect(result).toBe(testCase.expected)
			}
		})

		it("should return undefined for invalid paths", () => {
			const extractSpecName = (specSystem as any).extractSpecName.bind(specSystem)

			const invalidPaths = [
				"/workspace/requirements.md", // No .sddcline
				"/workspace/.sddcline/", // No spec name
				"requirements.md", // Relative path without .sddcline
			]

			for (const invalidPath of invalidPaths) {
				const result = extractSpecName(invalidPath)
				expect(result).toBeUndefined()
			}
		})
	})

	describe("createNewSpec", () => {
		it("should show error if spec name is invalid", async () => {
			// Mock user selecting workflow type
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
				label: "Requirements-First",
				value: "requirements-first",
			} as any)

			// Mock user entering invalid spec name
			vi.mocked(vscode.window.showInputBox).mockResolvedValue("Invalid_Name")

			await specSystem.createNewSpec()

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("Invalid spec name"))
		})

		it("should show error if spec already exists", async () => {
			// Mock user selecting workflow type
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
				label: "Requirements-First",
				value: "requirements-first",
			} as any)

			// Mock user entering valid spec name
			vi.mocked(vscode.window.showInputBox).mockResolvedValue("existing-spec")

			// Mock spec exists
			vi.spyOn(fs.promises, "access").mockResolvedValue(undefined)

			await specSystem.createNewSpec()

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Spec "existing-spec" already exists.')
		})

		it("should handle user cancellation at workflow type prompt", async () => {
			// Mock user cancelling workflow type selection
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined)

			await specSystem.createNewSpec()

			// Should not show any error messages
			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		})

		it("should handle user cancellation at spec name prompt", async () => {
			// Mock user selecting workflow type
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
				label: "Requirements-First",
				value: "requirements-first",
			} as vscode.QuickPickItem & { value: "requirements-first" })

			// Mock user cancelling spec name input
			vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined)

			await specSystem.createNewSpec()

			// Should not show any error messages
			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		})
	})

	describe("openSpecPreview", () => {
		it("should show error if spec name cannot be extracted", async () => {
			await specSystem.openSpecPreview("/invalid/path/file.md")

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Could not determine spec name from file path")
		})

		it("should show info message for valid spec path", async () => {
			await specSystem.openSpecPreview("/workspace/.sddcline/test-spec/requirements.md")

			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				expect.stringContaining('Opening preview for spec "test-spec"'),
			)
		})
	})

	describe("promptWorkflowType", () => {
		it("should return requirements-first when selected", async () => {
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
				label: "Requirements-First",
				value: "requirements-first",
			} as vscode.QuickPickItem & { value: "requirements-first" })

			const result = await (specSystem as unknown as SpecSystemPrivate).promptWorkflowType()

			expect(result).toBe("requirements-first")
		})

		it("should return design-first when selected", async () => {
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue({
				label: "Design-First",
				value: "design-first",
			} as vscode.QuickPickItem & { value: "design-first" })

			const result = await (specSystem as unknown as SpecSystemPrivate).promptWorkflowType()

			expect(result).toBe("design-first")
		})

		it("should return undefined when cancelled", async () => {
			vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined)

			const result = await (specSystem as unknown as SpecSystemPrivate).promptWorkflowType()

			expect(result).toBeUndefined()
		})
	})

	describe("promptSpecName", () => {
		it("should return valid spec name", async () => {
			vi.mocked(vscode.window.showInputBox).mockResolvedValue("my-feature")

			const result = await (specSystem as unknown as SpecSystemPrivate).promptSpecName()

			expect(result).toBe("my-feature")
		})

		it("should return undefined when cancelled", async () => {
			vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined)

			const result = await (specSystem as unknown as SpecSystemPrivate).promptSpecName()

			expect(result).toBeUndefined()
		})

		it("should validate input in real-time", async () => {
			let validateInput: ((value: string) => string | null) | undefined

			vi.mocked(vscode.window.showInputBox).mockImplementation((options: vscode.InputBoxOptions | undefined) => {
				validateInput = options?.validateInput
				return Promise.resolve("my-feature")
			})

			await (specSystem as unknown as SpecSystemPrivate).promptSpecName()

			expect(validateInput).toBeDefined()

			// Test validation function
			if (validateInput) {
				expect(validateInput("")).toBe("Spec name is required")
				expect(validateInput("Invalid_Name")).toContain("Invalid format")
				expect(validateInput("valid-name")).toBeNull()
			}
		})
	})
})
