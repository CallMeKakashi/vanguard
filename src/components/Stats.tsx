import { motion } from 'framer-motion';
import { ChevronRight, Trophy } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Game } from '../types';
import Skeleton from './ui/Skeleton';

const AchievementsList = lazy(() => import('./AchievementsList'));

interface StatsProps {
    vault: any;
    steamId: string;
}

export default function Stats({ vault, steamId }: StatsProps) {
    return (
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
    );
}
