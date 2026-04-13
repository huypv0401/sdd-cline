/**
 * SpecSystem - Main entry point for spec operations
 *
 * This class serves as the coordinator for all spec-related operations,
 * including creating new specs and opening spec previews.
 *
 * Validates: Requirements 1.1, 1.4, 1.5, 15.1, 15.2, 15.3, 15.4, 15.5
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { ConfigManager } from "./ConfigManager"
import { WorkflowController } from "./WorkflowController"
import type { Controller } from "../controller"

/**
 * Main entry point for the Spec System
 */
export class SpecSystem {
	private configManager: ConfigManager
	private workflowController: WorkflowController

	constructor(
		private context: vscode.ExtensionContext,
		private controller?: Controller,
	) {
		this.configManager = new ConfigManager()
		this.workflowController = new WorkflowController(context, controller)
	}

	/**
	 * Create a new spec with user interaction
	 * Validates: Requirements 1.1, 1.4, 1.5, 15.1, 15.2, 15.3, 15.4, 15.5
	 */
	async createNewSpec(): Promise<void> {
		try {
			// Prompt for workflow type
			const workflowType = await this.promptWorkflowType()
			if (!workflowType) {
				return // User cancelled
			}

			// Prompt for spec name
			const specName = await this.promptSpecName()
			if (!specName) {
				return // User cancelled
			}

			// Validate spec name (kebab-case format)
			if (!this.validateSpecName(specName)) {
				vscode.window.showErrorMessage(
					"Invalid spec name. Use kebab-case format (e.g., 'my-feature-name').",
				)
				return
			}

			// Check if spec already exists
			if (await this.specExists(specName)) {
				vscode.window.showErrorMessage(`Spec "${specName}" already exists.`)
				return
			}

			// Show progress notification
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Creating spec: ${specName}`,
					cancellable: false,
				},
				async (progress) => {
					progress.report({ increment: 0, message: "Initializing..." })

					// Initialize workflow based on type
					if (workflowType === "requirements-first") {
						await this.workflowController.initRequirementsFirst(specName)
					} else {
						await this.workflowController.initDesignFirst(specName)
					}

					progress.report({ increment: 100, message: "Complete" })
				},
			)
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to create spec: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Open spec preview for a given spec file
	 * Validates: Requirements 15.5
	 */
	async openSpecPreview(filePath: string): Promise<void> {
		try {
			const specName = this.extractSpecName(filePath)
			if (!specName) {
				vscode.window.showErrorMessage("Could not determine spec name from file path")
				return
			}

			// TODO: Show preview using SpecPreviewProvider
			// This will be implemented when SpecPreviewProvider is created
			// await this.previewProvider.show(specName)
			vscode.window.showInformationMessage(
				`Opening preview for spec "${specName}" will be implemented in SpecPreviewProvider`,
			)
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open spec preview: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Prompt user to select workflow type
	 * Validates: Requirements 15.2
	 */
	private async promptWorkflowType(): Promise<"requirements-first" | "design-first" | undefined> {
		const result = await vscode.window.showQuickPick(
			[
				{
					label: "Requirements-First",
					description: "Start with requirements, then generate design and tasks",
					value: "requirements-first" as const,
				},
				{
					label: "Design-First",
					description: "Start with design, then generate tasks",
					value: "design-first" as const,
				},
			],
			{
				placeHolder: "Select workflow type",
				title: "Create New Spec",
			},
		)

		return result?.value
	}

	/**
	 * Prompt user to enter spec name
	 * Validates: Requirements 15.3, 15.4
	 */
	private async promptSpecName(): Promise<string | undefined> {
		return await vscode.window.showInputBox({
			prompt: "Enter spec name (kebab-case format)",
			placeHolder: "my-feature-name",
			validateInput: (value: string) => {
				if (!value) {
					return "Spec name is required"
				}
				if (!this.validateSpecName(value)) {
					return "Invalid format. Use kebab-case (lowercase letters, numbers, and hyphens only)"
				}
				return null
			},
		})
	}

	/**
	 * Validate spec name format (kebab-case)
	 * Validates: Requirements 1.5
	 *
	 * @param name - The spec name to validate
	 * @returns true if name is valid kebab-case format
	 */
	private validateSpecName(name: string): boolean {
		// Regex pattern: ^[a-z0-9]+(-[a-z0-9]+)*$
		// - Must start with lowercase letter or number
		// - Can contain hyphens followed by lowercase letters or numbers
		// - Cannot start or end with hyphen
		// - Cannot have consecutive hyphens
		return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
	}

	/**
	 * Check if spec directory already exists
	 * Validates: Requirements 1.4
	 *
	 * @param specName - The spec name to check
	 * @returns true if spec directory exists
	 */
	private async specExists(specName: string): Promise<boolean> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			throw new Error("No workspace folder open")
		}

		const specPath = path.join(workspaceFolder.uri.fsPath, ".sddcline", specName)

		try {
			await fs.promises.access(specPath, fs.constants.F_OK)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Extract spec name from file path
	 *
	 * @param filePath - Path to a spec file
	 * @returns The spec name, or undefined if not a valid spec file path
	 */
	private extractSpecName(filePath: string): string | undefined {
		// Expected path format: .../workspace/.sddcline/{spec-name}/file.md
		const parts = filePath.split(path.sep)
		const sddclineIndex = parts.findIndex((part) => part === ".sddcline")

		if (sddclineIndex === -1 || sddclineIndex >= parts.length - 1) {
			return undefined
		}

		return parts[sddclineIndex + 1]
	}
}
