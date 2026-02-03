import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  ArrowRight,
  Wallet,
  Crosshair,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Target,
  Clock,
  Users,
  Volume2,
  VolumeX,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { getCachedSeries } from '@/lib/matchCache';

// Voice Narration Hook
function useVoiceNarration() {
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    
    // Stop any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const stop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
    }
  };

  return { speak, stop, speaking };
}

// Typewriter Effect Hook
function useTypewriter(text: string, speed: number = 20) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return displayedText;
}

import { MatchTimeline } from './MatchTimeline';


interface ValorantHypotheticalViewProps {
  seriesId?: string;
  teamName?: string;
}

interface MatchContext {
  team1: string;
  team2: string;
  score: string;
  map: string;
  currentRound?: number;
}

interface WhatIfResult {
  round_number: number;
  score_state: string;
  situation: string;
  action_taken: string;
  action_probability: number;
  alternative_action: string;
  alternative_probability: number;
  expected_value_taken: string;
  expected_value_alternative: string;
  recommendation: string;
  reasoning: string;
}

export function ValorantHypotheticalView({ seriesId, teamName }: ValorantHypotheticalViewProps) {
  const [scenario, setScenario] = useState('');
  const [roundNumber, setRoundNumber] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [timelineData, setTimelineData] = useState<any>(null);
  
  const { speak, stop, speaking } = useVoiceNarration();

  // Speak when result loads
  useEffect(() => {
    if (result?.recommendation && voiceEnabled) {
      speak(`Analysis complete. ${result.recommendation}. ${result.reasoning}`);
    }
    return () => stop();
  }, [result, voiceEnabled]);

  // Fetch match context - use shared cache first for consistency
  useEffect(() => {
    const fetchContext = async () => {
      if (!seriesId) return;
      setLoadingContext(true);

      // Check shared cache first for consistency with MacroReviewView
      const cached = getCachedSeries(seriesId);
      if (cached?.matchData && cached.matchData.team1.name !== 'Team 1') {
        console.log('[ValorantHypotheticalView] Using cached match context');
        setMatchContext({
          team1: cached.matchData.team1.name,
          team2: cached.matchData.team2.name,
          score: `${cached.matchData.team1.score}-${cached.matchData.team2.score}`,
          map: cached.matchData.map || 'Unknown Map',
          currentRound: cached.matchData.team1.score + cached.matchData.team2.score + 1
        });
        setLoadingContext(false);
        return;
      }

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/v1/grid/series/${seriesId}`);
        if (response.ok) {
          const data = await response.json();
          const gs = data.game_state;
          if (gs) {
            setMatchContext({
              team1: gs.team_1_name || 'Team 1',
              team2: gs.team_2_name || 'Team 2',
              score: `${gs.team_1_score || 0}-${gs.team_2_score || 0}`,
              map: gs.map_name || 'Unknown Map',
              currentRound: (gs.team_1_score || 0) + (gs.team_2_score || 0) + 1
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch match context:', e);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, [seriesId]);

  // Fetch timeline data
  useEffect(() => {
    if (!seriesId) return;
    const fetchTimeline = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE_URL}/api/v1/grid/round-timeline/${seriesId}`);
        if (res.ok) {
          const data = await res.json();
          setTimelineData(data);
        }
      } catch (e) {
        console.error("Failed to fetch timeline:", e);
      }
    };
    fetchTimeline();
  }, [seriesId]);

  // Handle timeline click
  const handleRoundClick = (round: number) => {
    setRoundNumber(round);
    const scenarioText = `Analyze round ${round} decision`;
    setScenario(scenarioText);
    handleSimulate(scenarioText, round);
  };


  // Dynamic suggestions based on context and selected team
  const teamLabel = teamName || "we";
  const suggestions = matchContext ? [
    { text: `What if ${teamLabel} saved on round ${matchContext.currentRound}?`, icon: ShieldAlert, round: matchContext.currentRound },
    { text: `Should ${teamLabel} force-buy or eco at ${matchContext.score}?`, icon: Wallet, round: matchContext.currentRound },
    { text: `Analyze ${teamLabel}'s last critical round`, icon: Crosshair, round: matchContext.currentRound ? matchContext.currentRound - 1 : undefined },
  ] : [
    { text: `What if ${teamLabel} saved instead of forcing?`, icon: ShieldAlert, round: undefined },
    { text: `${teamLabel} Force-Buy vs Eco on low economy`, icon: Wallet, round: undefined },
    { text: `Should ${teamLabel} rotate A or commit B?`, icon: Crosshair, round: undefined },
  ];

  const handleSimulate = async (scenarioText?: string, round?: number) => {
    const targetScenario = scenarioText || scenario;
    if (!targetScenario) return;
    
    stop(); // Stop any existing speech
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Use context-aware endpoint if seriesId available, otherwise fallback to generic
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const endpoint = seriesId
        ? `${API_BASE_URL}/api/v1/grid/what-if/${seriesId}`
        : `${API_BASE_URL}/api/v1/grid/hypothetical/valorant`;
      
      const body = seriesId
        ? { scenario: targetScenario, round_number: round || roundNumber, team_name: teamName }
        : { scenario: targetScenario, team_name: teamName };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error('API not available');
      }
      
      const data = await response.json();
      
      // Handle both endpoint response formats
      if (seriesId && data.analysis) {
        setResult(data.analysis);
      } else if (data.result) {
        // Convert generic endpoint format to WhatIfResult format
        setResult({
          round_number: 0,
          score_state: matchContext?.score || 'Unknown',
          situation: data.result.alternative || targetScenario,
          action_taken: data.result.alternative,
          action_probability: 0.35,
          alternative_action: data.result.suggested,
          alternative_probability: 0.55,
          expected_value_taken: 'Low probability outcome',
          expected_value_alternative: data.result.impact,
          recommendation: `${data.result.suggested} (${data.result.delta})`,
          reasoning: data.result.reasoning
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      console.error('Hypothetical API error', e);
      setError('Simulation API not available. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const typedReasoning = useTypewriter(result?.reasoning || '', 15);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 no-scrollbar pb-32">
      
      {/* Header & Context Lock */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >

        {/* Match Timeline (New) */}
        {timelineData && timelineData.rounds && timelineData.rounds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 mb-8"
          >
            <MatchTimeline
              rounds={timelineData.rounds}
              team1={timelineData.team_1 || 'Team 1'}
              team2={timelineData.team_2 || 'Team 2'}
              onRoundClick={handleRoundClick}
              selectedRound={roundNumber}
            />
          </motion.div>
        )}

        {/* Dynamic Context Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 font-mono text-[10px] uppercase tracking-widest">
            <BrainCircuit className="h-3 w-3" />
            {loadingContext ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading Context...
              </span>
            ) : matchContext ? (
              <span>
                {matchContext.team1} vs {matchContext.team2} | {matchContext.map} | Score: {matchContext.score}
              </span>
            ) : seriesId ? (
              <span>Series: {seriesId.slice(0, 8)}...</span>
            ) : (
              <span>No Match Connected - Using Generic Analysis</span>
            )}
          </div>
          
          <div className="relative">
             <h2 className="text-4xl font-bold tracking-tight text-white mb-2">
              What-If Simulator
            </h2>
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`absolute top-1/2 -right-12 -translate-y-1/2 p-2 rounded-full transition-colors ${voiceEnabled ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}
              title={voiceEnabled ? "Mute Voice Analysis" : "Enable Voice Analysis"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="text-slate-400 max-w-lg mx-auto text-sm mt-2">
          {seriesId 
            ? "Analyze alternative decisions with actual match context. Engine uses real game state."
            : "Evaluate tactical decisions. Connect to a match for context-aware analysis."
          }
        </p>
      </motion.div>

      {/* Round Number Input (only when seriesId available) */}
      {seriesId && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto max-w-2xl mb-4"
        >
          <div className="flex items-center justify-center gap-4">
            <label className="text-slate-400 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Analyze Round:
            </label>
            <input 
              type="number"
              min={1}
              max={25}
              value={roundNumber || ''}
              onChange={(e) => setRoundNumber(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder={matchContext?.currentRound?.toString() || "Round #"}
              className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-red-500/50"
            />
          </div>
        </motion.div>
      )}

      {/* Input Section */}
      <motion.div 
         initial={{ scale: 0.95, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.1 }}
         className="mx-auto max-w-2xl"
      >
        <div className="relative group z-20">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur ${loading ? 'opacity-60 animate-pulse' : ''}`}></div>
            <div className="relative flex bg-black rounded-2xl border border-white/10 overflow-hidden">
                <input
                    type="text"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                    placeholder={matchContext 
                      ? `"What if ${matchContext.team1} saved on round ${matchContext.currentRound}?"`
                      : 'Describe a specific decision (e.g. "What if we saved?")'
                    }
                    disabled={loading}
                    className="flex-1 bg-transparent px-6 py-4 text-lg text-white placeholder-slate-600 focus:outline-none font-light"
                />
                <button
                    onClick={() => handleSimulate()}
                    disabled={loading || !scenario}
                    className="px-8 bg-white/5 hover:bg-white/10 text-white font-bold border-l border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                         <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ArrowRight className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>

        {/* Auto-Suggestions */}
        {!result && !loading && (
             <div className="mt-8 grid gap-3">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center mb-2">
                  {seriesId ? 'Context-Aware Scenarios' : 'Example Scenarios'}
                </div>
                {suggestions.map((s, i) => (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        onClick={() => { 
                          setScenario(s.text); 
                          setRoundNumber(s.round);
                          handleSimulate(s.text, s.round); 
                        }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-red-500/30 transition-all text-left group"
                    >
                        <div className="p-2 rounded-lg bg-black/40 text-slate-400 group-hover:text-red-400 transition-colors">
                            <s.icon className="h-5 w-5" />
                        </div>
                        <span className="text-slate-300 font-medium">{s.text}</span>
                        <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-white ml-auto transition-colors transform group-hover:translate-x-1" />
                    </motion.button>
                ))}
             </div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center"
          >
            <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
            {error}
          </motion.div>
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
             {/* Context Badge */}
             {seriesId && result.round_number > 0 && (
               <div className="text-center mb-6">
                 <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-slate-300 text-sm">
                   <Target className="h-4 w-4 text-red-400" />
                   Round {result.round_number} | Score: {result.score_state}
                 </span>
               </div>
             )}

             <div className="grid md:grid-cols-2 gap-6 relative">
                 {/* Decorative Connector */}
                 <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black border border-white/20 rounded-full p-2">
                    <span className="text-xs font-bold text-slate-500">VS</span>
                 </div>

                 {/* OPTION A: ACTION TAKEN (or User Query) */}
                 <div className="glass-panel p-6 rounded-2xl border-red-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Crosshair className="h-24 w-24 text-red-500" />
                    </div>
                    <div className="relative z-10">
                         <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Action Taken</div>
                         <h3 className="text-xl font-bold text-white mb-6">{result.action_taken || result.situation}</h3>
                         
                         <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Success Probability</div>
                                <div className="flex items-end gap-2 mb-2">
                                  <motion.div 
                                    className="text-3xl font-bold text-red-400"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.8 }}
                                  >
                                    {(result.action_probability * 100).toFixed(0)}%
                                  </motion.div>
                                  <span className="text-sm text-slate-500 mb-1">
                                    {result.action_probability < 0.4 ? '(Unfavorable)' : result.action_probability > 0.6 ? '(Good)' : '(Risky)'}
                                  </span>
                                </div>
                                <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.action_probability * 100}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                  />
                                </div>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                <div className="text-xs text-red-300 font-mono">{result.expected_value_taken}</div>
                            </div>
                         </div>
                    </div>
                 </div>

                 {/* OPTION B: ALTERNATIVE (OPTIMAL) */}
                 <motion.div 
                   className="glass-panel p-6 rounded-2xl border-emerald-500/30 relative overflow-hidden bg-emerald-500/5"
                   animate={{
                     boxShadow: [
                       '0 0 20px rgba(16, 185, 129, 0.1)',
                       '0 0 40px rgba(16, 185, 129, 0.2)',
                       '0 0 20px rgba(16, 185, 129, 0.1)',
                     ]
                   }}
                   transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                 >

                     <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldAlert className="h-24 w-24 text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                         <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <SparklesIcon className="w-3 h-3 animate-pulse" />
                            AI Recommendation
                         </div>
                         <h3 className="text-xl font-bold text-white mb-6">{result.alternative_action}</h3>
                         
                         <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Success Probability</div>
                                <div className="flex items-end gap-2 mb-2">
                                  <motion.div 
                                    className="text-3xl font-bold text-emerald-400"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.8 }}
                                  >
                                    {(result.alternative_probability * 100).toFixed(0)}%
                                  </motion.div>
                                  <span className="text-sm text-slate-500 mb-1">
                                    (+{((result.alternative_probability - result.action_probability) * 100).toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.alternative_probability * 100}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                  />
                                </div>
                            </div>
                             <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <div className="text-xs text-emerald-300 font-mono">{result.expected_value_alternative}</div>
                            </div>
                         </div>
                    </div>
                 </motion.div>
             </div>

             {/* Recommendation Banner */}
             <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20 text-center relative overflow-hidden group"
             >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                 <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Verdict</div>
                 <div className="text-lg font-bold text-white">{result.recommendation}</div>
             </motion.div>

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
                        <p className="text-slate-400 leading-relaxed font-light min-h-[4rem]">
                            {typedReasoning}
                            <motion.span 
                              animate={{ opacity: [1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="inline-block w-1.5 h-4 bg-red-400/50 ml-1 align-middle"
                            />
                        </p>
                    </div>
                </div>
            </motion.div>

             <div className="mt-8 text-center">
                 <button onClick={() => {setResult(null); setScenario("");}} className="text-slate-500 hover:text-white text-sm font-medium transition-colors">
                    Reset Simulator
                 </button>
             </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
