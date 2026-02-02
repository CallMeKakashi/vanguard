# Vanguard Dashboard - Electron Installation

## Prerequisites
- Node.js (v18 or higher)
- A Steam API Key

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Start-Automating/steam-king.git
    cd steam-king
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Building & Running Locally

1.  **Development Mode:**
    To run the app in Electron with hot-reloading:
    ```bash
    npm run electron:dev
    ```

2.  **Build for Production:**
    To create a standalone executable/installer:
    ```bash
    npm run dist
    ```
    The output files (exe, dmg, deb) will be in the `dist/` directory.

## Configuration
The Electron app uses the same local storage mechanism as the web version. On first launch, you will need to input your Steam credentials.

## Troubleshooting
- **White Screen:** Check the console (Ctrl+Shift+I) for errors. Ensure the React app is building correctly.
- **API Connection Errors:** The Electron main process handles the API server. Ensure port 3001 is not in use by another application.
