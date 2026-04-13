# SpecPreviewProvider Integration Guide

## Overview

The SpecPreviewProvider has been implemented and is ready to be integrated into the VSCode extension. This document provides instructions for completing the integration.

## What Has Been Implemented

### Task 13.1: Create SpecPreviewProvider class ✓
- Created `SpecPreviewProvider.ts` implementing `vscode.WebviewViewProvider`
- Initialized with extension context and controller
- Set up proper disposal and resource management

### Task 13.2: Implement webview HTML generation ✓
- Created `getHtmlContent()` method with tab navigation UI
- Added VSCode theme-aware styling
- Implemented basic markdown rendering in JavaScript
- Added proper Content Security Policy

### Task 13.3: Implement spec content loading ✓
- Created `loadSpecContent()` method to read spec files
- Implemented `readFile()` helper with error handling
- Added message passing to send content to webview

### Task 13.4: Implement tab switching ✓
- Created `switchTab()` method to handle tab changes
- Implemented webview message handling for tab clicks
- Added active tab state management

### Task 13.5: Implement auto-refresh on file changes ✓
- Created `setupFileWatchers()` method
- Watches requirements.md, design.md, and tasks.md
- Auto-reloads content when files change
- Proper cleanup of watchers on disposal

### Task 13.6: Implement scroll position sync ✓
- Created `saveScrollPosition()` method
- Stores scroll positions per tab
- Restores scroll position when switching tabs
- Persists across webview visibility changes

## Integration Steps

### Step 1: Register the Webview View Provider

Add to `package.json` in the `contributes` section:

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "sddcline-specs",
          "title": "SDD Cline Specs",
          "icon": "assets/icons/spec-icon.svg"
        }
      ]
    },
    "views": {
      "sddcline-specs": [
        {
          "type": "webview",
          "id": "sddcline.specPreview",
          "name": "Spec Preview"
        }
      ]
    }
  }
}
```

### Step 2: Register Commands

Add to `package.json` commands:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "sddcline.openSpecPreview",
        "title": "Open Spec Preview",
        "category": "SDD Cline"
      }
    ]
  }
}
```

### Step 3: Initialize in extension.ts

Add to the `activate()` function in `src/extension.ts`:

```typescript
import { SpecSystem } from "./core/spec-system"

export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Initialize Spec System
  const specSystem = new SpecSystem(context, webview.controller)
  
  // Register webview view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "sddcline.specPreview",
      specSystem.getPreviewProvider(),
      {
        webviewOptions: { retainContextWhenHidden: true }
      }
    )
  )

  // Register command to open spec preview
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sddcline.openSpecPreview",
      async (uri: vscode.Uri) => {
        await specSystem.openSpecPreview(uri.fsPath)
      }
    )
  )

  // ... rest of activation code ...
}
```

### Step 4: Add Context Menu Integration (Optional)

Add to `package.json` to show "Open Spec Preview" in file explorer:

```json
{
  "contributes": {
    "menus": {
      "explorer/context": [
        {
          "command": "sddcline.openSpecPreview",
          "when": "resourcePath =~ /\\.sddcline\\/.*\\.md$/",
          "group": "navigation"
        }
      ]
    }
  }
}
```

## Features Implemented

### Tab Navigation
- Three tabs: Requirements, Design, Tasks
- Active tab highlighting
- Smooth tab switching with state preservation

### Content Display
- Markdown rendering with syntax highlighting
- VSCode theme integration
- Responsive layout

### Task Execution
- "Execute All Tasks" button in Tasks tab
- Individual "Execute Task" buttons for each task
- Button state management (disabled during execution)
- Real-time status updates

### Auto-Refresh
- File watchers for all three spec files
- Automatic content reload on file changes
- No manual refresh needed

### Scroll Position Sync
- Saves scroll position per tab
- Restores position when switching tabs
- Persists across webview visibility changes

## Type Definitions

All necessary types have been added to `types.ts`:

- `SpecContent` - Content for all three documents
- `WebviewToExtensionMessage` - Messages from webview to extension
- `ExtensionToWebviewMessage` - Messages from extension to webview

## Dependencies

The implementation uses standard VSCode APIs and doesn't require additional npm packages. The webview uses basic JavaScript for markdown rendering to keep it lightweight.

## Testing

To test the implementation:

1. Create a spec using the existing workflow
2. Open the Spec Preview view from the activity bar
3. Verify all three tabs display content correctly
4. Test tab switching and scroll position preservation
5. Modify a spec file and verify auto-refresh works
6. Test task execution buttons (if tasks are available)

## Next Steps

After integration:

1. Add icon for the spec view container (create `assets/icons/spec-icon.svg`)
2. Consider adding keyboard shortcuts for common operations
3. Add more sophisticated markdown rendering if needed
4. Implement progress indicators for task execution
5. Add error handling UI for failed operations

## Notes

- The implementation follows VSCode webview best practices
- All resources are properly disposed to prevent memory leaks
- The webview uses Content Security Policy for security
- Message passing is type-safe using TypeScript types
