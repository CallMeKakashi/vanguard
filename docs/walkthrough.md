# Vanguard: Operational Walkthrough

We have successfully integrated the "Deep Operations" suite into the Vanguard (formerly Steam King) tactical dashboard.

## 1. Operation Analytics (Charts)
**Visual Intelligence**:
- **Playtime Distribution**: A pie chart visualization breaking down your fleet engagement by playtime tiers.
- **High-Value Targets**: A bar chart highlighting your top 5 most played assets.
- **Integration**: Located prominently on the Dashboard overview for instant situational awareness.

## 2. Achievement Hunter Protocol
**Targeting System**:
- **"HUNTER" Filter**: A new filter mode in the Asset Repository.
- **Logic**: Isolates games with **50-99% completion**, identifying optimal targets for 100% mastery.
- **Visuals**: Eligible games are marked with an **Orange Trophy** badge.

## 3. Nexus Command (Cmd+K)
**Keyboard Control**:
- **Command Palette**: Triggered via `Cmd+K` (or `Ctrl+K`).
- **Capabilities**:
    - **Navigation**: Instant jump to Dashboard, Vault, Discovery, or Stats.
    - **Tactical Actions**: Toggle Mute, Randomize Target, Refresh Intel.
    - **Search**: Rapidly find and select assets from your library.
- **Aesthetic**: Blurred backdrop with a terminal-inspired input interface.

## 4. Direct Deployment (Launch Protocol)
**Action Integration**:
- **Launch Button**: Added a dedicated **"LAUNCH"** button to every game card in the Vault.
- **Protocol**: Triggers the `steam://run/<appid>` protocol to immediately launch the game via the Steam client.
- **Layout**: Reorganized the card footer to prioritize the Launch action while keeping "Logs" and "Intel" accessible.

## 5. Desktop Deployment (Electron)
**Cross-Platform App**:
- **Dev Mode**: Run `npm run electron:dev` to launch the standalone desktop app.
- **Build**: Run `npm run electron:build`.
    - Generates unpacked executable in `dist-electron-build/win-unpacked/Vanguard.exe`.
    - *Note*: Full installer creation (`nsis`) requires an environment with symbolic link permissions.

## 6. Rebrand: "Vanguard"
**New Identity**:
- **Name**: Transformed from "Steam King" to **"Vanguard"**.
- **Aesthetic**: Updated logo to a sleek, tactical shield design in neon indigo.
- **Metadata**: Application titles and window headers now reflect the new tactical command identity.
