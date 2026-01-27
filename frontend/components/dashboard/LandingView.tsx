'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export function LandingView({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full relative z-20">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-center space-y-6"
      >
        <div className="inline-block">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10 mb-2 drop-shadow-2xl">
            INTUITION
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        </div>
        
        <p className="text-xl md:text-2xl text-slate-400 font-light tracking-[0.2em] uppercase">
            Elite Esports Intelligence
        </p>

        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="mt-12 group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg tracking-wide shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.7)] transition-all flex items-center gap-2 mx-auto"
        >
            ENTER PORTAL
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 rounded-full bg-white blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
        </motion.button>
      </motion.div>

      {/* Footer Status */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 text-xs text-slate-600 font-mono tracking-widest flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM OPERATIONAL
        </div>
        <span>//</span>
        <div>V1.0.4 BUILD</div>
      </motion.div>
    </div>
  );
}
