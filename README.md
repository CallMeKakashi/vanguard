# Vanguard Tactical Dashboard

> **"Command your library. Conquer your backlog."**

Vanguard is a high-performance, tactical dashboard for your Steam library. Designed with a military-industrial aesthetic, it transforms your game collection into an operational asset repository, providing advanced filtering, squadron tracking, and mission logging capabilities.

![Vanguard Dashboard UI](https://github.com/Start-Automating/steam-king/assets/placeholder-image-url.png)

## Key Features

-   **Tactical Asset Repository**: A grid-based vault of your games with advanced filtering (Playtime, Status, Genre) and custom "Vanguard" sorting.
-   **Squadron Tracking**: Real-time status monitoring of your Steam friends.
-   **Mission Logs**: Integrated notepad for tracking objectives, guides, and tactical notes per game.
-   **Operations Analytics**: Visual breakdown of your engagement metrics, top genres, and completion rates.
-   **Blacklist Protocol**: Exclude unwanted or deprecated assets from your active view.
-   **Discovery Queue**: Algorithmically curated recommendations from your own library.

## Installation

### Prerequisites

-   **Node.js**: v18 or higher
-   **Steam API Key**: [Get it here](https://steamcommunity.com/dev/apikey)
-   **Steam ID64**: Your 17-digit Steam ID.

### Quick Start

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/CallMeKakashi/steam-king.git
    cd steam-king
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Launch Dashboard**
    ```bash
    npm start
    ```
    This launches both the local API server and the frontend client.

4.  **Authenticate**
    -   On first launch, enter your Steam ID and API Key.
    -   Credentials are stored locally in your browser/app data.

## Build for Desktop

To build the standalone desktop application (Electron):

```bash
# For your current OS
npm run electron:build

# For Linux (from Linux/WSL)
npm run electron:build -- --linux
```

Artifacts will be output to `dist-electron-build/`.

## Contributing

We welcome contributions from the community. Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Vanguard System // End of Transmission**
