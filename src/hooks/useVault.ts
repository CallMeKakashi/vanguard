import { useMemo, useState } from 'react';
import { Game } from '../types';

export interface VaultSearchParams {
    tab?: 'overview' | 'library' | 'stats' | 'discover' | 'blacklist';
    game?: number;
    sort?: 'playtime' | 'name' | 'recency';
    filter?: 'all' | 'mastered' | 'blacklisted' | 'active' | 'hunter';
}

export const useVault = (
    games: Game[],
    masteredAppIds: number[],
    hunterTargets: number[],
    blacklist: number[],
    searchParams: VaultSearchParams,
    updateSearchParams: (updates: Partial<VaultSearchParams>) => void
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

        if (vaultFilter === 'mastered') {
            result = result.filter(g => masteredAppIds.includes(g.appid));
        } else if (vaultFilter === 'blacklisted') {
            result = result.filter(g => blacklist.includes(g.appid));
        } else if (vaultFilter === 'active') {
            result = result.filter(g => (g.playtime_2weeks || 0) > 0);
        } else if (vaultFilter === 'hunter') {
            result = result.filter(g => hunterTargets.includes(g.appid));
        }

        return [...result].sort((a, b) => {
            if (vaultSortBy === 'name') return a.name.localeCompare(b.name);
            if (vaultSortBy === 'recency') return (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0);
            return b.playtime_forever - a.playtime_forever;
        });
    }, [games, searchQuery, vaultFilter, vaultSortBy, masteredAppIds, blacklist, hunterTargets]);

    return {
        activeTab,
        selectedGameId,
        selectedGame,
        vaultSortBy,
        vaultFilter,
        searchQuery,
        setSearchQuery,
        filteredAndSortedGames,
        setActiveTab: (tab: string) => updateSearchParams({ tab: tab as any }),
        setSelectedGameId: (id: number | null) => updateSearchParams({ game: id || undefined }),
        setVaultSortBy: (sort: string) => updateSearchParams({ sort: sort as any }),
        setVaultFilter: (filter: string) => updateSearchParams({ filter: filter as any }),
    };
};
