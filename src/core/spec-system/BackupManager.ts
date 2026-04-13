/**
 * BackupManager - Manages file backups before destructive operations
 *
 * This component is responsible for:
 * - Backing up files before destructive operations
 * - Restoring from backup on failure
 * - Cleaning up old backups
 *
 * Requirements: 17.3
 */

import * as fs from "fs"
import * as path from "path"

/**
 * BackupManager handles file backup and restore operations
 */
export class BackupManager {
	private backupDir: string
	private maxBackupAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

	constructor(specDir: string) {
		this.backupDir = path.join(specDir, ".backups")
	}

	/**
	 * Backup a file before performing a destructive operation
	 *
	 * @param filePath - Path to the file to backup
	 * @returns Promise that resolves to the backup file path
	 */
	async backupBeforeOperation(filePath: string): Promise<string> {
		// Ensure backup directory exists
		await this.ensureBackupDirectory()

		// Generate backup filename with timestamp
		const timestamp = Date.now()
		const basename = path.basename(filePath)
		const backupFilename = `${basename}.backup.${timestamp}`
		const backupPath = path.join(this.backupDir, backupFilename)

		// Copy file to backup location
		await fs.promises.copyFile(filePath, backupPath)

		return backupPath
	}

	/**
	 * Restore a file from backup
	 *
	 * @param backupPath - Path to the backup file
	 * @param originalPath - Path where the file should be restored
	 */
	async restoreFromBackup(backupPath: string, originalPath: string): Promise<void> {
		// Copy backup file to original location
		await fs.promises.copyFile(backupPath, originalPath)

		// Optionally delete the backup after successful restore
		// await fs.promises.unlink(backupPath)
	}

	/**
	 * List all backups for a specific file
	 *
	 * @param filename - Name of the file to find backups for
	 * @returns Promise that resolves to array of backup paths
	 */
	async listBackups(filename: string): Promise<string[]> {
		try {
			await this.ensureBackupDirectory()

			const files = await fs.promises.readdir(this.backupDir)
			const backups = files
				.filter((file) => file.startsWith(`${filename}.backup.`))
				.map((file) => path.join(this.backupDir, file))

			// Sort by timestamp (newest first)
			backups.sort((a, b) => {
				const timestampA = this.extractTimestamp(a)
				const timestampB = this.extractTimestamp(b)
				return timestampB - timestampA
			})

			return backups
		} catch (error) {
			return []
		}
	}

	/**
	 * Get the most recent backup for a file
	 *
	 * @param filename - Name of the file
	 * @returns Promise that resolves to the most recent backup path, or null if none exists
	 */
	async getMostRecentBackup(filename: string): Promise<string | null> {
		const backups = await this.listBackups(filename)
		return backups.length > 0 ? backups[0] : null
	}

	/**
	 * Clean up old backups
	 *
	 * @param maxAge - Maximum age in milliseconds (defaults to 7 days)
	 */
	async cleanupOldBackups(maxAge?: number): Promise<void> {
		const ageThreshold = maxAge ?? this.maxBackupAge
		const now = Date.now()

		try {
			await this.ensureBackupDirectory()

			const files = await fs.promises.readdir(this.backupDir)

			for (const file of files) {
				if (!file.includes(".backup.")) {
					continue
				}

				const filePath = path.join(this.backupDir, file)
				const timestamp = this.extractTimestamp(filePath)

				if (now - timestamp > ageThreshold) {
					await fs.promises.unlink(filePath)
				}
			}
		} catch (error) {
			console.error("Failed to cleanup old backups:", error)
		}
	}

	/**
	 * Delete a specific backup
	 *
	 * @param backupPath - Path to the backup file to delete
	 */
	async deleteBackup(backupPath: string): Promise<void> {
		await fs.promises.unlink(backupPath)
	}

	/**
	 * Delete all backups for a specific file
	 *
	 * @param filename - Name of the file
	 */
	async deleteAllBackups(filename: string): Promise<void> {
		const backups = await this.listBackups(filename)

		for (const backup of backups) {
			await this.deleteBackup(backup)
		}
	}

	/**
	 * Ensure backup directory exists
	 */
	private async ensureBackupDirectory(): Promise<void> {
		try {
			await fs.promises.mkdir(this.backupDir, { recursive: true })
		} catch (error) {
			// Directory might already exist, ignore error
		}
	}

	/**
	 * Extract timestamp from backup filename
	 *
	 * @param backupPath - Path to backup file
	 * @returns Timestamp in milliseconds
	 */
	private extractTimestamp(backupPath: string): number {
		const filename = path.basename(backupPath)
		const match = filename.match(/\.backup\.(\d+)$/)
		return match ? parseInt(match[1], 10) : 0
	}

	/**
	 * Get backup directory path
	 */
	getBackupDirectory(): string {
		return this.backupDir
	}
}
