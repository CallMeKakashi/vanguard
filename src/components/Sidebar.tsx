import logo from '@/assets/logo.png';
import { AnimatePresence, motion } from 'framer-motion';
import { Cog, LayoutDashboard, Library, Sparkles, Trophy, Users, XCircle, Zap } from 'lucide-react';
import { lazy, Suspense } from 'react';
import ThemeToggle from './ThemeToggle';
import Skeleton from './ui/Skeleton';

const SquadronWidget = lazy(() => import('./SquadronWidget'));

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: any) => void;
    isSquadronOpen: boolean;
    setIsSquadronOpen: (isOpen: boolean) => void;
    isMuted: boolean;
    toggleMute: () => void;
    onOpenSettings: () => void;
    steamId: string;
    apiBase: string;
    profile: any;
    onLogout: () => void;
}

export default function Sidebar({
    activeTab,
    onTabChange,
    isSquadronOpen,
    setIsSquadronOpen,
    isMuted,
    toggleMute,
    onOpenSettings,
    steamId,
    apiBase,
    profile,
    onLogout
}: SidebarProps) {
    const navItems = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'library', label: 'Game Vault', icon: Library },
        { id: 'discover', label: 'Discovery', icon: Sparkles },
        { id: 'stats', label: 'Achievements', icon: Trophy },
        { id: 'blacklist', label: 'Blacklist', icon: XCircle },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-72 bg-panel/80 backdrop-blur-3xl border-r border-border-main relative z-50 transition-colors duration-500">
            {/* Reduced padding from p-8 to p-5 for better vertical fit */}
            <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-8 shrink-0">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-accent-main rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <img src={logo} className="w-10 h-10 rounded-2xl relative z-10 border border-white/10" alt="Logo" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-txt-main uppercase italic">Vanguard</h1>
                </div>

                <nav className="space-y-1 flex-1 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${activeTab === item.id ? 'bg-accent-main text-txt-main shadow-lg shadow-accent-main/20' : 'text-txt-muted hover:text-txt-main hover:bg-surface'}`}
                        >
                            {activeTab === item.id && (
                                <motion.div layoutId="nav-glow" className="absolute inset-0 bg-white/20 mix-blend-overlay" />
                            )}
                            <item.icon className="w-5 h-5 relative z-10" strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className="font-bold relative z-10 uppercase tracking-wide text-xs">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-border-main space-y-4 shrink-0 relative">
                    <AnimatePresence>
                        {isSquadronOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="absolute bottom-20 left-0 w-full h-[400px] bg-[#050508]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto z-50"
                            >
                                <div className="p-4 border-b border-border-main flex items-center justify-between bg-surface">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-main">Tactical Squadron</h3>
                                    <button onClick={() => setIsSquadronOpen(false)} className="text-txt-muted hover:text-txt-main transition-colors">
                                        <XCircle size={14} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
                                    <Suspense fallback={<div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}>
                                        <SquadronWidget steamId={steamId} apiBase={apiBase} />
                                    </Suspense>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsSquadronOpen(!isSquadronOpen)}
                        className={`w-full p-4 rounded-2xl border shadow-lg transition-all flex items-center justify-center gap-3 ${isSquadronOpen ? 'bg-accent-main border-accent-main/20 text-txt-main' : 'bg-surface backdrop-blur-xl border-border-main text-accent-main hover:bg-surface-hover'}`}
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Squadron</span>
                    </motion.button>

                    <div className="flex items-center justify-between px-2">
                        <button
                            onClick={toggleMute}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface p-2 rounded-lg transition-colors"
                        >
                            <span className="text-txt-dim">AUDIO</span>
                            <span className={isMuted ? 'text-txt-dim' : 'text-accent-main'}>{isMuted ? 'OFF' : 'ON'}</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <button
                                onClick={onOpenSettings}
                                className="p-2 hover:bg-surface-hover rounded-lg text-txt-muted hover:text-txt-main transition-colors"
                            >
                                <Cog className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {profile ? (
                        <div className="p-3 rounded-[1.25rem] bg-surface border border-border-main space-y-3 group hover:bg-surface-hover transition-colors">
                            <div className="flex items-center gap-3">
                                <img src={profile.avatarfull} className="w-8 h-8 rounded-xl border border-white/10 shadow-lg" alt="User" />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate text-txt-main uppercase tracking-tight">{profile.personaname}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${profile.personastate === 1 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-500'}`}></span>
                                        <span className="text-[8px] font-black text-txt-muted uppercase">{profile.personastate === 1 ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-3 h-3" /> LOGOUT
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onLogout}
                            className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Zap className="w-3 h-3" /> RESET
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
