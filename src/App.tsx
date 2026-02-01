import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    XCircle,
    Zap
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AchievementsList from './components/AchievementsList';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CommandPalette from './components/CommandPalette';
import MissionLogDrawer from './components/MissionLogDrawer';
import SquadronWidget from './components/SquadronWidget';
import { useSound } from './hooks/useSound';
import { Game, Profile } from './types';

// @ts-ignore
const API_PORT = window.electron?.apiPort || '3001';
const API_BASE = `http://localhost:${API_PORT}/api`;
const STEAM_ID = import.meta.env.VITE_STEAM_ID || '';

// Local interfaces removed in favor of src/types.ts

// --- TanStack Router Search Params Schema ---
interface AppSearchParams {
    tab?: 'overview' | 'library' | 'stats' | 'discover' | 'blacklist';
    game?: number;
    sort?: 'playtime' | 'name' | 'recency';
    filter?: 'all' | 'mastered' | 'blacklisted' | 'active' | 'hunter';
}

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
    // --- Data Fetching (TanStack Query) ---
    const { data: profileData, isLoading: isProfileLoading, error: profileError } = useQuery({
        queryKey: ['profile', STEAM_ID],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/profile/${STEAM_ID}`);
            return res.data.response?.players?.[0] as Profile;
        },
        enabled: !!STEAM_ID,
    });

    const { data: gamesData, isLoading: isGamesLoading, error: gamesError } = useQuery({
        queryKey: ['games', STEAM_ID],
        queryFn: async () => {
            const [gamesRes, recentRes] = await Promise.all([
                axios.get(`${API_BASE}/games/${STEAM_ID}`),
                axios.get(`${API_BASE}/recent/${STEAM_ID}`)
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
        enabled: !!STEAM_ID,
    });

    const { data: recentGamesData, isLoading: isRecentLoading, error: recentError } = useQuery({
        queryKey: ['recent', STEAM_ID],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/recent/${STEAM_ID}`);
            const rawGames = (res.data.response?.games || []) as Game[];
            return rawGames.map(g => g.appid === 480 ? { ...g, name: 'ELDEN RING COOP' } : g);
        },
        enabled: !!STEAM_ID,
    });

    const queryClient = useQueryClient();
    const games = useMemo(() => gamesData || [], [gamesData]);
    const profile = profileData || null;
    const recentGames = recentGamesData || [];
    const loading = isProfileLoading || isGamesLoading || isRecentLoading;
    const error = profileError?.message || gamesError?.message || recentError?.message || null;

    // --- State & Search Params ---
    const search = useSearch({ from: '__root__' }) as AppSearchParams;
    const navigate = useNavigate();

    const activeTab = search.tab || 'overview';
    const selectedGameId = search.game || null;
    const vaultSortBy = search.sort || 'playtime';
    const vaultFilter = search.filter || 'all';

    const [blacklist, setBlacklist] = useState<number[]>(() => {
        const saved = localStorage.getItem('vanguard-blacklist');
        return saved ? JSON.parse(saved) : [];
    });
    const [randomGame, setRandomGame] = useState<Game | null>(null);
    const [discoveryQueue, setDiscoveryQueue] = useState<Game[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCmdOpen, setIsCmdOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [masteredAppIds, setMasteredAppIds] = useState<number[]>([]);
    const [isMissionLogOpen, setIsMissionLogOpen] = useState(false);
    const [missionLogGame, setMissionLogGame] = useState<{ id: number; name: string } | null>(null);
    const [hunterTargets, setHunterTargets] = useState<number[]>([]);

    const { playHover, playClick, toggleMute, isMuted } = useSound();

    const selectedGame = useMemo(() => {
        if (!selectedGameId) return null;
        const game = games.find(g => g.appid === selectedGameId);
        return game ? { id: game.appid, name: game.name } : null;
    }, [games, selectedGameId]);

    const updateSearchParams = useCallback((updates: Partial<AppSearchParams>) => {
        navigate({
            to: '/',
            search: (prev: any) => ({ ...prev, ...updates }),
        });
    }, [navigate]);

    const setActiveTab = (tab: string) => updateSearchParams({ tab: tab as any });
    const setSelectedGameId = (id: number | null) => updateSearchParams({ game: id || undefined });
    const setVaultSortBy = (sort: string) => updateSearchParams({ sort: sort as any });
    const setVaultFilter = (filter: string) => updateSearchParams({ filter: filter as any });

    // --- Achievement Verification (Mastered Fix) ---
    useEffect(() => {
        const verifyMastery = async () => {
            if (games.length === 0) return;
            const sortedByPlaytime = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever);
            const targets = sortedByPlaytime.slice(0, 15);
            if (!targets.some(g => g.appid === 1245620)) {
                const elden = games.find(g => g.appid === 1245620);
                if (elden) targets.push(elden);
            }

            const mastered: number[] = [];
            const hunters: number[] = [];

            for (const game of targets) {
                try {
                    const res = await axios.get(`${API_BASE}/achievements/${STEAM_ID}/${game.appid}`);
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
                    console.error(`Mastery check failed for ${game.appid}`, e);
                }
            }
            setMasteredAppIds(mastered);
            setHunterTargets(hunters);
        };
        verifyMastery();
    }, [games]);

    const formatTime = (minutes: number) => {
        if (minutes <= 0) return '0M';
        if (minutes < 1) {
            const seconds = Math.round(minutes * 60);
            return `${seconds}S`;
        }
        if (minutes < 60) {
            return `${minutes.toFixed(1)} MIN`;
        }
        return `${(minutes / 60).toFixed(1)}H`;
    };

    const stats = useMemo(() => {
        const totalPlaytime = games.reduce((acc, g) => acc + g.playtime_forever, 0);
        const topGame = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever)[0] || null;
        return {
            totalHours: (totalPlaytime / 60).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            gameCount: games.length,
            favoriteGame: topGame ? topGame.name : 'N/A',
            favoriteAppId: topGame?.appid
        };
    }, [games]);

    const toggleBlacklist = (appid: number) => {
        setBlacklist(prev => {
            const next = prev.includes(appid) ? prev.filter(id => id !== appid) : [...prev, appid];
            localStorage.setItem('vanguard-blacklist', JSON.stringify(next));
            return next;
        });
    };

    const generateRandomGame = () => {
        const pool = games.filter(g => !blacklist.includes(g.appid));
        if (pool.length === 0) return;
        const random = pool[Math.floor(Math.random() * pool.length)];
        setRandomGame(random);
    };

    const generateDiscoveryQueue = () => {
        const pool = games.filter(g => !blacklist.includes(g.appid));
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        setDiscoveryQueue(shuffled.slice(0, 5));
    };

    const isMastered = (game: Game) => masteredAppIds.includes(game.appid);

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
    }, [games, searchQuery, vaultFilter, vaultSortBy, masteredAppIds, blacklist]);

    const refreshData = () => {
        queryClient.invalidateQueries();
    };

    const lastUpdated = new Date().toLocaleTimeString();

    if (!STEAM_ID) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-12 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-3xl max-w-lg w-full text-center shadow-2xl">
                    <img src="/logo.png" className="w-24 h-24 mx-auto mb-8 rounded-3xl shadow-indigo-500/20 shadow-xl" alt="Logo" />
                    <h2 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Nexus Connectivity Error</h2>
                    <p className="mt-6 text-slate-400 text-lg leading-relaxed">Initialize your dashboard by configuring <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-300">.env</code>.</p>
                </motion.div>
            </div>
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
                            <img src="/logo.png" className="w-12 h-12 rounded-2xl relative z-10 border border-white/10" alt="Logo" />
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
                                onClick={() => { playClick(); setActiveTab(item.id as any); }}
                                onMouseEnter={playHover}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group relative ${activeTab === item.id ? 'bg-indigo-500/10 text-white font-bold border border-white/5' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                                {activeTab === item.id && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-2xl" />}
                                <item.icon className={`w-5 h-5 transition-colors ${activeTab === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-300'}`} />
                                <span className="relative z-10 uppercase tracking-widest text-xs">{item.label}</span>
                                {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/5 hover:scrollbar-thumb-white/10">
                    <SquadronWidget />
                </div>

                <div className="mt-auto p-8 border-t border-white/5 space-y-4">
                    <button
                        onClick={toggleMute}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors border border-white/5"
                    >
                        <span>AUDIO FEEDBACK</span>
                        <span className={isMuted ? 'text-slate-600' : 'text-indigo-400'}>{isMuted ? 'OFF' : 'ON'}</span>
                    </button>

                    {profile && (
                        <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-colors">
                            <img src={profile.avatarfull} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" alt="User" />
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate text-white uppercase tracking-tight">{profile.personaname}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`w-2 h-2 rounded-full ${profile.personastate === 1 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-500'}`}></span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase">{profile.personastate === 1 ? 'Online' : 'Offline'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            <MissionLogDrawer
                isOpen={isMissionLogOpen}
                onClose={() => setIsMissionLogOpen(false)}
                appId={missionLogGame?.id || null}
                gameName={missionLogGame?.name || ''}
            />

            <CommandPalette
                open={isCmdOpen}
                setOpen={setIsCmdOpen}
                games={games}
                onNavigate={(tab, gameId) => {
                    setActiveTab(tab as any);
                    if (gameId) setSelectedGameId(gameId);
                }}
                actions={{
                    toggleMute,
                    randomize: generateRandomGame,
                    refresh: refreshData
                }}
            />

            {/* Main Content */}
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
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-bold tracking-[0.2em] text-slate-300 w-full placeholder:text-slate-600 uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
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
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
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

                                <AnalyticsDashboard games={games} />

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
                                                        className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center gap-5 group transition-all overflow-hidden"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <div className="w-32 h-16 rounded-xl overflow-hidden shadow-lg relative group">
                                                                <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                <img
                                                                    src={game.appid === 480 ? 'https://i9.ytimg.com/vi/0zgcBTeKOSM/mqdefault.jpg?v=67dea7c8&sqp=COzs-8sG&rs=AOn4CLD7MxKxC0H8ad8sQ6p5_clg8II44Q' : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                                                                    alt={game.name}
                                                                />
                                                            </div>
                                                            {isMastered(game) && (
                                                                <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg shadow-yellow-500/20 z-10 scale-75">
                                                                    <Trophy className="w-3 h-3 text-black" fill="currentColor" />
                                                                </div>
                                                            )}
                                                            {hunterTargets.includes(game.appid) && (
                                                                <div className="absolute -top-2 -right-2 bg-orange-500 rounded-full p-1 shadow-lg shadow-orange-500/20 z-10 scale-75">
                                                                    <Trophy className="w-3 h-3 text-black" />
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
                                                                    title="Open Mission Log"
                                                                >
                                                                    <Notebook className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )) : <p className="text-slate-500 italic uppercase tracking-widest text-xs py-12 text-center border border-white/5 border-dashed rounded-3xl col-span-2">No active operations detected</p>}
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
                                                                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${randomGame.appid}/header.jpg`}
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
                                                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                                            INTELLIGENCE REPORT: Your deep dive into <span className="text-indigo-300 font-black">{games[0]?.name || 'current favorites'}</span> identifies shifting patterns. Deploy the randomizer for unexpected engagement.
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
                                                            onClick={() => setActiveTab('discover')}
                                                            className="w-full py-4 rounded-[1.5rem] bg-white/5 text-slate-300 text-xs font-black uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all"
                                                        >
                                                            OPEN DISCOVERY QUEUE
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div >
                            </motion.div >
                        )}

                        {
                            activeTab === 'library' && (
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
                                                {['all', 'mastered', 'active', 'blacklisted'].map((f) => (
                                                    <button
                                                        key={f}
                                                        onClick={() => setVaultFilter(f as any)}
                                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${vaultFilter === f ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
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
                                                    value={vaultSortBy}
                                                    onChange={(e) => setVaultSortBy(e.target.value as any)}
                                                    className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-indigo-400 cursor-pointer"
                                                >
                                                    <option value="playtime">Engagement</option>
                                                    <option value="name">Alpha Order</option>
                                                    <option value="recency">Active Ops</option>
                                                </select>
                                            </div>
                                            <Badge variant="outline" className="px-6 py-3 border-white/5 bg-white/5 text-slate-400 font-black tracking-[0.2em] whitespace-nowrap">TOTAL: {filteredAndSortedGames.length}</Badge>
                                        </div>
                                    </header>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                        {filteredAndSortedGames.map((game, i) => (
                                            <motion.div
                                                key={game.appid}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                whileHover={{ y: -8 }}
                                                className={`group relative overflow-hidden rounded-[2rem] border transition-all ${selectedGame?.id === game.appid ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5 bg-white/5 hover:border-white/20'} ${blacklist.includes(game.appid) ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                                            >
                                                <div className="relative h-48 overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020205] to-transparent z-10" />
                                                    <img
                                                        src={game.appid === 480 ? 'https://cdn.steamgriddb.com/icon/4e74f17c8008892410a563351d3886b7.png' : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        alt={game.name}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = game.appid === 480 ? 'https://i9.ytimg.com/vi/0zgcBTeKOSM/mqdefault.jpg?v=67dea7c8&sqp=COzs-8sG&rs=AOn4CLD7MxKxC0H8ad8sQ6p5_clg8II44Q' : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
                                                        }}
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
                                                                setSelectedGameId(game.appid);
                                                                setActiveTab('stats');
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
                                                            title={blacklist.includes(game.appid) ? "Unblacklist" : "Blacklist"}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )
                        }

                        {
                            activeTab === 'stats' && (
                                <motion.div
                                    key="stats"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="space-y-12"
                                >
                                    {selectedGame ? (
                                        <div className="max-w-4xl mx-auto w-full">
                                            <div className="flex items-center gap-6 mb-12">
                                                <button onClick={() => setActiveTab('library')} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                                </button>
                                                <h2 className="text-4xl font-black tracking-tighter text-white italic uppercase">Operational Data</h2>
                                            </div>
                                            <AchievementsList steamId={STEAM_ID} appId={selectedGame.id} gameName={selectedGame.name} />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-32 text-center">
                                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5">
                                                <Trophy className="w-10 h-10 text-slate-700" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">No Asset Selected</h3>
                                            <button onClick={() => setActiveTab('library')} className="mt-8 px-8 py-4 bg-indigo-500 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">
                                                RETURN TO VAULT
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        }
                        {
                            activeTab === 'discover' && (
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
                                            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Curated based on engagement patterns and your library</p>
                                        </div>
                                        <button
                                            onClick={generateDiscoveryQueue}
                                            className="px-8 py-4 bg-indigo-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            RE-ROLL QUEUE
                                        </button>
                                    </header>

                                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
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
                                                        src={game.appid === 480 ? 'https://i9.ytimg.com/vi/0zgcBTeKOSM/mqdefault.jpg?v=67dea7c8&sqp=COzs-8sG&rs=AOn4CLD7MxKxC0H8ad8sQ6p5_clg8II44Q' : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        alt={game.name}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = game.appid === 480 ? 'https://i9.ytimg.com/vi/0zgcBTeKOSM/mqdefault.jpg?v=67dea7c8&sqp=COzs-8sG&rs=AOn4CLD7MxKxC0H8ad8sQ6p5_clg8II44Q' : `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-[#020205]/40 to-transparent" />
                                                </div>
                                                <div className="relative z-10 p-12 w-full flex items-center justify-between gap-8">
                                                    <div className="max-w-2xl">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <Badge className="bg-indigo-500 text-white font-black px-4 py-1">#{i + 1} RECOMMENDED</Badge>
                                                            {isMastered(game) && (
                                                                <div className="px-4 py-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg border border-yellow-400/50 flex items-center gap-2">
                                                                    <Trophy className="w-3 h-3 text-white" fill="currentColor" />
                                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">MASTERED</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <h3 className="text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{game.name}</h3>
                                                        <p className="text-slate-400 font-medium text-lg uppercase tracking-widest">
                                                            {formatTime(game.playtime_forever || 0)} ALREADY INVESTED
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedGameId(game.appid);
                                                                setActiveTab('stats');
                                                            }}
                                                            className="px-12 py-5 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                            VIEW DETAILS
                                                        </button>
                                                        <button
                                                            onClick={() => toggleBlacklist(game.appid)}
                                                            className="px-12 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                            BLACKLIST
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )
                        }

                        {
                            activeTab === 'blacklist' && (
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
                                            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Excluded from discovery and randomizer protocols</p>
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
                                                            src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                                                            className="w-14 h-14 rounded-2xl grayscale object-cover border border-white/10"
                                                            alt={game.name}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
                                                            }}
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
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        RESTORE ASSET
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
                                            <button onClick={() => setActiveTab('library')} className="mt-8 px-8 py-4 bg-indigo-500 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">
                                                BROWSE REPOSITORY
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        }
                    </AnimatePresence >
                </div >
            </main >

            {/* Background Effects */}
            < div className="fixed inset-0 pointer-events-none z-0" >
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full"></div>
            </div >
        </div >
    );
};

const App = () => {
    return <RouterProvider router={router} />;
};

export default App;
