# Vanguard Tactical Dashboard - Web Installation

Guide for setting up and running the Vanguard dashboard as a local web application.

## Prerequisites
- **Node.js**: Version 18.x or higher
- **NPM**: Version 9.x or higher

## Local Setup

1. **Clone the Repository** (If not already done):
   ```bash
   git clone <repository-url>
   cd steam-king
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the Servers**:
   You need to run both the frontend development server and the backend API server.
   
   - **Start API Server**:
     ```bash
     npm run server
     ```
     *Server runs on port 3001 by default.*

   - **Start Web Dashboard (New Terminal)**:
     ```bash
     npm run dev
     ```
     *Dashboard runs on port 5180.*

4. **Access the Dashboard**:
   Open your browser and navigate to `http://localhost:5180`.

## Initial Configuration
Upon first launch, you will be prompted with the **Nexus Authorization** modal.
- **Steam ID 64**: Your unique numerical Steam identifier (e.g., `76561198XXXXXXXXX`).
- **Web API Key**: Obtain your key from the [official Steam Dev portal](https://steamcommunity.com/dev/apikey).

> [!NOTE]
> Your credentials are stored in your browser's `localStorage`. No `.env` configuration is required for the web version anymore.

## Troubleshooting
- **API Connectivity**: Ensure the API server is running on port 3001. If you change the port, ensure the frontend is updated accordingly.
- **CORS Issues**: The API server is pre-configured to allow requests from `http://localhost:5180`.
