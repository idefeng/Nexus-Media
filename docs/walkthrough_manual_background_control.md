# Background Task Manual Control Walkthrough

I have implemented manual controls for background processing tasks (EXIF extraction and AI analysis) in the Settings page. This allows users to manage resource usage and trigger tasks on demand.

## Changes

### 1. Settings Page UI
- **EXIF Configuration Section**: Added a new section for EXIF metadata settings.
    - **Auto-Extract Toggle**: Controls whether EXIF data is automatically extracted when files are scanned.
    - **Run Now Button**: Manually triggers EXIF extraction for pending files.
- **AI Configuration Section**: Enhanced the existing AI section.
    - **Auto-Analyze Toggle**: Controls whether AI analysis runs automatically.
    - **Run Now Button**: Manually triggers AI analysis for pending files.

### 2. Backend Logic
- **Configuration Store**: Added persistence for `exif.autoExtract` setting.
- **Task Scheduling**: Updated the main background loop to respect the "Auto" flags. If a feature is disabled or set to manual-only, the background loop will skip it.
- **IPC Handlers**: Added new IPC channels to support the manual "Run Now" buttons and configuration toggles.

## Verification

### Manual Verification Required
1.  **Restart Application**: Necessary for backend changes to take effect.
2.  **Check Settings**: Go to the Settings page.
3.  **Test Toggles**: Turn off "Auto Extract EXIF" and "Auto Analyze".
    - Verify that no background activity logs appear for these tasks.
4.  **Test Manual Triggers**: Click "Run Now" for EXIF or AI.
    - Verify that the task starts immediately (check logs or task status).
5.  **Test Persistence**: Restart the app and verify that your toggle settings are remembered.
