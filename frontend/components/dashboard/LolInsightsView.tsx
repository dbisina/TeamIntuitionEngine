import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Footprints, 
  Coins, 
  Eye, 
  Swords, 
  ShieldAlert, 
  Skull, 
  Trophy,
  BarChart2
} from 'lucide-react';

export function LolInsightsView({ player, teamName, seriesId }: { player: any, teamName: string, seriesId?: string }) {
  const [aiInsights, setAiInsights] = useState<{positive: any[], negative: any[], outliers: any[]} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch AI Insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!player?.player_name || !seriesId) return;
      setAiLoading(true);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE_URL}/api/v1/grid/player-insights/${seriesId}/${encodeURIComponent(player.player_name)}`, {
            method: 'POST'
        });
        if (res.ok) {
            const data = await res.json();
            if (data.insights) {
                setAiInsights({
                    positive: data.insights.positive_impacts || [],
                    negative: data.insights.negative_impacts || [],
                    outliers: data.insights.statistical_outliers || []
                });
            }
        }
      } catch (e) {
        console.error("AI Insight Fetch Error", e);
      } finally {
        setAiLoading(false);
      }
    };
    fetchInsights();
  }, [player?.player_name, seriesId]);

  if (!player) return null;

  // Real Stats or Safe Defaults
  const k = player.kills || 0;
  const d = player.deaths || 0;
  const a = player.assists || 0;
  const cs = player.creep_score || player.cs || 0;
  const gold = player.gold || player.money || 0;
  const kda = d > 0 ? ((k + a) / d).toFixed(2) : (k + a).toFixed(2);

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. HEADER SUMMARY */}
      <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#091428] to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
               <div className="h-20 w-20 rounded-full bg-[#C89B3C]/10 border-2 border-[#C89B3C] flex items-center justify-center shadow-[0_0_15px_rgba(200,155,60,0.3)]">
                    <span className="text-2xl font-bold text-[#C89B3C]">{player.role ? player.role[0] : 'L'}</span>
               </div>
               <div>
                   <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">{player.player_name}</h3>
                   <div className="flex items-center gap-3 text-sm text-slate-400 font-mono mt-1">
                       <span className="text-[#C89B3C] font-bold">{teamName}</span>
                       <span className="text-white/20">|</span>
                       <span>{player.role || 'Flex'}</span>
                       <span className="text-white/20">|</span>
                       <span>{player.champion || 'Champion'}</span>
                   </div>
               </div>
          </div>
          
          <div className="flex gap-8 text-right relative z-10">
               <div className="text-center">
                   <div className="text-3xl font-black text-white">{k}/{d}/{a}</div>
                   <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">KDA ({kda})</div>
               </div>
               <div className="h-10 w-[1px] bg-white/10"></div>
                <div className="text-center">
                   <div className="text-3xl font-black text-yellow-500">{(gold/1000).toFixed(1)}k</div>
                   <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Gold Earned</div>
               </div>
          </div>
      </div>

      {/* 2. AI COACHING INSIGHTS (Moneyball Core) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mt-6"
      >
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#C89B3C]/10 rounded-lg border border-[#C89B3C]/20">
                <BarChart2 className="w-5 h-5 text-[#C89B3C]" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Pattern Recognition Engine</h2>
            {aiLoading && <div className="text-xs text-[#C89B3C] animate-pulse">Processing Rift Data...</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive Patterns */}
            {aiInsights?.positive.map((insight: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy className="w-12 h-12 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Winning Condition</div>
                        <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            {Math.round(insight.probability * 100)}% Win Prob
                        </div>
                    </div>
                    <h4 className="text-white font-bold text-lg mb-1">{insight.trigger}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">...results in <span className="text-emerald-300 font-semibold">{insight.outcome}</span>.</p>
                    <div className="text-xs text-slate-500 italic pl-3 border-l-2 border-emerald-500/30">
                        {insight.recommendation}
                    </div>
                </div>
            ))}

            {/* Negative Patterns */}
            {aiInsights?.negative.map((insight: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldAlert className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest">Critical Leak</div>
                        <div className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            {Math.round(insight.probability * 100)}% Risk
                        </div>
                    </div>
                    <h4 className="text-white font-bold text-lg mb-1">{insight.trigger}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">...leads to <span className="text-rose-300 font-semibold">{insight.outcome}</span>.</p>
                    <div className="text-xs text-slate-500 italic pl-3 border-l-2 border-rose-500/30">
                        {insight.recommendation}
                    </div>
                </div>
            ))}
            
            {!aiInsights && !aiLoading && (
                <div className="col-span-2 text-center py-10 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    <div className="text-slate-500 mb-2">No enough match history for pattern recognition.</div>
                    <div className="text-xs text-slate-600">Connect more games to unlock Moneyball insights.</div>
                </div>
            )}
        </div>
      </motion.div>

      {/* 3. TRADITIONAL METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Economic Efficiency */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" /> Resource Efficiency
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                 <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase mb-1">CS / Min</div>
                    <div className="text-2xl font-bold text-white">{(cs / 30).toFixed(1)}</div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-xs text-slate-400 uppercase mb-1">Gold Share</div>
                    <div className="text-2xl font-bold text-yellow-400">24%</div>
                 </div>
            </div>
        </motion.div>

        {/* Vision & Control */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.3}} className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" /> Map Control
            </h3>
            <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-slate-300">Vision Score approx.</span>
                    <span className="font-bold text-blue-300">~{Math.round(cs * 0.4)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">Obj Participation</span>
                    <span className="font-bold text-emerald-400">High</span>
                 </div>
            </div>
        </motion.div>
      </div>

    </div>
  );
}

function InsightMetric({label, value, color, isText}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl text-center border-white/5">
            <div className={`text-2xl font-black ${color} mb-1 ${isText ? 'text-lg' : ''}`}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
        </div>
    )
}



function ChampCard({name, winrate, type, isWarn}: any) {
    return (
        <div className={`flex-1 p-3 rounded-lg border ${isWarn ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="font-bold text-white mb-1">{name}</div>
            <div className="flex justify-between text-xs">
                <span className={isWarn ? 'text-rose-400' : 'text-emerald-400'}>{winrate} WR</span>
                <span className="text-slate-500">{type}</span>
            </div>
        </div>
    )
}
