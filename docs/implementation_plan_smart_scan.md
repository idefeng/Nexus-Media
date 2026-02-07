# Implementation Plan - Smart File Scanning (Metadata Recovery)

## Objective
Implement a "Smart Scan" mechanism that detects file moves and renames. Instead of treating moved files as new entries (losing tags/notes), the system should identify "lost" files based on file signature (Size + Last Modified Time) and update the existing database record with the new path.

## Current Limitations
- The system uses `path` as the unique identifier.
- When a file is renamed `A.jpg` -> `B.jpg`:
  - `B.jpg` is imported as a new record (empty tags).
  - `A.jpg` remains as a "ghost" record.

## Proposed Changes

### 1. Database Optimization (`electron/database.ts`)
- **Add Index**: Create a composite index on `(size, modified_time)` to allow fast lookup of candidates for lost files.
- **Migration**: Ensure this index is created during `initDatabase`.

### 2. Logic Implementation (`electron/database.ts`)
- **New Function**: `smartMergeFiles(files: ScannedFile[])`
- **Algorithm**:
  1. Iterate through scanned files.
  2. **Check 1: Exact Path Match**: If `path` exists in DB, update `modified_time`/`size` if changed.
  3. **Check 2: Metadata Recovery** (If path not found):
     - Query DB for records with matching `size` AND `modified_time`.
     - Filter candidates: Check if the `candidate.path` *no longer exists* on disk.
     - **Match Found**: It's a move! `UPDATE media_items SET path = newPath WHERE id = candidateId`.
  4. **Fallthrough**: If no match, `INSERT` as new record.

### 3. Integration (`electron/main.ts`)
- Replace the call to `insertMediaItems` with `smartMergeFiles` in the `scan:folders` handler.

## Verification Plan
1. **Setup**: Add a file, tag it `TestTag`.
2. **Action**: Rename the file on disk.
3. **Scan**: Run scan.
4. **Verify**:
   - The file at the new path should have `TestTag`.
   - The old path record should no longer exist (path updated).
