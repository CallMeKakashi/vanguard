import { useMemo, useState } from 'react';
import { Game } from '../types';

export interface VaultSearchParams {
    tab?: 'overview' | 'library' | 'stats' | 'discover' | 'blacklist';
    game?: number;
    sort?: 'playtime' | 'name' | 'recency' | 'size' | 'metacritic' | 'release';
    filter?: 'all' | 'mastered' | 'blacklisted' | 'active' | 'hunter';
}

export const useVault = (
    games: Game[],
    masteredAppIds: number[],
    hunterTargets: number[],
    blacklist: number[],
    searchParams: VaultSearchParams,
    updateSearchParams: (updates: Partial<VaultSearchParams>) => void,
    selectedGenres: string[] = [],
    gameMetadata: Record<number, any> = {}
) => {
    const [searchQuery, setSearchQuery] = useState('');

    const activeTab = searchParams.tab || 'overview';
    const selectedGameId = searchParams.game || null;
    const vaultSortBy = searchParams.sort || 'playtime';
    const vaultFilter = searchParams.filter || 'all';

    const selectedGame = useMemo(() => {
        if (!selectedGameId) return null;
        const game = games.find(g => g.appid === selectedGameId);
        return game ? { id: game.appid, name: game.name, display_appid: game.display_appid } : null;
    }, [games, selectedGameId]);

    const filteredAndSortedGames = useMemo(() => {
        let result = games.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Filter: Tab/Status
        if (vaultFilter === 'mastered') {
            result = result.filter(g => masteredAppIds.includes(g.appid));
        } else if (vaultFilter === 'blacklisted') {
            result = result.filter(g => blacklist.includes(g.appid));
        } else if (vaultFilter === 'active') {
            result = result.filter(g => (g.playtime_2weeks || 0) > 0);
        } else if (vaultFilter === 'hunter') {
            result = result.filter(g => hunterTargets.includes(g.appid));
        }

        // Filter: Genres
        if (selectedGenres.length > 0) {
            result = result.filter(g => {
                const meta = gameMetadata[g.appid];
                if (!meta || !meta.genres) return false;
                return selectedGenres.every(sg => meta.genres.some((mg: any) => mg.description === sg));
            });
        }

        // Sort
        return [...result].sort((a, b) => {
            if (vaultSortBy === 'name') return a.name.localeCompare(b.name);
            if (vaultSortBy === 'recency') return (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0);

            // Metadata dependent sorts
            const metaA = gameMetadata[a.appid] || {};
            const metaB = gameMetadata[b.appid] || {};

            if (vaultSortBy === 'metacritic') {
                const scoreA = metaA.metacritic?.score || 0;
                const scoreB = metaB.metacritic?.score || 0;
                return scoreB - scoreA;
            }
            if (vaultSortBy === 'release') {
                // Simple string compare or date parse? Steam date format varies.
                // Fallback to name if missing.
                return (metaB.release_date || '').localeCompare(metaA.release_date || '');
            }

            return b.playtime_forever - a.playtime_forever;
        });
    }, [games, searchQuery, vaultFilter, vaultSortBy, masteredAppIds, blacklist, hunterTargets, selectedGenres, gameMetadata]);

    const [vaultGrouping, setVaultGrouping] = useState<'none' | 'alpha' | 'status'>('none');

    const groupedGames = useMemo(() => {
        if (vaultGrouping === 'none') return { 'All': filteredAndSortedGames };

        const groups: Record<string, Game[]> = {};

        if (vaultGrouping === 'alpha') {
            filteredAndSortedGames.forEach(g => {
                const letter = g.name.charAt(0).toUpperCase().match(/[A-Z]/) ? g.name.charAt(0).toUpperCase() : '#';
                if (!groups[letter]) groups[letter] = [];
                groups[letter].push(g);
            });
        } else if (vaultGrouping === 'status') {
            filteredAndSortedGames.forEach(g => {
                let status = 'Unplayed';
                if (masteredAppIds.includes(g.appid)) status = 'Mastered';
                else if (hunterTargets.includes(g.appid)) status = 'Hunter Target';
                else if (g.playtime_forever > 600) status = 'Veteran'; // >10h
                else if (g.playtime_forever > 60) status = 'Deploying'; // >1h

                if (!groups[status]) groups[status] = [];
                groups[status].push(g);
            });
        }

        return groups;
    }, [filteredAndSortedGames, vaultGrouping, masteredAppIds, hunterTargets]);

    return {
        activeTab,
        selectedGameId,
        selectedGame,
        vaultSortBy,
        vaultFilter,
        searchQuery,
        setSearchQuery,
        filteredAndSortedGames,
        vaultGrouping,
        setVaultGrouping,
        groupedGames,
        setActiveTab: (tab: string) => updateSearchParams({ tab: tab as any }),
        setSelectedGameId: (id: number | null) => updateSearchParams({ game: id || undefined }),
        setVaultSortBy: (sort: string) => updateSearchParams({ sort: sort as any }),
        setVaultFilter: (filter: string) => updateSearchParams({ filter: filter as any }),
    };
};
