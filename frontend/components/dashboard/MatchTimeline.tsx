'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface Round {
  number: number;
  winner: string;
  is_critical?: boolean;
  critical_reason?: string;
  round_type?: string;
}

interface MatchTimelineProps {
  rounds: Round[];
  team1: string;
  team2: string;
  onRoundClick: (round: number) => void;
  selectedRound?: number;
}

export function MatchTimeline({ 
  rounds, 
  team1, 
  team2, 
  onRoundClick,
  selectedRound 
}: MatchTimelineProps) {
  const [hoveredRound, setHoveredRound] = useState<number | null>(null);

  return (
    <div className="relative py-12 px-2 select-none">
      {/* Team Legend */}
      <div className="absolute top-0 left-0 right-0 flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          {team1}
        </div>
        <div className="flex items-center gap-2">
          {team2}
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Main Timeline Bar */}
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/10" />
      
      {/* Rounds */}
      <div className="flex justify-between relative z-10 mx-4">
        {rounds.map((round, i) => {
          const isTeam1 = round.winner === team1;
          const isSelected = selectedRound === round.number;
          
          return (
            <motion.button
              key={round.number}
              onClick={() => onRoundClick(round.number)}
              onMouseEnter={() => setHoveredRound(round.number)}
              onMouseLeave={() => setHoveredRound(null)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: isSelected ? 1.5 : 1, 
                opacity: 1,
                y: isSelected ? -4 : 0 
              }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.5 }}
              className={`
                relative w-3 h-3 rounded-full cursor-pointer transition-colors duration-300
                ${isTeam1 ? 'bg-cyan-500' : 'bg-red-500'}
                ${round.is_critical ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}
                ${isSelected ? 'ring-4 ring-white/20' : ''}
              `}
            >
              {/* Critical indicator */}
              {round.is_critical && (
                <motion.div 
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <span className="text-yellow-400 text-[10px]">⚠️</span>
                </motion.div>
              )}
              
              {/* Tooltip */}
              {(hoveredRound === round.number || isSelected) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 16 }}
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
                >
                  <div className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border shadow-xl
                    ${round.is_critical ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200' : 'bg-slate-900/90 border-slate-700 text-slate-300'}
                  `}>
                    Round {round.number}
                    {round.critical_reason && (
                      <span className="block text-[9px] opacity-70 font-normal mt-0.5">{round.critical_reason}</span>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
