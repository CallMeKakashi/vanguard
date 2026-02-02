import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Eye, RefreshCw } from 'lucide-react';
import { Game } from '../types';
import { formatTime } from '../utils/format';

interface DiscoveryProps {
    discoveryQueue: Game[];
    games: Game[]; // Fallback if queue is empty
    vault: any;
    generateDiscoveryQueue: () => void;
}

export default function Discovery({
    discoveryQueue,
    games,
    vault,
    generateDiscoveryQueue
}: DiscoveryProps) {
    return (
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
    );
}
