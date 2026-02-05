'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Map,
  Eye,
  Zap,
  Swords,
  GitBranch,
  AlertTriangle,
  Target,
  Brain,
  Loader2,
  Shield,
  Clock,
  Coins,
  Users,
  BarChart3,
  Skull,
  Crown,
  Crosshair
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

// Interfaces for LoL data
interface RoleImpactStat {
  player_name: string;
  champion: string;
  role: string;
  team_name: string;
  impact_score: number;
  kda_ratio: number;
  kp_percent: number;
  dmg_share: number;
  isolated_deaths: number;
  insight: string;
}

interface PlayerScoreboardStat {
  player_name: string;
  champion: string;
  role: string;
  team_name: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  kda_ratio: number;
  cs: number;
  cs_per_min: number;
  gold: number;
  gold_per_min: number;
  kp_percent: number;
  dmg_share: number;
  gold_share: number;
  damage_dealt: number;
  vision_score: number;
  vision_per_min: number;
  isolated_deaths: number;
  survival_rating: number;
  laning_score: number;
}

interface TeamPerformance {
  team_name: string;
  opponent_name: string;
  result: string;
  total_kills: number;
  total_deaths: number;
  total_gold: number;
  total_damage: number;
  gold_diff: number;
  kd_diff: number;
  avg_kda: number;
  avg_cs_min: number;
  avg_vision: number;
}

interface TeamMetrics {
  gold_diff_15: number;
  dragon_control_rate: number;
  baron_control_rate: number;
  tower_destruction_rate: number;
  vision_score_per_minute: number;
  lane_pressure_score: number;
}

interface MacroReviewData {
  executive_summary: string;
  key_takeaways: string[];
  critical_moments: any[];
  training_recommendations: string[];
}

