import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Clock, Notebook, Rocket, Trophy, XCircle } from 'lucide-react';
import { Game } from '../types';

interface GameCardProps {
    game: Game;
    isSelected: boolean;
    isBlacklisted: boolean;
    isMastered: boolean;
    isHunter: boolean;
    playtimeFiltered: string;
    onSelect: () => void;
    onLaunch: () => void;
    onMissionLog: () => void;
    onStats: () => void;
    onToggleBlacklist: () => void;
    style?: React.CSSProperties;
}

export default function GameCard({
    game,
    isSelected,
    isBlacklisted,
    isMastered,
    isHunter,
    playtimeFiltered,
    onSelect,
    onLaunch,
    onMissionLog,
    onStats,
    onToggleBlacklist,
    style
}: GameCardProps) {
    return (
        <motion.div
            style={style}
            onClick={onSelect}
            whileHover={{ scale: 1.01 }}
            className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hud-border ${isSelected
                ? 'border-accent-main bg-accent-glow vanguard-card z-10'
                : 'border-border-main bg-surface/40 hover:border-accent-main/30 hover:z-20'
                } ${isBlacklisted ? 'opacity-40 grayscale pointer-events-none' : ''}`}
        >
            <div className="relative aspect-[460/215] overflow-hidden bg-bg-panel">
                <div className="absolute inset-0 bg-gradient-to-t from-bg-panel via-transparent to-transparent z-10 opacity-60" />
                <div className="absolute top-2 inset-x-2 flex justify-between z-20">
                    {isMastered && (
                        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 backdrop-blur-md text-[8px] font-black px-1.5 py-0">MASTERED</Badge>
                    )}
                    {!isMastered && isHunter && (
                        <Badge className="bg-accent-main/20 text-accent-main border-accent-main/20 backdrop-blur-md flex items-center gap-1 text-[8px] font-black px-1.5 py-0">
                            <Trophy size={8} /> TARGET
                        </Badge>
                    )}
                </div>
                <img
                    src={game.custom_header || `https://cdn.akamai.steamstatic.com/steam/apps/${game.display_appid || game.appid}/header.jpg`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    alt={game.name}
                />
            </div>

            <div className="p-3 z-20 relative flex gap-3">
                <div className="w-0.5 self-stretch bg-accent-main/20 group-hover:bg-accent-main transition-colors rounded-full" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[7px] font-black font-mono text-accent-main opacity-40 group-hover:opacity-100 tracking-[0.2em] transition-opacity">VNGRD // {game.appid.toString().slice(-4)}</span>
                    </div>
                    <h3 className="font-black text-txt-main truncate text-xs uppercase tracking-tight group-hover:text-accent-main transition-colors leading-tight">{game.name}</h3>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-main/20">
                        <p className="text-[8px] font-black text-txt-dim uppercase tracking-widest flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5 text-accent-main/60" />
                            {playtimeFiltered}
                        </p>
                        <div className="h-0.5 w-0.5 rounded-full bg-accent-main/40 group-hover:bg-accent-main animate-pulse font-mono tracking-tighter" />
                    </div>
                </div>
            </div>

            {/* Tactical Action Overlay - HOVER ONLY */}
            <div className="absolute inset-0 bg-bg-panel/95 backdrop-blur-xl flex flex-col justify-center p-4 gap-2 transition-all duration-300 z-30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto shadow-2xl shadow-accent-main/10"
            >
                <div className="flex gap-2 w-full">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLaunch();
                        }}
                        className="flex-1 px-3 py-2.5 rounded-lg bg-accent-main hover:bg-accent-main/80 text-[9px] font-black uppercase tracking-[0.2em] text-txt-main transition-all flex items-center justify-center gap-2 relative z-40 group/btn shadow-lg shadow-accent-main/20"
                    >
                        <Rocket className="w-3 h-3 group-hover/btn:-translate-y-0.5 transition-transform" /> DEPLOY
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMissionLog();
                        }}
                        className="p-2.5 rounded-lg bg-surface border border-border-main hover:border-accent-main/30 text-txt-muted hover:text-txt-main transition-all relative z-40"
                    >
                        <Notebook className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex gap-2 w-full">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStats();
                        }}
                        className="flex-1 py-2.5 rounded-lg bg-surface border border-border-main hover:border-accent-main/30 text-[9px] font-black uppercase tracking-[0.2em] text-txt-muted hover:text-txt-main transition-all flex items-center justify-center gap-2 relative z-40"
                    >
                        <Trophy className="w-3.5 h-3.5" /> INTEL
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleBlacklist();
                        }}
                        className={`p-2.5 rounded-lg border transition-all relative z-40 ${isBlacklisted ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-surface border-border-main text-txt-dim hover:text-txt-main hover:border-red-500/30'}`}
                    >
                        <XCircle className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
