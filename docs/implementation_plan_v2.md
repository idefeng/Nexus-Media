# Nexus Media Production Readiness & Feature Completion Plan

## 1. Internationalization (i18n)
- **Dependencies**: `react-i18next`, `i18next`, `i18next-browser-languagedetector`
- **Structure**:
  - `src/i18n/config.ts`: Configuration.
  - `src/locales/{en,zh,ja}/translation.json`: Resource files.
- **Implementation**:
  - Update `main.tsx` to initialize i18n.
  - Refactor UI components (`Sidebar`, `TopBar`, `Dashboard`, `MediaGrid`) to use `useTranslation` hook.

## 2. Global Settings Page
- **State Management**: Use `electron-store` (or consistent `ipcMain` handlers reading/writing to `config.json` in `userData`) for persistence.
- **UI Component**: `src/components/settings/SettingsPage.tsx`
  - Tabs: Library, AI, Storage, General (Language).
- **Features**:
  - **Library**: IPC calls to add/remove watch paths (requires updating `scanner` logic).
  - **AI**: Input fields for Python Path and Model Path.
  - **Storage**: Input fields for DB and Thumbnail paths (requires restart to take effect).
- **Integration**: Add entry to `Sidebar` and routing logic in `App.tsx`.

## 3. Status Bar & Notifications
- **Component**: `src/components/layout/StatusBar.tsx`
  - Fixed at bottom.
  - Shows: Scan progress bar, AI Queue count, Total Media count.
- **Backend**:
  - Send `ipcRenderer.send('show-notification', ...)` or handle in Main.
  - Main process listens for scan/AI completion events and triggers `new Notification(...)`.

## 4. Production Build & Engineering
- **Python Backend**:
  - Script to run `pyinstaller` to bundle `server.py`.
  - Ensure `dist-electron` or `resources` includes the `server.exe` (or `server` binary).
- **Electron Builder**:
  - Update `package.json` `build` configuration.
  - Include `better-sqlite3` and `sharp` rebuilding.
  - Configure `extraResources` to include the AI binary and valid FFmpeg.
- **Icon**: Ensure `logo.png` is used for the app icon.

## Execution Order
1.  Install i18n dependencies.
2.  Setup i18n structure & Apply to Sidebar/TopBar (to verify).
3.  Create Settings Page UI.
4.  Implement Settings Persistence (Main process).
5.  Implement Status Bar.
6.  Configure Build Scripts.
