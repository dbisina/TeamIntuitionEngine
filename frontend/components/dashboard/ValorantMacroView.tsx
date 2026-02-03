'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Target,
  Brain,
  Loader2,
  DollarSign,
  Users,
  BarChart3,
  Crosshair
} from 'lucide-react';
import {
  getCachedSeries,
  setCachedSeries,
  updateCachedReview,
  KASTImpactStat,
  EconomyStats
} from '@/lib/matchCache';
import { getApiUrl } from '@/lib/utils';

// Extended interfaces for team-specific data
interface PlayerScoreboardStat {
  player_name: string;
  agent: string;
  team_name: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  kd_ratio: number;
  adr: number;
  acs: number;
  hs_percent: number;
  first_bloods: number;
  first_deaths: number;
  clutch_wins: number;
  multikills: number;
  kast_percentage: number;
  damage_dealt: number;
}

interface TeamPerformance {
  team_name: string;
  opponent_name: string;
  final_score: string;
  result: string;
  total_kills: number;
  total_deaths: number;
  total_damage: number;
  avg_adr: number;
  avg_acs: number;
  first_bloods: number;
  first_deaths: number;
  first_blood_rate: number;
  first_death_rate: number;
  clutch_wins: number;
  multikills: number;
  kd_diff: number;
}

// Interfaces matching Backend Models (app/models/valorant.py)
interface ValorantRoundAnalysis {
  round_number: number;
  round_type: string;
  importance: string;
  summary: string;
  key_mistakes: string[];
  key_plays: string[];
  economy_decision: string;
  economy_recommendation?: string;
  site_analysis?: string;
}

interface ValorantTeamMetrics {
  pistol_round_win_rate: number;
  eco_round_win_rate: number;
  full_buy_win_rate: number;
  team_kast: number;
  first_blood_rate: number;
  first_death_rate: number;
  trade_efficiency: number;
}

interface ValorantMacroReview {
  status: string;
  match_id: string;
  map_name: string;
  final_score: string;
  winner: string;
  executive_summary: string;
  key_takeaways: string[];
  critical_rounds: ValorantRoundAnalysis[];
  team_metrics?: ValorantTeamMetrics;
  training_recommendations: string[];
}

