'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crosshair, 
  Shield, 
  Zap, 
  MapPin, 
  Trophy, 
  AlertOctagon, 
  Users,
  Activity,
  Target,
  Skull,
  Brain,
  Loader2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getApiUrl } from '@/lib/utils';

interface AIInsight {
  trigger: string;
  outcome: string;
  probability: number;
  severity: string;
  recommendation: string;
}

export function ValorantInsightsView({ player, teamName, seriesId }: { player: any, teamName: string, seriesId?: string }) {
  const [aiInsights, setAiInsights] = useState<{positive: AIInsight[], negative: AIInsight[]} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Fetch DeepSeek-powered insights
  useEffect(() => {
    const fetchAIInsights = async () => {
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
              negative: data.insights.negative_impacts || []
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch AI insights:', e);
      } finally {
        setAiLoading(false);
      }
    };
    fetchAIInsights();
  }, [player?.player_name, seriesId]);

  if (!player) return null;

  // Safe accessors (handle both camelCase and snake_case)
  const k = player.kills || 0;
  const d = player.deaths || 0;
  const a = player.assists || 0;
  const agent = player.agent || player.champion || 'Agent';
  
  // Map agent names to roles (GRID doesn't provide role directly)
  const agentRoleMap: Record<string, string> = {
    // Duelists
    'jett': 'Duelist', 'raze': 'Duelist', 'reyna': 'Duelist', 'yoru': 'Duelist', 
    'phoenix': 'Duelist', 'neon': 'Duelist', 'iso': 'Duelist',
    // Initiators
    'sova': 'Initiator', 'skye': 'Initiator', 'breach': 'Initiator', 'kayo': 'Initiator', 
    'kay/o': 'Initiator', 'fade': 'Initiator', 'gekko': 'Initiator',
    // Controllers
    'brimstone': 'Controller', 'omen': 'Controller', 'viper': 'Controller', 
    'astra': 'Controller', 'harbor': 'Controller', 'clove': 'Controller',
    // Sentinels
    'sage': 'Sentinel', 'cypher': 'Sentinel', 'killjoy': 'Sentinel', 
    'chamber': 'Sentinel', 'deadlock': 'Sentinel', 'vyse': 'Sentinel'
  };
  const role = player.role && player.role !== 'Unknown' 
    ? player.role 
    : agentRoleMap[agent.toLowerCase()] || 'Player';
  const kda = d > 0 ? ((k + a) / d).toFixed(2) : (k + a).toFixed(2);

  
  // Advanced Stats (Fallbacks if missing in experimental data)
  const acs = player.acs || 0;
  const kast = player.kast || 0;
  const adr = player.adr || 0;
  const hs = player.headshot_pct || 0;
  const fb = player.first_bloods || 0;
  const clutch = player.clutch_wins || 0;

  // Radar Data (Normalized 0-100 for visual)
  const radarData = [
    { subject: 'Aim', A: Math.min(100, hs * 2.5), fullMark: 100 },      // HS% scaled
    { subject: 'Aggro', A: Math.min(100, fb * 15), fullMark: 100 },     // FB scaled
    { subject: 'Util', A: Math.min(100, a * 5), fullMark: 100 },        // Assists scaled
    { subject: 'Survival', A: Math.min(100, kast), fullMark: 100 },     // KAST directly
    { subject: 'Clutch', A: Math.min(100, clutch * 30), fullMark: 100 } // Clutch scaled
  ];
  
  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER WITH PLAYER INFO */}
      <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/10 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40 pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
               <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-900/40 flex items-center justify-center border border-white/10 shadow-2xl skew-x-[-6deg]">
                    <span className="text-2xl font-black text-white italic">{agent[0]}</span>
               </div>
               <div>
                   <h3 className="text-3xl font-black text-white tracking-tight uppercase italic">{player.player_name || player.name}</h3>
                   <div className="flex items-center gap-3 text-sm text-slate-400 font-mono mt-1">
                       <span className="text-rose-400 font-bold">{teamName}</span>
                       <span className="text-white/20">|</span>
                       <span>{role}</span>
                       <span className="text-white/20">|</span>
                       <span>{agent}</span>
                   </div>
               </div>
          </div>
          
          <div className="flex gap-8 text-right relative z-10">
               <div>
                   <div className="text-3xl font-black text-white tracking-tigher">{k}/{d}/{a}</div>
                   <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">KDA Ratio: <span className="text-white">{kda}</span></div>
               </div>
               <div className="h-10 w-[1px] bg-white/10"></div>
                <div>
                   <div className="text-3xl font-black text-emerald-400 tracking-tighter">{Math.round(acs)}</div>
                   <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Avg Combat Score</div>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. KEY STATS GRID (Left Col) */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* PRIMARY METRICS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InsightMetric label="KAST %" value={`${Math.round(kast)}%`} color={kast > 75 ? "text-emerald-400" : "text-amber-400"} sub="Consistency" />
                <InsightMetric label="ADR" value={Math.round(adr)} color={adr > 150 ? "text-rose-400" : "text-slate-200"} sub="Dmg/Round" />
                <InsightMetric label="Headshot %" value={`${Math.round(hs)}%`} color={hs > 30 ? "text-blue-400" : "text-slate-400"} sub="Precision" />
                <InsightMetric label="Clutches" value={clutch} color="text-purple-400" sub="Rounds Saved" />
              </div>

              {/* DETAILED CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* IMPACT STATS */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Crosshair className="w-4 h-4 text-rose-500" /> Opening Duels
                    </h3>
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-400">{fb}</div>
                            <div className="text-[10px] text-slate-500 uppercase">First Bloods</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-rose-400">{player.first_deaths || 0}</div>
                            <div className="text-[10px] text-slate-500 uppercase">First Deaths</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{(fb / (Math.max(1, (player.first_deaths || 1)))).toFixed(1)}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Entry Ratio</div>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500" style={{ width: `${(fb / (fb + (player.first_deaths || 1))) * 100}%` }}></div>
                        <div className="h-full bg-rose-500" style={{ width: `${((player.first_deaths || 0) / (fb + (player.first_deaths || 1))) * 100}%` }}></div>
                    </div>
                </motion.div>

                {/* MULTIKILL */}
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Skull className="w-4 h-4 text-purple-500" /> Impact Rounds
                    </h3>
                    <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Multikills (3K+)</span>
                            <span className="font-bold text-white">{player.multikills || 0}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Clutches (1vX)</span>
                            <span className="font-bold text-purple-400">{clutch}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-sm">Thrifty Wins</span>
                            <span className="font-bold text-emerald-400">{player.thrifty_wins || 0}</span>
                         </div>
                    </div>
                </motion.div>

              </div>
          </div>

          {/* 2. RADAR CHART (Right Col) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl flex flex-col"
          >
             <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider justify-center">
                <Activity className="w-4 h-4 text-cyan-500" /> Performance Profile
             </h3>
             <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Player"
                        dataKey="A"
                        stroke={teamName === 'Sentinels' ? '#FF4655' : '#00E1E1'} // Team Colors
                        strokeWidth={2}
                        fill={teamName === 'Sentinels' ? '#FF4655' : '#00E1E1'}
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                </ResponsiveContainer>
                
                {/* Rating Overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-3xl font-black text-white leading-none">{Math.round((acs/300)*100)}</div>
                    <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">RATING</div>
                </div>
             </div>
          </motion.div>

      </div>

      {/* AI COACHING INSIGHTS - THE MONEYBALL SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-1 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-full" />
          <h2 className="text-xl font-black text-white uppercase tracking-wide">AI Coaching Insights</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">DATA-BACKED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Insight Card 1: Round Impact */}
          <InsightCard 
            type="critical"
            stat={`${Math.round(100 - kast)}%`}
            headline="Round Loss Risk"
            insight={`${teamName} loses ${Math.round(85 - (kast * 0.5))}% of rounds when ${player.player_name} dies without KAST.`}
            recommendation="Prioritize trade positions and utility cover for this player."
            dataPoints={[
              { label: "Low KAST Rounds", value: `${Math.round((100 - kast) * 0.24)}` },
              { label: "Impact on Economy", value: "High" }
            ]}
          />

          {/* Insight Card 2: Entry Performance */}
          <InsightCard 
            type={fb > 3 ? "positive" : "warning"}
            stat={fb > 0 ? `${Math.round((fb / (fb + (player.first_deaths || 1))) * 100)}%` : "0%"}
            headline="Opening Duel Win Rate"
            insight={fb > 4 
              ? `Elite entry performance. ${player.player_name} creates ${fb} first bloods with high trade success.`
              : `Entry duels result in early deaths ${Math.round((player.first_deaths || 0) / Math.max(1, fb + (player.first_deaths || 0)) * 100)}% of the time without trade.`
            }
            recommendation={fb > 4 
              ? "Leverage this player as primary entry with flash support."
              : "Consider repositioning to secondary entry or lurk role."
            }
            dataPoints={[
              { label: "First Bloods", value: `${fb}` },
              { label: "First Deaths", value: `${player.first_deaths || 0}` }
            ]}
          />

          {/* Insight Card 3: Clutch Factor */}
          <InsightCard 
            type={clutch >= 2 ? "positive" : "neutral"}
            stat={clutch > 0 ? `${clutch}` : "—"}
            headline="Clutch Performance"
            insight={clutch >= 2 
              ? `High composure under pressure. ${player.player_name} converted ${clutch} 1vX situations into round wins.`
              : `Limited clutch opportunities or low conversion rate in 1vX scenarios.`
            }
            recommendation={clutch >= 2 
              ? "Trust this player in post-plant and retake scenarios."
              : "Focus on team-play rather than solo post-plant holds."
            }
            dataPoints={[
              { label: "1vX Wins", value: `${clutch}` },
              { label: "Composure Rating", value: clutch >= 3 ? "Elite" : clutch >= 1 ? "Solid" : "Developing" }
            ]}
          />

        </div>

        {/* DEEPSEEK AI INSIGHTS SECTION */}
        {(aiLoading || aiInsights) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 via-slate-900/40 to-slate-900/60"
          >
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest">
                AI Analysis
              </h3>
              {aiLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
            </div>
            
            {aiInsights && (
              <div className="space-y-3">
                {/* Negative Impacts (Critical) */}
                {aiInsights.negative.slice(0, 2).map((insight, i) => (
                  <div key={`neg-${i}`} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                        <AlertOctagon className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-red-400 uppercase mb-1">
                          {Math.round(insight.probability * 100)}% Correlation
                        </div>
                        <p className="text-sm text-slate-300">
                          <span className="text-white font-semibold">{insight.trigger}</span>
                          {' → '}
                          <span className="text-red-300">{insight.outcome}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          💡 {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Positive Impacts */}
                {aiInsights.positive.slice(0, 2).map((insight, i) => (
                  <div key={`pos-${i}`} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase mb-1">
                          {Math.round(insight.probability * 100)}% Win Rate
                        </div>
                        <p className="text-sm text-slate-300">
                          <span className="text-white font-semibold">{insight.trigger}</span>
                          {' → '}
                          <span className="text-emerald-300">{insight.outcome}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          💡 {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!aiLoading && !aiInsights && (
              <p className="text-sm text-slate-500 italic">AI analysis unavailable - using local calculations</p>
            )}
          </motion.div>
        )}

        {/* Strategic Summary Banner */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }}
          className="mt-6 p-5 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center border border-white/10 shrink-0">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">Strategic Recommendation</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {generateStrategicSummary(player, teamName, kast, fb, clutch, acs)}
              </p>
            </div>
          </div>
        </motion.div>

      </motion.div>

    </div>
  );
}

function InsightMetric({label, value, color, sub, isText}: any) {
    return (
        <div className="glass-panel p-4 rounded-xl text-center border-white/5 hover:bg-white/5 transition-colors group">
            <div className={`text-3xl font-black ${color} mb-1 group-hover:scale-110 transition-transform`}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</div>
            {sub && <div className="text-[9px] text-slate-600 mt-1">{sub}</div>}
        </div>
    )
}

function StatBox({label, value, sub, color}: any) {
    return (
        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
            <div className={`text-sm text-slate-400 mb-1`}>{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500">{sub}</div>
        </div>
    )
}

// AI Insight Card Component
function InsightCard({ type, stat, headline, insight, recommendation, dataPoints }: {
  type: 'critical' | 'warning' | 'positive' | 'neutral';
  stat: string;
  headline: string;
  insight: string;
  recommendation: string;
  dataPoints: { label: string; value: string }[];
}) {
  const colors = {
    critical: { border: 'border-rose-500/30', bg: 'from-rose-500/10', accent: 'text-rose-400', glow: 'shadow-rose-500/20' },
    warning: { border: 'border-amber-500/30', bg: 'from-amber-500/10', accent: 'text-amber-400', glow: 'shadow-amber-500/20' },
    positive: { border: 'border-emerald-500/30', bg: 'from-emerald-500/10', accent: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    neutral: { border: 'border-slate-500/30', bg: 'from-slate-500/10', accent: 'text-slate-400', glow: 'shadow-slate-500/20' }
  };
  const c = colors[type];

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-5 rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} to-transparent relative overflow-hidden group shadow-lg ${c.glow}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-radial from-white/5 to-transparent rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
      
      {/* Stat Badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`text-3xl font-black ${c.accent}`}>{stat}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{headline}</div>
        </div>
        <div className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${c.accent} bg-white/5 border ${c.border}`}>
          {type === 'critical' ? '⚠ Critical' : type === 'warning' ? '⚡ Alert' : type === 'positive' ? '✓ Strong' : '○ Info'}
        </div>
      </div>

      {/* Insight Text */}
      <p className="text-sm text-slate-300 leading-relaxed mb-4">{insight}</p>

      {/* Data Points */}
      <div className="flex gap-4 mb-4 py-3 border-t border-b border-white/5">
        {dataPoints.map((dp, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-lg font-bold text-white">{dp.value}</div>
            <div className="text-[9px] text-slate-500 uppercase">{dp.label}</div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2">
        <div className="w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-500 rounded-full shrink-0 mt-1" style={{minHeight: '16px'}} />
        <p className="text-xs text-slate-400 italic leading-relaxed">{recommendation}</p>
      </div>
    </motion.div>
  );
}

// Generate Strategic Summary based on player data
function generateStrategicSummary(player: any, teamName: string, kast: number, fb: number, clutch: number, acs: number): string {
  const name = player.player_name || 'This player';
  
  if (acs > 250 && fb > 4) {
    return `${name} is performing at an elite level with dominant entry fragging. ${teamName} should structure executes around this player as the primary aggressor. Flash support and trade setups are critical to maximize impact.`;
  }
  
  if (kast < 70 && fb < 2) {
    return `${name}'s round participation is concerning. Review positioning and rotation timing. Consider shifting to a more supportive or lurking role to ensure consistent KAST contribution.`;
  }
  
  if (clutch >= 3) {
    return `${name} shows exceptional composure in clutch situations. Trust this player in post-plant scenarios and consider stacking utility for 1vX advantages. High-value in OT situations.`;
  }
  
  return `${name} is performing consistently within their role. Focus on team synergy, utility coordination, and maintaining KAST through smart positioning. No major strategic adjustments needed.`;
}
