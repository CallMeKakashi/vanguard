import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { RefreshCw, XCircle } from 'lucide-react';
import { Game } from '../types';

interface BlacklistProps {
    blacklist: number[];
    games: Game[];
    toggleBlacklist: (id: number) => void;
}

export default function Blacklist({ blacklist, games, toggleBlacklist }: BlacklistProps) {
    return (
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
    );
}
