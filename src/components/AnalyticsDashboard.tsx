import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { Game } from '../types';

interface AnalyticsDashboardProps {
    games: Game[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b'];

const AnalyticsDashboard = ({ games }: AnalyticsDashboardProps) => {
    // 1. Prepare Data: Top 5 Games by Playtime
    const topGames = [...games]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 5)
        .map(g => ({
            name: g.name,
            hours: Math.round(g.playtime_forever / 60)
        }));

    // 2. Prepare Data: Simplified "Genre" Distribution (Randomized/Mocked for now as API doesn't give tags directly without extra calls)
    // In a real app, we'd fetch tags. For this demo, we'll bucket by playtime ranges or mock genres effectively.
    // Actually, let's use "Playtime Distribution" buckets instead which is real data.
    const distribution = [
        { name: '> 100h', value: games.filter(g => g.playtime_forever > 6000).length },
        { name: '50-100h', value: games.filter(g => g.playtime_forever > 3000 && g.playtime_forever <= 6000).length },
        { name: '10-50h', value: games.filter(g => g.playtime_forever > 600 && g.playtime_forever <= 3000).length },
        { name: '< 10h', value: games.filter(g => g.playtime_forever <= 600).length },
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0a0a0f] border border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">{label || payload[0].name}</p>
                    <p className="text-white text-sm font-black">
                        {payload[0].value} {payload[0].unit || 'ASSETS'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Chart 1: Top Assets (Bar) */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 10h2v7H7v-7zm4-3h2v10h-2V7zm4 6h2v4h-2v-4z" /></svg>
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-8 relative z-10">
                    High-Value Targets
                    <span className="block text-[10px] text-slate-500 font-bold not-italic tracking-widest mt-1">TOP 5 ASSETS BY ENGAGEMENT (HOURS)</span>
                </h3>
                <div className="h-64 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topGames} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                            <Bar dataKey="hours" unit="HRS" radius={[0, 4, 4, 0]} barSize={20}>
                                {topGames.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Fleet Distribution (Pie) */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2 0v11.41l8.48-8.48A9.957 9.957 0 0013 2zm8.48 5.76L13 16.24V22c5.07-.5 9-4.79 9-10 0-1.46-.32-2.84-.88-4.08z" /></svg>
                </div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-8 relative z-10">
                    Fleet Distribution
                    <span className="block text-[10px] text-slate-500 font-bold not-italic tracking-widest mt-1">ASSETS BY ENGAGEMENT TIER</span>
                </h3>
                <div className="h-64 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="middle"
                                align="right"
                                layout="vertical"
                                iconSize={8}
                                iconType="circle"
                                formatter={(value) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
