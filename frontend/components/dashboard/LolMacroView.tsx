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
  Coins
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface MacroReviewData {
  executive_summary: string;
  key_takeaways: string[];
  critical_moments: any[];
  training_recommendations: string[];
  team_metrics?: {
    gold_diff_15: number;
    dragon_control_rate: number;
    vision_score_per_minute: number;
    lane_pressure_score: number;
  };
  player_stats?: any[];
  economy_analysis?: {
    average_gold_diff: number;
    economy_management: string;
  };
}

export function LolMacroView({ teamName, matchData, seriesId }: { teamName: string, matchData?: any, seriesId?: string }) {
  const [macroReview, setMacroReview] = useState<MacroReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<any>(null);

  // Fetch live macro review from API
  useEffect(() => {
    const fetchMacroReview = async () => {
      if (!seriesId) return;
      setLoading(true);
      try {
        const API_BASE_URL = getApiUrl();
        // Use generic endpoint or create specific one if needed. 
        // Assuming /api/v1/grid/macro-review/{seriesId} serves the EnhancedLoLMacroReview if backend is updated
        const res = await fetch(`${API_BASE_URL}/api/v1/grid/macro-review/${seriesId}`, {
          method: 'POST'
        });
        if (res.ok) {
          const data = await res.json();
          // The backend might nest it under macro_review or return directly
          if (data.macro_review) {
            setMacroReview(data.macro_review);
          } else {
             // Fallback for direct return
             setMacroReview(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch LoL macro review:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMacroReview();
  }, [seriesId]);

  // Extract values
  const team1Name = matchData?.team_1_name || teamName || 'Team 1';
  const team2Name = matchData?.team_2_name || 'Team 2';
  const team1Score = matchData?.team_1_score || 0;
  const team2Score = matchData?.team_2_score || 0;
  const mapName = matchData?.map_name || 'Summoner\'s Rift';
  
  // Format Gold Diff for display
  const goldDiff = macroReview?.team_metrics?.gold_diff_15 || 0;
  const goldDiffColor = goldDiff > 0 ? 'text-emerald-400' : 'text-rose-400';
  const goldDiffSign = goldDiff > 0 ? '+' : '';

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER & CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${matchData?.winner ? 'bg-slate-500' : (seriesId ? 'bg-[#C89B3C] animate-pulse' : 'bg-slate-500')}`}></div>
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                {seriesId ? (matchData?.winner ? `VOD Review: ${seriesId.slice(0,8)}` : `Live Analysis: ${seriesId.slice(0,8)}`) : 'No Active Session'}
              </span>
           </div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <Map className="w-6 h-6 text-[#C89B3C]" /> {mapName}
           </h2>
        </div>
        
        {loading && <div className="flex items-center gap-2 text-[#C89B3C]"><Loader2 className="animate-spin w-4 h-4"/> Syncing Engine...</div>}
      </div>

      {/* 1. TEAM EFFICIENCY (Moneyball Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Gold Diff @ 15" 
          value={`${goldDiffSign}${(Math.abs(goldDiff)/1000).toFixed(1)}k`} 
          color={goldDiffColor} 
          icon={Coins}
        />
        <MetricCard 
          label="Objective Control" 
          value={`${(macroReview?.team_metrics?.dragon_control_rate || 0).toFixed(0)}%`} 
          color="text-[#C89B3C]" 
          icon={Target}
        />
        <MetricCard 
          label="Vision / Min" 
          value={(macroReview?.team_metrics?.vision_score_per_minute || 0).toFixed(1)} 
          color="text-purple-400" 
          icon={Eye}
        />
         <MetricCard 
          label="Lane Pressure" 
          value={(macroReview?.team_metrics?.lane_pressure_score || 0).toFixed(1)} 
          color="text-emerald-400" 
          subtext="Structure Dmg Share"
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. EXECUTIVE SUMMARY (Center Stage) */}
        <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-24 h-24 text-[#C89B3C]" />
                </div>
                <h3 className="text-sm font-bold text-[#C89B3C] uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Brain className="w-4 h-4" /> Strategic Assessment
                </h3>
                {macroReview?.executive_summary ? (
                   <p className="text-lg text-slate-200 leading-relaxed font-light">
                     {macroReview.executive_summary}
                   </p>
                ) : (
                   <div className="h-24 flex items-center justify-center text-slate-500 italic">Waiting for engine analysis...</div>
                )}
                
                {/* Key Takeaways */}
                {macroReview?.key_takeaways && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {macroReview.key_takeaways.slice(0, 4).map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C89B3C]/20 text-[#C89B3C] flex items-center justify-center text-xs font-bold">{i+1}</span>
                              <span className="text-sm text-slate-300">{t}</span>
                          </div>
                      ))}
                  </div>
                )}
            </motion.div>

            {/* CRITICAL MOMENTS TIMELINE */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl">
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Clock className="w-4 h-4 text-rose-500" /> Critical Decision Points
                </h3>
                <div className="space-y-3">
                    {macroReview?.critical_moments && macroReview.critical_moments.length > 0 ? (
                        macroReview.critical_moments.map((moment, i) => (
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
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500">No critical moments detected yet.</div>
                    )}
                </div>
            </motion.div>
        </div>

        {/* 3. ROSTER PERFORMANCE (Right Column) */}
        <div className="space-y-6">
             {/* Player Stats Table */}
             <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-0 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-400" /> Roster Performance
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/20 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">Player</th>
                                <th className="px-4 py-3 font-medium text-right">KDA</th>
                                <th className="px-4 py-3 font-medium text-right">CS/M</th>
                                <th className="px-4 py-3 font-medium text-right">KP%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {macroReview?.player_stats ? (
                                macroReview.player_stats.map((p, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-200 group-hover:text-white">{p.player_name}</div>
                                            <div className="text-xs text-slate-500">{p.champion}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-300">{p.kda}</td>
                                        <td className="px-4 py-3 text-right font-mono text-[#C89B3C]">{p.cs_per_min}</td>
                                        <td className="px-4 py-3 text-right font-mono text-blue-400">{p.kp_percent}%</td>
                                    </tr>
                                ))
                            ) : matchData?.players?.map((p: any, i: number) => (
                                // Fallback if no detailed stats yet
                                 <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-200">{p.name || `Player ${i+1}`}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">{p.kills}/{p.deaths}/{p.assists}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">-</td>
                                    <td className="px-4 py-3 text-right text-slate-500">-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </motion.div>

             {/* Training Focus */}
             <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                 <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Zap className="w-4 h-4" /> Next Steps
                 </h3>
                 <ul className="space-y-2">
                     {macroReview?.training_recommendations?.slice(0, 3).map((rec, i) => (
                         <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                             <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                             {rec}
                         </li>
                     ))}
                     {!macroReview?.training_recommendations && <li className="text-sm text-slate-500 italic">No recommendations yet.</li>}
                 </ul>
             </motion.div>
        </div>

      </div>
    </div>
  );
}

// Sub-Components
function MetricCard({label, value, color, icon: Icon, subtext}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
                {Icon && <Icon className={`w-4 h-4 ${color} opacity-50 group-hover:opacity-100 transition-opacity`} />}
            </div>
            <div className={`text-2xl font-black ${color} tracking-tight`}>{value}</div>
            {subtext && <div className="text-[10px] text-slate-600 mt-1">{subtext}</div>}
        </div>
    )
}

