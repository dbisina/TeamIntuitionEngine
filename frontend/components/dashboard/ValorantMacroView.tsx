'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Map, 
  Eye, 
  Zap, 
  Swords, 
  AlertTriangle,
  Target,
  Brain,
  Loader2,
  FileText,
  DollarSign
} from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI Macro Review
  useEffect(() => {
    const fetchReview = async () => {
      if (!seriesId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/grid/macro-review/${seriesId}`, {
          method: 'POST'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.review) {
            setReview(data.review);
          } else {
            setError("No review data generated");
          }
        } else {
            setError("Failed to fetch review");
        }
      } catch (e) {
        console.error('Failed to fetch macro review:', e);
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [seriesId]);

  const isWinner = matchData?.winner === teamName;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 0. TEAM CONTEXT HEADER */}
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
           <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full animate-pulse ${isWinner ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
               <span className="text-sm text-slate-300">
                   Showing Analysis for: <strong className="text-white text-lg ml-1">{teamName}</strong>
               </span>
           </div>
           
             {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> Generatiing AI Analysis...</div>}
             {error && <div className="text-rose-400 text-sm">{error}</div>}
           
           <div>
               {isWinner ? (
                   <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold uppercase tracking-wider">WINNER</span>
               ) : (
                   <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-bold uppercase tracking-wider">DEFEAT</span>
               )}
           </div>
      </div>

      {/* 1. TOP METRICS ROW (Derived from AI Metrics or Loading) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
            label="Macro Score" 
            value={review ? "Good" : (isWinner ? "High" : "Low")} 
            color={review ? "text-emerald-400" : "text-slate-500"} 
            isText
        />
        <MetricCard 
            label="Pistol WR" 
            value={review?.team_metrics ? `${(review.team_metrics.pistol_round_win_rate * 100).toFixed(0)}%` : "-"} 
            color="text-amber-400"
        />
        <MetricCard 
            label="Team KAST" 
            value={review?.team_metrics ? `${(review.team_metrics.team_kast * 100).toFixed(0)}%` : "-"} 
            color="text-purple-400"
        />
        <MetricCard 
            label="First Bloods" 
            value={review?.team_metrics ? `${(review.team_metrics.first_blood_rate * 100).toFixed(0)}%` : "-"} 
            color="text-cyan-400"
        />
      </div>

      {/* 2. REAL AI ANALYSIS BODY */}
      {review ? (
      <div className="grid grid-cols-1 gap-6">
        
        {/* EXECUTIVE SUMMARY */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C]">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#C89B3C]" /> AI Coach Executive Summary
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm mb-4">
                {review.executive_summary}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
               {review.key_takeaways.map((takeaway, i) => (
                   <div key={i} className="flex items-start gap-2 bg-white/5 p-3 rounded-lg">
                       <Target className="w-4 h-4 text-[#C89B3C] shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-300">{takeaway}</span>
                   </div>
               ))}
            </div>
        </motion.div>

        {/* CRITICAL ROUNDS (Replaces Critical Moments) */}
        {review.critical_rounds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Critical Rounds Review
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {review.critical_rounds.map((round, i) => (
                    <AgendaCard 
                        key={i}
                        icon={<DollarSign className="w-4 h-4" />}
                        category={`ROUND ${round.round_number} (${round.round_type})`}
                        status={round.importance === 'CRITICAL' ? 'critical' : 'warning'}
                        headline={round.summary}
                        bullets={[
                            ...round.key_mistakes.map(m => `Mistake: ${m}`),
                            ...round.key_plays.map(p => `Play: ${p}`),
                            round.economy_recommendation ? `Eco Rec: ${round.economy_recommendation}` : ''
                        ].filter(Boolean)}
                    />
                ))}
            </div>
        </motion.div>
        )}
        
        {/* TRAINING RECOMMENDATIONS */}
        {review.training_recommendations.length > 0 && (
         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Training Focus
            </h3>
            <div className="space-y-2">
                {review.training_recommendations.map((rec, i) => (
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
                {seriesId ? "Waiting for AI to analyze the match events..." : "Select a match to generate AI coaching insights."}
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

function AgendaCard({icon, category, status, headline, bullets}: any) {
  const statusColors = {
    positive: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400'
  };
  const c = statusColors[status as keyof typeof statusColors] || 'text-slate-400';

  return (
    <div className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
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
