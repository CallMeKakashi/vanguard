import axios from 'axios';
import cors from 'cors';
import express from 'express';

const app = express();
// Priority: Argument > Env > Default 3001
const argPort = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1];
const PORT = argPort || process.env.PORT || 3001;
let STEAM_API_KEY = '';

app.use(cors());
app.use(express.json());

// Endpoint to update configuration dynamically
app.post('/api/config', (req: any, res: any) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required' });
    }
    STEAM_API_KEY = apiKey;
    console.log('[API] Steam API Key updated');
    res.json({ success: true });
});

// Middleware to check for API Key
const checkApiKey = (req: any, res: any, next: any) => {
    if (!STEAM_API_KEY) {
        return res.status(401).json({ error: 'Steam API Key not configured' });
    }
    next();
};

app.get('/api/profile/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        const response = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamid}`);
        res.json(response.data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/games/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`);
        res.json(response.data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recent/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;
        const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}`);
        res.json(response.data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/friends/:steamid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid } = req.params;

        // 1. Get Friend List
        const friendsResponse = await axios.get(`http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&relationship=friend`);
        const friendsList = friendsResponse.data.friendslist?.friends || [];

        if (friendsList.length === 0) {
            return res.json({ friends: [] });
        }

        // 2. Get Player Summaries for all friends
        // Steam API limits to 100 IDs per call, so typically we'd batch, but for now we assume < 100 for simplicity or handle first 100
        const friendSteamIds = friendsList.map((f: any) => f.steamid).slice(0, 100).join(',');
        const summariesResponse = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${friendSteamIds}`);

        const players = summariesResponse.data.response?.players || [];

        // 3. Merge data (optional, but raw player summaries is usually enough for the UI)
        res.json({ friends: players });
    } catch (error: any) {
        console.error('[API] Friend fetch failed:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/achievements/:steamid/:appid', checkApiKey, async (req: any, res: any) => {
    try {
        const { steamid, appid } = req.params;
        console.log(`[API] Fetching achievements for AppID: ${appid}, SteamID: ${steamid}`);

        const [achResponse, schemaResponse] = await Promise.allSettled([
            axios.get(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?key=${STEAM_API_KEY}&steamid=${steamid}&appid=${appid}`),
            axios.get(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appid}`)
        ]);

        if (achResponse.status === 'rejected') {
            const errorReason = achResponse.reason?.response?.data || achResponse.reason?.message;
            console.error(`[API] GetPlayerAchievements FAILED for ${appid}:`, errorReason);

            // Check for private profile specifically
            if (errorReason?.playerstats?.error === 'Profile is not public') {
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
        console.error(`[API] Unexpected error in achievements endpoint:`, error.message);
        res.status(200).json({ achievements: { playerstats: { achievements: [], success: false } }, schema: { game: { availableGameStats: { achievements: [] } } } });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
