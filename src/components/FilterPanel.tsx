import { AnimatePresence, motion } from 'framer-motion';
import { Filter, RefreshCcw, Tag } from 'lucide-react';
import { useState } from 'react';
import { useSound } from '../hooks/useSound';

interface FilterPanelProps {
    availableGenres: string[];
    selectedGenres: string[];
    onToggleGenre: (genre: string) => void;
    onScanLibrary: () => void;
    isScanning: boolean;
}

export default function FilterPanel({ availableGenres, selectedGenres, onToggleGenre, onScanLibrary, isScanning }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { playClick, playHover } = useSound();

    return (
        <div className="relative">
            <button
                onClick={() => { playClick(); setIsOpen(!isOpen); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedGenres.length > 0 ? 'bg-accent-main border-accent-main text-txt-main' : 'bg-white/5 border-white/5 text-txt-muted hover:text-white hover:bg-white/10'}`}
            >
                <Filter className="w-3 h-3" />
                FILTERS {selectedGenres.length > 0 && `(${selectedGenres.length})`}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-72 bg-[#050508]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-40"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase tracking-widest text-white">Genre Intel</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onScanLibrary(); }}
                                className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 text-accent-main ${isScanning ? 'animate-spin' : ''}`}
                                title="Scan Library for Genre Tags"
                            >
                                <RefreshCcw className="w-3 h-3" />
                            </button>
                        </div>

                        {availableGenres.length === 0 ? (
                            <div className="text-center py-8">
                                <Tag className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">No Intelligence Data</p>
                                <button
                                    onClick={onScanLibrary}
                                    className="mt-2 text-[9px] font-bold text-accent-main underline uppercase"
                                >
                                    Scan Library Now
                                </button>
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                                {availableGenres.map((genre) => (
                                    <button
                                        key={genre}
                                        onClick={() => onToggleGenre(genre)}
                                        onMouseEnter={playHover}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${selectedGenres.includes(genre) ? 'bg-accent-main/20 text-accent-main' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                    >
                                        <span>{genre}</span>
                                        {selectedGenres.includes(genre) && <div className="w-1.5 h-1.5 rounded-full bg-accent-main" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
