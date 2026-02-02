import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Gamepad2,
    LayoutDashboard,
    Library,
    Search,
    Sparkles,
    Trophy,
    VolumeX
} from 'lucide-react';
import { useEffect } from 'react';
import { Game } from '../types';

interface CommandPaletteProps {
    open: boolean;
    setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    games: Game[];
    onNavigate: (tab: string, gameId?: number) => void;
    actions: {
        toggleMute: () => void;
        randomize: () => void;
        refresh: () => void;
    };
}

const CommandPalette = ({ open, setOpen, games, onNavigate, actions }: CommandPaletteProps) => {
    // Toggle with Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open: boolean) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [setOpen]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setOpen(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <Command className="w-full bg-transparent">
                            <div className="flex items-center border-b border-white/5 px-4" cmdk-input-wrapper="">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-white" />
                                <Command.Input
                                    autoFocus
                                    placeholder="Type a command or search assets..."
                                    className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-white font-mono uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 p-2">
                                <Command.Empty className="py-6 text-center text-xs text-slate-500 font-mono uppercase tracking-widest">
                                    No Intel Found.
                                </Command.Empty>

                                <Command.Group heading="Navigation" className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1.5 select-none">
                                    <Item icon={LayoutDashboard} onSelect={() => { onNavigate('overview'); setOpen(false); }}>Dashboard</Item>
                                    <Item icon={Library} onSelect={() => { onNavigate('library'); setOpen(false); }}>Game Vault</Item>
                                    <Item icon={Trophy} onSelect={() => { onNavigate('stats'); setOpen(false); }}>Achievements</Item>
                                    <Item icon={Sparkles} onSelect={() => { onNavigate('discover'); setOpen(false); }}>Discovery</Item>
                                </Command.Group>

                                <Command.Group heading="Tactical Actions" className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1.5 select-none mt-2">
                                    <Item icon={VolumeX} onSelect={() => { actions.toggleMute(); setOpen(false); }}>Toggle Audio Mute</Item>
                                    <Item icon={Gamepad2} onSelect={() => { actions.randomize(); setOpen(false); }}>Randomize Target</Item>
                                    <Item icon={Search} onSelect={() => { actions.refresh(); setOpen(false); }}>Refresh Intel</Item>
                                </Command.Group>

                                <Command.Group heading="Asset Database" className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1.5 select-none mt-2">
                                    {games.slice(0, 50).map((game) => (
                                        <Command.Item
                                            key={game.appid}
                                            onSelect={() => {
                                                onNavigate('overview', game.appid); // Or library, but overview works
                                                setOpen(false);
                                            }}
                                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-indigo-500 aria-selected:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 group transition-colors"
                                        >
                                            <img src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`} className="w-8 h-4 object-cover rounded mr-3 opacity-60 group-aria-selected:opacity-100" />
                                            <span className="font-bold uppercase tracking-tight text-xs text-slate-300 group-aria-selected:text-white">{game.name}</span>
                                        </Command.Item>
                                    ))}
                                    {games.length > 50 && (
                                        <Command.Item disabled className="px-2 py-2 text-[10px] text-slate-600 font-mono uppercase text-center cursor-default">
                                            ... and {games.length - 50} more assets
                                        </Command.Item>
                                    )}
                                </Command.Group>
                            </Command.List>
                        </Command>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Item = ({ children, icon: Icon, onSelect }: any) => {
    return (
        <Command.Item
            onSelect={onSelect}
            className="relative flex cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none aria-selected:bg-white/10 aria-selected:text-white text-slate-400 font-bold tracking-tight transition-colors"
        >
            <Icon className="mr-3 h-3.5 w-3.5" />
            <span>{children}</span>
        </Command.Item>
    );
};

export default CommandPalette;
