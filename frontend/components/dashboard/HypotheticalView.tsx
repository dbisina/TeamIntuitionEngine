'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ValorantHypotheticalView } from './ValorantHypotheticalView';
import { LolHypotheticalView } from './LolHypotheticalView';
import { getCachedSeries, setCachedSeries } from '@/lib/matchCache';

interface HypotheticalViewProps {
  game?: string;
  seriesId?: string;
}

export function HypotheticalView({ game = "VALORANT", seriesId }: HypotheticalViewProps) {
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<any>(null);
  const [activeTeam, setActiveTeam] = useState<'team1' | 'team2'>('team1');

  // Fetch match data - use shared cache for consistency across views
  useEffect(() => {
    if (!seriesId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Check shared cache first - this ensures consistency with MacroReviewView
      const cached = getCachedSeries(seriesId);
      if (cached?.matchData && cached.matchData.team1.name !== 'Team 1') {
        console.log('[HypotheticalView] Using cached match data');
        setMatchData({
          team1: cached.matchData.team1,
          team2: cached.matchData.team2,
          winner: cached.matchData.winner,
          map: cached.matchData.map
        });
        setLoading(false);
        return;
      }

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE_URL}/api/v1/grid/series/${seriesId}`);
        if (!res.ok) throw new Error("Failed");

        const data = await res.json();

        if (data.status === 'success' && data.game_state) {
          const gs = data.game_state;
          const newMatchData = {
            team1: { name: gs.team_1_name || "Team A", score: gs.team_1_score || 0 },
            team2: { name: gs.team_2_name || "Team B", score: gs.team_2_score || 0 },
            winner: gs.winner,
            map: gs.map_name || "Map"
          };

          setMatchData(newMatchData);

          // Update shared cache
          setCachedSeries(seriesId, {
            matchData: {
              team1: newMatchData.team1,
              team2: newMatchData.team2,
              winner: newMatchData.winner,
              map: newMatchData.map
            }
          });
        }
      } catch (err) {
        console.error('[HypotheticalView] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [seriesId]);

  const activeTeamName = matchData
    ? (activeTeam === 'team1' ? matchData.team1.name : matchData.team2.name)
    : "";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-purple-500" />
          <span className="text-purple-400 font-mono text-xs animate-pulse tracking-widest">
            LOADING SIMULATOR...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 no-scrollbar pb-32 relative">
      {/* Background accent */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] mix-blend-screen opacity-20 pointer-events-none ${game === "LoL" ? "bg-[#C89B3C]" : "bg-red-600"}`} />

      {/* Team Toggle Header */}
      {matchData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 relative z-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${game === "LoL" ? "bg-[#C89B3C]/20 text-[#C89B3C] border-[#C89B3C]/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"} border`}>
                {game === "LoL" ? "MOBA" : "TACTICAL FPS"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">What-If Simulator</h2>
            <p className="text-xs text-slate-500">
              Analyzing scenarios for <span className="text-white font-semibold">{activeTeamName}</span>
            </p>
          </div>

          {/* Team Toggle */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTeam('team1')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTeam === 'team1'
                    ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-purple-500 text-white shadow-lg')
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {matchData.team1.name}
              </button>
              <button
                onClick={() => setActiveTeam('team2')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTeam === 'team2'
                    ? (game === 'LoL' ? 'bg-[#C89B3C] text-black shadow-lg' : 'bg-purple-500 text-white shadow-lg')
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {matchData.team2.name}
              </button>
            </div>
            <div className="text-xs text-slate-500">
              {matchData.team1.score} - {matchData.team2.score} on {matchData.map}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${game}-${activeTeam}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {game === "LoL" ? (
            <LolHypotheticalView seriesId={seriesId} teamName={activeTeamName} />
          ) : (
            <ValorantHypotheticalView seriesId={seriesId} teamName={activeTeamName} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
