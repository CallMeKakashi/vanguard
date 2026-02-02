import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Shield, Terminal, Zap } from 'lucide-react';
import { useState } from 'react';
import { Theme, useTheme } from '../context/ThemeContext';
import { useSound } from '../hooks/useSound';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const { playClick, playHover } = useSound();
    const [isOpen, setIsOpen] = useState(false);

    const themes: { id: Theme; label: string; icon: any; color: string }[] = [
        { id: 'command', label: 'COMMAND', icon: Shield, color: 'bg-[#6366f1]' },
        { id: 'crimson', label: 'RED ALERT', icon: Zap, color: 'bg-[#ef4444]' },
        { id: 'terminal', label: 'TERMINAL', icon: Terminal, color: 'bg-[#22c55e]' },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => { playClick(); setIsOpen(!isOpen); }}
                className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-slate-400 hover:text-white"
            >
                <Monitor className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-full mb-4 left-0 w-48 bg-[#050508] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                    >
                        <div className="space-y-1">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        playClick();
                                        setTheme(t.id);
                                        setIsOpen(false);
                                    }}
                                    onMouseEnter={playHover}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${t.color} ${theme === t.id ? 'shadow-[0_0_8px_currentColor]' : ''}`} />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
