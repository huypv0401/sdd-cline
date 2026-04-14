/**
 * WorkflowController - Manages workflow logic and document generation
 *
 * This class orchestrates the requirements-first and design-first workflows,
 * handling document generation, user approval, and integration with Cline's Controller.
 *
 * Validates: Requirements 1.1, 1.2, 2.1-2.8, 3.1-3.6, 4.1-4.6, 11.2, 11.6, 15.7, 16.1-16.4
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { ConfigManager } from "./ConfigManager"
import { RequirementsParser } from "./RequirementsParser"
import { TasksParser } from "./TasksParser"
import type { SpecConfig } from "./types"
import type { Controller } from "../controller"

/**
 * WorkflowController manages the spec workflow logic
 */
export class WorkflowController {
	private configManager: ConfigManager
	private requirementsParser: RequirementsParser
	private tasksParser: TasksParser
	private fileSystemErrorHandler: FileSystemErrorHandler

	constructor(
		private context: vscode.ExtensionContext,
		private controller?: Controller,
	) {
		this.configManager = new ConfigManager()
		this.requirementsParser = new RequirementsParser()
		this.tasksParser = new TasksParser()
		this.fileSystemErrorHandler = new FileSystemErrorHandler()
	}

	/**
	 * Initialize requirements-first workflow
	 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
	 */
	async initRequirementsFirst(specName: string): Promise<void> {
		try {
			// Create spec directory structure
			const specDir = await this.createSpecDirectory(specName)

			// Create config file
			await this.createConfigFile(specDir, {
				specId: uuidv4(),
				workflowType: "requirements-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			})

			// Generate requirements document
			await this.generateRequirements(specDir, specName)

			// Open requirements for review
			const requirementsPath = path.join(specDir, "requirements.md")
			await this.openDocument(requirementsPath)

			// Wait for user approval
			const requirementsApproved = await this.waitForApproval("requirements")
			if (!requirementsApproved) {
				return // User cancelled
			}

			// Generate design document
			await this.generateDesign(specDir, specName)

			// Open design for review
			const designPath = path.join(specDir, "design.md")
			await this.openDocument(designPath)

			// Wait for user approval
			const designApproved = await this.waitForApproval("design")
			if (!designApproved) {
				return // User cancelled
			}

			// Generate tasks document
			await this.generateTasks(specDir, specName)

			// Open tasks for review
			const tasksPath = path.join(specDir, "tasks.md")
			await this.openDocument(tasksPath)

			vscode.window.showInformationMessage(`Spec "${specName}" created successfully!`)
		} catch (error) {
			throw new Error(`Failed to initialize requirements-first workflow: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Initialize design-first workflow
	 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
	 */
	async initDesignFirst(specName: string): Promise<void> {
		try {
			// Create spec directory structure
			const specDir = await this.createSpecDirectory(specName)

			// Create config file
			await this.createConfigFile(specDir, {
				specId: uuidv4(),
				workflowType: "design-first",
				specType: "feature",
				createdAt: new Date().toISOString(),
			})

			// Generate design document
			await this.generateDesign(specDir, specName)

			// Open design for review
			const designPath = path.join(specDir, "design.md")
			await this.openDocument(designPath)

			// Wait for user approval
			const designApproved = await this.waitForApproval("design")
			if (!designApproved) {
				return // User cancelled
			}

			// Generate tasks document
			await this.generateTasks(specDir, specName)

			// Open tasks for review
			const tasksPath = path.join(specDir, "tasks.md")
			await this.openDocument(tasksPath)

			vscode.window.showInformationMessage(`Spec "${specName}" created successfully!`)
		} catch (error) {
			throw new Error(`Failed to initialize design-first workflow: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Create spec directory structure
	 * Validates: Requirements 1.1, 11.6
	 */
	private async createSpecDirectory(specName: string): Promise<string> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			throw new Error("No workspace folder open")
		}

		const specDir = path.join(workspaceFolder.uri.fsPath, ".sddcline", specName)

		try {
			// Create directory recursively
			await fs.promises.mkdir(specDir, { recursive: true })
		} catch (error) {
			await this.fileSystemErrorHandler.handleFileError(error, "creating spec directory")
			throw error
		}

		return specDir
	}

	/**
	 * Create config file for spec
	 * Validates: Requirements 1.2, 16.1, 16.2, 16.3, 16.4
	 */
	private async createConfigFile(specDir: string, config: SpecConfig): Promise<void> {
		await this.configManager.createConfig(specDir, config)
	}

	/**
	 * Generate requirements document
	 * Validates: Requirements 2.2, 2.7, 2.8
	 */
	private async generateRequirements(specDir: string, specName: string): Promise<void> {
		// TODO: Integrate with Cline Controller to generate requirements
		// For now, create a placeholder requirements document
		const requirementsPath = path.join(specDir, "requirements.md")
		const placeholderContent = `# Requirements Document

## Introduction

[Feature overview for ${specName}]

## Glossary

- **Term**: Definition

## Requirements

### Requirement 1: [Title]

**User Story:** As a [role], I want [goal], so that [benefit].

#### Acceptance Criteria

1. WHEN [event] THEN THE system SHALL [action]
2. THE system SHALL [action] [condition]
`

		try {
			await fs.promises.writeFile(requirementsPath, placeholderContent, "utf-8")
		} catch (error) {
			await this.fileSystemErrorHandler.handleFileError(error, "writing requirements document")
			throw error
		}
	}

	/**
	 * Generate design document
	 * Validates: Requirements 3.2
	 */
	private async generateDesign(specDir: string, specName: string): Promise<void> {
		// TODO: Integrate with Cline Controller to generate design
		// For now, create a placeholder design document
		const designPath = path.join(specDir, "design.md")
		const placeholderContent = `# Design Document

## Overview

[High-level design overview for ${specName}]

## Architecture

[Architecture diagrams and descriptions]

## Components and Interfaces

[Detailed component designs with code examples]

## Data Models

[Data structures and schemas]

## Correctness Properties

[Property-based testing properties]

## Error Handling

[Error handling strategies]

## Testing Strategy

[Testing approach and requirements]
`

		try {
			await fs.promises.writeFile(designPath, placeholderContent, "utf-8")
		} catch (error) {
			await this.fileSystemErrorHandler.handleFileError(error, "writing design document")
			throw error
		}
	}

	/**
	 * Generate tasks document
	 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
	 */
	private async generateTasks(specDir: string, specName: string): Promise<void> {
		// TODO: Integrate with Cline Controller to generate tasks
		// For now, create a placeholder tasks document
		const tasksPath = path.join(specDir, "tasks.md")
		const placeholderContent = `# Implementation Plan: ${specName}

## Overview

[Implementation plan overview]

## Tasks

- [ ] 1. Setup project structure
  - [ ] 1.1 Create directory structure
  - [ ] 1.2 Initialize configuration

- [ ] 2. Implement core features
  - [ ] 2.1 Implement feature A
  - [ ] 2.2 Implement feature B

- [ ] 3. Write tests
  - [ ] 3.1 Unit tests
  - [ ] 3.2 Integration tests
`

		try {
			await fs.promises.writeFile(tasksPath, placeholderContent, "utf-8")
		} catch (error) {
			await this.fileSystemErrorHandler.handleFileError(error, "writing tasks document")
			throw error
		}
	}

	/**
	 * Wait for user approval of a document
	 * Validates: Requirements 2.3, 2.4, 3.3, 3.4, 4.5, 4.6, 15.7
	 */
	private async waitForApproval(documentType: string): Promise<boolean> {
		const result = await vscode.window.showInformationMessage(
			`Review ${documentType} document`,
			{ modal: true },
			"Approve",
			"Modify",
			"Cancel",
		)

		if (result === "Approve") {
			return true
		} else if (result === "Modify") {
			// Show message to user to modify the document
			vscode.window.showInformationMessage(
				`Please modify the ${documentType} document and save your changes. Click "Approve" when ready to continue.`,
			)

			// Wait for user to approve again
			return await this.waitForApproval(documentType)
		} else {
			// User cancelled
			return false
		}
	}

	/**
	 * Open a document in the editor
	 */
	private async openDocument(filePath: string): Promise<void> {
		const document = await vscode.workspace.openTextDocument(filePath)
		await vscode.window.showTextDocument(document, {
			preview: false,
			viewColumn: vscode.ViewColumn.One,
		})
	}
}
