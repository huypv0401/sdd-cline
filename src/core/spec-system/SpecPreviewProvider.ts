/**
 * SpecPreviewProvider - Webview provider for spec document preview
 *
 * This component is responsible for:
 * - Displaying spec documents (requirements, design, tasks) in a tabbed webview
 * - Handling tab switching between documents
 * - Auto-refreshing content when files change
 * - Providing interactive task execution buttons
 * - Syncing scroll position across sessions
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 18.5
 */

import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"
import type { Controller } from "../controller"
import { TaskOrchestrator } from "./TaskOrchestrator"
import { TasksParser } from "./TasksParser"
import type { SpecContent, WebviewToExtensionMessage } from "./types"

/**
 * SpecPreviewProvider implements WebviewViewProvider for spec document preview
 */
export class SpecPreviewProvider implements vscode.WebviewViewProvider {
	public static readonly VIEW_TYPE = "sddcline.specPreview"

	private view?: vscode.WebviewView
	private currentSpecName?: string
	private currentTab: "requirements" | "design" | "tasks" = "requirements"
	private scrollPositions: Map<string, number> = new Map()
	private fileWatchers: vscode.FileSystemWatcher[] = []
	private disposables: vscode.Disposable[] = []

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly controller: Controller,
	) {}

	/**
	 * Resolve webview view when it's first created
	 *
	 * Requirements: 5.5, 18.5
	 */
	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken,
	): void | Thenable<void> {
		this.view = webviewView

		// Configure webview options
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
		}

		// Set initial HTML content
		webviewView.webview.html = this.getHtmlContent(webviewView.webview)

		// Handle messages from webview
		this.setWebviewMessageListener(webviewView.webview)

		// Listen for when the view is disposed
		webviewView.onDidDispose(
			() => {
				this.dispose()
			},
			null,
			this.disposables,
		)

		// Listen for visibility changes
		webviewView.onDidChangeVisibility(
			() => {
				if (webviewView.visible && this.currentSpecName) {
					// Reload content when view becomes visible
					this.loadSpecContent()
				}
			},
			null,
			this.disposables,
		)
	}

	/**
	 * Show spec preview for a given spec name
	 *
	 * Requirements: 5.1
	 */
	async show(specName: string): Promise<void> {
		this.currentSpecName = specName
		await this.loadSpecContent()
		await this.setupFileWatchers()
	}

	/**
	 * Load spec content from files
	 *
	 * Requirements: 5.1
	 */
	private async loadSpecContent(): Promise<void> {
		if (!this.currentSpecName || !this.view) {
			return
		}

		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceRoot) {
			return
		}

		const specDir = path.join(workspaceRoot, ".sddcline", this.currentSpecName)

		try {
			const requirements = await this.readFile(path.join(specDir, "requirements.md"))
			const design = await this.readFile(path.join(specDir, "design.md"))
			const tasks = await this.readFile(path.join(specDir, "tasks.md"))

			const content: SpecContent = {
				requirements,
				design,
				tasks,
			}

			// Send content to webview
			this.view.webview.postMessage({
				type: "loadContent",
				content,
			})
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load spec content: ${error}`)
		}
	}

	/**
	 * Read file content with error handling
	 */
	private async readFile(filePath: string): Promise<string> {
		try {
			return await fs.promises.readFile(filePath, "utf-8")
		} catch (error) {
			return `# Error\n\nFailed to load file: ${path.basename(filePath)}`
		}
	}

	/**
	 * Switch active tab
	 *
	 * Requirements: 5.3
	 */
	private async switchTab(tab: "requirements" | "design" | "tasks"): Promise<void> {
		// Save current scroll position
		if (this.currentSpecName) {
			const scrollKey = `${this.currentSpecName}-${this.currentTab}`
			// Scroll position will be sent from webview
		}

		this.currentTab = tab

		// Send tab switch message to webview
		this.view?.webview.postMessage({
			type: "switchTab",
			tab,
		})

		// Restore scroll position for new tab
		if (this.currentSpecName) {
			const scrollKey = `${this.currentSpecName}-${tab}`
			const scrollPosition = this.scrollPositions.get(scrollKey) || 0

			this.view?.webview.postMessage({
				type: "restoreScroll",
				position: scrollPosition,
			})
		}
	}

	/**
	 * Save scroll position
	 *
	 * Requirements: 5.6
	 */
	private saveScrollPosition(tab: string, position: number): void {
		if (this.currentSpecName) {
			const scrollKey = `${this.currentSpecName}-${tab}`
			this.scrollPositions.set(scrollKey, position)
		}
	}

	/**
	 * Execute a single task
	 *
	 * Requirements: 6.2, 6.4
	 */
	private async executeTask(taskId: string): Promise<void> {
		if (!this.currentSpecName) {
			return
		}

		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceRoot) {
			return
		}

		const specDir = path.join(workspaceRoot, ".sddcline", this.currentSpecName)

		try {
			const orchestrator = new TaskOrchestrator(specDir, this.controller)
			const tasksParser = new TasksParser()
			const tasksFile = path.join(specDir, "tasks.md")
			const taskTree = await tasksParser.parse(tasksFile)
			const task = taskTree.findTask(taskId)

			if (task) {
				// Disable button during execution
				this.view?.webview.postMessage({
					type: "taskExecutionStarted",
					taskId,
				})

				await orchestrator.executeTask(task)

				// Reload content to show updated status
				await this.loadSpecContent()
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to execute task ${taskId}: ${error}`)
		}
	}

	/**
	 * Execute all tasks
	 *
	 * Requirements: 6.1, 6.3
	 */
	private async executeAllTasks(): Promise<void> {
		if (!this.currentSpecName) {
			return
		}

		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceRoot) {
			return
		}

		const specDir = path.join(workspaceRoot, ".sddcline", this.currentSpecName)

		try {
			const orchestrator = new TaskOrchestrator(specDir, this.controller)

			// Disable all buttons during execution
			this.view?.webview.postMessage({
				type: "allTasksExecutionStarted",
			})

			await orchestrator.executeAllTasks()

			// Reload content to show updated status
			await this.loadSpecContent()

			vscode.window.showInformationMessage("All tasks completed successfully")
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to execute tasks: ${error}`)
		}
	}

	/**
	 * Setup file watchers for auto-refresh
	 *
	 * Requirements: 5.7
	 */
	private async setupFileWatchers(): Promise<void> {
		// Clear existing watchers
		this.clearFileWatchers()

		if (!this.currentSpecName) {
			return
		}

		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
		if (!workspaceRoot) {
			return
		}

		const specDir = path.join(workspaceRoot, ".sddcline", this.currentSpecName)

		// Watch all three spec files
		const files = ["requirements.md", "design.md", "tasks.md"]

		for (const file of files) {
			const pattern = new vscode.RelativePattern(specDir, file)
			const watcher = vscode.workspace.createFileSystemWatcher(pattern)

			watcher.onDidChange(() => {
				this.loadSpecContent()
			})

			this.fileWatchers.push(watcher)
			this.disposables.push(watcher)
		}
	}

	/**
	 * Clear file watchers
	 */
	private clearFileWatchers(): void {
		for (const watcher of this.fileWatchers) {
			watcher.dispose()
		}
		this.fileWatchers = []
	}

	/**
	 * Set up message listener for webview
	 */
	private setWebviewMessageListener(webview: vscode.Webview): void {
		webview.onDidReceiveMessage(
			async (message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case "switchTab":
						await this.switchTab(message.tab)
						break
					case "executeTask":
						await this.executeTask(message.taskId)
						break
					case "executeAllTasks":
						await this.executeAllTasks()
						break
					case "refreshContent":
						await this.loadSpecContent()
						break
					case "saveScroll":
						this.saveScrollPosition(message.tab, message.position)
						break
					default:
						break
				}
			},
			null,
			this.disposables,
		)
	}

	/**
	 * Generate HTML content for webview
	 *
	 * Requirements: 5.1, 5.2, 5.4, 18.5
	 */
	private getHtmlContent(webview: vscode.Webview): string {
		// Get URIs for resources
		const markedUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "node_modules", "marked", "marked.min.js"),
		)

		const highlightJsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "node_modules", "highlight.js", "lib", "index.js"),
		)

		const highlightCssUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.context.extensionUri,
				"node_modules",
				"highlight.js",
				"styles",
				"github-dark.css",
			),
		)

		const nonce = this.getNonce()

		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
					style-src ${webview.cspSource} 'unsafe-inline'; 
					script-src 'nonce-${nonce}'; 
					font-src ${webview.cspSource};">
				<title>Spec Preview</title>
				<style>
					body {
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						color: var(--vscode-foreground);
						background-color: var(--vscode-editor-background);
						padding: 0;
						margin: 0;
						overflow: hidden;
					}

					.container {
						display: flex;
						flex-direction: column;
						height: 100vh;
					}

					.tabs {
						display: flex;
						border-bottom: 1px solid var(--vscode-panel-border);
						background: var(--vscode-sideBar-background);
						flex-shrink: 0;
					}

					.tab {
						padding: 10px 20px;
						cursor: pointer;
						border: none;
						background: transparent;
						color: var(--vscode-foreground);
						font-size: 13px;
						transition: background-color 0.2s;
					}

					.tab:hover {
						background-color: var(--vscode-list-hoverBackground);
					}

					.tab.active {
						border-bottom: 2px solid var(--vscode-focusBorder);
						font-weight: 600;
					}

					.content {
						flex: 1;
						overflow-y: auto;
						padding: 20px;
					}

					.content h1 {
						color: var(--vscode-foreground);
						border-bottom: 1px solid var(--vscode-panel-border);
						padding-bottom: 10px;
					}

					.content h2 {
						color: var(--vscode-foreground);
						margin-top: 24px;
					}

					.content h3 {
						color: var(--vscode-foreground);
						margin-top: 20px;
					}

					.content code {
						background-color: var(--vscode-textCodeBlock-background);
						padding: 2px 6px;
						border-radius: 3px;
						font-family: var(--vscode-editor-font-family);
					}

					.content pre {
						background-color: var(--vscode-textCodeBlock-background);
						padding: 12px;
						border-radius: 4px;
						overflow-x: auto;
					}

					.content pre code {
						background: none;
						padding: 0;
					}

					.task-actions {
						margin: 20px 0;
						padding: 10px;
						background-color: var(--vscode-sideBar-background);
						border-radius: 4px;
					}

					.execute-all-btn {
						padding: 8px 16px;
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 13px;
						font-weight: 500;
					}

					.execute-all-btn:hover {
						background-color: var(--vscode-button-hoverBackground);
					}

					.execute-all-btn:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}

					.task-item {
						display: flex;
						align-items: center;
						margin: 8px 0;
						padding: 4px 0;
					}

					.task-checkbox {
						margin-right: 8px;
						pointer-events: none;
					}

					.task-description {
						flex: 1;
						margin-right: 10px;
					}

					.execute-task-btn {
						padding: 4px 12px;
						background-color: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
						border: none;
						border-radius: 3px;
						cursor: pointer;
						font-size: 12px;
					}

					.execute-task-btn:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
					}

					.execute-task-btn:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}

					.loading {
						text-align: center;
						padding: 40px;
						color: var(--vscode-descriptionForeground);
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="tabs">
						<button class="tab active" data-tab="requirements">Requirements</button>
						<button class="tab" data-tab="design">Design</button>
						<button class="tab" data-tab="tasks">Tasks</button>
					</div>
					<div class="content" id="content">
						<div class="loading">Loading spec content...</div>
					</div>
				</div>

				<script nonce="${nonce}">
					const vscode = acquireVsCodeApi();
					let specContent = null;
					let currentTab = 'requirements';
					let executingTasks = new Set();

					// Tab switching
					document.querySelectorAll('.tab').forEach(tab => {
						tab.addEventListener('click', () => {
							const tabName = tab.dataset.tab;
							switchTab(tabName);
							vscode.postMessage({ type: 'switchTab', tab: tabName });
						});
					});

					function switchTab(tabName) {
						currentTab = tabName;
						
						// Update active tab
						document.querySelectorAll('.tab').forEach(t => {
							t.classList.toggle('active', t.dataset.tab === tabName);
						});

						// Render content
						if (specContent) {
							renderContent(tabName);
						}
					}

					function renderContent(tab) {
						const contentDiv = document.getElementById('content');
						const content = specContent[tab];

						if (tab === 'tasks') {
							renderTasksContent(content);
						} else {
							// Simple markdown rendering (basic)
							contentDiv.innerHTML = renderMarkdown(content);
						}
					}

					function renderMarkdown(markdown) {
						// Basic markdown rendering
						let html = markdown
							.replace(/^### (.+)$/gm, '<h3>$1</h3>')
							.replace(/^## (.+)$/gm, '<h2>$1</h2>')
							.replace(/^# (.+)$/gm, '<h1>$1</h1>')
							.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
							.replace(/\*(.+?)\*/g, '<em>$1</em>')
							.replace(/\`(.+?)\`/g, '<code>$1</code>')
							.replace(/^- (.+)$/gm, '<li>$1</li>')
							.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
							.replace(/\\n/g, '<br>');
						
						return html;
					}

					function renderTasksContent(markdown) {
						const contentDiv = document.getElementById('content');
						
						// Add execute all button
						let html = '<div class="task-actions">';
						html += '<button class="execute-all-btn" onclick="executeAllTasks()">Execute All Tasks</button>';
						html += '</div>';

						// Parse and render tasks with execute buttons
						const lines = markdown.split('\\n');
						let inTaskSection = false;

						for (const line of lines) {
							// Match task line: - [status] taskId description
							const taskMatch = line.match(/^(\\s*)- \\[(.)]\\s+([\\d.]+)\\s+(.+)$/);
							
							if (taskMatch) {
								inTaskSection = true;
								const [, indent, status, taskId, description] = taskMatch;
								const indentLevel = indent.length / 2;
								const isCompleted = status === 'x';
								const isExecuting = executingTasks.has(taskId);
								
								html += '<div class="task-item" style="margin-left: ' + (indentLevel * 20) + 'px;">';
								html += '<input type="checkbox" class="task-checkbox" ' + (isCompleted ? 'checked' : '') + ' disabled>';
								html += '<span class="task-description">' + taskId + ' ' + description + '</span>';
								html += '<button class="execute-task-btn" onclick="executeTask(\\''+taskId+'\\')" ' + 
									(isCompleted || isExecuting ? 'disabled' : '') + '>Execute</button>';
								html += '</div>';
							} else if (line.trim().startsWith('#')) {
								html += renderMarkdown(line);
							} else if (line.trim()) {
								html += '<p>' + line + '</p>';
							}
						}

						contentDiv.innerHTML = html;
					}

					function executeTask(taskId) {
						executingTasks.add(taskId);
						vscode.postMessage({ type: 'executeTask', taskId });
						renderContent(currentTab);
					}

					function executeAllTasks() {
						vscode.postMessage({ type: 'executeAllTasks' });
						document.querySelector('.execute-all-btn').disabled = true;
					}

					// Handle messages from extension
					window.addEventListener('message', event => {
						const message = event.data;
						
						switch (message.type) {
							case 'loadContent':
								specContent = message.content;
								renderContent(currentTab);
								break;
							
							case 'switchTab':
								switchTab(message.tab);
								break;
							
							case 'updateTaskStatus':
								// Reload content to show updated status
								vscode.postMessage({ type: 'refreshContent' });
								break;
							
							case 'taskExecutionStarted':
								executingTasks.add(message.taskId);
								renderContent(currentTab);
								break;
							
							case 'allTasksExecutionStarted':
								document.querySelector('.execute-all-btn').disabled = true;
								break;
							
							case 'restoreScroll':
								document.getElementById('content').scrollTop = message.position;
								break;
						}
					});

					// Save scroll position
					document.getElementById('content').addEventListener('scroll', (e) => {
						const position = e.target.scrollTop;
						vscode.postMessage({ 
							type: 'saveScroll', 
							tab: currentTab, 
							position 
						});
					});
				</script>
			</body>
			</html>
		`
	}

	/**
	 * Generate a nonce for CSP
	 */
	private getNonce(): string {
		let text = ""
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length))
		}
		return text
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.clearFileWatchers()

		while (this.disposables.length) {
			const disposable = this.disposables.pop()
			if (disposable) {
				disposable.dispose()
			}
		}
	}
}
