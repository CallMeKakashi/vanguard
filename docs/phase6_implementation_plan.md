# Phase 6: Visual Warfare & Fleet Organization Implementation Plan

## 1. Visual Warfare (Theming System)
**Goal**: Allow users to customize the visual aesthetic of the dashboard.

### Architecture
- **Context**: `ThemeContext` provider wrapping the app.
- **State**: `activeTheme` ('command', 'crimson', 'terminal').
- **Persistence**: Save selection to `localStorage`.

### Themes
1.  **Command (Default)**:
    - Base: `#020617` (Slate 950)
    - Accent: `Indigo 500`
    - Font: `Inter / Outfit`
2.  **Crimson (Red Alert)**:
    - Base: `#0f0505`
    - Accent: `Red 600`
    - Aesthetic: High contrast, aggressive.
3.  **Terminal (Night Vision)**:
    - Base: `#000000`
    - Accent: `Green 500`
    - Font: `Courier Prime` (Monospace everywhere)

### Implementation
- **Tailwind**: Use CSS variables for colors (e.g., `--bg-primary`, `--accent-primary`) and update `index.css`.
- **UI**: A "Theme Selector" widget in the Settings/Sidebar area.

## 2. Fleet Organization (Collections & Metadata)
**Goal**: Organize the library with custom collections and automated tagging.

### Backend Updates (`server.ts`)
- **New Endpoint**: `GET /api/store/:appid`
    - **Source**: `https://store.steampowered.com/api/appdetails?appids=<appid>`
    - **Logic**: Fetch and return `genres`, `categories`, and `metacritic` score.
    - **Rate Limiting**: Implementation must handle this gracefully (caching is critical).

### Frontend Updates
- **Metadata Cache**: Store fetched genres in `localStorage` to avoid re-fetching.
- **Squads (Collections)**:
    - **Data Structure**: `Record<string, number[]>` (Name -> Array of AppIDs).
    - **UI**:
        - "Create Squad" button in Sidebar.
        - Drag-and-drop game cards into Squads (or Context Menu "Add to Squad").
- **Auto-Sort**:
    - "Auto-Assign" button: Iterates through library, fetches Store data (batched/delayed), and tags games into Genre buckets (FPS, RPG, Strategy).

## 3. Advanced Vault UI (Steam-Like)
**Goal**: Professional-grade library management.
- **Custom Sort Dropdown**:
    - Replace native `<select>` with a custom `framer-motion` dropdown.
    - Options: Name, Playtime, Size, Metacritic Score, Release Date.
- **Detailed Filters**:
    - Multi-select Genres (Action, RPG).
    - Features (Co-op, Controller Support).
    - Completion Status (Started, Unplayed, Completed).
- **Grouping**:
    - Toggle to group games by: None, Genre, Collection, Store Tags.

## Verification
- **Visuals**: Toggle all themes and verify consistency.
- **Fleet**: Create a squad, add games, verify persistence. Auto-sort a subset of games.
- **Vault**: Test complex filter combinations and customized sorting.
