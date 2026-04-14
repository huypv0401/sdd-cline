/**
 * Integration tests for validation logic
 * Demonstrates end-to-end validation workflow
 */

import { describe, it, expect } from "vitest"
import { RequirementsParser } from "../RequirementsParser"
import { TasksParser } from "../TasksParser"

describe("Validation Integration", () => {
	describe("Requirements Validation Workflow", () => {
		it("should validate a complete requirements document", () => {
			const requirementsContent = `
# Requirements Document

## Introduction
Test feature

## Glossary
- **Term**: Definition

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to login to access my account securely

#### Acceptance Criteria

1. WHEN user enters valid credentials THEN THE system SHALL authenticate the user
2. WHEN user enters invalid credentials THEN THE system SHALL display error message
3. THE system SHALL lock account after 3 failed attempts
`

			const parser = new RequirementsParser()
			const requirements = parser.parse(requirementsContent)

			// Validate
			const result = parser.validate(requirements, "requirements.md")

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("should detect multiple validation errors in requirements", () => {
			const requirementsContent = `
# Requirements Document

## Requirements

### Requirement 1: Bad Requirement

**User Story:** Bad

#### Acceptance Criteria

1. System should maybe do something
2. The interface should be user-friendly
3. TBD - figure this out later
`

			const parser = new RequirementsParser()
			const requirements = parser.parse(requirementsContent)

			// Validate
			const result = parser.validate(requirements, "requirements.md")

			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)

			// Should have errors for:
			// - Short user story
			// - Missing SHALL keyword
			// - Ambiguous language ("maybe")
			// - Subjective term ("user-friendly")
			// - Placeholder ("TBD")
			// - COMPLEX EARS pattern (no standard pattern match)

			const errorMessages = result.errors.map((e) => e.message).join("\n")
			expect(errorMessages).toContain("too short")
			expect(errorMessages).toContain("SHALL")
			expect(errorMessages).toContain("ambiguous")
			expect(errorMessages).toContain("subjective")
			expect(errorMessages).toContain("placeholder")
		})

		it("should validate EARS patterns separately", () => {
			const requirementsContent = `
# Requirements Document

## Requirements

### Requirement 1: Test

**User Story:** As a user, I want to test EARS patterns

#### Acceptance Criteria

1. WHEN event occurs THEN THE system SHALL respond
2. WHILE system is active THE system SHALL monitor
3. WHERE feature is enabled THE system SHALL execute
4. IF error occurs THEN THE system SHALL log
5. THE system SHALL always validate input
`

			const parser = new RequirementsParser()
			const requirements = parser.parse(requirementsContent)

			// Validate EARS patterns only
			const earsResult = parser.validateEARSPattern(requirements, "requirements.md")

			expect(earsResult.valid).toBe(true)
			expect(earsResult.errors).toHaveLength(0)
		})

		it("should validate INCOSE rules separately", () => {
			const requirementsContent = `
# Requirements Document

## Requirements

### Requirement 1: Test

**User Story:** As a user, I want to test INCOSE rules validation

#### Acceptance Criteria

1. THE system SHALL process user input within 2 seconds
2. THE system SHALL validate email format using RFC 5322 standard
3. THE system SHALL store data in encrypted format using AES-256
`

			const parser = new RequirementsParser()
			const requirements = parser.parse(requirementsContent)

			// Validate INCOSE rules only
			const incoseResult = parser.validateINCOSERules(requirements, "requirements.md")

			expect(incoseResult.valid).toBe(true)
			expect(incoseResult.errors).toHaveLength(0)
		})
	})

	describe("Tasks Validation Workflow", () => {
		it("should validate a complete tasks document", () => {
			const tasksContent = `
# Implementation Plan

## Tasks

- [ ] 1 Setup project structure
  - [ ] 1.1 Create directory structure
  - [ ] 1.2 Initialize configuration
- [ ] 2 Implement core features
  - [ ] 2.1 Implement parser
    - [ ] 2.1.1 Write unit tests
    - [ ] 2.1.2 Implement parsing logic
  - [ ] 2.2 Implement validator
`

			const parser = new TasksParser()
			const taskTree = parser.parseContent(tasksContent)

			// Validate
			const result = parser.validate(taskTree, "tasks.md")

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("should detect multiple validation errors in tasks", () => {
			const tasksContent = `
# Tasks

- [ ] 1 Invalid parent
  - [ ] 2.1 Wrong parent ID
    - [ ] 2.1.1.1.1 Too many levels
- [ ] 3 Do
`

			const parser = new TasksParser()
			const taskTree = parser.parseContent(tasksContent)

			// Validate
			const result = parser.validate(taskTree, "tasks.md")

			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)

			const errorMessages = result.errors.map((e) => e.message).join("\n")
			expect(errorMessages).toContain("does not match parent")
			expect(errorMessages).toContain("too short")
		})

		it("should validate task hierarchy correctly", () => {
			const tasksContent = `
# Tasks

- [ ] 1 Parent task
  - [ ] 1.1 Child task level 1
    - [ ] 1.1.1 Child task level 2
      - [ ] 1.1.1.1 Child task level 3
`

			const parser = new TasksParser()
			const taskTree = parser.parseContent(tasksContent)

			// Validate
			const result = parser.validate(taskTree, "tasks.md")

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)

			// Verify hierarchy
			const allTasks = taskTree.getAllTasks()
			expect(allTasks).toHaveLength(4)
			expect(allTasks[0].id).toBe("1")
			expect(allTasks[1].id).toBe("1.1")
			expect(allTasks[2].id).toBe("1.1.1")
			expect(allTasks[3].id).toBe("1.1.1.1")
		})
	})

	describe("Combined Validation Workflow", () => {
		it("should validate both requirements and tasks in a complete spec", () => {
			// Requirements
			const requirementsContent = `
# Requirements Document

## Requirements

### Requirement 1: Feature Implementation

**User Story:** As a developer, I want to implement validation logic

#### Acceptance Criteria

1. WHEN requirements are parsed THEN THE system SHALL validate EARS patterns
2. WHEN tasks are parsed THEN THE system SHALL validate format
3. THE system SHALL report all validation errors with descriptive messages
`

			// Tasks
			const tasksContent = `
# Tasks

- [ ] 1 Implement validation logic
  - [ ] 1.1 Implement EARS pattern validation
  - [ ] 1.2 Implement INCOSE rules validation
  - [ ] 1.3 Implement tasks format validation
`

			const reqParser = new RequirementsParser()
			const requirements = reqParser.parse(requirementsContent)
			const reqResult = reqParser.validate(requirements, "requirements.md")

			const taskParser = new TasksParser()
			const taskTree = taskParser.parseContent(tasksContent)
			const taskResult = taskParser.validate(taskTree, "tasks.md")

			// Both should be valid
			expect(reqResult.valid).toBe(true)
			expect(taskResult.valid).toBe(true)

			// Combined validation
			const allErrors = [...reqResult.errors, ...taskResult.errors]
			expect(allErrors).toHaveLength(0)
		})
	})
})
