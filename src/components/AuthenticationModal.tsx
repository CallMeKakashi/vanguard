import { motion } from 'framer-motion';
import { ExternalLink, HelpCircle, Key, Shield, User, Zap } from 'lucide-react';
import React, { useState } from 'react';

interface AuthenticationModalProps {
    onAuthenticate: (steamId: string, apiKey: string) => void;
}

const AuthenticationModal: React.FC<AuthenticationModalProps> = ({ onAuthenticate }) => {
    const [steamId, setSteamId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!steamId || !apiKey) return;
        setIsLoading(true);
        // Simulate minor delay for premium feel
        await new Promise(r => setTimeout(r, 800));
        onAuthenticate(steamId, apiKey);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020205]/95 backdrop-blur-2xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-xl bg-[#050508] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                            <Shield className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Nexus Authorization</h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure your tactical credentials</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Steam ID 64</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <User className="w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={steamId}
                                    onChange={(e) => setSteamId(e.target.value)}
                                    placeholder="76561198XXXXXXXXX"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all uppercase tracking-widest"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Web API Key</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Key className="w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="ENTER MASTER KEY..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all uppercase tracking-widest"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <a
                                    href="https://steamidfinder.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Find Steam ID</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-white" />
                                </a>
                                <a
                                    href="https://steamcommunity.com/dev/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                                >
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Get API Key</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-white" />
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !steamId || !apiKey}
                                className="w-full h-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:hover:scale-100 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        AUTHORIZE
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
                        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider">
                            Your credentials are stored locally in your <span className="text-indigo-300">Browser/Electron Vault</span>. We never transmit your API key to any third-party servers except for proxying Steam API calls.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthenticationModal;
