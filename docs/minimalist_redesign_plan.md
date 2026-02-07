# Minimalist Swiss Design Implementation Plan

## Objective
Refactor the Nexus Media UI/UX to a "Minimalist Swiss Design / Clean Tech" aesthetic. Shift from a dark, neon-heavy interface to a clean, light, and airy interface with a focus on typography, whitespace, and subtle shadows.

## Key Design Decisions
1.  **Color Palette**:
    *   **Background**: Light Gray (`#F9F9F9`) for the main app background.
    *   **Cards/Panels**: Pure White (`#FFFFFF`) for content containers.
    *   **Primary Accent**: Emerald Green (`#10B981`) for actions and active states.
    *   **Secondary Accent**: Slate Gray (`#64748B`) for secondary information.
    *   **Alerts**: Red (`#EF4444`).
    *   **Text**: Dark Gray (`#111827`) for primary text, Medium Gray (`#4B5563`) for secondary.

2.  **Typography & Layout**:
    *   **Font**: Inter (Sans-serif) for clean readability.
    *   **Spacing**: Generous padding and whitespace.
    *   **Borders/Shadows**: Replaced heavy neon borders with subtle 1px gray borders (`border-gray-100`) and soft shadows (`shadow-sm`, `shadow-clean`).
    *   **Rounded Corners**: Consistent `rounded-xl` (16px) or `rounded-2xl` (24px) for a softer look.

3.  **Key Components Refactored**:
    *   **TopBar**: White glassmorphism header, clean search input, specific brand gradient (Emerald-Slate).
    *   **Sidebar**: White glassmorphism panel, updated navigation states.
    *   **MediaGrid & Cards**: White cards with shadow hover effects, removed "neon glow", clean typography.
    *   **Dashboard**: White dashboard cards, light mode charts/stats.
    *   **Floating Action Button (FAB)**: Added for AI Re-scanning (Emerald Green).

## Files Modified
*   `tailwind.config.js`: Updated color tokens and shadows. Added `nexus-border`.
*   `src/index.css`: Updated global styles, scrollbars, and component utility classes.
*   `src/App.tsx`: Layout structure, background, FAB.
*   `src/components/layout/TopBar.tsx`: Header styling and functionality.
*   `src/components/layout/Sidebar.tsx`: Navigation panel styling.
*   `src/components/media/MediaGrid.tsx`: Grid header and layout.
*   `src/components/media/MediaCard.tsx`: Individual media item styling.
*   `src/components/dashboard/Dashboard.tsx`: Dashboard widgets and layout.
*   `src/components/common/ContextMenu.tsx`: Context menu styling.
*   `src/components/gallery/BulkActionBar.tsx`: Bulk action bar styling.

## Verification
*   **Visual Check**: The application should now look predominantly white/light gray.
*   **Interactions**: Hover states should be subtle shadows or light gray backgrounds.
*   **Readability**: Text should be dark and legible against the light background.
*   **Functionality**: All buttons and actions (search, navigate, select) should remain functional.
