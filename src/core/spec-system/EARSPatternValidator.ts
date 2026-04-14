/**
 * EARSPatternValidator - Validates acceptance criteria against EARS patterns
 *
 * This validator checks that each acceptance criterion conforms to exactly one
 * of the six EARS (Easy Approach to Requirements Syntax) patterns.
 */

import { EARSPattern, Requirement, ValidationError, ValidationResult } from "./types"

export class EARSPatternValidator {
	/**
	 * Validate that all acceptance criteria follow EARS patterns
	 *
	 * @param requirements - Array of requirements to validate
	 * @param filePath - Path to the requirements file (for error reporting)
	 * @returns ValidationResult with any errors found
	 */
	validate(requirements: Requirement[], filePath: string): ValidationResult {
		const errors: ValidationError[] = []

		for (const requirement of requirements) {
			for (const criterion of requirement.acceptanceCriteria) {
				// Check if criterion matches expected EARS pattern
				const detectedPattern = this.detectEARSPattern(criterion.text)

				// Validate that the pattern is not COMPLEX (should match a standard pattern)
				if (detectedPattern === EARSPattern.COMPLEX) {
					errors.push({
						file: filePath,
						message: `Acceptance criterion ${criterion.id} does not match any standard EARS pattern. Text: "${criterion.text}"`,
					})
				}

				// Validate pattern consistency
				if (criterion.earsPattern !== detectedPattern) {
					errors.push({
						file: filePath,
						message: `Acceptance criterion ${criterion.id} has inconsistent EARS pattern. Expected: ${criterion.earsPattern}, Detected: ${detectedPattern}`,
					})
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		}
	}

	/**
	 * Detect EARS pattern from acceptance criterion text
	 * This should match the logic in RequirementsParser
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
}
