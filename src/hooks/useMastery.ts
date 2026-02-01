import axios from 'axios';
import { useEffect, useState } from 'react';
import { Game } from '../types';

export const useMastery = (games: Game[], steamId: string, apiBase: string) => {
    const [masteredAppIds, setMasteredAppIds] = useState<number[]>([]);
    const [hunterTargets, setHunterTargets] = useState<number[]>([]);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        const verifyMastery = async () => {
            if (games.length === 0 || !steamId) return;
            setIsValidating(true);

            const sortedByPlaytime = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever);
            const targets = sortedByPlaytime.slice(0, 15);

            // Priority targets
            const priorityIds = [1245620]; // Elden Ring
            priorityIds.forEach(id => {
                const game = games.find(g => g.appid === id);
                if (game && !targets.some(t => t.appid === id)) {
                    targets.push(game);
                }
            });

            const mastered: number[] = [];
            const hunters: number[] = [];

            // Batch or sequential? For now sequential as per original logic but with better error handling
            for (const game of targets) {
                try {
                    const res = await axios.get(`${apiBase}/achievements/${steamId}/${game.appid}`);
                    const playerstats = res.data.achievements?.playerstats;

                    if (playerstats?.success !== false && playerstats?.achievements?.length > 0) {
                        const total = playerstats.achievements.length;
                        const achieved = playerstats.achievements.filter((a: any) => a.achieved === 1).length;

                        if (total > 0) {
                            const ratio = achieved / total;
                            if (ratio === 1) mastered.push(game.appid);
                            if (ratio >= 0.5 && ratio < 1) hunters.push(game.appid);
                        }
                    }
                } catch (e) {
                    console.error(`[Mastery] Check failed for ${game.appid}:`, e);
                }
            }
            setMasteredAppIds(mastered);
            setHunterTargets(hunters);
            setIsValidating(false);
        };

        verifyMastery();
    }, [games, steamId, apiBase]);

    return { masteredAppIds, hunterTargets, isValidating };
};
