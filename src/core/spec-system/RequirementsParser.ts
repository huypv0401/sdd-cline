/**
 * RequirementsParser - Parses requirements documents into structured objects
 *
 * This parser extracts requirements from markdown files following the EARS pattern,
 * building structured Requirement objects with IDs, user stories, and acceptance criteria.
 */

import { AcceptanceCriterion, EARSPattern, Requirement, ValidationResult } from "./types"
import { EARSPatternValidator } from "./EARSPatternValidator"
import { INCOSERulesValidator } from "./INCOSERulesValidator"

export class RequirementsParser {
	/**
	 * Parse requirements document into structured objects
	 *
	 * @param content - The markdown content of the requirements document
	 * @returns Array of Requirement objects
	 * @throws ParsingError if the document format is invalid
	 */
	parse(content: string): Requirement[] {
		const requirements: Requirement[] = []
		const lines = content.split("\n")

		let currentRequirement: Requirement | null = null
		let currentCriteria: AcceptanceCriterion[] = []
		let inAcceptanceCriteria = false
		let lineNumber = 0

		for (const rawLine of lines) {
			lineNumber++
			const line = rawLine.trim() // Trim whitespace including carriage returns

			// Match requirement header: ### Requirement N: Title
			const reqMatch = line.match(/^###\s+Requirement\s+(\d+):\s*(.*)$/)
			if (reqMatch) {
				// Save previous requirement
				if (currentRequirement) {
					currentRequirement.acceptanceCriteria = currentCriteria
					requirements.push(currentRequirement)
				}

				// Start new requirement
				currentRequirement = {
					id: reqMatch[1],
					userStory: "",
					acceptanceCriteria: [],
				}
				currentCriteria = []
				inAcceptanceCriteria = false
				continue
			}

			// Match user story
			const storyMatch = line.match(/^\*\*User Story:\*\*\s+(.+)$/)
			if (storyMatch && currentRequirement) {
				currentRequirement.userStory = storyMatch[1]
				continue
			}

			// Match acceptance criteria section header
			if (line.match(/^####\s+Acceptance Criteria\s*$/)) {
				inAcceptanceCriteria = true
				continue
			}

			// Match acceptance criteria items (numbered list)
			const criteriaMatch = line.match(/^(\d+)\.\s+(.+)$/)
			if (criteriaMatch && currentRequirement && inAcceptanceCriteria) {
				const criterionText = criteriaMatch[2]
				const criterion: AcceptanceCriterion = {
					id: `${currentRequirement.id}.${criteriaMatch[1]}`,
					text: criterionText,
					earsPattern: this.detectEARSPattern(criterionText),
				}
				currentCriteria.push(criterion)
			}
		}

		// Save last requirement
		if (currentRequirement) {
			currentRequirement.acceptanceCriteria = currentCriteria
			requirements.push(currentRequirement)
		}

		return requirements
	}

	/**
	 * Pretty print requirements back to markdown
	 *
	 * @param requirements - Array of Requirement objects
	 * @returns Formatted markdown string
	 */
	prettyPrint(requirements: Requirement[]): string {
		let output = "# Requirements Document\n\n"
		output += "## Introduction\n\n"
		output += "[Feature overview and context]\n\n"
		output += "## Glossary\n\n"
		output += "- **Term**: Definition\n\n"
		output += "## Requirements\n\n"

		for (const req of requirements) {
			output += `### Requirement ${req.id}: [Title]\n\n`
			output += `**User Story:** ${req.userStory}\n\n`
			output += `#### Acceptance Criteria\n\n`

			for (let i = 0; i < req.acceptanceCriteria.length; i++) {
				const criterion = req.acceptanceCriteria[i]
				output += `${i + 1}. ${criterion.text}\n`
			}

			output += "\n"
		}

		return output
	}

	/**
	 * Detect EARS pattern from acceptance criterion text
	 *
	 * @param text - The acceptance criterion text
	 * @returns The detected EARS pattern
	 */
	private detectEARSPattern(text: string): EARSPattern {
		// Event-driven: WHEN [event] THEN system SHALL [action]
		if (text.includes("WHEN") && text.includes("THEN") && text.includes("SHALL")) {
			return EARSPattern.EVENT_DRIVEN
		}

		// State-driven: WHILE [state] THE system SHALL [action]
		if (text.includes("WHILE") && text.includes("SHALL")) {
			return EARSPattern.STATE_DRIVEN
		}

		// Optional: WHERE [condition] THE system SHALL [action]
		if (text.includes("WHERE") && text.includes("SHALL")) {
			return EARSPattern.OPTIONAL
		}

		// Unwanted: IF [condition] THEN system SHALL [action]
		if (text.includes("IF") && text.includes("THEN") && text.includes("SHALL")) {
			return EARSPattern.UNWANTED
		}

		// Ubiquitous: THE system SHALL [action]
		if (text.includes("THE") && text.includes("SHALL")) {
			return EARSPattern.UBIQUITOUS
		}

		// Complex: Requirements that don't fit standard EARS patterns
		return EARSPattern.COMPLEX
	}

	/**
	 * Validate requirements against EARS patterns
	 *
	 * @param requirements - Array of requirements to validate
	 * @param filePath - Path to the requirements file (for error reporting)
	 * @returns ValidationResult with any errors found
	 */
	validateEARSPattern(requirements: Requirement[], filePath: string): ValidationResult {
		const validator = new EARSPatternValidator()
		return validator.validate(requirements, filePath)
	}

	/**
	 * Validate requirements against INCOSE rules
	 *
	 * @param requirements - Array of requirements to validate
	 * @param filePath - Path to the requirements file (for error reporting)
	 * @returns ValidationResult with any errors found
	 */
	validateINCOSERules(requirements: Requirement[], filePath: string): ValidationResult {
		const validator = new INCOSERulesValidator()
		return validator.validate(requirements, filePath)
	}

	/**
	 * Validate requirements against both EARS patterns and INCOSE rules
	 *
	 * @param requirements - Array of requirements to validate
	 * @param filePath - Path to the requirements file (for error reporting)
	 * @returns Combined ValidationResult with all errors found
	 */
	validate(requirements: Requirement[], filePath: string): ValidationResult {
		const earsResult = this.validateEARSPattern(requirements, filePath)
		const incoseResult = this.validateINCOSERules(requirements, filePath)

		return {
			valid: earsResult.valid && incoseResult.valid,
			errors: [...earsResult.errors, ...incoseResult.errors],
		}
	}
}
