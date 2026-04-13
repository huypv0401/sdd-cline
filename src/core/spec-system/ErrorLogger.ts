/**
 * ErrorLogger - Logs errors to file with timestamps
 *
 * This component is responsible for:
 * - Logging errors to .error-log.txt
 * - Including timestamp, context, and stack trace
 * - Providing method to retrieve recent errors
 *
 * Requirements: 17.1
 */

import * as fs from "fs"
import * as path from "path"

/**
 * Error log file name
 */
const ERROR_LOG_FILE = ".error-log.txt"

/**
 * ErrorLogger logs errors to a file with timestamps and context
 */
export class ErrorLogger {
	private logFilePath: string

	constructor(specDir: string) {
		this.logFilePath = path.join(specDir, ERROR_LOG_FILE)
	}

	/**
	 * Log an error to the error log file
	 *
	 * @param error - The error to log
	 * @param context - Context information about where/when the error occurred
	 */
	async logError(error: Error, context: string): Promise<void> {
		const timestamp = new Date().toISOString()
		const logEntry = this.formatLogEntry(timestamp, context, error)

		try {
			await fs.promises.appendFile(this.logFilePath, logEntry, "utf-8")
		} catch (writeError) {
			console.error("Failed to write to error log:", writeError)
		}
	}

	/**
	 * Format a log entry
	 *
	 * @param timestamp - ISO timestamp
	 * @param context - Context information
	 * @param error - The error object
	 * @returns Formatted log entry string
	 */
	private formatLogEntry(timestamp: string, context: string, error: Error): string {
		return `
[${timestamp}] ${context}
Error: ${error.message}
Stack: ${error.stack || "No stack trace available"}
---
`
	}

	/**
	 * Get recent errors from the log
	 *
	 * @param count - Number of recent errors to retrieve (default: 10)
	 * @returns Promise that resolves to array of log entries
	 */
	async getRecentErrors(count: number = 10): Promise<string[]> {
		try {
			const content = await fs.promises.readFile(this.logFilePath, "utf-8")
			const entries = content.split("---\n").filter((e) => e.trim())

			// Return the most recent entries
			return entries.slice(-count)
		} catch (error) {
			// Log file doesn't exist or can't be read
			return []
		}
	}

	/**
	 * Get all errors from the log
	 *
	 * @returns Promise that resolves to array of all log entries
	 */
	async getAllErrors(): Promise<string[]> {
		try {
			const content = await fs.promises.readFile(this.logFilePath, "utf-8")
			return content.split("---\n").filter((e) => e.trim())
		} catch (error) {
			return []
		}
	}

	/**
	 * Clear the error log
	 */
	async clearLog(): Promise<void> {
		try {
			await fs.promises.writeFile(this.logFilePath, "", "utf-8")
		} catch (error) {
			console.error("Failed to clear error log:", error)
		}
	}

	/**
	 * Get error log file path
	 */
	getLogFilePath(): string {
		return this.logFilePath
	}

	/**
	 * Check if error log exists
	 *
	 * @returns Promise that resolves to true if log file exists
	 */
	async logExists(): Promise<boolean> {
		try {
			await fs.promises.access(this.logFilePath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Get error log file size in bytes
	 *
	 * @returns Promise that resolves to file size, or 0 if file doesn't exist
	 */
	async getLogSize(): Promise<number> {
		try {
			const stats = await fs.promises.stat(this.logFilePath)
			return stats.size
		} catch {
			return 0
		}
	}

	/**
	 * Rotate log file if it exceeds size limit
	 *
	 * @param maxSizeBytes - Maximum log file size in bytes (default: 1MB)
	 */
	async rotateLogIfNeeded(maxSizeBytes: number = 1024 * 1024): Promise<void> {
		const size = await this.getLogSize()

		if (size > maxSizeBytes) {
			// Create backup of current log
			const timestamp = Date.now()
			const backupPath = `${this.logFilePath}.${timestamp}`

			try {
				await fs.promises.rename(this.logFilePath, backupPath)
			} catch (error) {
				console.error("Failed to rotate log file:", error)
			}
		}
	}

	/**
	 * Log a simple message (not an error)
	 *
	 * @param message - Message to log
	 * @param context - Context information
	 */
	async logMessage(message: string, context: string): Promise<void> {
		const timestamp = new Date().toISOString()
		const logEntry = `
[${timestamp}] ${context}
Message: ${message}
---
`

		try {
			await fs.promises.appendFile(this.logFilePath, logEntry, "utf-8")
		} catch (writeError) {
			console.error("Failed to write to error log:", writeError)
		}
	}
}
