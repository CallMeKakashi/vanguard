# Implementation Plans

## Phase 2: Tactical Enhancements

### 1. Field Notes (Mission Logs)
**Goal**: Enable persistent note-taking for each game directly within the dashboard.
- **Storage**: `localStorage` using a key pattern `steam-king-notes-${appId}`.
- **Component**: Slide-out drawer available when a game is selected.

### 2. Squadron Activity (Friend Intel)
**Goal**: Display active friends in the sidebar.
- **Backend**: `GET /api/friends/:steamid` fetches friend list + player summaries.
- **Frontend**: `SquadronWidget` component in Sidebar. Displays Online/In-Game status.

### 3. Tactical Audio
**Goal**: Auditory feedback for interactions.
- **Implementation**: `useSound` hook exposing `playHover`, `playClick`, `toggleMute`.
- **Assets**: Synth beeps for UI interactions.

---

## Phase 3: Deep Operations

### 1. Operation Analytics
**Goal**: Visual intelligence on dashboard.
- **Tech**: `recharts` for Pie and Bar charts.
- **Metrics**: Playtime distribution, Top 5 games.

### 2. Achievement Hunter Protocol
**Goal**: Filter for high-priority completion targets.
- **Logic**: Games with >50% but <100% achievement completion.
- **UI**: "HUNTER" filter and Orange Trophy badge.

### 3. Nexus Command (Cmd+K)
**Goal**: Keyboard-first navigation.
- **Tech**: `cmdk` (Radix UI).
- **Features**: Global search, navigation shortcuts, quick actions (Mute, Randomize).

### 4. Direct Deployment
**Goal**: Launch capability.
- **Implementation**: `steam://run/<appid>` protocol handler.

---

## Phase 4: Desktop Deployment (Electron)

### Goal
Transform React web app into cross-platform desktop application.

### Architecture
- **Main Process**: `electron/main.ts` (ESM). Handles window creation and lifecycle.
- **Preload**: `electron/preload.ts`. Secure IPC bridge.
- **Build**: `electron-builder` configuration for Windows (nsis/dir), Mac (dmg), Linux (AppImage).

### Key Configurations
- **Vite**: `base: './'` for file-system loading.
- **Network**: `API_BASE` hardcoded to `http://localhost:3001/api` in dev to bypass proxy issues.
- **Ports**: Dev server runs on port 5180 to avoid conflicts.
