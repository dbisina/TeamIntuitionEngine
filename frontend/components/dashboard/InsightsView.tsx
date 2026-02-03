'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ValorantInsightsView } from './ValorantInsightsView';
import { LolInsightsView } from './LolInsightsView';
import { Users, ChevronRight, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

interface InsightsViewProps {
  game?: string;
  seriesId?: string;
}

export function InsightsView({ game = "VALORANT", seriesId }: InsightsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [matchData, setMatchData] = useState<any>(null);
  const [activeTeam, setActiveTeam] = useState<'team1' | 'team2'>('team1');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  // Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
        if (!seriesId) return;
        setLoading(true);
        setError(null);
        
        try {
             // 1. Fetch Series Data
             const API_BASE_URL = getApiUrl();
             const res = await fetch(`${API_BASE_URL}/api/v1/grid/series/${seriesId}`);
             if (!res.ok) throw new Error("Failed to load match data");
             
             const data = await res.json();
             
             if (data.status === 'success' && data.game_state) {
                 const gs = data.game_state;
                 
                 // Normalize Data Structure
                 const t1Name = gs.team_1_name || "Team 1";
                 const t2Name = gs.team_2_name || "Team 2";
                 
                 const allPlayers = gs.player_states || [];
                 const t1Players = allPlayers.filter((p: any) => p.team_name === t1Name);
                 const t2Players = allPlayers.filter((p: any) => p.team_name === t2Name);

                 const team1 = {
                     name: t1Name,
                     players: t1Players
                 };
                 const team2 = {
                     name: t2Name,
                     players: t2Players
                 };
                 
                 setMatchData({ team1, team2 });
                 
                 // Default Selection
                 if (team1.players.length > 0) {
                     setSelectedPlayer(team1.players[0]);
                     setActiveTeam('team1');
                 }
             } else {
                 throw new Error("Invalid data format");
             }
        } catch (err) {
            console.error(err);
            setError("Could not load match insights. Please select a valid series.");
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [seriesId, game]);


  // Helper: Get Current Team's Players
  const currentTeamName = matchData ? (activeTeam === 'team1' ? matchData.team1.name : matchData.team2.name) : "Loading...";
  const currentPlayers = matchData ? (activeTeam === 'team1' ? matchData.team1.players : matchData.team2.players) : [];

  // Loading Screen
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-500" />
            <span className="text-cyan-400 font-mono text-xs animate-pulse tracking-widest">
                ANALYZING {game === "LoL" ? "RIFT" : "AGENT"} PATTERNS...
            </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center">
              <span className="text-rose-400 text-2xl">!</span>
            </div>
            <span className="text-rose-400 font-medium text-sm">
                {error}
            </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 no-scrollbar pb-32">
      
      {/* 1. HEADER & CONTROLS */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 space-y-6"
      >
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    {game === "LoL" ? "Summoner Insights" : "Agent Performance"}
                    <span className="text-sm font-normal text-slate-500 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                        {game}
                    </span>
                </h2>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Series Analysis • {seriesId || 'No Series Selected'}
                </div>
            </div>

            {/* TEAM TOGGLE */}
            {matchData && (
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => { setActiveTeam('team1'); if(matchData.team1.players[0]) setSelectedPlayer(matchData.team1.players[0]); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTeam === 'team1' ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-[#FF4655] text-white shadow-lg') : 'text-slate-500 hover:text-white'}`}
                    >
                        {matchData.team1.name}
                    </button>
                    <button 
                        onClick={() => { setActiveTeam('team2'); if(matchData.team2.players[0]) setSelectedPlayer(matchData.team2.players[0]); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTeam === 'team2' ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-[#FF4655] text-white shadow-lg') : 'text-slate-500 hover:text-white'}`}
                    >
                        {matchData.team2.name}
                    </button>
                </div>
            )}
        </div>

        {/* 2. PLAYER STRIP (Horizontal Scroll) */}
        {currentPlayers.length > 0 && (
            <div className="relative">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {currentPlayers.map((p: any, i: number) => {
                        const isSelected = selectedPlayer?.player_name === p.player_name;
                        const agentOrRole = p.agent || p.role || 'Player';
                        
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedPlayer(p)}
                                className={`
                                    min-w-[140px] p-3 rounded-xl border transition-all duration-200 text-left group relative overflow-hidden
                                    ${isSelected 
                                        ? 'bg-white/10 border-white/30 ring-1 ring-white/20' 
                                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                        ${isSelected ? 'bg-white text-black' : 'bg-black/40 text-slate-400 group-hover:text-white'}
                                    `}>
                                        {p.agent ? p.agent[0] : (p.role ? p.role[0] : 'P')}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {p.player_name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate">{agentOrRole}</div>
                                    </div>
                                </div>
                                {isSelected && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${game === 'LoL' ? 'bg-[#C89B3C]' : 'bg-[#FF4655]'}`}></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
      </motion.div>

      {/* 3. CONTENT AREA */}
      <AnimatePresence mode="wait">
        <motion.div
            key={selectedPlayer?.player_name || 'empty'}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
        >
            {selectedPlayer ? (
                game === "LoL" ? (
                    <LolInsightsView player={selectedPlayer} teamName={currentTeamName} seriesId={seriesId} />
                ) : (
                    <ValorantInsightsView player={selectedPlayer} teamName={currentTeamName} seriesId={seriesId} />
                )
            ) : (
                <div className="text-center py-20 text-slate-500 italic">
                    Select a player to view insights
                </div>
            )}
        </motion.div>
      </AnimatePresence>
      
    </div>
  );
}

