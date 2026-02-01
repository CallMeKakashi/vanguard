import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Game, Profile } from '../types';

export const useSteamData = (steamId: string, apiBase: string) => {
    const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery({
        queryKey: ['profile', steamId],
        queryFn: async () => {
            const res = await axios.get(`${apiBase}/profile/${steamId}`);
            return res.data.response?.players?.[0] as Profile;
        },
        enabled: !!steamId,
    });

    const { data: gamesData, isLoading: isGamesLoading, error: gamesError } = useQuery({
        queryKey: ['games', steamId],
        queryFn: async () => {
            const [gamesRes, recentRes] = await Promise.all([
                axios.get(`${apiBase}/games/${steamId}`),
                axios.get(`${apiBase}/recent/${steamId}`)
            ]);
            let rawGames = (gamesRes.data.response?.games || []) as Game[];
            const recentGamesMap = new Map((recentRes.data.response?.games || []).map((g: any) => [g.appid, g]));

            // Sync and Force include Spacewar (AppID 480)
            const recentSpacewar = recentGamesMap.get(480) as Game | undefined;
            const ownedSpacewarIndex = rawGames.findIndex(g => g.appid === 480);

            if (ownedSpacewarIndex !== -1) {
                if (recentSpacewar) {
                    rawGames[ownedSpacewarIndex].playtime_forever = Math.max(rawGames[ownedSpacewarIndex].playtime_forever, recentSpacewar.playtime_forever);
                    rawGames[ownedSpacewarIndex].playtime_2weeks = recentSpacewar.playtime_2weeks;
                }
            } else {
                rawGames.push({
                    appid: 480,
                    name: 'Spacewar',
                    playtime_forever: recentSpacewar?.playtime_forever || 0,
                    img_icon_url: '',
                    playtime_2weeks: recentSpacewar?.playtime_2weeks || 0
                });
            }

            return rawGames.map(g => g.appid === 480 ? { ...g, name: 'ELDEN RING COOP' } : g);
        },
        enabled: !!steamId,
    });

    const { data: recentGamesData, isLoading: isRecentLoading, error: recentError } = useQuery({
        queryKey: ['recent', steamId],
        queryFn: async () => {
            const res = await axios.get(`${apiBase}/recent/${steamId}`);
            const rawGames = (res.data.response?.games || []) as Game[];
            return rawGames.map(g => g.appid === 480 ? { ...g, name: 'ELDEN RING COOP' } : g);
        },
        enabled: !!steamId,
    });

    return {
        profile: profileData || null,
        games: gamesData || [],
        recentGames: recentGamesData || [],
        loading: isProfileLoading || isGamesLoading || isRecentLoading,
        error: profileError?.message || gamesError?.message || recentError?.message || null,
    };
};
