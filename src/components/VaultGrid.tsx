import { Game } from '../types';
import { formatTime } from '../utils/format';
import GameCard from './GameCard';

interface VaultGridProps {
    groupedGames: Record<string, Game[]>;
    vaultGrouping: 'none' | 'alpha' | 'status';
    blacklist: number[];
    isMastered: (game: Game) => boolean;
    hunterTargets: number[];
    selectedGameId: number | null;
    onSelectGame: (id: number) => void;
    onLaunchGame: (id: number) => void;
    onOpenMissionLog: (game: { id: number; name: string }) => void;
    onOpenStats: (id: number) => void;
    onToggleBlacklist: (id: number) => void;
    playClick: () => void;
}

export default function VaultGrid({ groupedGames, vaultGrouping, ...props }: VaultGridProps) {
    if (!groupedGames) return null;

    const sections = Object.entries(groupedGames);

    return (
        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
            <div className="space-y-12">
                {sections.map(([group, games]) => (
                    <div key={group} className="space-y-6">
                        {vaultGrouping !== 'none' && (
                            <div className="flex items-center gap-4 pt-8 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-accent-main rounded-full" />
                                    <h3 className="text-2xl font-black text-txt-main uppercase tracking-tighter italic font-mono">
                                        {group}
                                    </h3>
                                </div>
                                <div className="h-px flex-1 bg-border-main/50" />
                                <div className="px-3 py-1 bg-surface/40 border border-border-main rounded-lg backdrop-blur-sm">
                                    <span className="text-[10px] font-black text-txt-muted uppercase tracking-[0.2em]">
                                        {games.length} ASSETS
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                            {games.map(game => (
                                <GameCard
                                    key={game.appid}
                                    game={game}
                                    isSelected={props.selectedGameId === game.appid}
                                    isBlacklisted={props.blacklist.includes(game.appid)}
                                    isMastered={props.isMastered(game)}
                                    isHunter={props.hunterTargets.includes(game.appid)}
                                    playtimeFiltered={formatTime(game.playtime_forever)}
                                    onSelect={() => props.onSelectGame(game.appid)}
                                    onLaunch={() => {
                                        props.playClick();
                                        props.onLaunchGame(game.appid);
                                    }}
                                    onMissionLog={() => {
                                        props.playClick();
                                        props.onOpenMissionLog({ id: game.appid, name: game.name });
                                    }}
                                    onStats={() => {
                                        props.playClick();
                                        props.onSelectGame(game.appid);
                                        props.onOpenStats(game.appid);
                                    }}
                                    onToggleBlacklist={() => props.onToggleBlacklist(game.appid)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
