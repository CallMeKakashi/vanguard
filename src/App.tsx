import logo from '@/assets/logo.png';
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
    History, LayoutDashboard,
    Library,
    Notebook,
    RefreshCw,
    Rocket,
    Search,
    Sparkles,
    Star,
    Trophy,
    Users,
    XCircle,
    Zap
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Skeleton from './components/ui/Skeleton';

const AchievementsList = lazy(() => import('./components/AchievementsList'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AuthenticationModal = lazy(() => import('./components/AuthenticationModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const MissionLogDrawer = lazy(() => import('./components/MissionLogDrawer'));
const SquadronWidget = lazy(() => import('./components/SquadronWidget'));

import { useMastery } from './hooks/useMastery';
import { useSound } from './hooks/useSound';
import { useSteamData } from './hooks/useSteamData';
import { useVault, VaultSearchParams } from './hooks/useVault';
import { Game } from './types';

declare global {
    interface Window {
        electron: {
            apiPort: string;
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

    const vault = useVault(games, masteredAppIds, hunterTargets,
        JSON.parse(localStorage.getItem('vanguard-blacklist') || '[]'),
        search, updateSearchParams
    );

    const [blacklist, setBlacklist] = useState<number[]>(() => {
        const saved = localStorage.getItem('vanguard-blacklist');
        return saved ? JSON.parse(saved) : [];
    });

    const [randomGame, setRandomGame] = useState<Game | null>(null);
    const [discoveryQueue, setDiscoveryQueue] = useState<Game[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCmdOpen, setIsCmdOpen] = useState(false);
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

    const formatTime = (minutes: number) => {
        if (minutes <= 0) return '0M';
        if (minutes < 60) return `${minutes.toFixed(1)} MIN`;
        return `${(minutes / 60).toFixed(1)}H`;
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
        <div className="flex h-screen bg-[#020205] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 bg-[#050508]/80 backdrop-blur-3xl border-r border-white/5 relative z-50">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-12">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <img src={logo} className="w-12 h-12 rounded-2xl relative z-10 border border-white/10" alt="Logo" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Vanguard</h1>
                    </div>

                    <nav className="space-y-2">
                        {[
                            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                            { id: 'library', label: 'Game Vault', icon: Library },
                            { id: 'discover', label: 'Discovery', icon: Sparkles },
                            { id: 'stats', label: 'Achievements', icon: Trophy },
                            { id: 'blacklist', label: 'Blacklist', icon: XCircle },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { playClick(); vault.setActiveTab(item.id); }}
                                onMouseEnter={playHover}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative ${vault.activeTab === item.id ? 'bg-indigo-500/10 text-white font-bold border border-white/5' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                                {vault.activeTab === item.id && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-2xl" />}
                                <item.icon className={`w-5 h-5 transition-colors ${vault.activeTab === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-300'}`} />
                                <span className="relative z-10 uppercase tracking-widest text-xs">{item.label}</span>
                                {item.id === 'discover' && <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-500 text-[8px] font-black text-white">NEW</span>}
                                {vault.activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8">
                        <button
                            onClick={() => { playClick(); setIsCmdOpen(true); }}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Search size={14} />
                                </span>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">Command Center</span>
                                </div>
                            </div>
                            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-500">
                                <span className="text-xs">Ctrl</span>K
                            </kbd>
                        </button>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/5 hover:scrollbar-thumb-white/10 mt-6 mb-6">
                    <Suspense fallback={<div className="h-32 bg-white/5 rounded-xl animate-pulse mx-8" />}>
                        <SquadronWidget steamId={steamId} apiBase={API_BASE} />
                    </Suspense>
                </div>

                <div className="mt-auto p-8 border-t border-white/5 space-y-4">
                    <button
                        onClick={toggleMute}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border border-white/5"
                    >
                        <span>AUDIO FEEDBACK</span>
                        <span className={isMuted ? 'text-slate-600' : 'text-indigo-400'}>{isMuted ? 'OFF' : 'ON'}</span>
                    </button>

                    {profile ? (
                        <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 space-y-3 group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <img src={profile.avatarfull} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" alt="User" />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate text-white uppercase tracking-tight">{profile.personaname}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`w-2 h-2 rounded-full ${profile.personastate === 1 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-500'}`}></span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase">{profile.personastate === 1 ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-3 h-3" /> TERMINATE SESSION
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Zap className="w-3 h-3" /> RESET CREDENTIALS
                        </button>
                    )}
                </div>
            </aside>

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

            <main className="flex-1 flex flex-col relative h-screen overflow-y-auto overflow-x-hidden">
                <header className="sticky top-0 z-40 bg-[#020205]/80 backdrop-blur-3xl border-b border-white/5 px-8 py-6 flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 group hover:border-white/10 transition-all shrink-0 w-80">
                            <Search className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="QUERY INTERFACE..."
                                value={vault.searchQuery}
                                onChange={(e) => vault.setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold tracking-[0.2em] text-slate-300 w-full placeholder:text-slate-600 uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {steamError && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 mb-6">
                                <XCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{steamError}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <History className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{lastUpdated}</span>
                        </div>
                        <button onClick={refreshData} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors relative group">
                            <RefreshCw className={`w-4 h-4 text-slate-300 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                <div className="p-8 lg:p-12 space-y-12">
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
                                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity rounded-[2.5rem]`}></div>
                                            <div className="absolute inset-0 bg-white/5 border border-white/5 rounded-[2.5rem] backdrop-blur-xl group-hover:border-white/10 transition-all flex flex-col p-8 overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all">
                                                    <stat.icon size={120} strokeWidth={1} />
                                                </div>
                                                <div className="mt-auto">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">{stat.label}</p>
                                                        <Badge variant="outline" className="text-[9px] font-black border-white/10 text-slate-400">{stat.trend}</Badge>
                                                    </div>
                                                    <h3 className="text-4xl font-black text-white tracking-tighter truncate max-w-full" title={stat.value.toString()}>
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
                                                <h2 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3 italic uppercase">
                                                    <BarChart3 className="w-6 h-6 text-indigo-400" />
                                                    Active Field Operations
                                                </h2>
                                                <Badge variant="outline" className="border-indigo-500/20 text-indigo-400 font-black tracking-widest px-4 py-1">LAST 2 WEEKS</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {recentGames.length > 0 ? recentGames.slice(0, 4).map((game) => (
                                                    <motion.div
                                                        key={game.appid}
                                                        whileHover={{ y: -5 }}
                                                        className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center gap-5 group transition-all overflow-hidden cursor-pointer"
                                                        onClick={() => {
                                                            vault.setSelectedGameId(game.appid);
                                                            vault.setActiveTab('library');
                                                        }}
                                                    >
                                                        <div className="relative shrink-0">
                                                            <div className="w-32 h-16 rounded-xl overflow-hidden shadow-lg relative group">
                                                                <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                            <h3 className="font-black text-white truncate uppercase tracking-tight text-sm mb-1">{game.name}</h3>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[10px] uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatTime(game.playtime_2weeks || 0)} Recent
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMissionLogGame({ id: game.appid, name: game.name });
                                                                        setIsMissionLogOpen(true);
                                                                    }}
                                                                    className="p-1 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-colors"
                                                                >
                                                                    <Notebook className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )) : <p className="text-slate-500 italic uppercase tracking-widest text-xs py-12 text-center border border-white/5 border-dashed rounded-3xl col-span-2">No active operations</p>}
                                            </div>
                                        </section>
                                    </div>

                                    <div className="lg:col-span-12 xl:col-span-4">
                                        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 h-full relative overflow-hidden group shadow-2xl">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                                                <Zap size={140} strokeWidth={1} className="text-indigo-400" />
                                            </div>
                                            <div className="relative z-10 flex flex-col h-full">
                                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                                                    <Sparkles className="w-5 h-5 text-indigo-400" />
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
                                                                    <p className="text-sm font-bold text-white truncate">{randomGame.name}</p>
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
                                                            className="w-full py-4 rounded-[1.5rem] bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                                        >
                                                            <Dices className="w-4 h-4" />
                                                            GENERATE TARGET
                                                        </button>
                                                        <button
                                                            onClick={() => vault.setActiveTab('discover')}
                                                            className="w-full py-4 rounded-[1.5rem] bg-white/5 text-slate-300 text-xs font-black uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all"
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
                                className="space-y-12"
                            >
                                <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                                    <div className="space-y-4">
                                        <h2 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">Asset Repository</h2>
                                        <div className="flex flex-wrap gap-3">
                                            {['all', 'mastered', 'active', 'hunter', 'blacklisted'].map((f) => (
                                                <button
                                                    key={f}
                                                    onClick={() => vault.setVaultFilter(f as any)}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${vault.vaultFilter === f ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">SORT BY:</span>
                                            <select
                                                value={vault.vaultSortBy}
                                                onChange={(e) => vault.setVaultSortBy(e.target.value as any)}
                                                className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-indigo-400 cursor-pointer"
                                            >
                                                <option value="playtime">Engagement</option>
                                                <option value="name">Alpha Order</option>
                                                <option value="recency">Active Ops</option>
                                            </select>
                                        </div>
                                        <Badge variant="outline" className="px-6 py-3 border-white/5 bg-white/5 text-slate-400 font-black tracking-[0.2em] whitespace-nowrap">TOTAL: {vault.filteredAndSortedGames.length}</Badge>
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {vault.filteredAndSortedGames.map((game, i) => (
                                        <motion.div
                                            key={game.appid}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            whileHover={{ y: -8 }}
                                            className={`group relative overflow-hidden rounded-[2rem] border transition-all ${vault.selectedGame?.id === game.appid ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5 bg-white/5 hover:border-white/20'} ${blacklist.includes(game.appid) ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                                        >
                                            <div className="relative h-48 overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#020205] to-transparent z-10" />
                                                <img
                                                    src={game.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${game.display_appid || game.appid}/header.jpg`}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    alt={game.name}
                                                />
                                                {isMastered(game) && (
                                                    <div className="absolute top-4 right-4 bg-yellow-500 rounded-full p-1.5 shadow-lg shadow-yellow-500/20 z-20">
                                                        <Trophy className="w-3.5 h-3.5 text-black" fill="currentColor" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                                    <h3 className="font-black text-white truncate text-lg uppercase tracking-tight group-hover:text-indigo-400 transition-colors drop-shadow-lg">{game.name}</h3>
                                                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock className="w-3 h-3 text-indigo-400" />
                                                        {formatTime(game.playtime_forever)} DEPLOYED
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white/5 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            playClick();
                                                            window.location.href = `steam://run/${game.appid}`;
                                                        }}
                                                        className="flex-1 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-[10px] font-black uppercase tracking-widest text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                                    >
                                                        <Rocket className="w-3 h-3" /> LAUNCH
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMissionLogGame({ id: game.appid, name: game.name });
                                                            setIsMissionLogOpen(true);
                                                        }}
                                                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        <Notebook className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            vault.setSelectedGameId(game.appid);
                                                            vault.setActiveTab('stats');
                                                        }}
                                                        className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Trophy className="w-3.5 h-3.5" />
                                                        INTEL
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleBlacklist(game.appid);
                                                        }}
                                                        className={`p-3 rounded-2xl border transition-all ${blacklist.includes(game.appid) ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
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
                                            <h2 className="text-4xl font-black tracking-tighter text-white italic uppercase">Operational Data</h2>
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
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Asset Selected</h3>
                                        <button onClick={() => vault.setActiveTab('library')} className="mt-8 px-8 py-4 bg-indigo-500 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-widest">
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
                                        <h2 className="text-5xl font-black tracking-tighter text-white italic uppercase">Discovery Queue</h2>
                                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Curated based on engagement patterns</p>
                                    </div>
                                    <button
                                        onClick={generateDiscoveryQueue}
                                        className="px-8 py-4 bg-indigo-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
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
                                                        <Badge className="bg-indigo-500 text-white font-black px-4 py-1">#{i + 1} RECOMMENDED</Badge>
                                                    </div>
                                                    <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{game.name}</h3>
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
                                        <h2 className="text-5xl font-black tracking-tighter text-white italic uppercase">Asset Blacklist</h2>
                                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Excluded from protocols</p>
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
                                                        <h3 className="font-black text-white truncate text-sm uppercase tracking-tight">{game.name}</h3>
                                                        <p className="text-[10px] font-black text-red-500/60 mt-1 uppercase tracking-widest">PROTOCOL: EXCLUDED</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleBlacklist(game.appid)}
                                                    className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/20 hover:border-red-500/40 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
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
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Blacklist Empty</h3>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full"></div>
            </div>

            {/* Floating Squadron Interface */}
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4 pointer-events-none">
                <AnimatePresence>
                    {isSquadronOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-80 h-[500px] bg-[#050508]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Tactical Squadron</h3>
                                <button onClick={() => setIsSquadronOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <XCircle size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
                                <Suspense fallback={<div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}>
                                    <SquadronWidget steamId={steamId} apiBase={API_BASE} />
                                </Suspense>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSquadronOpen(!isSquadronOpen)}
                    className={`p-5 rounded-3xl border shadow-2xl transition-all flex items-center justify-center pointer-events-auto ${isSquadronOpen ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-[#050508]/80 backdrop-blur-xl border-white/10 text-indigo-400 hover:bg-white/10'}`}
                >
                    <Users className="w-6 h-6" />
                </motion.button>
            </div>
        </div>
    );
};

const App = () => <RouterProvider router={router} />;
export default App;
