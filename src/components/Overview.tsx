import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Clock,
    Dices,
    Gamepad2,
    Notebook,
    Sparkles,
    Star,
    Trophy,
    Zap
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Game } from '../types';
import { formatTime } from '../utils/format';
import Skeleton from './ui/Skeleton';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

interface OverviewProps {
    stats: {
        totalHours: string;
        gameCount: number;
        favoriteGame: string;
    };
    recentGames: Game[];
    games: Game[]; // Used by AnalyticsDashboard
    vault: any; // Using any for brevity during refactor, ideally strict type
    isMastered: (game: Game) => boolean;
    setMissionLogGame: (game: { id: number; name: string }) => void;
    setIsMissionLogOpen: (open: boolean) => void;
    playClick: () => void;
    playHover: () => void;
    randomGame: Game | null;
    generateRandomGame: () => void;
}

export default function Overview({
    stats,
    recentGames,
    games,
    vault,
    isMastered,
    setMissionLogGame,
    setIsMissionLogOpen,
    playClick,
    playHover,
    randomGame,
    generateRandomGame
}: OverviewProps) {
    return (
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
    );
}
