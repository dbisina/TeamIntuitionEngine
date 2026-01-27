'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function HomeView({ onSelectGame }: { onSelectGame: (game: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 relative z-10">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 space-y-4"
      >
        <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Team Intuition
        </h1>
        <p className="text-slate-400 text-lg uppercase tracking-[0.3em] font-medium">
          Elite Coaching Operating System
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl">

        {/* League of Legends Card */}
        <motion.button
          onClick={() => onSelectGame('LoL')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -10, scale: 1.02 }}
          className="group relative h-[400px] w-full rounded-[32px] overflow-hidden text-left shadow-[0_0_60px_-15px_rgba(200,155,60,0.3)] transition-all duration-500"
        >
          {/* Background Image */}
          <div className="absolute inset-0 bg-[url('/assets/lol-card.png')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-10 w-full">
            <div className="flex items-center gap-3 mb-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
              <span className="px-3 py-1 bg-[#C89B3C]/20 text-[#C89B3C] border border-[#C89B3C]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                MOBA
              </span>
              <span className="text-slate-300 text-xs font-mono">GRID WARPED</span>
            </div>
            
            <h2 className="text-5xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition-colors duration-300">
              League of Legends
            </h2>
            <p className="text-slate-400 group-hover:text-white transition-colors duration-300">
              Summoner's Rift Analytics
            </p>
          </div>
        </motion.button>

        {/* VALORANT Card */}
        <motion.button
          onClick={() => onSelectGame('VALORANT')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -10, scale: 1.02 }}
          className="group relative h-[400px] w-full rounded-[32px] overflow-hidden text-left shadow-[0_0_60px_-15px_rgba(255,70,85,0.3)] transition-all duration-500"
        >
          {/* Background Image */}
          <div className="absolute inset-0 bg-[url('/assets/valorant-card.png')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-10 w-full">
            <div className="flex items-center gap-3 mb-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
              <span className="px-3 py-1 bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                FPS
              </span>
              <span className="text-slate-300 text-xs font-mono">GRID SERIES STATE</span>
            </div>
            
            <h2 className="text-5xl font-bold text-white mb-2 group-hover:text-[#FF4655] transition-colors duration-300">
              VALORANT
            </h2>
            <p className="text-slate-400 group-hover:text-white transition-colors duration-300">
              Tactical Shooter Intelligence
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
