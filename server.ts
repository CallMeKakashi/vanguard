import axios from 'axios';
import cors from 'cors';
import express from 'express';

const app = express();
// Priority: Argument > Env > Default 3001
const argPort = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1];
const PORT = argPort || process.env.PORT || 3001;
let STEAM_API_KEY = '';

// --- Structured Logger ---
const Logger = {
    info: (msg: string, ...args: any[]) => console.log(`[\x1b[36mINFO\x1b[0m] [${new Date().toISOString()}] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[\x1b[33mWARN\x1b[0m] [${new Date().toISOString()}] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[\x1b[31mERROR\x1b[0m] [${new Date().toISOString()}] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => console.debug(`[\x1b[90mDEBUG\x1b[0m] [${new Date().toISOString()}] ${msg}`, ...args)
};

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    Logger.info(`${req.method} ${req.url}`);
    next();
});

// Helper to mask API key in logs
const maskKey = (key: string) => {
    if (!key) return 'MISSING';
    if (key.length <= 8) return '********';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

// Endpoint to update configuration dynamically
app.post('/api/config', (req: any, res: any) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        Logger.warn('Attempted to configure API without Key');
        return res.status(400).json({ error: 'API Key is required' });
    }
    STEAM_API_KEY = apiKey;
    Logger.info(`Configuration updated. Key: ${maskKey(STEAM_API_KEY)}`);
    res.json({ success: true });
});

// Middleware to check for API Key
const checkApiKey = (_req: any, res: any, next: any) => {
    if (!STEAM_API_KEY) {
        Logger.warn('Request rejected: Steam API Key not configured');
        return res.status(401).json({ error: 'Steam API Key not configured' });
    }
    next();
};

// Health check to verify server is alive
app.get('/api/health', (_req, res) => {
    Logger.debug('Health check requested');
    res.json({ status: 'active', port: PORT, config: !!STEAM_API_KEY });
});

app.get('/api/profile/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamid}`;
        Logger.debug(`Fetching profile for: ${steamid}`);
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error: any) {
        const status = error.response?.status || 500;
        Logger.error(`Profile fetch FAILED (${status}) for ${req.params.steamid}:`, error.message);
        if (error.response?.data) {
            Logger.debug('Steam Error Body:', JSON.stringify(error.response.data));
        }
        res.status(status).json({ error: error.message, details: error.response?.data || 'No additional details' });
    }
});

app.get('/api/games/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        Logger.debug(`Fetching games for: ${steamid}`);
        const response = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`);
        res.json(response.data);
    } catch (error: any) {
        const status = error.response?.status || 500;
        Logger.error(`Games fetch FAILED (${status}) for ${req.params.steamid}:`, error.message);
        res.status(status).json({ error: error.message, details: error.response?.data || 'No additional details' });
    }
});

app.get('/api/recent/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        Logger.debug(`Fetching recent games for: ${steamid}`);
        const response = await axios.get(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}`);
        res.json(response.data);
    } catch (error: any) {
        const status = error.response?.status || 500;
        Logger.error(`Recent games fetch FAILED (${status}) for ${req.params.steamid}:`, error.message);
        res.status(status).json({ error: error.message, details: error.response?.data || 'No additional details' });
    }
});

app.get('/api/friends/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        Logger.debug(`Fetching friends for: ${steamid}`);

        // 1. Get Friend List
        const friendsResponse = await axios.get(`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&relationship=friend`);
        const friendsList = friendsResponse.data.friendslist?.friends || [];

        if (friendsList.length === 0) {
            Logger.info(`No friends found for ${steamid}`);
            return res.json({ friends: [] });
        }

        // 2. Get Player Summaries for all friends
        const friendSteamIds = friendsList.map((f: any) => f.steamid).slice(0, 100).join(',');
        const summariesResponse = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${friendSteamIds}`);

        const players = summariesResponse.data.response?.players || [];
        res.json({ friends: players });
    } catch (error: any) {
        const status = error.response?.status || 500;
        Logger.error(`Friend fetch FAILED (${status}):`, error.message);
        res.status(status).json({ error: error.message, details: error.response?.data || 'No additional details' });
    }
});

app.get('/api/achievements/:steamid/:appid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid, appid } = req.params;
        Logger.debug(`Fetching achievements -> AppID: ${appid}, SteamID: ${steamid}`);

        const [achResponse, schemaResponse] = await Promise.allSettled([
            axios.get(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&appid=${appid}`),
            axios.get(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appid}`)
        ]);

        if (achResponse.status === 'rejected') {
            const errorReason = achResponse.reason?.response?.data || achResponse.reason?.message;
            Logger.warn(`GetPlayerAchievements FAILED for ${appid}:`, typeof errorReason === 'object' ? JSON.stringify(errorReason) : errorReason);

            // Check for private profile specifically
            if (errorReason?.playerstats?.error === 'Profile is not public') {
                Logger.info(`Private profile detected for ${steamid} on game ${appid}`);
                return res.json({
                    achievements: { playerstats: { success: false, error: 'Private Profile' } },
                    schema: schemaResponse.status === 'fulfilled' ? schemaResponse.value.data : { game: { availableGameStats: { achievements: [] } } }
                });
            }
        }

        const achievements = achResponse.status === 'fulfilled' ? achResponse.value.data : { playerstats: { achievements: [], success: false } };
        const schema = schemaResponse.status === 'fulfilled' ? schemaResponse.value.data : { game: { availableGameStats: { achievements: [] } } };

        res.json({ achievements, schema });
    } catch (error: any) {
        Logger.error(`Unexpected error in achievements endpoint:`, error.message);
        res.status(200).json({ achievements: { playerstats: { achievements: [], success: false } }, schema: { game: { availableGameStats: { achievements: [] } } } });
    }
});

app.listen(PORT, () => {
    Logger.info(`Server running on port ${PORT}`);
    Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
