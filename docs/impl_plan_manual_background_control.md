# Manual Control for Background Tasks

## Goal Description
Allow users to manually control (start/stop/toggle auto) background tasks for EXIF extraction and AI analysis. This prevents resource contention and gives users more control over when heavy processing occurs.

## User Review Required
> [!NOTE]
> I will be adding a new "EXIF Configuration" section to the Settings page and enhancing the "AI Configuration" section.
> Default behavior: Auto-analysis will remain enabled by default, but users can now turn it off.

## Proposed Changes

### Backend

#### [MODIFY] [electron/config-store.ts](file:///e:/dev/Client/Nexus-Media/electron/config-store.ts)
- Add `exif` configuration object: `{ enabled: boolean, autoExtract: boolean }`.
- Update `AppConfig` interface and default values.

#### [MODIFY] [electron/main.ts](file:///e:/dev/Client/Nexus-Media/electron/main.ts)
- Modify the background task interval loop to check `configStore.get('exif.autoExtract')` and `configStore.get('ai.autoAnalyze')` before running.
- Add IPC handlers:
    - `exif:start`: Manually trigger `processExifBatch`.
    - `ai:start`: Manually trigger `processBackgroundAnalysis`.
    - `config:toggleExifAuto`: Toggle EXIF auto-extraction.
    - `config:toggleAiAuto`: Toggle AI auto-analysis.

#### [MODIFY] [electron/preload.ts](file:///e:/dev/Client/Nexus-Media/electron/preload.ts)
- Expose new methods in `window.electronAPI`:
    - `exif.start()`
    - `exif.toggleAuto(enabled: boolean)`
    - `ai.start()`
    - `ai.toggleAuto(enabled: boolean)`

### Frontend

#### [MODIFY] [src/components/settings/SettingsPage.tsx](file:///e:/dev/Client/Nexus-Media/src/components/settings/SettingsPage.tsx)
- Add "EXIF Configuration" section.
- Add toggle for "Auto EXIF Extraction".
- Add "Run EXIF Extraction Now" button.
- Update "AI Configuration" section:
    - Add "Run AI Analysis Now" button.
    - Ensure "Auto Analyze" toggle works with new backend logic.

## Verification Plan

### Manual Verification
1.  **Check Default State**: Verify that auto-analysis is still on by default.
2.  **Toggle Off**: Turn off "Auto EXIF" and "Auto AI".
3.  **Wait**: Verify that no new logs appear for these tasks in the terminal.
4.  **Manual Trigger**: Click "Run Now" for both.
5.  **Check Logs**: Verify that tasks run once immediately.
6.  **Toggle On**: Turn "Auto" back on and verify tasks resume in the background loop.
