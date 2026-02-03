'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Link as LinkIcon, Clock, ArrowRight } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

interface InitializationViewProps {
  game: string;
  onConnect: (seriesId: string) => void;
  onBack: () => void;
}

export function InitializationView({ game, onConnect, onBack }: InitializationViewProps) {
  const [seriesId, setSeriesId] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'recent' | 'browse'>('browse');
  
  // Data State
  const [browseMatches, setBrowseMatches] = useState<any[]>([]);
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Filter State
  const [timeFilter, setTimeFilter] = useState('1m'); // ongoing, 24h, 1w, 1m
  const [teamSearch, setTeamSearch] = useState('');
  
  // Loading States
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Map game to title ID (same as dashboard.html)
  const getTitleId = () => game === 'LoL' ? 3 : 6; // 6=VALORANT, 3=LoL

  // Map filter to hours (same as dashboard.html time-range-select)
  const getHours = () => {
    switch (timeFilter) {
      case 'ongoing': return 24; // Ongoing uses short window
      case '24h': return 24;
      case '1w': return 168;
      case '1m': return 720;
      case 'all': return 720; // Cap at 30 days like dashboard.html
      default: return 168;
    }
  };

  // Fetch Logic - using the same endpoint as dashboard.html
  const fetchMatches = async (reset: boolean = false, cursor: string | null = null) => {
      const targetState = reset ? setIsFetching : setIsLoadingMore;
      targetState(true);
      
      try {
          const titleId = getTitleId();
          const hours = getHours();
          
          // Build query with optional team filter
          // Build query with optional team filter
          const API_BASE_URL = getApiUrl();
          let url = `${API_BASE_URL}/api/v1/grid/series-by-title?title_id=${titleId}&hours=${hours}&limit=20`;
          if (timeFilter === 'ongoing') {
            url += '&status=ongoing';
          }
          if (teamSearch.trim()) {
              url += `&team_name=${encodeURIComponent(teamSearch.trim())}`;
          }
          if (cursor) {
              url += `&cursor=${encodeURIComponent(cursor)}`;
          }
          const res = await fetch(url);
          
          if (res.ok) {
              const data = await res.json();
              
              // Parse exactly like dashboard.html does (lines 723-750)
              if (data.data && data.data.allSeries && data.data.allSeries.edges) {
                  const edges = data.data.allSeries.edges;
                  
                  const matches = edges.map((edge: any) => {
                      const series = edge.node;
                      const team1 = series.teams?.[0]?.baseInfo?.name || 'TBD';
                      const team2 = series.teams?.[1]?.baseInfo?.name || 'TBD';
                      const scheduled = series.startTimeScheduled;
                      const timeStr = scheduled ? new Date(scheduled).toLocaleString() : 'N/A';
                      const tournamentName = series.tournament?.name || 'Unknown Tournament';
                      
                      return {
                          id: series.id,
                          teams: `${team1} vs ${team2}`,
                          tournament: tournamentName,
                          startTime: timeStr,
                          team1_name: team1,
                          team2_name: team2
                      };
                  });
                  
                  setBrowseMatches(matches);
                  setNextCursor(null); // This endpoint doesn't use cursor-based pagination
              } else {
                  setBrowseMatches([]);
              }
          }
      } catch (e) {
          console.error("Fetch error", e);
          setBrowseMatches([]);
      } finally {
          targetState(false);
      }
  };

  // Initial Fetch & Filter/Search Change
  useEffect(() => {
    fetchMatches(true);
  }, [game, timeFilter, teamSearch]);

  // Fetch History once
  useEffect(() => {
      fetch('http://localhost:8000/api/v1/matches/recent')
          .then(res => res.json())
          .then(data => setHistoryMatches(Array.isArray(data) ? data : []))
          .catch(err => console.error("History fetch error", err));
  }, []);

  const handleConnect = (idToConnect?: string) => {
    const targetId = idToConnect || seriesId;
    if (!targetId) return;
    setLoading(true);
    setTimeout(() => onConnect(targetId), 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full relative z-20 px-4">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl glass-panel p-8 rounded-3xl relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${game === 'LoL' ? 'bg-[#C89B3C] shadow-[0_0_10px_#C89B3C]' : 'bg-[#FF4655] shadow-[0_0_10px_#FF4655]'}`}></span>
                Connect {game}
            </h2>
            <button onClick={onBack} className="text-slate-400 hover:text-white px-3 py-1 text-sm font-medium hover:bg-white/5 rounded-lg transition-colors">
                CANCEL
            </button>
        </div>

        {/* Controls Row */}
        <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-1">
            {/* Tabs */}
            <div className="flex gap-6">
                <button 
                    onClick={() => setMode('browse')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${mode === 'browse' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Browse Series
                    {mode === 'browse' && <motion.div layoutId="tab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${game === 'LoL' ? 'bg-[#C89B3C]' : 'bg-[#FF4655]'}`} />}
                </button>
                <button 
                    onClick={() => setMode('recent')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${mode === 'recent' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Recent History
                    {mode === 'recent' && <motion.div layoutId="tab" className={`absolute bottom-0 left-0 right-0 h-0.5 ${game === 'LoL' ? 'bg-[#C89B3C]' : 'bg-[#FF4655]'}`} />}
                </button>
            </div>

            {/* Filters (Only for Browse) */}
            {mode === 'browse' && (
                <div className="pb-2 flex gap-2 items-center">
                    {/* Team Preset Filter - HACKATHON: Cloud9 is the host! */}
                    <select 
                        value={teamSearch === 'Cloud9' ? 'c9' : 'all'}
                        onChange={(e) => setTeamSearch(e.target.value === 'c9' ? 'Cloud9' : '')}
                        className="bg-black/40 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                        <option value="all">All Teams</option>
                        <option value="c9">☁️ Cloud9</option>
                    </select>
                    <select 
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                        <option value="ongoing">🔴 Ongoing</option>
                        <option value="24h">Past 24 Hours</option>
                        <option value="1w">Past Week</option>
                        <option value="1m">Past Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Search team..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="bg-black/40 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1 w-28 focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                    />
                </div>
            )}
        </div>

        <div className="space-y-6">
            
            {/* LIST AREA */}
            <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden h-[300px] flex flex-col relative">
                {isFetching ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500 space-x-2">
                        <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs uppercase tracking-widest">Fetching GRID Data...</span>
                    </div>
                ) : (
                   <div className="overflow-y-auto custom-scrollbar p-2 space-y-2 flex-1">
                        {(mode === 'browse' ? browseMatches : historyMatches).length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm italic">
                                No matches found for this period.
                            </div>
                        )}
                        {(mode === 'browse' ? browseMatches : historyMatches).map((match, i) => (
                            <div 
                                key={match.id || i}
                                onClick={() => {
                                    setSeriesId(match.id || match.series_id);
                                    handleConnect(match.id || match.series_id);
                                }}
                                className="group p-4 rounded-xl bg-black/20 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10 flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                                        {match.teams || `${match.team1_name || 'Team 1'} vs ${match.team2_name || 'Team 2'}`}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                            {match.tournament || match.title || 'GRID Series'}
                                        </span>
                                        <span>•</span>
                                        <span>{match.startTime || new Date(match.match_time).toLocaleDateString() || 'Recent'}</span>
                                    </div>
                                </div>
                                <div className="text-slate-600 group-hover:text-white transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                        
                        {/* Load More Button */}
                        {mode === 'browse' && nextCursor && (
                            <button 
                                onClick={() => fetchMatches(false, nextCursor)}
                                disabled={isLoadingMore}
                                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoadingMore ? 'Loading...' : 'Load More Matches'}
                                {!isLoadingMore && <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                   </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="h-[1px] bg-white/10 flex-1"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">OR MANUAL ENTRY</span>
                <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            {/* Manual ID Input */}
            <div>
                <div className="relative group">
                    <input 
                        type="text" 
                        value={seriesId}
                        onChange={(e) => setSeriesId(e.target.value)}
                        placeholder="Paste Series ID (e.g., 2843071)..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-10 py-4 text-base font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:bg-black/40 transition-all"
                    />
                    <LinkIcon className="absolute left-4 top-4.5 w-5 h-5 text-slate-500 group-focus-within:text-cyan-500 transition-colors" />
                    
                    <button 
                        onClick={() => handleConnect()}
                        disabled={loading || !seriesId}
                        className="absolute right-2 top-2 bottom-2 px-6 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-sm border border-cyan-500/20 transition-all disabled:opacity-0"
                    >
                         CONNECT
                    </button>
                </div>
            </div>

        </div>
      </motion.div>
    </div>
  );
}
