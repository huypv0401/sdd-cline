/**
 * FileSystemErrorHandler - Handles file system errors gracefully
 *
 * This component is responsible for:
 * - Handling ENOENT, EACCES, ENOSPC errors
 * - Showing user-friendly error messages
 * - Providing context-specific error handling
 *
 * Requirements: 17.1
 */

import * as vscode from "vscode"

/**
 * Node.js file system error codes
 */
interface NodeError extends Error {
	code?: string
	errno?: number
	syscall?: string
	path?: string
}

/**
 * FileSystemErrorHandler handles file I/O errors gracefully
 */
export class FileSystemErrorHandler {
	/**
	 * Handle file system errors with user-friendly messages
	 *
	 * @param error - The error that occurred
	 * @param operation - Description of the operation that failed
	 * @returns Promise that resolves when error is handled
	 */
	async handleFileError(error: unknown, operation: string): Promise<void> {
		const nodeError = error as NodeError

		if (nodeError.code === "ENOENT") {
			await vscode.window.showErrorMessage(
				`File not found during ${operation}. Please check the file path.${nodeError.path ? ` Path: ${nodeError.path}` : ""}`,
			)
		} else if (nodeError.code === "EACCES" || nodeError.code === "EPERM") {
			await vscode.window.showErrorMessage(
				`Permission denied during ${operation}. Please check file permissions.${nodeError.path ? ` Path: ${nodeError.path}` : ""}`,
			)
		} else if (nodeError.code === "ENOSPC") {
			await vscode.window.showErrorMessage(`No space left on device during ${operation}.`)
		} else if (nodeError.code === "EISDIR") {
			await vscode.window.showErrorMessage(
				`Expected a file but found a directory during ${operation}.${nodeError.path ? ` Path: ${nodeError.path}` : ""}`,
			)
		} else if (nodeError.code === "ENOTDIR") {
			await vscode.window.showErrorMessage(
				`Expected a directory but found a file during ${operation}.${nodeError.path ? ` Path: ${nodeError.path}` : ""}`,
			)
		} else if (nodeError.code === "EEXIST") {
			await vscode.window.showErrorMessage(
				`File or directory already exists during ${operation}.${nodeError.path ? ` Path: ${nodeError.path}` : ""}`,
			)
		} else {
			const message = nodeError instanceof Error ? nodeError.message : String(error)
			await vscode.window.showErrorMessage(`File system error during ${operation}: ${message}`)
		}
	}

	/**
	 * Validate file permissions before attempting write operations
	 *
	 * @param filePath - Path to the file to check
	 * @returns Promise that resolves to true if file is writable
	 */
	async validateFilePermissions(filePath: string): Promise<boolean> {
		try {
			const fs = await import("fs")
			await fs.promises.access(filePath, fs.constants.W_OK)
			return true
		} catch (error) {
			const nodeError = error as NodeError
			if (nodeError.code === "ENOENT") {
				// File doesn't exist yet, check parent directory
				const path = await import("path")
				const parentDir = path.dirname(filePath)
				try {
					const fs = await import("fs")
					await fs.promises.access(parentDir, fs.constants.W_OK)
					return true
				} catch {
					return false
				}
			}
			return false
		}
	}

	/**
	 * Check if a path exists
	 *
	 * @param filePath - Path to check
	 * @returns Promise that resolves to true if path exists
	 */
	async pathExists(filePath: string): Promise<boolean> {
		try {
			const fs = await import("fs")
			await fs.promises.access(filePath)
			return true
		} catch {
			return false
		}
	}
}
