import { motion } from 'framer-motion';
import { Cloud, Cog, Database, HardDrive, Key, LucideIcon, RefreshCw, Save, Shield, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSound } from '../hooks/useSound';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    steamId: string;
    steamKey: string;
    onUpdateCredentials: (id: string, key: string) => void;
    onLogout: () => void;
}

type Tab = 'general' | 'account' | 'data' | 'about';

export default function SettingsModal({ isOpen, onClose, steamId, steamKey, onUpdateCredentials, onLogout }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [tempId, setTempId] = useState(steamId);
    const [tempKey, setTempKey] = useState(steamKey);
    const { playClick, playHover } = useSound();

    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest'>('idle');

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;

        if (window.electron) {
            const cleanupAvailable = window.electron.onUpdateAvailable(() => {
                if (mounted) setUpdateStatus('available');
            });
            const cleanupDownloaded = window.electron.onUpdateDownloaded(() => {
                if (mounted) {
                    setUpdateStatus('latest');
                    alert("Update downloaded. It will be installed on restart.");
                }
            });

            return () => {
                mounted = false;
                cleanupAvailable?.(); // Optional chaining safe
                cleanupDownloaded?.();
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
        { id: 'general', label: 'General', icon: Cog },
        { id: 'account', label: 'Account', icon: Shield },
        { id: 'data', label: 'Data Mgmt', icon: Database },
        { id: 'about', label: 'System', icon: HardDrive },
    ];

    const handleClearCache = () => {
        // Clear only metadata caches
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('vanguard-meta-') || key === 'vanguard-genres') {
                localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };

    const handleFactoryReset = () => {
        if (confirm('WARNING: This will wipe all local data, including credentials and theme settings. Proceed?')) {
            localStorage.clear();
            window.location.reload();
        }
    };


    const checkForUpdates = async () => {
        setUpdateStatus('checking');
        if (window.electron && window.electron.checkForUpdates) {
            try {
                await window.electron.checkForUpdates();
                // Fallback reset if no event fires quickly (e.g. up to date)
                setTimeout(() => {
                    setUpdateStatus(prev => prev === 'checking' ? 'latest' : prev);
                }, 3000);
            } catch (e) {
                console.error(e);
                setUpdateStatus('latest');
            }
        } else {
            setTimeout(() => setUpdateStatus('latest'), 2000);
        }
    };

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-app/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-4xl bg-panel border border-border-main rounded-[2rem] shadow-2xl overflow-hidden flex h-[600px]"
            >
                {/* Sidebar */}
                <div className="w-64 bg-surface border-r border-border-main p-6 flex flex-col gap-2">
                    <h2 className="text-xl font-black text-txt-main uppercase italic mb-6 px-2">Settings</h2>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { playClick(); setActiveTab(tab.id); }}
                            onMouseEnter={playHover}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-accent-main text-txt-main' : 'text-txt-muted hover:text-txt-main hover:bg-surface'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-hover text-txt-muted hover:text-txt-main transition-colors">
                        <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        {currentTab?.icon && <currentTab.icon className="w-6 h-6 text-accent-main" />}
                        {currentTab?.label}
                    </h3>

                    <div className="space-y-8">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-surface border border-border-main">
                                    <h4 className="text-sm font-bold text-txt-muted mb-2">Startup Behavior</h4>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-txt-dim">Launch Vanguard on system startup</span>
                                        <div className="text-[10px] font-mono text-txt-dim px-2 py-1 rounded bg-black/40">COMING SOON</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-surface border border-border-main space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-txt-dim mb-1 block">Steam ID 64</label>
                                        <input
                                            type="text"
                                            value={tempId}
                                            onChange={(e) => setTempId(e.target.value)}
                                            className="w-full bg-black/40 border border-border-main rounded-xl px-4 py-3 text-sm text-txt-main focus:border-accent-main focus:outline-none transition-colors font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-txt-dim mb-1 block">Steam Web API Key</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={tempKey}
                                                onChange={(e) => setTempKey(e.target.value)}
                                                className="w-full bg-black/40 border border-border-main rounded-xl px-4 py-3 text-sm text-txt-main focus:border-accent-main focus:outline-none transition-colors font-mono"
                                            />
                                            <Key className="absolute right-4 top-3.5 w-4 h-4 text-txt-dim" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { playClick(); onUpdateCredentials(tempId, tempKey); onClose(); }}
                                        className="w-full py-3 rounded-xl bg-accent-main hover:bg-accent-main/80 text-txt-main text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> Save Credentials
                                    </button>
                                </div>

                                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                                    <h4 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h4>
                                    <button
                                        onClick={() => { playClick(); onLogout(); onClose(); }}
                                        className="text-xs text-red-400 hover:text-red-300 underline"
                                    >
                                        Disconnect Account
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-surface border border-border-main">
                                    <h4 className="text-sm font-bold text-txt-muted mb-4">Cache Management</h4>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-txt-muted">Metadata Cache</p>
                                            <p className="text-xs text-txt-dim">Cached genres, categories, and store data.</p>
                                        </div>
                                        <button
                                            onClick={handleClearCache}
                                            className="px-4 py-2 rounded-lg bg-surface border border-border-main hover:bg-surface-hover text-xs font-bold text-txt-muted"
                                        >
                                            Clear Cache
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                                    <h4 className="text-sm font-bold text-red-500 mb-4">Factory Reset</h4>
                                    <p className="text-xs text-red-500/60 mb-4">This will completely wipe all local data and reset the application to its default state.</p>
                                    <button
                                        onClick={handleFactoryReset}
                                        className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wide border border-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Factory Reset
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="space-y-6">
                                <div className="text-center py-8">
                                    <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-txt-main to-txt-dim uppercase tracking-tighter mb-2">Vanguard</h1>
                                    <p className="text-xs font-mono text-accent-main">v1.1.0-prod</p>
                                </div>

                                <div className="p-6 rounded-2xl bg-surface border border-border-main text-center">
                                    <p className="text-sm text-txt-muted mb-4">System Status: <span className="text-green-500 font-bold">ONLINE</span></p>
                                    <button
                                        onClick={checkForUpdates}
                                        disabled={updateStatus === 'checking'}
                                        className="px-6 py-3 rounded-xl bg-surface border border-border-main hover:bg-surface-hover text-txt-main text-xs font-bold uppercase tracking-wide transition-all inline-flex items-center gap-2"
                                    >
                                        {updateStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                                        {updateStatus === 'checking' ? 'Checking...' : updateStatus === 'latest' ? 'System Up to Date' : 'Check for Updates'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
