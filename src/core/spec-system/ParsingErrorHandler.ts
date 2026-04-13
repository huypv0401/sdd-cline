/**
 * ParsingErrorHandler - Handles parsing errors with editor integration
 *
 * This component is responsible for:
 * - Highlighting problematic lines in editor
 * - Showing diagnostics in Problems panel
 * - Including line numbers in error messages
 *
 * Requirements: 17.4
 */

import * as vscode from "vscode"
import { ParsingError } from "./types"

/**
 * ParsingErrorHandler handles parsing errors with editor integration
 */
export class ParsingErrorHandler {
	private diagnosticCollection: vscode.DiagnosticCollection

	constructor() {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection("sddcline-spec")
	}

	/**
	 * Handle parsing error with editor highlighting and diagnostics
	 *
	 * @param error - The parsing error that occurred
	 */
	async handleParsingError(error: ParsingError): Promise<void> {
		// Show error message with line number
		const lineInfo = error.line !== undefined ? ` at line ${error.line + 1}` : ""
		const fileInfo = error.file ? ` in ${error.file}` : ""
		await vscode.window.showErrorMessage(`Parsing error${lineInfo}${fileInfo}: ${error.message}`)

		// Highlight problematic line in editor if available
		if (error.file && error.line !== undefined) {
			await this.highlightErrorLine(error.file, error.line)
		}

		// Show diagnostic in Problems panel
		if (error.file) {
			await this.showDiagnostic(error)
		}
	}

	/**
	 * Highlight the problematic line in the editor
	 *
	 * @param filePath - Path to the file
	 * @param line - Line number (0-indexed)
	 */
	private async highlightErrorLine(filePath: string, line: number): Promise<void> {
		try {
			// Open the document
			const document = await vscode.workspace.openTextDocument(filePath)
			const editor = await vscode.window.showTextDocument(document)

			// Ensure line number is valid
			if (line < 0 || line >= document.lineCount) {
				return
			}

			// Create range for the line
			const lineText = document.lineAt(line)
			const range = new vscode.Range(line, 0, line, lineText.text.length)

			// Select and reveal the line
			editor.selection = new vscode.Selection(range.start, range.end)
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
		} catch (error) {
			// If we can't open the file, just log the error
			console.error(`Failed to highlight error line: ${error}`)
		}
	}

	/**
	 * Show diagnostic in Problems panel
	 *
	 * @param error - The parsing error
	 */
	private async showDiagnostic(error: ParsingError): Promise<void> {
		if (!error.file) {
			return
		}

		try {
			const uri = vscode.Uri.file(error.file)
			const document = await vscode.workspace.openTextDocument(uri)

			// Create diagnostic range
			const line = error.line ?? 0
			const lineText = line < document.lineCount ? document.lineAt(line) : null
			const range = lineText
				? new vscode.Range(line, 0, line, lineText.text.length)
				: new vscode.Range(line, 0, line, 100)

			// Create diagnostic
			const diagnostic = new vscode.Diagnostic(range, error.message, vscode.DiagnosticSeverity.Error)

			diagnostic.source = "SDD Cline Spec"

			// Set the diagnostic
			this.diagnosticCollection.set(uri, [diagnostic])
		} catch (error) {
			// If we can't create diagnostic, just log the error
			console.error(`Failed to create diagnostic: ${error}`)
		}
	}

	/**
	 * Clear all diagnostics
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
	 * Dispose of the diagnostic collection
	 */
	dispose(): void {
		this.diagnosticCollection.dispose()
	}
}
