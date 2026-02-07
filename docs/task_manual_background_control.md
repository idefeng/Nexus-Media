# Manual Control for Background Tasks

- [x] Analyze existing background task implementations <!-- id: 0 -->
    - [x] EXIF extraction (`electron/exif.ts`) <!-- id: 1 -->
    - [x] AI Tagging logic (locate file) <!-- id: 2 -->
    - [x] Analyze `SettingsPage.tsx` structure <!-- id: 3 -->
- [x] Create Implementation Plan <!-- id: 4 -->
- [x] Backend Implementation <!-- id: 5 -->
    - [x] Create IPC handlers for starting/stopping tasks <!-- id: 6 -->
    - [x] Add configuration persistence for task toggles <!-- id: 7 -->
    - [x] Refactor task loops to respect flags <!-- id: 8 -->
- [x] Frontend Implementation <!-- id: 9 -->
    - [x] Add "Background Tasks" section to `SettingsPage.tsx` <!-- id: 10 -->
    - [x] Add toggle switches for "Auto EXIF" and "Auto AI Analysis" <!-- id: 11 -->
    - [x] Add "Run Now" buttons <!-- id: 12 -->
- [ ] Verify functionality <!-- id: 13 -->
