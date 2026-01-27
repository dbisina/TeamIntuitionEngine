'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ValorantMacroView } from './ValorantMacroView';
import { LolMacroView } from './LolMacroView';

interface MacroReviewViewProps {
  game?: string;
  seriesId?: string;
}

export function MacroReviewView({ game = "VALORANT", seriesId }: MacroReviewViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [activeTeam, setActiveTeam] = useState<'team1' | 'team2'>('team1');

  // Fetch Logic (Mirrored from InsightsView for independence)
  useEffect(() => {
    const fetchData = async () => {
        if (!seriesId) return;
        setLoading(true);
        
        try {
             const res = await fetch(`http://localhost:8000/api/v1/grid/series/${seriesId}`);
             if (!res.ok) throw new Error("Failed");
             const data = await res.json();
             
             if (data.status === 'success' && data.game_state) {
                 const gs = data.game_state;
                 setMatchData({
                     team1: { name: gs.team_1_name || "Team A", score: gs.team_1_score || 0 },
                     team2: { name: gs.team_2_name || "Team B", score: gs.team_2_score || 0 },
                     winner: gs.winner,
                     map: gs.map_name || "Map",
                     duration: "38:20" // Mock/Calc if needed
                 });
                 // Default to winner or team1
                 setActiveTeam('team1');
             }
        } catch (err) {
            console.error(err);
            setError("Could not load match data. Please select a valid series.");
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [seriesId]);


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-500" />
            <span className="text-cyan-400 font-mono text-xs animate-pulse tracking-widest">
                ANALYZING MACRO PATTERNS...
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

  const activeTeamName = matchData ? (activeTeam === 'team1' ? matchData.team1.name : matchData.team2.name) : "Loading";
  
  return (
    <div className="h-full overflow-y-auto px-4 py-6 no-scrollbar pb-32">
      
      {/* Universal Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between border-b border-white/10 pb-6 mb-8"
      >
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${game === "LoL" ? "bg-[#C89B3C]/20 text-[#C89B3C] border-[#C89B3C]/30" : "bg-rose-500/20 text-rose-500 border-rose-500/30"} border`}>
                    {game === "LoL" ? "MOBA FRAMEWORK" : "FPS FRAMEWORK"}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                    // TEAM STRATEGY
                </span>
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight">Macro Review</h2>
        </div>
        
        {/* RIGHT SIDE: SCORE BOARD + TEAM TOGGLE */}
        <div className="flex flex-col items-end gap-4">
            
            {/* Team Toggle */}
             {matchData && (
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setActiveTeam('team1')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTeam === 'team1' ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-[#FF4655] text-white shadow-lg') : 'text-slate-500 hover:text-white'}`}
                    >
                        {matchData.team1.name}
                    </button>
                    <button 
                        onClick={() => setActiveTeam('team2')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTeam === 'team2' ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-[#FF4655] text-white shadow-lg') : 'text-slate-500 hover:text-white'}`}
                    >
                        {matchData.team2.name}
                    </button>
                </div>
            )}

            <div className="flex gap-4 text-right">
                <div>
                    <div className="text-3xl font-black text-white">
                        {matchData ? `${matchData.team1.score} - ${matchData.team2.score}` : "0-0"}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{matchData?.map || "Map"}</div>
                </div>
                <div className="h-10 w-[1px] bg-white/10"></div>
                <div>
                     <div className="text-3xl font-black text-white">{matchData?.duration || "00:00"}</div>
                     <div className="text-[10px] text-slate-500 uppercase tracking-widest">Duration</div>
                </div>
            </div>
        </div>
      </motion.div>

      {/* Game Specific Content */}
      <AnimatePresence mode="wait">
        <motion.div
            key={activeTeam}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            {game === "LoL" ? (
                <LolMacroView teamName={activeTeamName} /> 
            ) : (
                <ValorantMacroView teamName={activeTeamName} matchData={matchData} seriesId={seriesId} />
            )}
        </motion.div>
      </AnimatePresence>
      
    </div>
  );
}
