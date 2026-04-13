/**
 * Unit tests for RequirementsParser
 */

import { expect } from "chai"
import { beforeEach, describe, it } from "mocha"
import { RequirementsParser } from "../RequirementsParser"
import { EARSPattern } from "../types"

describe("RequirementsParser", () => {
	let parser: RequirementsParser

	beforeEach(() => {
		parser = new RequirementsParser()
	})

	describe("parse", () => {
		it("should parse a simple requirement with user story and acceptance criteria", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test the parser, so that I can verify it works.

#### Acceptance Criteria

1. THE system SHALL parse requirements correctly
2. WHEN user provides valid input, THEN THE system SHALL return structured data
`

			const requirements = parser.parse(content)

			expect(requirements).to.have.lengthOf(1)
			expect(requirements[0].id).to.equal("1")
			expect(requirements[0].userStory).to.equal(
				"As a developer, I want to test the parser, so that I can verify it works.",
			)
			expect(requirements[0].acceptanceCriteria).to.have.lengthOf(2)
		})

		it("should parse multiple requirements", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: First Feature

**User Story:** As a user, I want feature one.

#### Acceptance Criteria

1. THE system SHALL do something

### Requirement 2: Second Feature

**User Story:** As a user, I want feature two.

#### Acceptance Criteria

1. THE system SHALL do something else
2. WHEN event occurs, THEN THE system SHALL respond
`

			const requirements = parser.parse(content)

			expect(requirements).to.have.lengthOf(2)
			expect(requirements[0].id).to.equal("1")
			expect(requirements[1].id).to.equal("2")
			expect(requirements[1].acceptanceCriteria).to.have.lengthOf(2)
		})

		it("should correctly assign acceptance criterion IDs", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test IDs.

#### Acceptance Criteria

1. THE system SHALL do first thing
2. THE system SHALL do second thing
3. THE system SHALL do third thing
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].id).to.equal("1.1")
			expect(requirements[0].acceptanceCriteria[1].id).to.equal("1.2")
			expect(requirements[0].acceptanceCriteria[2].id).to.equal("1.3")
		})

		it("should detect UBIQUITOUS EARS pattern", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. THE system SHALL always do this action
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.UBIQUITOUS)
		})

		it("should detect EVENT_DRIVEN EARS pattern", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. WHEN user clicks button, THEN THE system SHALL perform action
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.EVENT_DRIVEN)
		})

		it("should detect STATE_DRIVEN EARS pattern", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. WHILE system is active, THE system SHALL monitor status
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.STATE_DRIVEN)
		})

		it("should detect OPTIONAL EARS pattern", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. WHERE feature is enabled, THE system SHALL provide functionality
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.OPTIONAL)
		})

		it("should detect UNWANTED EARS pattern", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. IF error occurs, THEN THE system SHALL handle it gracefully
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.UNWANTED)
		})

		it("should detect COMPLEX pattern for non-standard requirements", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test patterns.

#### Acceptance Criteria

1. This is a complex requirement without standard EARS keywords
`

			const requirements = parser.parse(content)

			expect(requirements[0].acceptanceCriteria[0].earsPattern).to.equal(EARSPattern.COMPLEX)
		})

		it("should handle empty requirements document", () => {
			const content = `# Requirements Document

## Requirements
`

			const requirements = parser.parse(content)

			expect(requirements).to.have.lengthOf(0)
		})

		it("should handle requirement without acceptance criteria", () => {
			const content = `# Requirements Document

## Requirements

### Requirement 1: Test Feature

**User Story:** As a developer, I want to test edge cases.
`

			const requirements = parser.parse(content)

			expect(requirements).to.have.lengthOf(1)
			expect(requirements[0].acceptanceCriteria).to.have.lengthOf(0)
		})
	})

	describe("prettyPrint", () => {
		it("should format requirements back to markdown", () => {
			const requirements = [
				{
					id: "1",
					userStory: "As a developer, I want to test printing.",
					acceptanceCriteria: [
						{
							id: "1.1",
							text: "THE system SHALL format correctly",
							earsPattern: EARSPattern.UBIQUITOUS,
						},
						{
							id: "1.2",
							text: "WHEN printed, THEN THE output SHALL be valid markdown",
							earsPattern: EARSPattern.EVENT_DRIVEN,
						},
					],
				},
			]

			const output = parser.prettyPrint(requirements)

			expect(output).to.include("# Requirements Document")
			expect(output).to.include("### Requirement 1:")
			expect(output).to.include("**User Story:** As a developer, I want to test printing.")
			expect(output).to.include("#### Acceptance Criteria")
			expect(output).to.include("1. THE system SHALL format correctly")
			expect(output).to.include("2. WHEN printed, THEN THE output SHALL be valid markdown")
		})

		it("should handle multiple requirements", () => {
			const requirements = [
				{
					id: "1",
					userStory: "First story",
					acceptanceCriteria: [
						{
							id: "1.1",
							text: "First criterion",
							earsPattern: EARSPattern.UBIQUITOUS,
						},
					],
				},
				{
					id: "2",
					userStory: "Second story",
					acceptanceCriteria: [
						{
							id: "2.1",
							text: "Second criterion",
							earsPattern: EARSPattern.UBIQUITOUS,
						},
					],
				},
			]

			const output = parser.prettyPrint(requirements)

			expect(output).to.include("### Requirement 1:")
			expect(output).to.include("### Requirement 2:")
		})

		it("should handle empty requirements array", () => {
			const requirements: any[] = []

			const output = parser.prettyPrint(requirements)

			expect(output).to.include("# Requirements Document")
			expect(output).to.include("## Requirements")
		})
	})
})
