'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2
} from 'lucide-react';

interface MacroReviewData {
  executive_summary?: string;
  key_takeaways?: string[];
  critical_moments?: any[];
  training_recommendations?: string[];
}

export function LolMacroView({ teamName, matchData, seriesId }: { teamName: string, matchData?: any, seriesId?: string }) {
  const [macroReview, setMacroReview] = useState<MacroReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch live macro review from API
  useEffect(() => {
    const fetchMacroReview = async () => {
      if (!seriesId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/grid/macro-review/${seriesId}`, {
          method: 'POST'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.macro_review) {
            setMacroReview(data.macro_review);
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

  // Extract values from live match data (with fallbacks for display)
  const team1Name = matchData?.team_1_name || teamName || 'Team 1';
  const team2Name = matchData?.team_2_name || 'Team 2';
  const team1Score = matchData?.team_1_score || 0;
  const team2Score = matchData?.team_2_score || 0;
  const mapName = matchData?.map_name || 'Unknown Map';
  const gameClock = matchData?.game_clock || 0;

  // Calculate some metrics from match data if available
  const players = matchData?.players || [];
  const teamPlayers = players.filter((p: any) => p.team === team1Name);
  const totalGold = teamPlayers.reduce((sum: number, p: any) => sum + (p.gold || p.money || 0), 0);
  const totalKills = teamPlayers.reduce((sum: number, p: any) => sum + (p.kills || 0), 0);
  const totalDeaths = teamPlayers.reduce((sum: number, p: any) => sum + (p.deaths || 0), 0);
  
  return (
    <div className="space-y-6 pb-20">
      
      {/* Live Data Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${seriesId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
            {seriesId ? `Live: ${seriesId}` : 'No Series Connected'}
          </span>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
      </div>
      
      {/* 1. TOP METRICS ROW (LIVE DATA) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Team Score" value={`${team1Score}:${team2Score}`} color="text-[#C89B3C]" />
        <MetricCard label="Team Gold" value={totalGold > 1000 ? `${(totalGold/1000).toFixed(1)}k` : totalGold} color="text-yellow-400" />
        <MetricCard label="K/D" value={`${totalKills}/${totalDeaths}`} color="text-emerald-400" />
        <MetricCard label="Map" value={mapName || '-'} color="text-purple-400" isText />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. GAME PHASE CONTROL */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C89B3C]" /> Game Status
            </h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Game Clock</span>
                    <span className="font-mono text-white">{Math.floor(gameClock / 60)}:{String(gameClock % 60).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Map</span>
                    <span className="font-mono text-white">{mapName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                     <StatTile label="Team 1" value={team1Name} color="text-blue-400" isText />
                     <StatTile label="Team 2" value={team2Name} color="text-rose-400" isText />
                </div>
            </div>
        </motion.div>

        {/* 2. PLAYER STATS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Team Players
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                 {teamPlayers.length > 0 ? teamPlayers.map((p: any, i: number) => (
                   <PlayerRow key={i} name={p.name} champion={p.agent || p.champion} kills={p.kills} deaths={p.deaths} assists={p.assists} gold={p.gold || p.money} />
                 )) : (
                   <p className="text-sm text-slate-500 italic">Connect to a series to see player data</p>
                 )}
            </div>
        </motion.div>

      </div>

      {/* AI GENERATED ANALYSIS */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#C89B3C]">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Brain className="w-5 h-5 text-[#C89B3C]" /> AI Macro Analysis
         </h3>
         
         {loading ? (
           <div className="flex items-center gap-3 text-slate-400">
             <Loader2 className="w-5 h-5 animate-spin" />
             <span>Generating analysis...</span>
           </div>
         ) : macroReview ? (
           <div className="space-y-4">
             {macroReview.executive_summary && (
               <div className="bg-white/5 p-4 rounded-xl">
                 <div className="text-xs text-[#C89B3C] uppercase font-bold mb-2">Executive Summary</div>
                 <p className="text-sm text-slate-300 leading-relaxed">{macroReview.executive_summary}</p>
               </div>
             )}
             
             {macroReview.key_takeaways && macroReview.key_takeaways.length > 0 && (
               <div className="grid md:grid-cols-2 gap-4">
                 {macroReview.key_takeaways.slice(0, 4).map((item: string, i: number) => (
                   <AgendaItem key={i} title={`Takeaway ${i + 1}`} desc={item} />
                 ))}
               </div>
             )}
             
             {macroReview.training_recommendations && macroReview.training_recommendations.length > 0 && (
               <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                 <div className="text-xs text-emerald-400 uppercase font-bold mb-2">Training Recommendations</div>
                 <ul className="space-y-1">
                   {macroReview.training_recommendations.slice(0, 3).map((rec: string, i: number) => (
                     <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                       <span className="text-emerald-400">•</span> {rec}
                     </li>
                   ))}
                 </ul>
               </div>
             )}
           </div>
         ) : (
           <p className="text-slate-500 text-sm italic">
             {seriesId ? 'No analysis available yet. Data is loaded from GRID API.' : 'Connect to a live series to see AI-generated macro analysis.'}
           </p>
         )}
      </motion.div>

    </div>
  );
}

// Sub-Components
function MetricCard({label, value, color, isText}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl text-center border-white/5">
            <div className={`${isText ? 'text-lg truncate' : 'text-3xl'} font-black ${color} mb-1`}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
        </div>
    )
}

function StatTile({label, value, color, isText}: any) {
    return (
        <div className="bg-white/5 p-2 rounded text-center">
            <div className="text-[10px] text-slate-400 uppercase">{label}</div>
            <div className={`${isText ? 'text-sm truncate' : 'text-lg'} font-bold ${color}`}>{value}</div>
        </div>
    )
}

function PlayerRow({name, champion, kills, deaths, assists, gold}: any) {
    return (
        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0">
            <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">{name}</span>
                <span className="text-xs text-slate-500">{champion}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-slate-300 font-mono text-xs">{kills}/{deaths}/{assists}</span>
                <span className="text-yellow-400 font-mono text-xs">{gold > 1000 ? `${(gold/1000).toFixed(1)}k` : gold}</span>
            </div>
        </div>
    )
}

function AgendaItem({title, desc}: any) {
     return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-white group-hover:text-[#C89B3C] transition-colors">{title}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </div>
    )
}
