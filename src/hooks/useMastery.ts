import axios from 'axios';
import { useEffect, useState } from 'react';
import { Game } from '../types';

export const useMastery = (games: Game[], steamId: string, apiBase: string) => {
    const [masteredAppIds, setMasteredAppIds] = useState<number[]>([]);

    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        const verifyMastery = async () => {
            if (games.length === 0 || !steamId) return;
            setIsValidating(true);

            // Keep existing mastery logic but decouple hunter targets from it
            // We only check for 100% completion for "Mastered" status

            // Optimization: Only check games that have achievements and are not already known mastered
            // Optimization: Only check games that have achievements and are not already known mastered

            const mastered: number[] = [...masteredAppIds];

            // Use a limited concurrency to prevent flooding
            // Only check top 20 by playtime if we haven't checked them yet? 
            // For now, let's just stick to the original logic which was checking top 15 "targets".
            // Since "targets" logic is changing to manual, we just want to find MASTERED games.

            // Let's just iterate top played games to check for mastery, or maybe all eventually?
            // Reverting to original "check top 15" logic for mastery detection, but removing the "hunter" separate logic
            const sortedByPlaytime = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever);
            const checkList = sortedByPlaytime.slice(0, 20);

            for (const game of checkList) {
                // Skip if we already know it's mastered (basic cache could be added here)
                try {
                    const res = await axios.get(`${apiBase}/achievements/${steamId}/${game.appid}`);
                    const playerstats = res.data.achievements?.playerstats;

                    if (playerstats?.success !== false && playerstats?.achievements?.length > 0) {
                        const total = playerstats.achievements.length;
                        const achieved = playerstats.achievements.filter((a: any) => a.achieved === 1).length;

                        if (total > 0 && achieved / total === 1) {
                            if (!mastered.includes(game.appid)) mastered.push(game.appid);
                        }
                    }
                } catch (e) {
                    // console.error(`[Mastery] Check failed for ${game.appid}:`, e);
                }
            }
            setMasteredAppIds(mastered);
            setIsValidating(false);
        };

        verifyMastery();
    }, [games, steamId, apiBase]);

    return { masteredAppIds, isValidating };
};