export function LolMacroView({ teamName, matchData, seriesId }: { teamName: string, matchData?: any, seriesId?: string }) {
  const [macroReview, setMacroReview] = useState<MacroReviewData | null>(null);
  const [roleImpact, setRoleImpact] = useState<RoleImpactStat[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [playerScoreboard, setPlayerScoreboard] = useState<PlayerScoreboardStat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<number | null>(null);
  const [showFullScoreboard, setShowFullScoreboard] = useState(false);

  // Fetch enhanced review data
  useEffect(() => {
    if (!seriesId) {
      setLoading(false);
      return;
    }

    // Don't fetch if teamName is not a real team name yet
    const invalidTeamNames = ["Loading", "Team 1", "Team 2", "Team A", "Team B", "Unknown"];
    if (!teamName || invalidTeamNames.includes(teamName)) {
      console.log(`[LolMacroView] Waiting for real team name, got: ${teamName}`);
      return;
    }

    const fetchEnhancedData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[LolMacroView] Fetching enhanced data for series: ${seriesId}, team: ${teamName}`);
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
        console.log(`[LolMacroView] Enhanced data received:`, data);

        // Set all the data
        setRoleImpact(data.role_impact || []);
        setTeamMetrics(data.team_metrics || null);
        setTeamPerformance(data.team_performance || null);
        setPlayerScoreboard(data.player_scoreboard || []);
        setInsights(data.insights || []);
        setDataReady(true);

        // Fetch AI review in background
        if (!macroReview) {
          setReviewLoading(true);
          console.log(`[LolMacroView] Fetching AI review in background...`);

          fetch(`${API_BASE_URL}/api/v1/grid/macro-review/${seriesId}`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(aiData => {
              if (aiData?.review) {
                console.log(`[LolMacroView] AI Review received!`);
                setMacroReview(aiData.review);
              }
            })
            .catch(e => console.error('[LolMacroView] AI review fetch error:', e))
            .finally(() => setReviewLoading(false));
        }
      } catch (e) {
        console.error('[LolMacroView] Fetch exception:', e);
        setError("Connection error - retrying...");

        // Retry once
        setTimeout(async () => {
          try {
            const API_BASE_URL = getApiUrl();
            const retryRes = await fetch(`${API_BASE_URL}/api/v1/grid/enhanced-review/${seriesId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ team_name: teamName })
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              setRoleImpact(data.role_impact || []);
              setTeamMetrics(data.team_metrics || null);
              setTeamPerformance(data.team_performance || null);
              setPlayerScoreboard(data.player_scoreboard || []);
              setInsights(data.insights || []);
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

    fetchEnhancedData();
  }, [seriesId, teamName]);

  // Check if we have data
  const hasData = roleImpact.length > 0 || playerScoreboard.length > 0 || teamPerformance !== null;

  // Filter data by team
  const teamRoleImpact = roleImpact.filter(p => p.team_name === teamName);
  const teamScoreboard = playerScoreboard.filter(p => p.team_name === teamName);
  const isWinner = teamPerformance?.result === 'WIN';

  // Extract values from matchData
  const team1Name = matchData?.team1?.name || teamName || 'Team 1';
  const team2Name = matchData?.team2?.name || 'Team 2';
  const mapName = matchData?.map || 'Summoner\'s Rift';

  // Only show loading if we're still loading AND don't have data yet
  if (loading && !hasData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#C89B3C]" />
          <span className="text-[#C89B3C] font-mono text-xs animate-pulse">
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
          <div className={`w-3 h-3 rounded-full ${isWinner ? 'bg-emerald-500' : (seriesId ? 'bg-[#C89B3C] animate-pulse' : 'bg-slate-500')}`}></div>
          <span className="text-sm text-slate-300">
            {seriesId ? (matchData?.winner ? `VOD Review: ${seriesId.slice(0,8)}...` : `Live: ${seriesId.slice(0,8)}...`) : 'No Series Connected'}
            <strong className="text-white text-lg ml-3">{teamName}</strong>
          </span>
        </div>

        {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> Syncing Engine...</div>}
        {error && <div className="text-rose-400 text-sm">{error}</div>}

        <div className="flex items-center gap-3">
          {isWinner ? (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold uppercase tracking-wider">WINNER</span>
          ) : teamPerformance ? (
            <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-bold uppercase tracking-wider">DEFEAT</span>
          ) : null}
        </div>
      </div>

      {/* 1. TEAM PERFORMANCE OVERVIEW */}
      {teamPerformance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl border-l-4 border-l-[#C89B3C]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#C89B3C]" /> Team Performance
            </h3>
            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${teamPerformance.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {teamPerformance.result}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{teamPerformance.total_kills}</div>
              <div className="text-[10px] text-slate-500 uppercase">Total Kills</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-slate-400">{teamPerformance.total_deaths}</div>
              <div className="text-[10px] text-slate-500 uppercase">Total Deaths</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-[#C89B3C]">{teamPerformance.avg_kda}</div>
              <div className="text-[10px] text-slate-500 uppercase">Avg KDA</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className={`text-2xl font-bold ${teamPerformance.gold_diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {teamPerformance.gold_diff >= 0 ? '+' : ''}{(teamPerformance.gold_diff / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-slate-500 uppercase">Gold Diff</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{teamPerformance.avg_cs_min}</div>
              <div className="text-[10px] text-slate-500 uppercase">Avg CS/min</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{teamPerformance.avg_vision}</div>
              <div className="text-[10px] text-slate-500 uppercase">Avg Vision/min</div>
            </div>
          </div>
          {/* Additional stats row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-[#C89B3C]">{(teamPerformance.total_gold / 1000).toFixed(1)}k</div>
              <div className="text-[9px] text-slate-500 uppercase">Total Gold</div>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className="text-lg font-bold text-rose-400">{(teamPerformance.total_damage / 1000).toFixed(1)}k</div>
              <div className="text-[9px] text-slate-500 uppercase">Total Damage</div>
            </div>
            <div className="text-center p-2 bg-white/5 rounded-lg">
              <div className={`text-lg font-bold ${teamPerformance.kd_diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {teamPerformance.kd_diff >= 0 ? '+' : ''}{teamPerformance.kd_diff}
              </div>
              <div className="text-[9px] text-slate-500 uppercase">K/D Diff</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. TOP METRICS ROW (Moneyball Stats) */}
      {teamMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Gold Diff @ 15"
            value={`${teamMetrics.gold_diff_15 >= 0 ? '+' : ''}${(teamMetrics.gold_diff_15 / 1000).toFixed(1)}k`}
            color={teamMetrics.gold_diff_15 >= 0 ? "text-emerald-400" : "text-rose-400"}
            icon={Coins}
          />
          <MetricCard
            label="Dragon Control"
            value={`${teamMetrics.dragon_control_rate.toFixed(0)}%`}
            color="text-[#C89B3C]"
            icon={Target}
          />
          <MetricCard
            label="Vision / Min"
            value={teamMetrics.vision_score_per_minute.toFixed(1)}
            color="text-purple-400"
            icon={Eye}
          />
          <MetricCard
            label="Lane Pressure"
            value={`${teamMetrics.lane_pressure_score.toFixed(0)}%`}
            color="text-emerald-400"
            icon={Zap}
          />
        </div>
      )}

      {/* 3. ROLE IMPACT ANALYSIS (Like KAST for LoL) */}
      {teamRoleImpact.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-rose-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" /> Role Impact Analysis
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Key insight: How each {teamName} player's performance impacts team success
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {teamRoleImpact.map((stat, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-800/50 to-gray-900 p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">{stat.player_name}</div>
                    <div className="text-xs text-gray-500">{stat.champion} • {stat.role}</div>
                  </div>
                  <div className={`text-2xl font-bold ${stat.impact_score >= 70 ? 'text-emerald-400' : stat.impact_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {stat.impact_score.toFixed(0)}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Impact Score
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex-1">
                    <div className="text-gray-500">KDA</div>
                    <div className="text-purple-400 font-semibold">{stat.kda_ratio.toFixed(1)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500">KP%</div>
                    <div className="text-blue-400 font-semibold">{stat.kp_percent.toFixed(0)}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500">Dmg%</div>
                    <div className="text-rose-400 font-semibold">{stat.dmg_share.toFixed(0)}%</div>
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

      {/* 4. PLAYER SCOREBOARD */}
      {playerScoreboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#C89B3C]" /> Player Scoreboard
            </h3>
            <button
              onClick={() => setShowFullScoreboard(!showFullScoreboard)}
              className="text-xs text-[#C89B3C] hover:text-[#DDB04B] transition-colors"
            >
              {showFullScoreboard ? 'Show Team Only' : 'Show All Players'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase border-b border-white/10">
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-center py-2 px-1">Champion</th>
                  <th className="text-center py-2 px-1">K/D/A</th>
                  <th className="text-center py-2 px-1">CS/M</th>
                  <th className="text-center py-2 px-1">Gold/M</th>
                  <th className="text-center py-2 px-1">KP%</th>
                  <th className="text-center py-2 px-1">Dmg%</th>
                  <th className="text-center py-2 px-1">Vision</th>
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
                        className={`border-b border-white/5 ${isTeamPlayer ? 'bg-[#C89B3C]/5' : 'bg-white/[0.02]'} hover:bg-white/5 transition-colors`}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-6 rounded ${isTeamPlayer ? 'bg-[#C89B3C]' : 'bg-rose-500'}`}></div>
                            <div>
                              <div className="font-semibold text-white">{player.player_name}</div>
                              <div className="text-[10px] text-slate-500">{player.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-slate-400 text-xs">{player.champion}</span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-white font-mono">{player.kda}</span>
                          <div className={`text-[10px] ${player.kda_ratio >= 3 ? 'text-emerald-400' : player.kda_ratio >= 1.5 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {player.kda_ratio.toFixed(2)}
                          </div>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`font-bold ${player.cs_per_min >= 8 ? 'text-emerald-400' : player.cs_per_min >= 6 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {player.cs_per_min}
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className="text-[#C89B3C]">{player.gold_per_min}</span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.kp_percent >= 60 ? 'text-purple-400' : player.kp_percent >= 40 ? 'text-slate-300' : 'text-slate-500'}`}>
                            {player.kp_percent.toFixed(0)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.dmg_share >= 25 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {player.dmg_share.toFixed(0)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-1">
                          <span className={`${player.vision_per_min >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
                            {player.vision_per_min.toFixed(1)}
                          </span>
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
            const mvp = teamPlayers.sort((a, b) => b.kda_ratio - a.kda_ratio)[0];
            if (!mvp) return null;
            return (
              <div className="mt-4 p-3 bg-gradient-to-r from-[#C89B3C]/10 to-amber-500/10 rounded-lg border border-[#C89B3C]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#C89B3C]/20 rounded-lg">
                    <Crown className="w-4 h-4 text-[#C89B3C]" />
                  </div>
                  <div>
                    <div className="text-xs text-[#C89B3C] uppercase tracking-wider">Team MVP</div>
                    <div className="text-white font-semibold">
                      {mvp.player_name} ({mvp.champion}) - {mvp.kda} KDA
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* 5. INSTANT COACHING INSIGHTS */}
      {(teamRoleImpact.length > 0 || teamPerformance) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" /> Instant Coaching Insights
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Key Player Dependency */}
            {teamRoleImpact.length > 0 && teamRoleImpact[0]?.impact_score > 70 && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Star Performer</span>
                </div>
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{teamRoleImpact[0]?.player_name}</strong> has the highest impact score
                  ({teamRoleImpact[0]?.impact_score.toFixed(0)}) on {teamRoleImpact[0]?.champion}.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Continue to enable this player with resources and map pressure.
                </p>
              </div>
            )}

            {/* Low Impact Warning */}
            {teamRoleImpact.length > 0 && teamRoleImpact[teamRoleImpact.length - 1]?.impact_score < 40 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Needs Support</span>
                </div>
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{teamRoleImpact[teamRoleImpact.length - 1]?.player_name}</strong> had
                  low impact ({teamRoleImpact[teamRoleImpact.length - 1]?.impact_score.toFixed(0)}).
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Review positioning, jungle proximity, and team coordination.
                </p>
              </div>
            )}

            {/* Gold Analysis */}
            {teamPerformance && (
              <div className={`p-4 ${teamPerformance.gold_diff >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-[#C89B3C]" />
                  <span className="text-xs font-bold text-[#C89B3C] uppercase tracking-wider">Economy Impact</span>
                </div>
                <p className="text-sm text-slate-300">
                  {teamPerformance.gold_diff >= 5000 ? (
                    <>Dominated economy with <strong className="text-emerald-400">+{(teamPerformance.gold_diff / 1000).toFixed(1)}k gold</strong>. Excellent resource management.</>
                  ) : teamPerformance.gold_diff >= 0 ? (
                    <>Slight gold advantage (+{(teamPerformance.gold_diff / 1000).toFixed(1)}k). Look for opportunities to extend lead.</>
                  ) : teamPerformance.gold_diff >= -5000 ? (
                    <>Behind in gold ({(teamPerformance.gold_diff / 1000).toFixed(1)}k). Focus on safe farming and objective control.</>
                  ) : (
                    <><strong className="text-rose-400">{(teamPerformance.gold_diff / 1000).toFixed(1)}k gold deficit</strong>. Review early game decisions and jungle pathing.</>
                  )}
                </p>
              </div>
            )}

            {/* K/D Analysis */}
            {teamPerformance && (
              <div className={`p-4 ${teamPerformance.kd_diff >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl`}>
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Team Fighting</span>
                </div>
                <p className="text-sm text-slate-300">
                  {teamPerformance.kd_diff >= 10 ? (
                    <>Dominant fragging with <strong className="text-emerald-400">+{teamPerformance.kd_diff} K/D differential</strong>. Strong team fight execution.</>
                  ) : teamPerformance.kd_diff >= 0 ? (
                    <>Even team fighting (+{teamPerformance.kd_diff} K/D). Look for better engage opportunities.</>
                  ) : teamPerformance.kd_diff >= -10 ? (
                    <>Slight K/D deficit ({teamPerformance.kd_diff}). Focus on trading and peel.</>
                  ) : (
                    <><strong className="text-rose-400">{teamPerformance.kd_diff} K/D differential</strong> is concerning. Review engage timing and positioning.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 6. PLAYER FOCUS AREAS */}
      {teamRoleImpact.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-cyan-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-500" /> Player Focus Areas
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="space-y-3">
            {teamRoleImpact.slice(0, 3).map((player, i) => {
              const needsAttention = player.impact_score < 40;
              const isConsistent = player.impact_score > 70;
              return (
                <div key={i} className={`p-4 rounded-xl border ${needsAttention ? 'bg-rose-500/5 border-rose-500/20' : isConsistent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${needsAttention ? 'bg-rose-500/20 text-rose-400' : isConsistent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{player.player_name}</div>
                        <div className="text-xs text-slate-500">{player.champion} • {player.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${player.kda_ratio >= 3 ? 'text-emerald-400' : player.kda_ratio >= 1.5 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {player.kda_ratio.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">KDA</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {needsAttention ? (
                      <>⚠️ Low impact ({player.impact_score.toFixed(0)}). {player.isolated_deaths > 2 ? `${player.isolated_deaths} isolated deaths - improve positioning.` : 'Consider safer playstyle or better team coordination.'}</>
                    ) : isConsistent ? (
                      <>✓ High impact performer with {player.kp_percent.toFixed(0)}% kill participation. Key contributor to team success.</>
                    ) : (
                      <>Moderate impact. {player.dmg_share.toFixed(0)}% damage share. Look for opportunities to increase contribution.</>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 7. STRATEGIC RECOMMENDATIONS */}
      {(insights.length > 0 || teamPerformance) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Strategic Recommendations
            <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs shrink-0">{i + 1}</div>
                <div>
                  <p className="text-sm text-slate-300">{insight}</p>
                </div>
              </div>
            ))}

            {/* Additional generated recommendations */}
            {teamMetrics && teamMetrics.dragon_control_rate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 text-amber-400 font-bold text-xs shrink-0">!</div>
                <div>
                  <p className="text-sm text-slate-300">Dragon control ({teamMetrics.dragon_control_rate.toFixed(0)}%) needs improvement. Prioritize vision around dragon pit 1 minute before spawn.</p>
                </div>
              </div>
            )}

            {teamMetrics && teamMetrics.vision_score_per_minute < 1 && (
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20 text-amber-400 font-bold text-xs shrink-0">!</div>
                <div>
                  <p className="text-sm text-slate-300">Vision score is low ({teamMetrics.vision_score_per_minute.toFixed(1)}/min). All players should contribute to warding objectives and jungle entrances.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 8. DEEPSEEK AI ANALYSIS */}
      {reviewLoading && !macroReview && (
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

      {macroReview ? (
        <div className="grid grid-cols-1 gap-6">
          {/* EXECUTIVE SUMMARY */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="w-24 h-24 text-[#C89B3C]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#C89B3C]" /> Strategic Assessment
              <span className="text-xs text-slate-500 font-normal ml-2">({teamName})</span>
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm mb-4">
              {macroReview.executive_summary}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {(macroReview.key_takeaways || []).slice(0, 4).map((takeaway, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/5 p-3 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C89B3C]/20 text-[#C89B3C] flex items-center justify-center text-xs font-bold">{i+1}</span>
                  <span className="text-xs text-slate-300">{takeaway}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CRITICAL MOMENTS TIMELINE */}
          {(macroReview.critical_moments?.length || 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" /> Critical Decision Points
              </h3>
              <div className="space-y-3">
                {macroReview.critical_moments.map((moment, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedMoment(selectedMoment === i ? null : i)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedMoment === i ? 'bg-white/10 border-[#C89B3C]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[#C89B3C] font-mono font-bold">{moment.timestamp_formatted}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          moment.event_type === 'FIGHT' ? 'bg-rose-500/20 text-rose-400' :
                          moment.event_type === 'OBJECTIVE' ? 'bg-[#C89B3C]/20 text-[#C89B3C]' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {moment.event_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Impact: <span className={moment.impact_score > 0.7 ? 'text-rose-400' : 'text-slate-400'}>{(moment.impact_score * 10).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 font-medium">{moment.description}</div>

                    <AnimatePresence>
                      {selectedMoment === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-white/10 grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-slate-500 uppercase mb-1">Decision Made</div>
                              <div className="text-rose-300">{moment.decision_made}</div>
                              <div className="text-xs text-slate-400 mt-1">Outcome: {moment.outcome}</div>
                            </div>
                            <div className="bg-emerald-500/5 p-2 rounded">
                              <div className="text-xs text-emerald-500 uppercase mb-1 flex items-center gap-1"><GitBranch className="w-3 h-3"/> Alternative</div>
                              <div className="text-emerald-300">{moment.alternative_decision}</div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TRAINING RECOMMENDATIONS */}
          {(macroReview.training_recommendations?.length || 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Training Focus
              </h3>
              <ul className="space-y-2">
                {macroReview.training_recommendations.slice(0, 4).map((rec, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      ) : !reviewLoading && !loading && (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5">
          <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-400 mb-2">AI Review Pending</h3>
          <p className="text-slate-500 text-sm">
            {seriesId ? "Analysis pending or loading..." : "Select a match to generate AI coaching insights."}
          </p>
        </div>
      )}
    </div>
  );
}

// Sub-Components
function MetricCard({label, value, color, icon: Icon}: {label: string, value: string, color: string, icon: any}) {
  return (
    <div className="glass-panel p-4 rounded-xl border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
        {Icon && <Icon className={`w-4 h-4 ${color} opacity-50 group-hover:opacity-100 transition-opacity`} />}
      </div>
      <div className={`text-2xl font-black ${color} tracking-tight`}>{value}</div>
    </div>
  );
}
