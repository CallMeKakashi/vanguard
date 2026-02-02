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
    BarChart3,
    ChevronRight,
    Clock,
    Dices,
    Eye,
    Gamepad2,
    LayoutDashboard,
    Notebook,
    RefreshCw,
    Search,
    Sparkles,
    Star,
    Trophy,
    XCircle,
    Zap
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import FilterPanel from './components/FilterPanel';
import Sidebar from './components/Sidebar';
import SortDropdown, { SortOption } from './components/SortDropdown';
import Skeleton from './components/ui/Skeleton';
import { ThemeProvider } from './context/ThemeContext';

const AchievementsList = lazy(() => import('./components/AchievementsList'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AuthenticationModal = lazy(() => import('./components/AuthenticationModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const MissionLogDrawer = lazy(() => import('./components/MissionLogDrawer'));
const VaultGrid = lazy(() => import('./components/VaultGrid'));

import { useMastery } from './hooks/useMastery';
import { useSound } from './hooks/useSound';
import { useSteamData } from './hooks/useSteamData';
import { useVault, VaultSearchParams } from './hooks/useVault';
import { Game } from './types';
import { formatTime } from './utils/format';

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
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -30 }}
                                    className="space-y-12"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {[
                                            { label: 'Total Engagement', value: `${stats.totalHours}H`, icon: Clock, color: 'from-indigo-500 to-indigo-700', trend: '+12%' },
                                            { label: 'Asset Library', value: stats.gameCount, icon: Gamepad2, color: 'from-purple-500 to-purple-700', trend: 'STABLE' },
                                            { label: 'Primary Focus', value: stats.favoriteGame, icon: Star, color: 'from-pink-500 to-pink-700', trend: 'TOP' },
                                        ].map((stat, i) => (
                                            <motion.div
                                                key={stat.label}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="relative group h-48"
                                            >
                                                <div className={`absolute inset-0 bg-accent-main opacity-0 group-hover:opacity-10 blur-2xl transition-opacity rounded-[2.5rem]`}></div>
                                                <div className="absolute inset-0 bg-surface border-border-main rounded-[2.5rem] backdrop-blur-xl group-hover:border-accent-main/20 transition-all flex flex-col p-8 overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all">
                                                        <stat.icon size={120} strokeWidth={1} />
                                                    </div>
                                                    <div className="mt-auto">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[10px] font-black tracking-[0.3em] text-txt-muted uppercase">{stat.label}</p>
                                                            <Badge variant="outline" className="text-[9px] font-black border-border-main text-txt-muted">{stat.trend}</Badge>
                                                        </div>
                                                        <h3 className="text-4xl font-black text-txt-main tracking-tighter truncate max-w-full" title={stat.value.toString()}>
                                                            {stat.value}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"><Skeleton className="h-64 rounded-[2.5rem]" /><Skeleton className="h-64 rounded-[2.5rem]" /></div>}>
                                        <AnalyticsDashboard games={games} />
                                    </Suspense>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                                            <section>
                                                <div className="flex items-center justify-between mb-8">
                                                    <h2 className="text-2xl font-black tracking-tighter text-txt-main flex items-center gap-3 italic uppercase">
                                                        <BarChart3 className="w-6 h-6 text-accent-main" />
                                                        Active Field Operations
                                                    </h2>
                                                    <Badge variant="outline" className="border-indigo-500/20 text-accent-main font-black tracking-widest px-4 py-1">LAST 2 WEEKS</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {recentGames.length > 0 ? recentGames.slice(0, 4).map((game) => (
                                                        <motion.div
                                                            key={game.appid}
                                                            whileHover={{ y: -5 }}
                                                            className="bg-glass border-border-main rounded-3xl p-4 flex items-center gap-5 group transition-all overflow-hidden cursor-pointer"
                                                            onClick={() => {
                                                                vault.setSelectedGameId(game.appid);
                                                                vault.setActiveTab('library');
                                                            }}
                                                        >
                                                            <div className="relative shrink-0">
                                                                <div className="w-32 h-16 rounded-xl overflow-hidden shadow-lg relative group">
                                                                    <div className="absolute inset-0 bg-accent-main/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    <img
                                                                        src={game.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${game.display_appid || game.appid}/header.jpg`}
                                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                                                                        alt={game.name}
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                                {isMastered(game) && (
                                                                    <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg shadow-yellow-500/20 z-10 scale-75">
                                                                        <Trophy className="w-3 h-3 text-black" fill="currentColor" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="font-black text-txt-main truncate uppercase tracking-tight text-sm mb-1">{game.name}</h3>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-1.5 text-accent-main font-black text-[10px] uppercase bg-accent-main/10 px-2 py-0.5 rounded-md">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatTime(game.playtime_2weeks || 0)} Recent
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setMissionLogGame({ id: game.appid, name: game.name });
                                                                            setIsMissionLogOpen(true);
                                                                        }}
                                                                        className="p-1 hover:bg-surface-hover rounded-md text-txt-muted hover:text-txt-main transition-colors"
                                                                    >
                                                                        <Notebook className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )) : <p className="text-txt-muted italic uppercase tracking-widest text-xs py-12 text-center border border-border-main border-dashed rounded-3xl col-span-2">No active operations</p>}
                                                </div>
                                            </section>
                                        </div>

                                        <div className="lg:col-span-12 xl:col-span-4">
                                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 h-full relative overflow-hidden group shadow-2xl">
                                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                                                    <Zap size={140} strokeWidth={1} className="text-accent-main" />
                                                </div>
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <h3 className="text-xl font-black text-txt-main italic uppercase tracking-tighter flex items-center gap-2">
                                                        <Sparkles className="w-5 h-5 text-accent-main" />
                                                        PROJECT RELIABILITY
                                                    </h3>
                                                    <div className="mt-8 space-y-6 flex-1">
                                                        {randomGame ? (
                                                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-white/5 rounded-3xl border border-white/10">
                                                                <div className="flex items-center gap-4">
                                                                    <img
                                                                        src={randomGame.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${randomGame.display_appid || randomGame.appid}/header.jpg`}
                                                                        className="w-20 h-10 object-cover rounded-xl border border-white/10"
                                                                        alt={randomGame.name}
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] font-black text-indigo-300 uppercase">RANDOMIZED ASSET</p>
                                                                        <p className="text-sm font-bold text-txt-main truncate">{randomGame.name}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <p className="text-slate-400 text-sm leading-relaxed font-medium uppercase tracking-tight">
                                                                INTELLIGENCE REPORT: Your engagement patterns are shifting. Deploy the randomizer to discover dormant assets.
                                                            </p>
                                                        )}
                                                        <div className="flex flex-col gap-3 mt-auto">
                                                            <button
                                                                onClick={() => { playClick(); generateRandomGame(); }}
                                                                onMouseEnter={playHover}
                                                                className="w-full py-4 rounded-[1.5rem] bg-accent-main text-txt-main text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                            >
                                                                <Dices className="w-4 h-4" />
                                                                GENERATE TARGET
                                                            </button>
                                                            <button
                                                                onClick={() => vault.setActiveTab('discover')}
                                                                className="w-full py-4 rounded-[1.5rem] bg-surface text-txt-muted text-xs font-black uppercase tracking-[0.2em] border border-border-main hover:bg-surface-hover transition-all"
                                                            >
                                                                OPEN DISCOVERY
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
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
                                <motion.div
                                    key="stats"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="space-y-12"
                                >
                                    {vault.selectedGame ? (
                                        <div className="max-w-4xl mx-auto w-full">
                                            <div className="flex items-center gap-6 mb-12">
                                                <button onClick={() => vault.setActiveTab('library')} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                                </button>
                                                <h2 className="text-4xl font-black tracking-tighter text-txt-main italic uppercase">Operational Data</h2>
                                            </div>
                                            <Suspense fallback={<div className="space-y-8"><Skeleton className="h-32 rounded-[2rem]" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-20" /><Skeleton className="h-20" /></div></div>}>
                                                <AchievementsList steamId={steamId} appId={vault.selectedGame.display_appid || vault.selectedGame.id} gameName={vault.selectedGame.name} />
                                            </Suspense>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-32 text-center">
                                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5">
                                                <Trophy className="w-10 h-10 text-slate-700" />
                                            </div>
                                            <h3 className="text-2xl font-black text-txt-main italic uppercase tracking-tighter">No Asset Selected</h3>
                                            <button onClick={() => vault.setActiveTab('library')} className="mt-8 px-8 py-4 bg-accent-main rounded-[1.5rem] text-txt-main font-black text-xs uppercase tracking-widest">
                                                RETURN TO VAULT
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {vault.activeTab === 'discover' && (
                                <motion.div
                                    key="discover"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-12"
                                >
                                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div>
                                            <h2 className="text-5xl font-black tracking-tighter text-txt-main italic uppercase">Discovery Queue</h2>
                                            <p className="text-txt-muted font-bold mt-2 uppercase tracking-widest text-xs">Curated based on engagement patterns</p>
                                        </div>
                                        <button
                                            onClick={generateDiscoveryQueue}
                                            className="px-8 py-4 bg-accent-main text-txt-main rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                                        >
                                            <RefreshCw className="w-4 h-4" /> RE-ROLL
                                        </button>
                                    </header>

                                    <div className="grid grid-cols-1 gap-8">
                                        {(discoveryQueue.length > 0 ? discoveryQueue : games.slice(0, 5)).map((game, i) => (
                                            <motion.div
                                                key={game.appid}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="group relative h-96 rounded-[3rem] overflow-hidden border border-white/5 hover:border-white/20 transition-all flex items-end"
                                            >
                                                <div className="absolute inset-0 z-0">
                                                    <img
                                                        src={game.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${game.display_appid || game.appid}/library_hero.jpg`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        alt={game.name}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-[#020205]/40 to-transparent" />
                                                </div>
                                                <div className="relative z-10 p-12 w-full flex items-center justify-between gap-8">
                                                    <div className="max-w-2xl">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <Badge className="bg-accent-main text-txt-main font-black px-4 py-1">#{i + 1} RECOMMENDED</Badge>
                                                        </div>
                                                        <h3 className="text-6xl font-black text-txt-main italic uppercase tracking-tighter leading-none mb-4">{game.name}</h3>
                                                        <p className="text-slate-400 font-medium text-lg uppercase tracking-widest">
                                                            {formatTime(game.playtime_forever || 0)} ALREADY INVESTED
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                vault.setSelectedGameId(game.appid);
                                                                vault.setActiveTab('stats');
                                                            }}
                                                            className="px-12 py-5 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3"
                                                        >
                                                            <Eye className="w-5 h-5" /> VIEW DETAILS
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {vault.activeTab === 'blacklist' && (
                                <motion.div
                                    key="blacklist"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="space-y-12"
                                >
                                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div>
                                            <h2 className="text-5xl font-black tracking-tighter text-txt-main italic uppercase">Asset Blacklist</h2>
                                            <p className="text-txt-muted font-bold mt-2 uppercase tracking-widest text-xs">Excluded from protocols</p>
                                        </div>
                                        <Badge variant="outline" className="px-6 py-2 border-red-500/20 bg-red-500/5 text-red-500 font-black tracking-[0.2em]">EXCLUDED: {blacklist.length}</Badge>
                                    </header>

                                    {blacklist.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                            {games.filter(g => blacklist.includes(g.appid)).map((game, i) => (
                                                <motion.div
                                                    key={game.appid}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.02 }}
                                                    className="group relative overflow-hidden rounded-[2rem] border border-red-500/20 bg-red-500/5 transition-all p-6"
                                                >
                                                    <div className="flex items-center gap-4 mb-6 relative">
                                                        <img
                                                            src={game.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${game.display_appid || game.appid}/header.jpg`}
                                                            className="w-14 h-14 rounded-2xl grayscale object-cover border border-white/10"
                                                            alt={game.name}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-black text-txt-main truncate text-sm uppercase tracking-tight">{game.name}</h3>
                                                            <p className="text-[10px] font-black text-red-500/60 mt-1 uppercase tracking-widest">PROTOCOL: EXCLUDED</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleBlacklist(game.appid)}
                                                        className="w-full py-3 rounded-2xl bg-glass border-border-main hover:bg-red-500/20 hover:border-red-500/40 text-[10px] font-black uppercase tracking-widest text-txt-main transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" /> RESTORE
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-32 text-center">
                                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5">
                                                <XCircle className="w-10 h-10 text-slate-700" />
                                            </div>
                                            <h3 className="text-2xl font-black text-txt-main italic uppercase tracking-tighter">Blacklist Empty</h3>
                                        </div>
                                    )}
                                </motion.div>
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
