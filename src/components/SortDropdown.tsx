import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownAZ, Calendar, ChevronDown, Clock, Database, Star } from 'lucide-react';
import { useState } from 'react';
import { useSound } from '../hooks/useSound';

export type SortOption = 'playtime' | 'name' | 'size' | 'metacritic' | 'release';

interface SortDropdownProps {
    value: SortOption;
    onChange: (value: SortOption) => void;
}

const options: { id: SortOption; label: string; icon: any }[] = [
    { id: 'playtime', label: 'Engagement', icon: Clock },
    { id: 'name', label: 'Alpha Order', icon: ArrowDownAZ },
    { id: 'size', label: 'Install Size', icon: Database },
    { id: 'metacritic', label: 'Quality', icon: Star },
    { id: 'release', label: 'Release Date', icon: Calendar },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { playClick, playHover } = useSound();

    const selected = options.find((o) => o.id === value) || options[0];

    return (
        <div className="relative z-50">
            <button
                onClick={() => { playClick(); setIsOpen(!isOpen); }}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent-main transition-all min-w-[160px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    <span className="text-txt-muted">SORT BY:</span>
                    <span className="text-txt-main">{selected.label}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-txt-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#050508]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 overflow-hidden"
                    >
                        <div className="space-y-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        playClick();
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    onMouseEnter={playHover}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${value === opt.id ? 'bg-accent-main text-txt-main' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <opt.icon className={`w-3 h-3 ${value === opt.id ? 'text-txt-main' : 'text-slate-600'}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
