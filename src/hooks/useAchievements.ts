import axios from 'axios';
import { useEffect, useState } from 'react';
import { Achievement } from '../types';

interface AchievementWithLink extends Achievement {
    videoUrl?: string;
    icon?: string;
    icongray?: string;
    percent?: number;
}

export const useAchievements = (appId: number | null, steamId: string, apiBase: string) => {
    const [achievements, setAchievements] = useState<AchievementWithLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load video links from local storage
    const getStoredLinks = (id: number) => {
        try {
            return JSON.parse(localStorage.getItem(`vanguard-videos-${id}`) || '{}');
        } catch {
            return {};
        }
    };

    useEffect(() => {
        if (!appId || !steamId) {
            setAchievements([]);
            return;
        }

        const fetchAchievements = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${apiBase}/achievements/${steamId}/${appId}`);

                // Handle private profile or API errors
                if (res.data?.achievements?.playerstats?.error) {
                    setError(res.data.achievements.playerstats.error);
                    setAchievements([]);
                    return;
                }

                const playerAchievements = res.data.achievements?.playerstats?.achievements || [];
                const schemaAchievements = res.data.schema?.game?.availableGameStats?.achievements || [];
                const globalStats = res.data.globalStats?.achievementpercentages?.achievements || [];
                const storedLinks = getStoredLinks(appId);

                // Merge player status with schema details and global stats
                const merged = playerAchievements.map((pa: any) => {
                    const schema = schemaAchievements.find((sa: any) => sa.name === pa.apiname);
                    const global = globalStats.find((ga: any) => ga.name === pa.apiname);
                    return {
                        ...pa,
                        name: schema?.displayName || pa.apiname,
                        description: schema?.description,
                        icon: schema?.icon,
                        icongray: schema?.icongray,
                        percent: typeof global?.percent === 'number' ? global.percent : parseFloat(global?.percent || '0'),
                        videoUrl: storedLinks[pa.apiname] || ''
                    };
                });

                // Sort: 
                // 1. Locked achievements first (achieved: 0)
                // 2. Sort by rarity (percent ascending) - simplest/most common first? 
                //    User asked validation: "sort the achievements from easiest to hardest and move all the already completed ones down at the bottom"
                //    "Easiest" usually means HIGHEST percentage. "Hardest" is LOWEST percentage.
                //    So: Locked (High % -> Low %) -> Unlocked

                merged.sort((a: AchievementWithLink, b: AchievementWithLink) => {
                    // Status priority: Locked (0) before Unlocked (1)
                    if (a.achieved !== b.achieved) {
                        return a.achieved - b.achieved; // 0 - 1 = -1 (Locked comes first)
                    }

                    // If status is same, sort by percent descending (Easiest/Common -> Hardest/Rare)
                    return (b.percent || 0) - (a.percent || 0);
                });

                setAchievements(merged);
            } catch (err) {
                console.error(err);
                setError('Failed to load achievements');
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [appId, steamId, apiBase]);

    const saveVideoLink = (apiname: string, url: string) => {
        if (!appId) return;

        const stored = getStoredLinks(appId);
        stored[apiname] = url;
        localStorage.setItem(`vanguard-videos-${appId}`, JSON.stringify(stored));

        setAchievements(prev => prev.map(a =>
            a.apiname === apiname ? { ...a, videoUrl: url } : a
        ));
    };

    return { achievements, loading, error, saveVideoLink };
};
