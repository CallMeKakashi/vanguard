# Vanguard Tactical Dashboard - Electron Installation

Guide for setting up and running Vanguard as a standalone desktop application.

## Prerequisites
- **Node.js**: Version 18.x or higher
- **NPM**: Version 9.x or higher

## Development Environment Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd steam-king
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run in Development Mode**:
   ```bash
   npm run electron:dev
   ```
   This command will:
   - Compile the Electron source code.
   - Start the Vite development server (port 5180).
   - Start the local API server (port 3001).
   - Launch the Electron window.

## Building the Desktop App

To create a standalone installer (Windows, Linux, or Mac):

1. **Execute Build Script**:
   ```bash
   npm run electron:build
   ```
   
2. **Access Output**:
   The installer and packaged application will be available in the `dist-electron-build` directory.

## Initial Configuration
When you launch the Electron app, you will be prompted to enter your **Steam ID 64** and **Web API Key**.

- **Steam ID 64**: Your unique numerical Steam identifier.
- **Web API Key**: Obtain from [Steam Dev Portal](https://steamcommunity.com/dev/apikey).

> [!IMPORTANT]
> Within the Electron app, your credentials are encrypted and stored in the application's local user data. You can "Terminate Session" via the dashboard profile section to switch accounts.

## Guides
- [How to find your SteamID 64](https://steamidfinder.com/)
- [How to generate a Steam API Key](https://steamcommunity.com/dev/apikey)