export function ValorantMacroView({ teamName, matchData, seriesId }: { teamName: string, matchData: any, seriesId?: string }) {
  const [review, setReview] = useState<ValorantMacroReview | null>(null);
  const [allKastImpact, setAllKastImpact] = useState<KASTImpactStat[]>([]);
  const [economyAnalysis, setEconomyAnalysis] = useState<EconomyStats | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [playerScoreboard, setPlayerScoreboard] = useState<PlayerScoreboardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [showFullScoreboard, setShowFullScoreboard] = useState(false);

  // Fetch data on mount and when seriesId or teamName changes
  useEffect(() => {
    if (!seriesId) {
      setLoading(false);
      return;
    }

    // Don't fetch if teamName is not a real team name yet
    const invalidTeamNames = ["Loading", "Team 1", "Team 2", "Team A", "Team B", "Unknown"];
    if (!teamName || invalidTeamNames.includes(teamName)) {
      console.log(`[ValorantMacroView] Waiting for real team name, got: ${teamName}`);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[ValorantMacroView] Fetching stats for series: ${seriesId}, team: ${teamName}`);
        const API_BASE_URL = getApiUrl();
        const res = await fetch(`${API_BASE_URL}/api/v1/grid/enhanced-review/${seriesId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_name: teamName })
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log(`[ValorantMacroView] Stats received:`, data);

        const reviewData = data.review?.review || data.review || null;
        const kastData = data.kast_impact || data.review?.kast_impact || [];
        const econData = data.economy_analysis || data.review?.economy_analysis || null;
        const perfData = data.team_performance || null;
        const scoreboardData = data.player_scoreboard || [];

        // Only cache stats data - don't overwrite matchData from parent component
        if (kastData.length > 0) {
          setCachedSeries(seriesId, {
            kastImpact: kastData,
            economyAnalysis: econData,
            aiReview: reviewData
            // Don't set matchData here - MacroReviewView manages it
          });
        }

        setReview(reviewData);
        setAllKastImpact(kastData);
        setEconomyAnalysis(econData);
        setTeamPerformance(perfData);
        setPlayerScoreboard(scoreboardData);
        setDataReady(true);

        // Fetch AI review in background if not already cached
        if (!reviewData) {
          setReviewLoading(true);
          console.log(`[ValorantMacroView] Fetching AI review in background...`);
          const API_BASE_URL = getApiUrl();

          fetch(`${API_BASE_URL}/api/v1/grid/macro-review/${seriesId}`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(aiData => {
              if (aiData?.review) {
                console.log(`[ValorantMacroView] AI Review received!`);
                setReview(aiData.review);
                updateCachedReview(seriesId, aiData.review);
              }
            })
            .catch(e => console.error('[ValorantMacroView] AI review fetch error:', e))
            .finally(() => setReviewLoading(false));
        }
      } catch (e) {
        console.error('[ValorantMacroView] Fetch exception:', e);
        setError("Connection error - retrying...");

        // Retry once after short delay
        setTimeout(async () => {
          // Verify team name is still valid before retry
          const retryInvalidNames = ["Loading", "Team 1", "Team 2", "Team A", "Team B", "Unknown"];
          if (!teamName || retryInvalidNames.includes(teamName)) {
            return;
          }
          try {
            const API_BASE_URL = getApiUrl();
            const retryRes = await fetch(`${API_BASE_URL}/api/v1/grid/enhanced-review/${seriesId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ team_name: teamName })
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              setAllKastImpact(data.kast_impact || []);
              setEconomyAnalysis(data.economy_analysis || null);
              setTeamPerformance(data.team_performance || null);
              setPlayerScoreboard(data.player_scoreboard || []);
              setError(null);
              setDataReady(true);
            }
          } catch {
            setError("Could not connect to server");
          }
        }, 1000);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [seriesId, teamName]);

  // Check if we have any data loaded
  const hasData = allKastImpact.length > 0 || playerScoreboard.length > 0 || teamPerformance !== null;

  // FRONTEND FILTERING: Filter KAST players by current teamName
  const kastImpact = allKastImpact.filter(player => {
    // Use team_name directly from KAST data (added by backend)
    if (player.team_name) {
      return player.team_name === teamName;
    }
    // Fallback: check matchData if KAST doesn't have team_name
    if (player.player_name && matchData?.player_states) {
      const playerInfo = matchData.player_states.find((p: any) => p.player_name === player.player_name);
      if (playerInfo) {
        return playerInfo.team_name === teamName;
      }
    }
    // Final fallback: don't show if we can't determine team
    return false;
  });

  // Filter scoreboard by team too
  const teamScoreboard = playerScoreboard.filter(p => p.team_name === teamName);

  const isWinner = matchData?.winner === teamName;

  // Only show loading if we're still loading AND don't have data yet
  if (loading && !hasData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-500" />
          <span className="text-cyan-400 font-mono text-xs animate-pulse">
            Loading team data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

       {/* 0. TEAM CONTEXT HEADER */}
       <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isWinner ? 'bg-emerald-500' : (seriesId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500')}`}></div>
                <span className="text-sm text-slate-300">
                    {seriesId ? (matchData?.winner ? `VOD Review: ${seriesId}` : `Live: ${seriesId}`) : 'No Series Connected'}
                    <strong className="text-white text-lg ml-3">{teamName}</strong>
                </span>
            </div>
            
              {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> Analyzing match data...</div>}
             {error && <div className="text-rose-400 text-sm">{error}</div>}
           
           <div className="flex items-center gap-3">
               {isWinner ? (
                   <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold uppercase tracking-wider">WINNER</span>
               ) : (
                   <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-bold uppercase tracking-wider">DEFEAT</span>
               )}
           </div>
      </div>

      {/* 1. TEAM PERFORMANCE OVERVIEW */}
      {teamPerformance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" /> Team Performance
            </h3>
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${teamPerformance.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {teamPerformance.result}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{teamPerformance.final_score}</div>
              <div className="text-[10px] text-slate-500 uppercase">Final Score</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-cyan-400">{teamPerformance.avg_acs}</div>
              <div className="text-[10px] text-slate-500 uppercase">Avg ACS</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{teamPerformance.avg_adr}</div>
              <div className="text-[10px] text-slate-500 uppercase">Avg ADR</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className={`text-2xl font-bold ${teamPerformance.kd_diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {teamPerformance.kd_diff >= 0 ? '+' : ''}{teamPerformance.kd_diff}
              </div>
              <div className="text-[10px] text-slate-500 uppercase">K/D Diff</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-amber-400">{teamPerformance.first_blood_rate}%</div>
              <div className="text-[10px] text-slate-500 uppercase">FB Rate</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-rose-400">{teamPerformance.first_death_rate}%</div>
              <div className="text-[10px] text-slate-500 uppercase">FD Rate</div>
            </div>
          </div>
          {/* Additional stats row */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-white">{teamPerformance.total_kills}</div>
              <div className="text-[9px] text-slate-500 uppercase">Kills</div>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-white">{teamPerformance.total_deaths}</div>
              <div className="text-[9px] text-slate-500 uppercase">Deaths</div>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-emerald-400">{teamPerformance.clutch_wins}</div>
              <div className="text-[9px] text-slate-500 uppercase">Clutches</div>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-amber-400">{teamPerformance.multikills}</div>
              <div className="text-[9px] text-slate-500 uppercase">Multikills</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. TOP METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
            label="Win Rate"
            value={economyAnalysis?.win_rate != null ? `${economyAnalysis.win_rate}%` : (isWinner ? "WIN" : "LOSS")}
            color={isWinner ? "text-emerald-400" : "text-rose-400"}
        />
        <MetricCard
            label="Pistol WR"
            value={economyAnalysis?.pistol_win_rate != null ? `${economyAnalysis.pistol_win_rate}%` : "N/A"}
            color="text-amber-400"
        />
        <MetricCard
            label="Attack WR"
            value={economyAnalysis?.attack_win_rate != null ? `${economyAnalysis.attack_win_rate}%` : "N/A"}
            color="text-orange-400"
        />
        <MetricCard
            label="Defense WR"
            value={economyAnalysis?.defense_win_rate != null ? `${economyAnalysis.defense_win_rate}%` : "N/A"}
            color="text-blue-400"
        />
      </div>

      {/* 5. KAST IMPACT SECTION (Hackathon Feature) */}
      {kastImpact.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-rose-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" /> KAST Impact Analysis
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Key insight: How each {teamName} player's KAST affects round win probability
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {kastImpact.map((stat, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-800/50 to-gray-900 p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">{stat.player_name}</div>
                    <div className="text-xs text-gray-500">{stat.agent}</div>
                  </div>
                  <div className={`text-2xl font-bold ${stat.loss_rate_without_kast >= 70 ? 'text-rose-400' : stat.loss_rate_without_kast >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {stat.loss_rate_without_kast.toFixed(0)}%
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Loss rate when no KAST
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex-1">
                    <div className="text-gray-500">KAST</div>
                    <div className="text-purple-400 font-semibold">{stat.kast_percentage.toFixed(0)}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500">Rounds w/o</div>
                    <div className="text-gray-300">{stat.rounds_without_kast}/{stat.total_rounds}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-gray-700/50 pt-2">
                  {stat.insight}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 3. ECONOMY ANALYSIS (Hackathon Feature) */}
      {economyAnalysis && typeof economyAnalysis.pistol_win_rate === 'number' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" /> Economy Breakdown
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <EconomyStat label="Pistol WR" value={`${(economyAnalysis.pistol_win_rate ?? 0).toFixed(0)}%`} color="text-amber-400" />
            <EconomyStat label="Force Buy WR" value={`${(economyAnalysis.force_buy_win_rate ?? 0).toFixed(0)}%`} color="text-orange-400" />
            <EconomyStat label="Eco Conversion" value={`${(economyAnalysis.eco_conversion_rate ?? 0).toFixed(0)}%`} color="text-purple-400" />
            <EconomyStat label="Bonus Loss" value={`${(economyAnalysis.bonus_loss_rate ?? 0).toFixed(0)}%`} color={(economyAnalysis.bonus_loss_rate ?? 0) > 50 ? "text-rose-400" : "text-emerald-400"} />
            <EconomyStat label="Full Buy WR" value={`${(economyAnalysis.full_buy_win_rate ?? 0).toFixed(0)}%`} color="text-cyan-400" />
          </div>
          {economyAnalysis.insights && economyAnalysis.insights.length > 0 && (
            <div className="space-y-2">
              {economyAnalysis.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg">
                  <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">{insight}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 4. PLAYER SCOREBOARD */}
      {playerScoreboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" /> Player Scoreboard
            </h3>
            <button
              onClick={() => setShowFullScoreboard(!showFullScoreboard)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showFullScoreboard ? 'Show Team Only' : 'Show All Players'}
            </button>
          </div>

          {/* Scoreboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase border-b border-white/10">
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-center py-2 px-1">Agent</th>
                  <th className="text-center py-2 px-1">K/D/A</th>
                  <th className="text-center py-2 px-1">ACS</th>
                  <th className="text-center py-2 px-1">ADR</th>
                  <th className="text-center py-2 px-1">HS%</th>
                  <th className="text-center py-2 px-1">KAST</th>
                  <th className="text-center py-2 px-1">FB</th>
                </tr>
              </thead>
              <tbody>
                {playerScoreboard
                  .filter(p => showFullScoreboard || p.team_name === teamName)
                  .map((player, i) => {
                    const isTeamPlayer = player.team_name === teamName;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-white/5 ${isTeamPlayer ? 'bg-cyan-500/5' : 'bg-white/[0.02]'} hover:bg-white/5 transition-colors`}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-6 rounded ${isTeamPlayer ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                            <div>
                              <div className="font-semibold text-white">{player.player_name}</div>
                              <div className="text-[10px] text-slate-500">{player.team_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-slate-400 text-xs">{player.agent}</span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-white font-mono">{player.kda}</span>
                          <div className={`text-[10px] ${player.kd_ratio >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {player.kd_ratio.toFixed(2)}
                          </div>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`font-bold ${player.acs >= 250 ? 'text-emerald-400' : player.acs >= 200 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {player.acs}
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.adr >= 150 ? 'text-emerald-400' : player.adr >= 100 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {player.adr}
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.hs_percent >= 30 ? 'text-purple-400' : 'text-slate-400'}`}>
                            {player.hs_percent}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.kast_percentage >= 70 ? 'text-cyan-400' : player.kast_percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {player.kast_percentage}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-amber-400">{player.first_bloods}</span>
                          {player.first_deaths > 0 && (
                            <span className="text-rose-400 text-[10px] ml-1">/{player.first_deaths}FD</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* MVP Highlight */}
          {(() => {
            const teamPlayers = playerScoreboard.filter(p => p.team_name === teamName);
            if (teamPlayers.length === 0) return null;
            const mvp = teamPlayers.sort((a, b) => b.acs - a.acs)[0];
            if (!mvp) return null;
            return (
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs text-amber-400 uppercase tracking-wider">Team MVP</div>
                    <div className="text-white font-semibold">
                      {mvp.player_name} - {mvp.acs} ACS
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* 6. DATA-DRIVEN COACHING INSIGHTS (Instant - No AI needed) */}
      {(kastImpact.length > 0 || teamPerformance) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" /> Instant Coaching Insights
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Key Weakness Identification */}
            {kastImpact.length > 0 && kastImpact[0]?.loss_rate_without_kast > 65 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Critical Dependency</span>
                </div>
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{kastImpact[0]?.player_name}</strong> is your highest-risk player.
                  When they die without impact, {teamName} loses <strong className="text-rose-400">{kastImpact[0]?.loss_rate_without_kast?.toFixed(0)}%</strong> of rounds.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Recommendation: Ensure trade setups and utility support for this player's engagements.
                </p>
              </div>
            )}

            {/* Economy Pattern Analysis */}
            {economyAnalysis && economyAnalysis.pistol_win_rate !== undefined && (
              <div className={`p-4 ${economyAnalysis.pistol_win_rate >= 75 ? 'bg-emerald-500/10 border-emerald-500/20' : economyAnalysis.pistol_win_rate < 50 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pistol Round Impact</span>
                </div>
                <p className="text-sm text-slate-300">
                  {economyAnalysis.pistol_win_rate >= 75 ? (
                    <>Pistol rounds are a <strong className="text-emerald-400">core strength</strong> at {economyAnalysis.pistol_win_rate}% win rate. This gives excellent economy tempo.</>
                  ) : economyAnalysis.pistol_win_rate < 50 ? (
                    <>Pistol rounds are a <strong className="text-rose-400">major weakness</strong> at {economyAnalysis.pistol_win_rate}% win rate. Review opening strategies.</>
                  ) : (
                    <>Pistol rounds at {economyAnalysis.pistol_win_rate}% - room for improvement in opening rounds.</>
                  )}
                </p>
              </div>
            )}

            {/* First Blood Analysis */}
            {teamPerformance && (
              <div className={`p-4 ${teamPerformance.first_blood_rate > teamPerformance.first_death_rate ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Opening Duels</span>
                </div>
                <p className="text-sm text-slate-300">
                  {teamPerformance.first_blood_rate > teamPerformance.first_death_rate ? (
                    <>{teamName} wins opening duels more often ({teamPerformance.first_blood_rate}% FB vs {teamPerformance.first_death_rate}% FD). <strong className="text-emerald-400">Strong entry presence.</strong></>
                  ) : (
                    <>{teamName} loses opening duels frequently ({teamPerformance.first_death_rate}% FD vs {teamPerformance.first_blood_rate}% FB). <strong className="text-rose-400">Review positioning and aggression timing.</strong></>
                  )}
                </p>
              </div>
            )}

            {/* K/D Differential Analysis */}
            {teamPerformance && (
              <div className={`p-4 ${teamPerformance.kd_diff >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Frag Efficiency</span>
                </div>
                <p className="text-sm text-slate-300">
                  {teamPerformance.kd_diff >= 10 ? (
                    <>Dominant fragging with <strong className="text-emerald-400">+{teamPerformance.kd_diff} K/D differential</strong>. Converting kills to rounds effectively.</>
                  ) : teamPerformance.kd_diff >= 0 ? (
                    <>Even fragging with +{teamPerformance.kd_diff} K/D. Look for opportunities to secure more trades.</>
                  ) : teamPerformance.kd_diff >= -10 ? (
                    <>Slight frag deficit ({teamPerformance.kd_diff} K/D). Focus on trading and crossfire setups.</>
                  ) : (
                    <><strong className="text-rose-400">{teamPerformance.kd_diff} K/D differential</strong> is concerning. Review utility usage and positioning to reduce deaths.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 7. PLAYER-SPECIFIC COACHING */}
      {kastImpact.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-cyan-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-500" /> Player Focus Areas
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="space-y-3">
            {kastImpact.slice(0, 3).map((player, i) => {
              const needsAttention = player.loss_rate_without_kast > 65;
              const isConsistent = player.kast_percentage > 75;
              return (
                <div key={i} className={`p-4 rounded-xl border ${needsAttention ? 'bg-rose-500/5 border-rose-500/20' : isConsistent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${needsAttention ? 'bg-rose-500/20 text-rose-400' : isConsistent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{player.player_name}</div>
                        <div className="text-xs text-slate-500">{player.agent}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${player.kast_percentage >= 70 ? 'text-emerald-400' : player.kast_percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {player.kast_percentage}%
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">KAST</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {needsAttention ? (
                      <>⚠️ High-priority: {player.rounds_without_kast} rounds without impact. Team success heavily depends on this player's survival and contribution.</>
                    ) : isConsistent ? (
                      <>✓ Consistent performer with {player.rounds_with_kast}/{player.total_rounds} impactful rounds. Reliable anchor for team strategies.</>
                    ) : (
                      <>Monitor: {player.rounds_without_kast} rounds without KAST impact. Could improve trade timing or utility usage.</>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 8. STRATEGIC RECOMMENDATIONS */}
      {(economyAnalysis || teamPerformance) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Strategic Recommendations
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="space-y-3">
            {/* Generate recommendations based on data */}
            {economyAnalysis && economyAnalysis.full_buy_win_rate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">1</div>
                <div>
                  <p className="text-sm text-slate-300">Review full buy executes - {economyAnalysis.full_buy_win_rate}% win rate indicates execution issues</p>
                  <p className="text-xs text-slate-500 mt-1">Focus on: Utility timing, site coordination, post-plant positioning</p>
                </div>
              </div>
            )}
            {economyAnalysis && economyAnalysis.eco_conversion_rate > 20 && (
              <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">2</div>
                <div>
                  <p className="text-sm text-slate-300">Strong eco conversion ({economyAnalysis.eco_conversion_rate}%) - leverage this as a tactical weapon</p>
                  <p className="text-xs text-slate-500 mt-1">Consider: Aggressive eco plays, stack strategies, timing pushes</p>
                </div>
              </div>
            )}
            {teamPerformance && teamPerformance.clutch_wins > 2 && (
              <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="text-sm text-slate-300">{teamPerformance.clutch_wins} clutch wins show strong individual skill under pressure</p>
                  <p className="text-xs text-slate-500 mt-1">Identify clutch players and structure late-round scenarios around them</p>
                </div>
              </div>
            )}
            {economyAnalysis && economyAnalysis.attack_win_rate && economyAnalysis.defense_win_rate && (
              <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="text-sm text-slate-300">
                    {economyAnalysis.attack_win_rate > economyAnalysis.defense_win_rate
                      ? `Attack side stronger (${economyAnalysis.attack_win_rate}% vs ${economyAnalysis.defense_win_rate}% defense) - focus on defensive setups`
                      : `Defense side stronger (${economyAnalysis.defense_win_rate}% vs ${economyAnalysis.attack_win_rate}% attack) - refine execute timing and entries`
                    }
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {economyAnalysis.attack_win_rate > economyAnalysis.defense_win_rate
                      ? "Prioritize: Retake drills, anchor positioning, rotation timing"
                      : "Prioritize: Default executes, entry support, post-plant setups"
                    }
                  </p>
                </div>
              </div>
            )}
            {kastImpact.length > 0 && kastImpact.filter(p => p.loss_rate_without_kast > 70).length >= 2 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 text-amber-400 font-bold text-xs shrink-0">!</div>
                <div>
                  <p className="text-sm text-slate-300">Multiple players with high loss impact when dying - team relies heavily on individual survival</p>
                  <p className="text-xs text-slate-500 mt-1">Critical: Develop better trading setups and crossfire positions to reduce individual dependency</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 9. DEEPSEEK AI ANALYSIS */}
      {reviewLoading && !review && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#C89B3C]" /> DeepSeek AI Analysis
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="flex items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#C89B3C]" />
            <div>
              <p className="text-slate-300 text-sm font-medium">Generating Deep Analysis...</p>
              <p className="text-slate-500 text-xs">DeepSeek AI is processing match patterns</p>
            </div>
          </div>
        </motion.div>
      )}
      {review ? (
      <div className="grid grid-cols-1 gap-6">

        {/* EXECUTIVE SUMMARY */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C]">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#C89B3C]" /> DeepSeek Executive Summary
                <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm mb-4">
                {review.executive_summary}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
               {(review.key_takeaways || []).map((takeaway, i) => (
                   <div key={i} className="flex items-start gap-2 bg-white/5 p-3 rounded-lg">
                       <Target className="w-4 h-4 text-[#C89B3C] shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-300">{takeaway}</span>
                   </div>
               ))}
            </div>
        </motion.div>

        {/* CRITICAL ROUNDS WITH WHAT IF */}
        {(review.critical_rounds?.length || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Critical Rounds Review
                <span className="text-xs text-slate-500 font-normal ml-2">({teamName} perspective)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(review.critical_rounds || []).map((round, i) => (
                    <AgendaCard 
                        key={i}
                        icon={<DollarSign className="w-4 h-4" />}
                        category={`ROUND ${round.round_number} (${round.round_type})`}
                        status={round.importance === 'CRITICAL' ? 'critical' : 'warning'}
                        headline={round.summary}
                        bullets={[
                            ...(round.key_mistakes || []).map(m => `Mistake: ${m}`),
                            ...(round.key_plays || []).map(p => `Play: ${p}`),
                            round.economy_recommendation ? `Eco Rec: ${round.economy_recommendation}` : ''
                        ].filter(Boolean)}
                    />
                ))}
            </div>
        </motion.div>
        )}
        
        {/* TRAINING RECOMMENDATIONS */}
        {(review.training_recommendations?.length || 0) > 0 && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Training Focus
                <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
            </h3>
            <div className="space-y-2">
                {(review.training_recommendations || []).map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">
                            {i+1}
                        </div>
                        <span className="text-slate-300 text-sm">{rec}</span>
                    </div>
                ))}
            </div>
         </motion.div>
        )}

      </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-slate-400 mb-2">AI Review Pending</h3>
             <p className="text-slate-500">
                {seriesId ? "Analysis pending or not available for this series." : "Select a match to generate AI coaching insights."}
             </p>
        </div>
      )}



    </div>
  );
}

// Sub-components
function MetricCard({label, value, color, isText}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl text-center border-white/5">
            <div className={`${isText ? 'text-xl' : 'text-3xl'} font-black ${color} mb-1 truncate`}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
        </div>
    )
}

function EconomyStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 bg-white/5 rounded-lg">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    </div>
  );
}

function AgendaCard({icon, category, status, headline, bullets}: any) {
  const statusColors = {
    positive: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400'
  };
  const c = statusColors[status as keyof typeof statusColors] || 'text-slate-400';

  return (
    <div className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg bg-white/5 ${c}`}>{icon}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{category}</div>
      </div>
      <div className={`text-md font-bold mb-3 ${c} leading-tight`}>{headline}</div>
      <ul className="space-y-2">
        {bullets.map((b: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
            <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${c} bg-current opacity-50`} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

