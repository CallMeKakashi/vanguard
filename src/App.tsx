import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import {
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
    useNavigate,
    useSearch
} from '@tanstack/react-router';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    LayoutDashboard,
    RefreshCw,
    Search,
    XCircle
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import FilterPanel from './components/FilterPanel';
import Sidebar from './components/Sidebar';
import SortDropdown, { SortOption } from './components/SortDropdown';
import Skeleton from './components/ui/Skeleton';
import { ThemeProvider } from './context/ThemeContext';


const AuthenticationModal = lazy(() => import('./components/AuthenticationModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const MissionLogDrawer = lazy(() => import('./components/MissionLogDrawer'));

const VaultGrid = lazy(() => import('./components/VaultGrid'));
const Overview = lazy(() => import('./components/Overview'));
const Discovery = lazy(() => import('./components/Discovery'));
const Blacklist = lazy(() => import('./components/Blacklist'));
const Stats = lazy(() => import('./components/Stats'));

import { useMastery } from './hooks/useMastery';
import { useSound } from './hooks/useSound';
import { useSteamData } from './hooks/useSteamData';
import { useVault, VaultSearchParams } from './hooks/useVault';
import { Game } from './types';


declare global {
    interface Window {
        electron: {
            apiPort: string;
            checkForUpdates: () => Promise<any>;
            downloadUpdate: () => void;
            installUpdate: () => void;
            onUpdateAvailable: (cb: (info: any) => void) => () => void;
            onUpdateDownloaded: (cb: (info: any) => void) => () => void;
            onUpdateError: (cb: (err: string) => void) => () => void;
        };
    }
}

const API_PORT = window.electron?.apiPort || '3001';
const API_BASE = `http://localhost:${API_PORT}/api`;

// --- TanStack Router Configuration ---
const rootRoute = createRootRoute({
    component: () => <RootComponent />,
});

const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
});

const routeTree = rootRoute.addChildren([indexRoute]);

const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
});

// Inject router into type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

