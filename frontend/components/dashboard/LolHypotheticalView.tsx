'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  Sparkles, 
  ArrowRight, 
  Swords, 
  Map, 
  TrendingUp,
  RotateCcw
} from 'lucide-react';

export function LolHypotheticalView({ seriesId, teamName }: { seriesId?: string; teamName?: string }) {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);

  // Dynamic suggestions based on team context
  const teamLabel = teamName || "we";
  const suggestions = [
    { text: `Should ${teamLabel} contest or concede Drake 3?`, icon: Swords },
    { text: `Should ${teamLabel} reset or push mid at 18:00?`, icon: RotateCcw },
    { text: `Should ${teamLabel} trade Baron for Inhib?`, icon: Map },
  ];

  const handleSimulate = async () => {
    if (!scenario) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/grid/hypothetical/lol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, team_name: teamName })
      });
      
      if (!response.ok) {
        throw new Error('API not available');
      }
      
      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      } else {
        throw new Error('No result from API');
      }
    } catch (e) {
      console.error('Hypothetical API error', e);
      setError('Simulation API not available. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 no-scrollbar pb-32">
      
      {/* Header & Context Lock */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C89B3C]/10 border border-[#C89B3C]/20 rounded-full text-[#C89B3C] font-mono text-[10px] mb-3 uppercase tracking-widest">
             <BrainCircuit className="h-3 w-3" />
             Game State Locked: 22:15 (Drake Spawning)
        </div>
        <h2 className="text-4xl font-bold tracking-tight text-white mb-2">
          Macro Simulator
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Evaluate objectve trades and macro decisions. Engine locked to current match state (LoL).
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div 
         initial={{ scale: 0.95, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.1 }}
         className="mx-auto max-w-2xl"
      >
        <div className="relative group z-20">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C] to-yellow-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur ${loading ? 'opacity-60 animate-pulse' : ''}`}></div>
            <div className="relative flex bg-black rounded-2xl border border-white/10 overflow-hidden">
                <input
                    type="text"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                    placeholder='Describe a specific decision (e.g. "What if we conceded?")'
                    disabled={loading}
                    className="flex-1 bg-transparent px-6 py-4 text-lg text-white placeholder-slate-600 focus:outline-none font-light"
                />
                <button
                    onClick={handleSimulate}
                    disabled={loading || !scenario}
                    className="px-8 bg-white/5 hover:bg-white/10 text-white font-bold border-l border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                         <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                        <ArrowRight className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>

        {/* Auto-Suggestions */}
        {!result && !loading && (
             <div className="mt-8 grid gap-3">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center mb-2">AI-Detected High Value Queries</div>
                {suggestions.map((s, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        onClick={() => { setScenario(s.text); handleSimulate(); }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#C89B3C]/30 transition-all text-left group"
                    >
                        <div className="p-2 rounded-lg bg-black/40 text-slate-400 group-hover:text-[#C89B3C] transition-colors">
                            <s.icon className="h-5 w-5" />
                        </div>
                        <span className="text-slate-300 font-medium">{s.text}</span>
                        <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-white ml-auto transition-colors transform group-hover:translate-x-1" />
                    </motion.button>
                ))}
             </div>
        )}
      </motion.div>

      {/* Results Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 max-w-4xl mx-auto"
          >
             <div className="grid md:grid-cols-2 gap-6 relative">
                 {/* Decorative Connector */}
                 <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black border border-white/20 rounded-full p-2">
                    <span className="text-xs font-bold text-slate-500">VS</span>
                 </div>

                 {/* OPTION A: ALTERNATIVE (USER QUERY) */}
                 <div className="glass-panel p-6 rounded-2xl border-rose-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Swords className="h-24 w-24 text-rose-500" />
                    </div>
                    <div className="relative z-10">
                         <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Alternative Path</div>
                         <h3 className="text-xl font-bold text-white mb-6">{result.alternative}</h3>
                         
                         <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-400">Projected Equity</div>
                                <div className="text-2xl font-bold text-slate-500">35% <span className="text-sm font-normal text-slate-600">(Coinflip)</span></div>
                            </div>
                            <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                                <div className="text-xs text-rose-300 font-mono">RISK: High - Wipe Potential</div>
                            </div>
                         </div>
                    </div>
                 </div>

                 {/* OPTION B: SUGGESTED (OPTIMAL) */}
                 <div className="glass-panel p-6 rounded-2xl border-[#C89B3C]/30 relative overflow-hidden bg-[#C89B3C]/5">
                     <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="h-24 w-24 text-[#C89B3C]" />
                    </div>
                    <div className="relative z-10">
                         <div className="text-xs font-bold text-[#C89B3C] uppercase tracking-widest mb-1 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            AI Recommendation
                         </div>
                         <h3 className="text-xl font-bold text-white mb-6">{result.suggested}</h3>
                         
                         <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-400">Win Prob Delta</div>
                                <div className="text-4xl font-black text-[#C89B3C]">{result.delta}</div>
                            </div>
                             <div>
                                <div className="text-xs text-slate-400">Macro Tradeoff</div>
                                <div className="text-lg font-bold text-white">{result.tradeoff}</div>
                            </div>
                         </div>
                    </div>
                 </div>
             </div>

             {/* Reasoning Engine Output */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 glass-panel p-6 rounded-2xl border-t-2 border-t-white/20"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/5 rounded-lg">
                        <BrainCircuit className="h-6 w-6 text-slate-300" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-2">Engine Reasoning</h4>
                        <p className="text-slate-400 leading-relaxed font-light">
                            {result.reasoning}
                        </p>
                    </div>
                </div>
            </motion.div>

             <div className="mt-8 text-center">
                 <button onClick={() => {setResult(null); setScenario("")}} className="text-slate-500 hover:text-white text-sm font-medium transition-colors">
                    Reset Simulator
                 </button>
             </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
