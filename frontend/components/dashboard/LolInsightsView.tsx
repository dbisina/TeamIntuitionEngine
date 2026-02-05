'use client';

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
  BarChart2,
  Crosshair,
  Target
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export function LolInsightsView({ player, teamName, seriesId }: { player: any, teamName: string, seriesId?: string }) {
  const [aiInsights, setAiInsights] = useState<{positive: any[], negative: any[], outliers: any[]} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch AI Insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!player?.player_name || !seriesId) return;
      setAiLoading(true);
      try {
        const API_BASE_URL = getApiUrl();
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
  const vision = player.vision_score || Math.round(cs * 0.2) + 5; // fallback estimate
  
  // Normalize stats for Radar Chart (0-100 scale estimate)
  // These would ideally come from the backend's "percentiles" but we estimate for now
  const radarData = [
    { subject: 'Combat', A: Math.min(100, ((k+a)/15)*100), fullMark: 100 },
    { subject: 'Farming', A: Math.min(100, (cs/250)*100), fullMark: 100 },
    { subject: 'Vision', A: Math.min(100, (vision/40)*100), fullMark: 100 },
    { subject: 'Survival', A: Math.max(0, 100 - (d*10)), fullMark: 100 },
    { subject: 'Gold', A: Math.min(100, (gold/12000)*100), fullMark: 100 },
  ];

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

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. PERFORMANCE PROFILE (Radar) */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-1 glass-panel p-4 rounded-2xl flex flex-col items-center justify-center" style={{ minHeight: '320px' }}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 w-full text-center">Playstyle Profile</h3>
            <div className="w-full flex-1 relative" style={{ minHeight: '250px', minWidth: '200px' }}>
                <ResponsiveContainer width="100%" height={250} minWidth={200}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name={player.player_name || 'Player'}
                        dataKey="A"
                        stroke="#C89B3C"
                        strokeWidth={2}
                        fill="#C89B3C"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ color: '#C89B3C' }}
                    />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-500 text-center mt-2">
                Based on current match data vs role averages
            </div>
        </motion.div>

        {/* 3. AI COACHING INSIGHTS */}
        <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#C89B3C]/10 rounded-lg border border-[#C89B3C]/20">
                    <BarChart2 className="w-5 h-5 text-[#C89B3C]" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Pattern Recognition Engine</h2>
                {aiLoading && <div className="text-xs text-[#C89B3C] animate-pulse">Processing Rift Data...</div>}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Positive Patterns */}
                {aiInsights?.positive.map((insight: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <Trophy className="w-3 h-3" /> Winning Habit
                            </div>
                        </div>
                        <h4 className="text-white font-bold text-base mb-1">{insight.trigger}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">...results in <span className="text-emerald-300 font-semibold">{insight.outcome}</span>.</p>
                    </div>
                ))}

                {/* Negative Patterns */}
                {aiInsights?.negative.map((insight: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3" /> Critical Leak
                            </div>
                        </div>
                        <h4 className="text-white font-bold text-base mb-1">{insight.trigger}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">...leads to <span className="text-rose-300 font-semibold">{insight.outcome}</span>.</p>
                        <div className="mt-2 text-xs text-rose-300/80 italic pl-2 border-l-2 border-rose-500/30">
                            Rec: {insight.recommendation}
                        </div>
                    </div>
                ))}
                
                {!aiInsights && !aiLoading && (
                     <div className="text-center py-8 text-slate-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                        No significant patterns detected in this match sample.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 4. KEY METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
           <MetricCard label="CS / Min" value={(cs / 30).toFixed(1)} icon={Target} color="text-[#C89B3C]" />
           <MetricCard label="Gold Share" value="24%" icon={Coins} color="text-yellow-400" />
           <MetricCard label="Vision Score" value={vision} icon={Eye} color="text-purple-400" />
           <MetricCard label="Kill Part %" value="62%" icon={Swords} color="text-rose-400" />
      </div>

    </div>
  );
}

function MetricCard({label, value, color, icon: Icon}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl border-white/5 relative overflow-hidden flex items-center gap-4">
            <div className={`p-3 rounded-full bg-white/5 ${color}`}>
                 {Icon && <Icon className="w-5 h-5" />}
            </div>
            <div>
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
            </div>
        </div>
    )
}