const RootComponent = () => {
    // --- Auth State ---
    const [steamId, setSteamId] = useState<string>(() => localStorage.getItem('vanguard-steam-id') || '');
    const [isSquadronOpen, setIsSquadronOpen] = useState(false);
    const [steamKey, setSteamKey] = useState<string>(() => localStorage.getItem('vanguard-steam-key') || '');

    // Sync API Key to server
    useEffect(() => {
        if (steamKey) {
            axios.post(`${API_BASE}/config`, { apiKey: steamKey }).catch(err => {
                console.error('[Auth] Failed to sync session to server:', err);
            });
        }
    }, [steamKey]);

    const handleAuthenticate = (id: string, key: string) => {
        localStorage.setItem('vanguard-steam-id', id);
        localStorage.setItem('vanguard-steam-key', key);
        setSteamId(id);
        setSteamKey(key);
    };

    const handleLogout = () => {
        localStorage.removeItem('vanguard-steam-id');
        localStorage.removeItem('vanguard-steam-key');
        setSteamId('');
        setSteamKey('');
    };

    // --- Data Fetching ---
    const { profile, games, recentGames, loading, error: steamError } = useSteamData(steamId, API_BASE);
    const { masteredAppIds, hunterTargets } = useMastery(games, steamId, API_BASE);

    useEffect(() => {
        if (steamKey) {
            axios.post(`${API_BASE}/config`, { apiKey: steamKey })
                .catch(err => {
                    console.error('[Auth] Failed to sync session to server:', err);
                });
        }
    }, [steamKey, steamId]);

    const queryClient = useQueryClient();
    const { playHover, playClick, toggleMute, isMuted } = useSound();

    // --- State & Search Params ---
    const search = useSearch({ from: '__root__' }) as VaultSearchParams;
    const navigate = useNavigate();

    const updateSearchParams = useCallback((updates: Partial<VaultSearchParams>) => {
        navigate({ to: '/', search: (prev: any) => ({ ...prev, ...updates }) });
    }, [navigate]);



    const [blacklist, setBlacklist] = useState<number[]>(() => {
        const saved = localStorage.getItem('vanguard-blacklist');
        return saved ? JSON.parse(saved) : [];
    });

    const [randomGame, setRandomGame] = useState<Game | null>(null);
    const [discoveryQueue, setDiscoveryQueue] = useState<Game[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    // Phase 6: Fleet Logic
    const [availableGenres, setAvailableGenres] = useState<Set<string>>(() => {
        const cached = localStorage.getItem('vanguard-genres');
        return cached ? new Set(JSON.parse(cached)) : new Set();
    });
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [gameMetadata, setGameMetadata] = useState<Record<number, any>>(() => {
        const meta: Record<number, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('vanguard-meta-')) {
                const appId = parseInt(key.replace('vanguard-meta-', ''));
                try {
                    meta[appId] = JSON.parse(localStorage.getItem(key)!);
                } catch (e) {
                    console.error("Failed to load metadata cache", e);
                }
            }
        }
        return meta;
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const toggleGenre = (g: string) => {
        if (selectedGenres.includes(g)) setSelectedGenres(prev => prev.filter(x => x !== g));
        else setSelectedGenres(prev => [...prev, g]);
    };

    const scanLibrary = async () => {
        if (isScanning) return;
        setIsScanning(true);
        const newGenres = new Set(availableGenres);

        // Process in chunks to avoid rate limits
        const processGame = async (gameId: number) => {
            // Check cache first
            const key = `vanguard-meta-${gameId}`;
            if (localStorage.getItem(key)) {
                const meta = JSON.parse(localStorage.getItem(key)!);
                meta.genres?.forEach((g: any) => newGenres.add(g.description));
                return;
            }

            try {
                const res = await axios.get(`${API_BASE}/store/${gameId}`);
                const meta = res.data;
                localStorage.setItem(key, JSON.stringify(meta)); // Save individual game metadata
                meta.genres?.forEach((g: any) => newGenres.add(g.description));
            } catch (e) {
                console.error(e);
            }
        };

        const chunk = 5; // Parallel requests
        const unprofiledGames = games.filter(g => !localStorage.getItem(`vanguard-meta-${g.appid}`));

        // Just scan first 50 for now to demo, full scan would need a progress bar
        const targetGames = unprofiledGames.slice(0, 50);

        for (let i = 0; i < targetGames.length; i += chunk) {
            await Promise.all(targetGames.slice(i, i + chunk).map(g => processGame(g.appid)));
            // Small delay
            await new Promise(r => setTimeout(r, 500));
        }

        setAvailableGenres(new Set(newGenres));
        localStorage.setItem('vanguard-genres', JSON.stringify(Array.from(newGenres)));

        // Refresh metadata state
        const meta: Record<number, any> = { ...gameMetadata };
        targetGames.forEach(g => {
            const key = `vanguard-meta-${g.appid}`;
            if (localStorage.getItem(key)) {
                meta[g.appid] = JSON.parse(localStorage.getItem(key)!);
            }
        });
        setGameMetadata(meta);

        setIsScanning(false);
    };

    const vault = useVault(games, masteredAppIds, hunterTargets,
        JSON.parse(localStorage.getItem('vanguard-blacklist') || '[]'),
        search, updateSearchParams,
        selectedGenres, gameMetadata
    );
    const [isMissionLogOpen, setIsMissionLogOpen] = useState(false);
    const [missionLogGame, setMissionLogGame] = useState<{ id: number; name: string } | null>(null);

    const generateRandomGame = () => {
        const pool = games.filter(g => !blacklist.includes(g.appid));
        if (pool.length === 0) return;
        setRandomGame(pool[Math.floor(Math.random() * pool.length)]);
    };

    const generateDiscoveryQueue = () => {
        const pool = games.filter(g => !blacklist.includes(g.appid));
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        setDiscoveryQueue(shuffled.slice(0, 5));
    };

    const toggleBlacklist = (appid: number) => {
        setBlacklist(prev => {
            const next = prev.includes(appid) ? prev.filter(id => id !== appid) : [...prev, appid];
            localStorage.setItem('vanguard-blacklist', JSON.stringify(next));
            return next;
        });
    };


    const stats = useMemo(() => {
        const totalPlaytime = games.reduce((acc, g) => acc + g.playtime_forever, 0);
        const topGame = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever)[0] || null;
        return {
            totalHours: (totalPlaytime / 60).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            gameCount: games.length,
            favoriteGame: topGame ? topGame.name : 'N/A'
        };
    }, [games]);

    const isMastered = (game: Game) => masteredAppIds.includes(game.appid);
    const refreshData = () => queryClient.invalidateQueries();
    const lastUpdated = new Date().toLocaleTimeString();

    if (!steamId || !steamKey) {
        return (
            <Suspense fallback={<div className="fixed inset-0 bg-[#020205] flex items-center justify-center"><Skeleton className="w-full max-w-xl h-[500px]" /></div>}>
                <AuthenticationModal onAuthenticate={handleAuthenticate} />
            </Suspense>
        );
    }

    return (
        <ThemeProvider>
            <div className="flex h-screen bg-app text-txt-main font-sans selection:bg-accent-main/30 overflow-hidden transition-colors duration-500">
                <Suspense fallback={<div className="w-72 bg-panel/80 animate-pulse" />}>
                    <Sidebar
                        activeTab={vault.activeTab}
                        onTabChange={vault.setActiveTab}
                        isSquadronOpen={isSquadronOpen}
                        setIsSquadronOpen={setIsSquadronOpen}
                        isMuted={isMuted}
                        toggleMute={toggleMute}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        steamId={steamId}
                        apiBase={API_BASE}
                        profile={profile}
                        onLogout={handleLogout}
                    />
                </Suspense>

                <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
                    <header className="sticky top-0 z-40 bg-app/60 backdrop-blur-3xl border-b border-border-main/50 px-8 py-6 flex items-center justify-between transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="lg:hidden p-3 rounded-xl bg-surface border border-border-main text-txt-muted hover:text-accent-main transition-colors"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                            </button>
                            {vault.activeTab === 'library' && (
                                <div className="hidden sm:flex items-center gap-4 bg-surface/40 px-6 py-3 rounded-xl border border-border-main group hover:border-accent-main/30 transition-all shrink-0 w-80 hud-border">
                                    <Search className="w-4 h-4 text-txt-dim group-hover:text-accent-main transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH ASSETS..."
                                        value={vault.searchQuery}
                                        onChange={(e) => vault.setSearchQuery(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black tracking-[0.2em] text-txt-main w-full placeholder:text-txt-dim uppercase font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            {steamError && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[10px] font-black uppercase tracking-widest">
                                    <XCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>SYSTEM_ERROR</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-4 py-2 bg-accent-main/5 border border-accent-main/20 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse" />
                                <span className="text-[10px] font-black text-accent-main uppercase tracking-widest font-mono">SYNC: {lastUpdated}</span>
                            </div>
                            <button onClick={refreshData} className="p-3 rounded-xl bg-surface hover:bg-surface-hover border border-border-main transition-all group active:scale-95">
                                <RefreshCw className={`w-4 h-4 text-txt-muted group-hover:text-accent-main transition-colors ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>

                    <div className={`flex-1 min-h-0 flex flex-col p-4 lg:p-8 ${vault.activeTab === 'library' ? '' : 'overflow-y-auto custom-scrollbar'}`}>
                        {steamError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold uppercase tracking-widest">
                                {steamError}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {vault.activeTab === 'overview' && (
                                <Overview
                                    stats={stats}
                                    recentGames={recentGames}
                                    games={games}
                                    vault={vault}
                                    isMastered={isMastered}
                                    setMissionLogGame={(g) => { setMissionLogGame(g); setIsMissionLogOpen(true); }}
                                    setIsMissionLogOpen={setIsMissionLogOpen}
                                    playClick={playClick}
                                    playHover={playHover}
                                    randomGame={randomGame}
                                    generateRandomGame={generateRandomGame}
                                />
                            )}

                            {vault.activeTab === 'library' && (
                                <motion.div
                                    key="library"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="flex-1 flex flex-col min-h-0 space-y-6 px-8 pb-4"
                                >
                                    <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 shrink-0">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-12 bg-accent-main" />
                                                <h2 className="text-6xl font-black tracking-tighter text-txt-main italic uppercase leading-none">Asset Repository</h2>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['all', 'mastered', 'active', 'hunter', 'blacklisted'].map((f) => (
                                                    <button
                                                        key={f}
                                                        onClick={() => { playClick(); vault.setVaultFilter(f as any); }}
                                                        className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${vault.vaultFilter === f ? 'bg-accent-main border-accent-main text-txt-main shadow-lg shadow-accent-main/20' : 'bg-surface/40 border-border-main text-txt-muted hover:text-txt-main hover:bg-surface-hover'}`}
                                                    >
                                                        {f}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-3 bg-surface/40 px-3 py-2 rounded-xl border border-border-main hud-border">
                                                <SortDropdown
                                                    value={vault.vaultSortBy as SortOption}
                                                    onChange={(val) => vault.setVaultSortBy(val as any)}
                                                />
                                            </div>
                                            <FilterPanel
                                                availableGenres={Array.from(availableGenres)}
                                                selectedGenres={selectedGenres}
                                                onToggleGenre={toggleGenre}
                                                onScanLibrary={scanLibrary}
                                                isScanning={isScanning}
                                            />
                                            <Badge variant="outline" className="px-6 py-3 border-border-main bg-surface text-txt-muted font-black tracking-[0.2em] whitespace-nowrap">TOTAL: {vault.filteredAndSortedGames.length}</Badge>

                                            {/* Grouping Toggle */}
                                            <div className="flex bg-surface rounded-xl p-1">
                                                {(['none', 'alpha', 'status'] as const).map(g => (
                                                    <button
                                                        key={g}
                                                        onClick={() => vault.setVaultGrouping(g)}
                                                        className={`px-3 py-1 rounded-lg text-[10px] uppercase font-black transition-all ${vault.vaultGrouping === g ? 'bg-accent-main text-txt-main' : 'text-txt-muted hover:text-txt-main'}`}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </header>

                                    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-accent-main" /></div>}>
                                        <VaultGrid
                                            groupedGames={vault.groupedGames}
                                            vaultGrouping={vault.vaultGrouping}
                                            blacklist={blacklist}
                                            isMastered={isMastered}
                                            hunterTargets={hunterTargets}
                                            selectedGameId={vault.selectedGameId}
                                            onSelectGame={vault.setSelectedGameId}
                                            onLaunchGame={(id) => window.location.href = `steam://run/${id}`}
                                            onOpenMissionLog={(g) => { setMissionLogGame(g); setIsMissionLogOpen(true); }}
                                            onOpenStats={(id) => { vault.setSelectedGameId(id); vault.setActiveTab('stats'); }}
                                            onToggleBlacklist={toggleBlacklist}
                                            playClick={playClick}
                                        />
                                    </Suspense>
                                </motion.div>
                            )}

                            {vault.activeTab === 'stats' && (
                                <Stats vault={vault} steamId={steamId} />
                            )}

                            {vault.activeTab === 'discover' && (
                                <Discovery
                                    discoveryQueue={discoveryQueue}
                                    games={games}
                                    vault={vault}
                                    generateDiscoveryQueue={generateDiscoveryQueue}
                                />
                            )}

                            {vault.activeTab === 'blacklist' && (
                                <Blacklist
                                    blacklist={blacklist}
                                    games={games}
                                    toggleBlacklist={toggleBlacklist}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-main/10 blur-[150px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full"></div>
                </div>

                <Suspense fallback={null}>
                    <MissionLogDrawer
                        isOpen={isMissionLogOpen}
                        onClose={() => setIsMissionLogOpen(false)}
                        appId={missionLogGame?.id || null}
                        gameName={missionLogGame?.name || ''}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <CommandPalette
                        open={isCmdOpen}
                        setOpen={setIsCmdOpen}
                        games={games}
                        onNavigate={(tab, gameId) => {
                            vault.setActiveTab(tab);
                            if (gameId) vault.setSelectedGameId(gameId);
                        }}
                        actions={{
                            toggleMute,
                            randomize: generateRandomGame,
                            refresh: refreshData
                        }}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        steamId={steamId}
                        steamKey={steamKey}
                        onUpdateCredentials={handleAuthenticate}
                        onLogout={handleLogout}
                    />
                </Suspense>

            </div >
        </ThemeProvider >
    );
};

const App = () => <RouterProvider router={router} />;
export default App;
