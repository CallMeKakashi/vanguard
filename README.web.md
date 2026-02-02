# Vanguard Dashboard - Web Installation

## Prerequisites
- Node.js (v18 or higher)
- A Steam API Key (Get it from: https://steamcommunity.com/dev/apikey)
- Your Steam ID

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

## Running the Application

1.  **Start the development server:**
    ```bash
    npm start
    ```
    This will start both the React frontend (Vite) and the Express backend server.

2.  **Open the dashboard:**
    Open your browser and navigate to `http://localhost:5173`.

3.  **Initial Setup:**
    - You will be prompted to enter your **Steam ID** and **Steam API Key**.
    - These credentials are saved locally in your browser to keep them secure.

## Features
- **Dashboard:** Overview of your profile, top games, and recent activity.
- **Game Vault:** Browse your entire library with advanced filtering.
- **Discovery:** Get new game recommendations based on your library.
- **Achievements:** Track your progress and hunt for 100% completion.
- **Squadron:** See your friends' status in real-time.

## Troubleshooting
- **CORS Errors:** Ensure the backend server is running on port 3001.
- **403 Forbidden:** Verify your Steam API Key is valid and your profile privacy settings are public.
