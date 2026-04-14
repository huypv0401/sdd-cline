/**
 * INCOSERulesValidator - Validates requirements against INCOSE quality rules
 *
 * This validator checks that requirements meet INCOSE (International Council on
 * Systems Engineering) quality standards for clarity, testability, and completeness.
 */

import { Requirement, ValidationError, ValidationResult } from "./types"

export class INCOSERulesValidator {
	/**
	 * Validate that all requirements meet INCOSE quality rules
	 *
	 * @param requirements - Array of requirements to validate
	 * @param filePath - Path to the requirements file (for error reporting)
	 * @returns ValidationResult with any errors found
	 */
	validate(requirements: Requirement[], filePath: string): ValidationResult {
		const errors: ValidationError[] = []

		for (const requirement of requirements) {
			// Validate user story
			this.validateUserStory(requirement, filePath, errors)

			// Validate each acceptance criterion
			for (const criterion of requirement.acceptanceCriteria) {
				this.validateClarity(requirement.id, criterion.id, criterion.text, filePath, errors)
				this.validateTestability(requirement.id, criterion.id, criterion.text, filePath, errors)
				this.validateCompleteness(requirement.id, criterion.id, criterion.text, filePath, errors)
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Validate user story format and content
	 */
	private validateUserStory(requirement: Requirement, filePath: string, errors: ValidationError[]): void {
		if (!requirement.userStory || requirement.userStory.trim().length === 0) {
			errors.push({
				file: filePath,
				message: `Requirement ${requirement.id} is missing a user story`,
			})
			return
		}

		// Check for minimum length (too short stories are likely incomplete)
		if (requirement.userStory.length < 10) {
			errors.push({
				file: filePath,
				message: `Requirement ${requirement.id} has a user story that is too short (minimum 10 characters)`,
			})
		}
	}

	/**
	 * Validate clarity - requirement should be clear and unambiguous
	 */
	private validateClarity(
		reqId: string,
		criterionId: string,
		text: string,
		filePath: string,
		errors: ValidationError[],
	): void {
		// Check for ambiguous words that reduce clarity
		const ambiguousWords = [
			"maybe",
			"possibly",
			"might",
			"could",
			"should consider",
			"as appropriate",
			"if possible",
			"etc",
			"and so on",
			"similar",
		]

		for (const word of ambiguousWords) {
			if (text.toLowerCase().includes(word.toLowerCase())) {
				errors.push({
					file: filePath,
					message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) contains ambiguous language: "${word}". Requirements should be clear and unambiguous.`,
				})
			}
		}

		// Check for minimum length (too short criteria are likely unclear)
		if (text.length < 15) {
			errors.push({
				file: filePath,
				message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) is too short to be clear (minimum 15 characters)`,
			})
		}

		// Check for vague quantifiers
		const vagueQuantifiers = ["some", "many", "few", "several", "various", "appropriate", "reasonable"]
		for (const quantifier of vagueQuantifiers) {
			// Use word boundaries to avoid false positives (e.g., "something" shouldn't match "some")
			const regex = new RegExp(`\\b${quantifier}\\b`, "i")
			if (regex.test(text)) {
				errors.push({
					file: filePath,
					message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) contains vague quantifier: "${quantifier}". Use specific quantities or conditions.`,
				})
			}
		}
	}

	/**
	 * Validate testability - requirement should be verifiable
	 */
	private validateTestability(
		reqId: string,
		criterionId: string,
		text: string,
		filePath: string,
		errors: ValidationError[],
	): void {
		// Check for SHALL keyword (indicates testable requirement)
		if (!text.includes("SHALL")) {
			errors.push({
				file: filePath,
				message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) is missing "SHALL" keyword. Requirements should be testable with clear obligations.`,
			})
		}

		// Check for untestable subjective terms
		const subjectiveTerms = [
			"user-friendly",
			"easy to use",
			"intuitive",
			"fast",
			"slow",
			"good",
			"bad",
			"nice",
			"beautiful",
			"elegant",
			"simple",
			"complex",
			"efficient",
			"robust",
		]

		for (const term of subjectiveTerms) {
			if (text.toLowerCase().includes(term.toLowerCase())) {
				errors.push({
					file: filePath,
					message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) contains subjective term: "${term}". Requirements should be objectively testable.`,
				})
			}
		}
	}

	/**
	 * Validate completeness - requirement should have all necessary information
	 */
	private validateCompleteness(
		reqId: string,
		criterionId: string,
		text: string,
		filePath: string,
		errors: ValidationError[],
	): void {
		// Check for incomplete placeholders
		const placeholders = ["TBD", "TODO", "FIXME", "[", "]", "...", "___"]
		for (const placeholder of placeholders) {
			if (text.includes(placeholder)) {
				errors.push({
					file: filePath,
					message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) contains placeholder: "${placeholder}". Requirements should be complete.`,
				})
			}
		}

		// Check for minimum information content
		// A complete requirement should have subject, action, and condition
		const hasSubject = /\b(system|user|THE|application|component)\b/i.test(text)
		const hasAction = /\b(SHALL|create|update|delete|display|validate|process|send|receive)\b/i.test(text)

		if (!hasSubject) {
			errors.push({
				file: filePath,
				message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) is missing a clear subject (e.g., "THE system", "user", "application")`,
			})
		}

		if (!hasAction) {
			errors.push({
				file: filePath,
				message: `Acceptance criterion ${criterionId} (Requirement ${reqId}) is missing a clear action verb`,
			})
		}
	}
}
