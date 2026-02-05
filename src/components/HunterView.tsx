import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Brain, ExternalLink, History, Loader2, MessageSquare, Plus, StickyNote, Trophy, X, Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAchievements } from '../hooks/useAchievements';
import { Game } from '../types';

const GuideOverlay = ({ game, activeGuide, onClose }: { game: Game; activeGuide: { name: string; query: string }; onClose: () => void }) => {
    const [notes, setNotes] = useState(() => localStorage.getItem(`vanguard-notes-${game.appid}-${activeGuide.name}`) || '');
    const [aiGuide, setAiGuide] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem(`vanguard-notes-${game.appid}-${activeGuide.name}`, notes);
        }, 500);
        return () => clearTimeout(handler);
    }, [notes, game.appid, activeGuide.name]);

    const generateAiGuide = async () => {
        setLoadingAi(true);
        try {
            const res = await fetch('http://localhost:8000/generate_guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: game.name, achievement: activeGuide.name })
            });
            const data = await res.json();
            if (data.guide) {
                setAiGuide(data.guide);
            }
        } catch (e) {
            console.error(e);
            setAiGuide("Tactical Computer Offline. Unable to generate guide.");
        } finally {
            setLoadingAi(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
        >
            <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6" onClick={e => e.stopPropagation()}>

                {/* Browser / Video Section */}
                <div className="lg:col-span-2 flex flex-col bg-[#0f0f13] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300">Target: {activeGuide.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex-1 relative bg-black flex flex-col">
                        <div className="flex-1 relative">
                            {window.electron ? (
                                // @ts-ignore
                                <webview
                                    src={`https://www.youtube.com/results?search_query=${encodeURIComponent(activeGuide.query)}`}
                                    className="w-full h-full"
                                    allowpopups
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-4">
                                    <Youtube className="w-12 h-12 text-red-500 opacity-50" />
                                    <h3 className="text-xl font-bold text-white">External Guide Required</h3>
                                    <p className="text-slate-400 max-w-md">In-app browsing is only available in the desktop app. Click below to open YouTube.</p>
                                    <button
                                        onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(activeGuide.query)}`, '_blank')}
                                        className="px-6 py-3 bg-red-600 rounded-xl font-bold uppercase tracking-widest hover:bg-red-500 transition-all"
                                    >
                                        Open on YouTube
                                    </button>
                                </div>
                            )}
                        </div>
                    </div >
                </div >

                {/* Right Column: AI & Notes */}
                <div className="flex flex-col gap-6 h-full overflow-hidden">

                    {/* AI Agent Section */}
                    <div className="flex-1 flex flex-col bg-[#0f0f13] rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-0">
                        <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-cyan-500" />
                                <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300">Tactical AI</span>
                            </div>
                            {!aiGuide && !loadingAi && (
                                <button onClick={generateAiGuide} className="text-[10px] bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white px-2 py-1 rounded border border-cyan-500/20 uppercase font-bold transition-all">
                                    Generate Guide
                                </button>
                            )}
                        </div>
                        <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-black/20">
                            {loadingAi ? (
                                <div className="h-full flex flex-col items-center justify-center text-cyan-500/50 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-xs font-mono uppercase tracking-widest animate-pulse">Computing Strategy...</span>
                                </div>
                            ) : aiGuide ? (
                                <div className="prose prose-invert prose-emerald prose-sm max-w-none prose-headings:uppercase prose-headings:tracking-widest prose-headings:italic prose-p:text-slate-300 prose-strong:text-cyan-400">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {aiGuide}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                    <Brain className="w-8 h-8 opacity-20" />
                                    <span className="text-[10px] font-mono uppercase tracking-widest">Awaiting Analysis</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tactical Notes Section */}
                    < div className="h-1/3 flex flex-col bg-[#0f0f13] rounded-2xl border border-white/10 overflow-hidden shadow-2xl shrink-0" >
                        <div className="bg-white/5 p-4 flex items-center gap-3 border-b border-white/5">
                            <StickyNote className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300">Tactical Notes</span>
                        </div>
                        <div className="flex-1 p-4">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Type steps, codes, or reminders here..."
                                className="w-full h-full bg-transparent resize-none outline-none text-slate-300 font-mono text-sm leading-relaxed placeholder:text-slate-700"
                                spellCheck={false}
                            />
                        </div>
                        <div className="p-3 bg-white/5 border-t border-white/5 text-[10px] text-center text-slate-500 uppercase tracking-widest font-mono">
                            Auto-saved to Local Storage
                        </div>
                    </div >
                </div>
            </div >
        </motion.div >
    );
};

interface ExpertMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatSession {
    id: string;
    title: string;
    created_at: string;
}

const ExpertChat = ({ game }: { game: Game }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ExpertMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Initial Load
    useEffect(() => {
        loadSessions();
    }, [game.name]);

    const loadSessions = async () => {
        try {
            const res = await fetch(`http://localhost:8000/expert/sessions/${encodeURIComponent(game.name)}`);
            const data = await res.json();
            setSessions(data);
            if (data.length > 0 && !currentSessionId) {
                setCurrentSessionId(data[0].id);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    };

    const loadHistory = async (sid: string) => {
        setLoadingHistory(true);
        try {
            const res = await fetch(`http://localhost:8000/expert/messages/${sid}`);
            const data = await res.json();
            setMessages(data);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (currentSessionId) {
            loadHistory(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    const createNewChat = () => {
        const id = crypto.randomUUID();
        setCurrentSessionId(id);
        setMessages([]);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        let sid = currentSessionId;
        if (!sid) {
            sid = crypto.randomUUID();
            setCurrentSessionId(sid);
        }

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            if (!sessions.find(s => s.id === sid)) {
                await fetch('http://localhost:8000/expert/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: sid,
                        game: game.name,
                        title: userMsg.slice(0, 30) + (userMsg.length > 30 ? '...' : '')
                    })
                });
                loadSessions();
            }

            const res = await fetch('http://localhost:8000/ask_expert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game: game.name,
                    question: userMsg,
                    session_id: sid
                })
            });
            const data = await res.json();
            if (data.answer) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'assistant', content: "Tactical uplink failed. Ensure AI server is running." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full max-w-7xl mx-auto bg-[#0f0f13] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="w-64 border-r border-white/5 flex flex-col bg-black/40">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">History</span>
                    </div>
                    <button
                        onClick={createNewChat}
                        className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all border border-cyan-500/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                    {sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setCurrentSessionId(s.id)}
                            className={`w-full flex flex-col p-3 rounded-lg text-left transition-all group ${currentSessionId === s.id
                                ? 'bg-cyan-500/10 border border-cyan-500/30'
                                : 'hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <span className={`text-[11px] font-bold truncate ${currentSessionId === s.id ? 'text-cyan-400' : 'text-slate-300'}`}>
                                {s.title}
                            </span>
                            <span className="text-[9px] font-mono text-slate-600 mt-1 uppercase">
                                {new Date(s.created_at).toLocaleDateString()}
                            </span>
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="py-10 text-center opacity-20 flex flex-col items-center gap-2">
                            <MessageSquare className="w-8 h-8" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">No History</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-white/5 p-4 flex items-center gap-3 border-b border-white/5">
                    <Brain className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm font-bold font-mono uppercase tracking-widest text-slate-300">
                        {sessions.find(s => s.id === currentSessionId)?.title || "Target Intel"}
                    </span>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar bg-black/20">
                    {loadingHistory ? (
                        <div className="h-full flex flex-col items-center justify-center text-cyan-500/20">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                    ) : messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                            <Bot className="w-16 h-16 opacity-20" />
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-bold text-slate-400">Tactical Advisor Active</h3>
                                <p className="text-xs max-w-sm font-mono uppercase tracking-wider">Ask about item locations, boss mechanics, or quest walkthroughs.</p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 shadow-xl shadow-cyan-500/5'
                                : 'bg-white/5 border border-white/10 text-slate-200'
                                }`}>
                                <div className="prose prose-invert prose-emerald prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-cyan-400">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                                <span className="text-xs font-mono uppercase tracking-widest text-cyan-500/70 animate-pulse">Analyzing Wiki Data...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Search tactical database..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500/50 transition-colors font-mono text-sm leading-relaxed"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg shadow-cyan-500/10"
                        >
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface HunterViewProps {
    game: Game | null;
    steamId: string;
    apiBase: string;
    onClose: () => void;
}

export default function HunterView({ game, steamId, apiBase, onClose }: HunterViewProps) {
    if (!game) return null;

    const { achievements, loading, error } = useAchievements(game.appid, steamId, apiBase);
    const [activeGuide, setActiveGuide] = useState<{ name: string; query: string } | null>(null);
    const [aiStatus, setAiStatus] = useState<'offline' | 'loading' | 'ready'>('loading');
    const [activeTab, setActiveTab] = useState<'achievements' | 'expert'>('achievements');

    // Poll AI Status
    useEffect(() => {
        const checkAi = async () => {
            try {
                const res = await fetch('http://localhost:8000/health');
                const data = await res.json();
                if (data.status === 'ok') {
                    if (data.model_loaded) setAiStatus('ready');
                    else setAiStatus('loading');
                }
            } catch {
                setAiStatus('offline');
            }
        };

        checkAi();
        const interval = setInterval(checkAi, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!game) return null;

    const completedCount = achievements.filter(a => a.achieved).length;
    const progress = achievements.length > 0 ? (completedCount / achievements.length) * 100 : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#020205] flex flex-col overflow-hidden"
            >
                {/* Background Art */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <img
                        src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`}
                        className="w-full h-full object-cover blur-md scale-105"
                        alt="bg"
                        onError={(e) => e.currentTarget.src = game.custom_header || ''}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-[#020205]/80 to-transparent" />
                </div>
                {/* GuideOverlay is managed locally now */}
                <AnimatePresence>
                    {activeGuide && (
                        <GuideOverlay
                            game={game}
                            activeGuide={activeGuide}
                            onClose={() => setActiveGuide(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="relative z-10 p-8 flex items-center justify-between border-b border-white/10 bg-[#020205]/50 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <img
                            src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                            className="h-16 rounded-lg shadow-2xl border border-white/10"
                            alt={game.name}
                        />
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-white tracking-widest uppercase italic">{game.name}</h1>
                                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest">HUNTER MODE</span>

                                {/* AI Status Indicator */}
                                <div className={`flex items-center gap-2 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest transition-colors
                                    ${aiStatus === 'ready' ? 'bg-cyan-500/20 text-cyan-500 border-cyan-500/20' :
                                        aiStatus === 'loading' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' :
                                            'bg-slate-500/20 text-slate-500 border-slate-500/20'}`}>
                                    <Brain className="w-3 h-3" />
                                    {aiStatus === 'ready' ? 'BRAIN ONLINE' : aiStatus === 'loading' ? 'BRAIN LOADING...' : 'BRAIN OFFLINE'}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                                <span className="flex items-center gap-2">
                                    <Trophy className="w-3 h-3 text-yellow-500" />
                                    {completedCount} / {achievements.length} UNLOCKED
                                </span>
                                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span>{progress.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('achievements')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'achievements'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Achievements
                        </button>
                        <button
                            onClick={() => setActiveTab('expert')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'expert'
                                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Expert Intel
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 hover:rotate-90 transition-all text-slate-400 hover:text-white border border-white/5 hover:border-white/20"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative z-10 flex-1 overflow-auto p-8 custom-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin w-12 h-12 border-4 border-accent-main border-t-transparent rounded-full" />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full text-red-500 font-mono tracking-widest">
                            ERROR: {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <AnimatePresence mode="wait">
                            {activeTab === 'achievements' ? (
                                <motion.div
                                    key="achievements"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20"
                                >
                                    {achievements.map((ach) => (
                                        <motion.div
                                            key={ach.apiname}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`relative p-4 rounded-xl border group transition-all duration-300 ${ach.achieved
                                                ? 'bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20'
                                                : 'bg-surface/40 border-white/5 hover:border-accent-main/30'
                                                }`}
                                        >
                                            <div className="flex gap-4">
                                                <div className="shrink-0">
                                                    <img
                                                        src={ach.achieved ? ach.icon : ach.icongray}
                                                        className={`w-16 h-16 rounded-lg object-cover ${ach.achieved ? 'shadow-lg shadow-green-500/10' : 'grayscale opacity-50'}`}
                                                        alt={ach.name}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className={`font-bold font-mono text-sm uppercase tracking-tight leading-tight ${ach.achieved ? 'text-green-400' : 'text-slate-300'}`}>
                                                            {ach.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] font-black font-mono opacity-50">
                                                                {typeof ach.percent === 'number' ? `${ach.percent.toFixed(1)}%` : ''}
                                                            </span>
                                                            {ach.achieved && <Trophy className="w-4 h-4 text-green-500 shrink-0" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                        {ach.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Link Section */}
                                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                                                <button
                                                    onClick={() => setActiveGuide({
                                                        name: ach.name || 'Achievement',
                                                        query: `${game.name} ${ach.name || ''} achievement guide`
                                                    })}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-xs font-bold uppercase tracking-wider border border-red-500/20 group/btn"
                                                >
                                                    <Youtube className="w-4 h-4" /> FIND GUIDE <ExternalLink className="w-3 h-3 opacity-50 group-hover/btn:opacity-100" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="expert"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full"
                                >
                                    <ExpertChat game={game} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
