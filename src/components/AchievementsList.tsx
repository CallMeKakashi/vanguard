import { motion } from 'framer-motion';
import {
    RefreshCw,
    Trophy,
    XCircle,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

const API_BASE = '/api';

interface Achievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
    name?: string;
    description?: string;
    icon?: string;
    icongray?: string;
}

interface GameSchema {
    gameName?: string;
    availableGameStats?: {
        achievements?: {
            name: string;
            defaultvalue: number;
            displayName: string;
            hidden: number;
            description: string;
            icon: string;
            icongray: string;
        }[];
    };
}

const AchievementsList = ({ steamId, appId, gameName }: { steamId: string; appId: number; gameName: string }) => {
    const [data, setData] = useState<{ achievements: Achievement[], schema: GameSchema } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAchievements = async () => {
            setError(null);
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE}/achievements/${steamId}/${appId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();

                if (result.achievements?.playerstats?.achievements && result.schema?.game?.availableGameStats?.achievements) {
                    const statusMap = new Map();
                    result.achievements.playerstats.achievements.forEach((a: any) => {
                        statusMap.set(a.apiname.toLowerCase(), a);
                    });

                    const merged = result.schema.game.availableGameStats.achievements.map((a: any) => {
                        const playerStatus = statusMap.get(a.name.toLowerCase());
                        return {
                            ...a,
                            ...(playerStatus || {}),
                            apiname: a.name,
                            name: a.displayName,
                            achieved: playerStatus ? playerStatus.achieved : 0
                        };
                    });
                    setData({ achievements: merged, schema: result.schema.game });
                } else if (result.achievements?.playerstats?.error === 'Private Profile') {
                    setData(null);
                    setError('Access Denied: Achievements are set to private in Steam settings.');
                } else if (!result.achievements?.playerstats?.achievements) {
                    setData(null);
                    setError('Intelligence data unavailable for this asset.');
                } else {
                    setData(null);
                    setError('Intelligence data unavailable for this asset.');
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to retrieve intelligence data.');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        if (appId) {
            fetchAchievements();
        }
    }, [steamId, appId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Decrypting Achievement Data...</p>
        </div>
    );

    if (error) return (
        <div className="p-12 bg-indigo-500/5 border border-indigo-500/20 rounded-[3rem] text-center max-w-2xl mx-auto backdrop-blur-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full" />
            <XCircle className="w-16 h-16 text-indigo-400 mx-auto mb-8 animate-pulse" />
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Protocol: Data Access Denied</h3>
            <p className="text-slate-400 font-medium mb-12 text-sm leading-relaxed uppercase tracking-widest">
                Intelligence retrieval for <span className="text-indigo-400 font-black">{gameName}</span> blocked by Steam Privacy Matrix.
            </p>

            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 text-left space-y-6">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-4">Resolution Sequence:</p>
                {[
                    'GO TO STEAM PRIVACY SETTINGS',
                    'SET "GAME DETAILS" TO PUBLIC',
                    'ENSURE "ALWAYS KEEP TOTAL PLAYTIME PRIVATE" IS UNCHECKED',
                    'REFRESH DASHBOARD'
                ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black">{i + 1}</span>
                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">{step}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => window.location.reload()}
                className="mt-12 w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-400 transition-all"
            >
                RE-INITIALIZE PROTOCOL
            </button>
        </div>
    );

    if (!data) return <div className="text-center py-4 text-slate-500">No achievements found for {gameName}.</div>;

    const earned = data.achievements.filter(a => a.achieved === 1);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap size={80} className="text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase mb-2">COMPLETION STATUS</p>
                    <h3 className="text-4xl font-black text-white italic">{data.achievements.length > 0 ? ((earned.length / data.achievements.length) * 100).toFixed(0) : 0}%</h3>
                    <div className="mt-6 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.achievements.length > 0 ? (earned.length / data.achievements.length) * 100 : 0}%` }}
                            className="h-full bg-indigo-500"
                        />
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <Trophy size={80} className="text-slate-300" strokeWidth={1} />
                    </div>
                    <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-2">INTELLIGENCE COUNT</p>
                    <h3 className="text-4xl font-black text-white italic">{earned.length} / {data.achievements.length}</h3>
                </div>
            </div>

            <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/5" />
                    DEPLOYED INTEL
                    <div className="h-px flex-1 bg-white/5" />
                </h4>

                <div className="grid grid-cols-1 gap-4">
                    {data.achievements.map((achievement, i) => (
                        <motion.div
                            key={achievement.apiname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.01 }}
                            className={`p-4 rounded-3xl border flex items-center gap-6 transition-all ${achievement.achieved === 1 ? 'bg-white/5 border-white/5 opacity-100' : 'bg-[#050508] border-white/5 opacity-40'}`}
                        >
                            <img
                                src={achievement.achieved === 1 ? achievement.icon : achievement.icongray}
                                className={`w-12 h-12 rounded-xl border border-white/10 ${achievement.achieved === 1 ? 'shadow-lg shadow-indigo-500/10' : ''}`}
                                alt=""
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/logo.png';
                                }}
                            />
                            <div className="min-w-0 flex-1">
                                <h5 className="font-black text-sm text-white uppercase tracking-tight">{achievement.name}</h5>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">{achievement.description || 'No data available'}</p>
                            </div>
                            {achievement.achieved === 1 && (
                                <div className="p-2 border border-green-500/20 bg-green-500/10 rounded-xl">
                                    <Trophy className="w-4 h-4 text-green-500" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AchievementsList;
