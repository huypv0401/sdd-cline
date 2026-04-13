/**
 * ConfigManager - Manages spec configuration files
 *
 * This module handles creation, loading, and validation of .config.kiro files
 * that store metadata for each spec.
 */

import * as fs from "fs"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import { SpecConfig } from "./types"

/**
 * Manages spec configuration files (.config.kiro)
 */
export class ConfigManager {
	/**
	 * Create a new config file for a spec
	 *
	 * @param specDir - Path to the spec directory
	 * @param config - Configuration object to save
	 * @throws Error if file write fails
	 */
	async createConfig(specDir: string, config: SpecConfig): Promise<void> {
		const configPath = path.join(specDir, ".config.kiro")
		const content = JSON.stringify(config, null, 2)

		try {
			await fs.promises.writeFile(configPath, content, "utf-8")
		} catch (error) {
			throw new Error(`Failed to create config file: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Load config from a spec directory
	 *
	 * @param specDir - Path to the spec directory
	 * @param recreateIfInvalid - If true, recreate config with defaults when missing or invalid
	 * @returns Parsed configuration object
	 * @throws Error if file doesn't exist or parsing fails (when recreateIfInvalid is false)
	 */
	async loadConfig(specDir: string, recreateIfInvalid = false): Promise<SpecConfig> {
		const configPath = path.join(specDir, ".config.kiro")

		try {
			const content = await fs.promises.readFile(configPath, "utf-8")
			const config = JSON.parse(content) as SpecConfig

			// Validate the loaded config
			if (!this.validateConfig(config)) {
				if (recreateIfInvalid) {
					// Recreate with default values
					return await this.recreateConfigWithDefaults(specDir)
				}
				throw new Error("Invalid config format")
			}

			return config
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ENOENT") {
				if (recreateIfInvalid) {
					// Recreate with default values
					return await this.recreateConfigWithDefaults(specDir)
				}
				throw new Error(`Config file not found: ${configPath}`)
			}

			// For JSON parsing errors or other errors
			if (recreateIfInvalid) {
				return await this.recreateConfigWithDefaults(specDir)
			}

			throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Recreate config file with default values
	 *
	 * @param specDir - Path to the spec directory
	 * @returns The newly created default config
	 */
	private async recreateConfigWithDefaults(specDir: string): Promise<SpecConfig> {
		const defaultConfig: SpecConfig = {
			specId: this.generateSpecId(),
			workflowType: "requirements-first",
			specType: "feature",
			createdAt: new Date().toISOString(),
		}

		await this.createConfig(specDir, defaultConfig)
		return defaultConfig
	}

	/**
	 * Update an existing config file
	 *
	 * @param specDir - Path to the spec directory
	 * @param updates - Partial config object with fields to update
	 * @throws Error if config doesn't exist or update fails
	 */
	async updateConfig(specDir: string, updates: Partial<SpecConfig>): Promise<void> {
		// Load existing config
		const config = await this.loadConfig(specDir)

		// Merge updates and set lastModified timestamp
		const updatedConfig: SpecConfig = {
			...config,
			...updates,
			lastModified: new Date().toISOString(),
		}

		// Validate the updated config
		if (!this.validateConfig(updatedConfig)) {
			throw new Error("Updated config would be invalid")
		}

		// Save updated config
		await this.createConfig(specDir, updatedConfig)
	}

	/**
	 * Generate a unique spec ID using UUID v4
	 *
	 * @returns A unique UUID string
	 */
	generateSpecId(): string {
		return uuidv4()
	}

	/**
	 * Validate config format
	 *
	 * @param config - Configuration object to validate
	 * @returns true if valid, false otherwise
	 */
	validateConfig(config: any): config is SpecConfig {
		return (
			typeof config === "object" &&
			config !== null &&
			typeof config.specId === "string" &&
			config.specId.length > 0 &&
			(config.workflowType === "requirements-first" || config.workflowType === "design-first") &&
			(config.specType === "feature" || config.specType === "bugfix" || config.specType === "refactor") &&
			typeof config.createdAt === "string" &&
			config.createdAt.length > 0
		)
	}
}
