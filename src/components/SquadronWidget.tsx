import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Gamepad2, Users, Wifi, WifiOff } from 'lucide-react';

const API_BASE = '/api';
const STEAM_ID = import.meta.env.VITE_STEAM_ID || '';

interface Friend {
    steamid: string;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    personastate: number; // 0 - Offline, 1 - Online, 2 - Busy, 3 - Away, 4 - Snooze, 5 - looking to trade, 6 - looking to play
    gameextrainfo?: string;
    gameid?: string;
}

const SquadronWidget = () => {
    const { data: friends, isLoading } = useQuery({
        queryKey: ['friends', STEAM_ID],
        queryFn: async () => {
            if (!STEAM_ID) return [];
            const res = await axios.get(`${API_BASE}/friends/${STEAM_ID}`);
            return (res.data.friends || []) as Friend[];
        },
        refetchInterval: 30000, // Refresh every 30s
        enabled: !!STEAM_ID
    });

    // Sort: In-Game > Online > Offline
    const sortedFriends = [...(friends || [])].sort((a, b) => {
        const aInGame = a.gameextrainfo ? 2 : 0;
        const bInGame = b.gameextrainfo ? 2 : 0;
        const aOnline = a.personastate > 0 ? 1 : 0;
        const bOnline = b.personastate > 0 ? 1 : 0;

        const scoreA = aInGame + aOnline;
        const scoreB = bInGame + bOnline;

        return scoreB - scoreA;
    });

    const activeSquadron = sortedFriends.filter(f => f.personastate > 0);
    const inGameCount = activeSquadron.filter(f => f.gameextrainfo).length;

    if (isLoading) return <div className="animate-pulse h-20 bg-white/5 rounded-2xl mx-8 mb-8" />;

    return (
        <div className="px-8 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Squadron [{activeSquadron.length}]
                </h3>
                {inGameCount > 0 && (
                    <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-wider animate-pulse">
                        {inGameCount} ACTIVE
                    </span>
                )}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {activeSquadron.length === 0 ? (
                    <div className="text-center py-8 border border-white/5 border-dashed rounded-xl">
                        <WifiOff className="w-4 h-4 text-slate-600 mx-auto mb-2" />
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No Allies Online</p>
                    </div>
                ) : (
                    activeSquadron.map((friend) => (
                        <motion.a
                            href={friend.profileurl}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={friend.steamid}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group relative"
                        >
                            <div className="relative">
                                <img src={friend.avatarmedium} className={`w-8 h-8 rounded-lg shadow-sm ${friend.gameextrainfo ? 'ring-2 ring-green-500' : 'ring-1 ring-white/10'}`} alt={friend.personaname} />
                                <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#050508] ${friend.gameextrainfo ? 'bg-green-500' : 'bg-blue-400'}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">{friend.personaname}</p>
                                <p className={`text-[9px] font-bold truncate leading-tight ${friend.gameextrainfo ? 'text-green-400' : 'text-slate-500'}`}>
                                    {friend.gameextrainfo ? (
                                        <span className="flex items-center gap-1">
                                            <Gamepad2 className="w-2.5 h-2.5" />
                                            {friend.gameextrainfo}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <Wifi className="w-2.5 h-2.5" />
                                            ONLINE
                                        </span>
                                    )}
                                </p>
                            </div>
                        </motion.a>
                    ))
                )}
            </div>
        </div>
    );
};

export default SquadronWidget;
