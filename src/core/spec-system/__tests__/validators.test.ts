/**
 * Tests for validation logic
 */

import { describe, it, expect } from "vitest"
import { EARSPatternValidator } from "../EARSPatternValidator"
import { INCOSERulesValidator } from "../INCOSERulesValidator"
import { TasksFormatValidator } from "../TasksFormatValidator"
import { EARSPattern, Requirement, TaskStatus, TaskTree } from "../types"

describe("EARSPatternValidator", () => {
	const validator = new EARSPatternValidator()

	it("should validate requirements with correct EARS patterns", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "WHEN user enters credentials THEN THE system SHALL authenticate",
						earsPattern: EARSPattern.EVENT_DRIVEN,
					},
					{
						id: "1.2",
						text: "THE system SHALL display error message",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	it("should detect COMPLEX patterns as invalid", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "System should do something",
						earsPattern: EARSPattern.COMPLEX,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
		expect(result.errors[0].message).toContain("does not match any standard EARS pattern")
	})

	it("should detect pattern inconsistencies", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system SHALL display message",
						earsPattern: EARSPattern.EVENT_DRIVEN, // Wrong pattern assigned
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.length).toBeGreaterThan(0)
		expect(result.errors[0].message).toContain("inconsistent EARS pattern")
	})
})

describe("INCOSERulesValidator", () => {
	const validator = new INCOSERulesValidator()

	it("should validate requirements with good clarity, testability, and completeness", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login to access my account",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "WHEN user enters valid credentials THEN THE system SHALL authenticate the user",
						earsPattern: EARSPattern.EVENT_DRIVEN,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	it("should detect missing user story", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system SHALL do something",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("missing a user story"))).toBe(true)
	})

	it("should detect ambiguous language", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system SHALL maybe display an error message",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("ambiguous language"))).toBe(true)
	})

	it("should detect missing SHALL keyword", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system displays an error message",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes('missing "SHALL" keyword'))).toBe(true)
	})

	it("should detect subjective terms", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system SHALL provide a user-friendly interface",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("subjective term"))).toBe(true)
	})

	it("should detect incomplete placeholders", () => {
		const requirements: Requirement[] = [
			{
				id: "1",
				userStory: "As a user, I want to login",
				acceptanceCriteria: [
					{
						id: "1.1",
						text: "THE system SHALL do something TBD",
						earsPattern: EARSPattern.UBIQUITOUS,
					},
				],
			},
		]

		const result = validator.validate(requirements, "test.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("placeholder"))).toBe(true)
	})
})

describe("TasksFormatValidator", () => {
	const validator = new TasksFormatValidator()

	it("should validate tasks with correct format", () => {
		const taskTree = new TaskTree([
			{
				id: "1",
				description: "Setup project structure",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [
					{
						id: "1.1",
						description: "Create directory structure",
						status: TaskStatus.NOT_STARTED,
						indentLevel: 1,
						parentId: "1",
						subTasks: [],
					},
				],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(true)
		expect(result.errors).toHaveLength(0)
	})

	it("should detect invalid task ID format", () => {
		const taskTree = new TaskTree([
			{
				id: "task-1",
				description: "Setup project",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("invalid format"))).toBe(true)
	})

	it("should detect incorrect parent-child ID relationship", () => {
		const taskTree = new TaskTree([
			{
				id: "1",
				description: "Parent task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [
					{
						id: "2.1",
						description: "Child task with wrong parent",
						status: TaskStatus.NOT_STARTED,
						indentLevel: 1,
						parentId: "1",
						subTasks: [],
					},
				],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("does not match parent ID"))).toBe(true)
	})

	it("should detect incorrect indentation level", () => {
		const taskTree = new TaskTree([
			{
				id: "1",
				description: "Parent task",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [
					{
						id: "1.1",
						description: "Child task",
						status: TaskStatus.NOT_STARTED,
						indentLevel: 2, // Should be 1
						parentId: "1",
						subTasks: [],
					},
				],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("incorrect indentation level"))).toBe(true)
	})

	it("should detect empty task description", () => {
		const taskTree = new TaskTree([
			{
				id: "1",
				description: "",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("empty description"))).toBe(true)
	})

	it("should detect description that is too short", () => {
		const taskTree = new TaskTree([
			{
				id: "1",
				description: "Do",
				status: TaskStatus.NOT_STARTED,
				indentLevel: 0,
				subTasks: [],
			},
		])

		const result = validator.validate(taskTree, "tasks.md")
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.message.includes("too short"))).toBe(true)
	})
})
