/**
 * ValidationErrorHandler - Handles validation errors
 *
 * This component is responsible for:
 * - Grouping errors by file
 * - Creating diagnostics for each error
 * - Showing summary in Problems panel
 *
 * Requirements: 12.4, 12.5
 */

import * as vscode from "vscode"
import type { ValidationError } from "./types"

/**
 * ValidationErrorHandler handles validation errors with diagnostics
 */
export class ValidationErrorHandler {
	private diagnosticCollection: vscode.DiagnosticCollection

	constructor() {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection("sddcline-validation")
	}

	/**
	 * Handle validation errors by creating diagnostics
	 *
	 * @param errors - Array of validation errors
	 */
	async handleValidationErrors(errors: ValidationError[]): Promise<void> {
		if (errors.length === 0) {
			return
		}

		// Group errors by file
		const errorsByFile = this.groupErrorsByFile(errors)

		// Create diagnostics for each file
		for (const [file, fileErrors] of errorsByFile) {
			await this.createDiagnosticsForFile(file, fileErrors)
		}

		// Show summary message
		const fileCount = errorsByFile.size
		const errorCount = errors.length
		await vscode.window.showWarningMessage(
			`Found ${errorCount} validation error${errorCount !== 1 ? "s" : ""} in ${fileCount} file${fileCount !== 1 ? "s" : ""}. Check Problems panel for details.`,
		)
	}

	/**
	 * Group validation errors by file
	 *
	 * @param errors - Array of validation errors
	 * @returns Map of file paths to their errors
	 */
	private groupErrorsByFile(errors: ValidationError[]): Map<string, ValidationError[]> {
		const errorsByFile = new Map<string, ValidationError[]>()

		for (const error of errors) {
			const fileErrors = errorsByFile.get(error.file) || []
			fileErrors.push(error)
			errorsByFile.set(error.file, fileErrors)
		}

		return errorsByFile
	}

	/**
	 * Create diagnostics for a specific file
	 *
	 * @param file - File path
	 * @param errors - Errors for this file
	 */
	private async createDiagnosticsForFile(file: string, errors: ValidationError[]): Promise<void> {
		try {
			const uri = vscode.Uri.file(file)
			const document = await vscode.workspace.openTextDocument(uri)

			const diagnostics = errors.map((error) => {
				// Create range for the error
				const line = error.line ?? 0
				const lineText = line < document.lineCount ? document.lineAt(line) : null
				const range = lineText
					? new vscode.Range(line, 0, line, lineText.text.length)
					: new vscode.Range(line, 0, line, 100)

				// Create diagnostic
				const diagnostic = new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Warning)

				diagnostic.source = "SDD Cline Validation"

				return diagnostic
			})

			// Set diagnostics for this file
			this.diagnosticCollection.set(uri, diagnostics)
		} catch (error) {
			console.error(`Failed to create diagnostics for ${file}:`, error)
		}
	}

	/**
	 * Clear all validation diagnostics
	 */
	clearDiagnostics(): void {
		this.diagnosticCollection.clear()
	}

	/**
	 * Clear diagnostics for a specific file
	 *
	 * @param filePath - Path to the file
	 */
	clearFileDiagnostics(filePath: string): void {
		const uri = vscode.Uri.file(filePath)
		this.diagnosticCollection.delete(uri)
	}

	/**
	 * Show validation success message
	 *
	 * @param fileCount - Number of files validated
	 */
	async showValidationSuccess(fileCount: number): Promise<void> {
		await vscode.window.showInformationMessage(
			`Validation passed for ${fileCount} file${fileCount !== 1 ? "s" : ""}.`,
		)
	}

	/**
	 * Dispose of the diagnostic collection
	 */
	dispose(): void {
		this.diagnosticCollection.dispose()
	}
}
