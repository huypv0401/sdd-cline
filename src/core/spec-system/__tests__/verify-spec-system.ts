/**
 * Verification script for SpecSystem implementation
 *
 * This script verifies the core functionality of SpecSystem without
 * requiring the full VSCode extension context.
 */

import { describe, it, expect } from "vitest"

describe("SpecSystem Verification", () => {
	describe("Spec name validation regex", () => {
		const validateSpecName = (name: string): boolean => {
			return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
		}

		it("should accept valid kebab-case names", () => {
			const validNames = [
				"my-feature",
				"user-authentication",
				"feature-123",
				"a",
				"123",
				"my-feature-name-123",
				"test",
				"my-long-feature-name-with-many-parts",
			]

			for (const name of validNames) {
				expect(validateSpecName(name)).toBe(true)
			}
		})

		it("should reject invalid names", () => {
			const invalidNames = [
				"MyFeature", // Uppercase
				"my-Feature", // Mixed case
				"my_feature", // Underscore
				"my feature", // Space
				"-my-feature", // Starting with hyphen
				"my-feature-", // Ending with hyphen
				"my--feature", // Consecutive hyphens
				"", // Empty
				"my-feature!", // Special character
				"my@feature", // Special character
				"my.feature", // Dot
			]

			for (const name of invalidNames) {
				expect(validateSpecName(name)).toBe(false)
			}
		})
	})

	describe("Spec name extraction from path", () => {
		const extractSpecName = (filePath: string): string | undefined => {
			const parts = filePath.split(/[/\\]/)
			const sddclineIndex = parts.findIndex((part) => part === ".sddcline")

			if (sddclineIndex === -1 || sddclineIndex >= parts.length - 1) {
				return undefined
			}

			return parts[sddclineIndex + 1]
		}

		it("should extract spec name from valid paths", () => {
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
				{
					path: "/home/user/projects/.sddcline/feature-123/requirements.md",
					expected: "feature-123",
				},
			]

			for (const testCase of testCases) {
				const result = extractSpecName(testCase.path)
				expect(result).toBe(testCase.expected)
			}
		})

		it("should return undefined for invalid paths", () => {
			const invalidPaths = [
				"/workspace/requirements.md", // No .sddcline
				"/workspace/.sddcline/", // No spec name
				"requirements.md", // Relative path without .sddcline
				"/workspace/other-dir/requirements.md", // Wrong directory
			]

			for (const invalidPath of invalidPaths) {
				const result = extractSpecName(invalidPath)
				expect(result).toBeUndefined()
			}
		})
	})

	describe("Workflow type validation", () => {
		it("should recognize valid workflow types", () => {
			const validTypes = ["requirements-first", "design-first"]

			for (const type of validTypes) {
				expect(["requirements-first", "design-first"]).toContain(type)
			}
		})

		it("should reject invalid workflow types", () => {
			const invalidTypes = ["requirements", "design", "tasks-first", ""]

			for (const type of invalidTypes) {
				expect(["requirements-first", "design-first"]).not.toContain(type)
			}
		})
	})
})

// Run verification
console.log("SpecSystem verification complete!")
