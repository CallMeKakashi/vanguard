import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { useMissionLog } from '../hooks/useMissionLog';

interface MissionLogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    appId: number | null;
    gameName: string;
}

const MissionLogDrawer = ({ isOpen, onClose, appId, gameName }: MissionLogDrawerProps) => {
    const { notes, updateNotes, isSaving, lastSaved } = useMissionLog(appId);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#020205]/80 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0f] border-l border-white/5 shadow-2xl z-50 flex flex-col"
                    >
                        <header className="p-6 border-b border-white/5 flex items-center justify-between bg-[#050508]">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                                    MISSION LOG
                                    {isSaving ? (
                                        <span className="text-[10px] text-yellow-500 animate-pulse tracking-widest">SAVING...</span>
                                    ) : lastSaved && (
                                        <span className="text-[10px] text-green-500 tracking-widest flex items-center gap-1">
                                            <Save className="w-3 h-3" /> SAVED
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1 truncate max-w-[250px]">
                                    {gameName}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="flex-1 p-6 relative">
                            {/* Paper Background Line Effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-5"
                                style={{
                                    backgroundImage: 'linear-gradient(transparent 23px, #ffffff 24px)',
                                    backgroundSize: '100% 24px',
                                    marginTop: '24px' // Align with text
                                }}
                            />

                            <textarea
                                value={notes}
                                onChange={(e) => updateNotes(e.target.value)}
                                placeholder="> ENTER TACTICAL DATA..."
                                className="w-full h-full bg-transparent border-none outline-none text-slate-300 font-mono text-sm leading-[24px] resize-none placeholder:text-slate-700"
                                spellCheck={false}
                                autoFocus
                            />
                        </div>

                        <footer className="p-4 border-t border-white/5 bg-[#050508] text-[10px] text-slate-600 font-mono uppercase text-center tracking-widest">
                            SECURE STORAGE // LOCAL TERMINAL
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MissionLogDrawer;
