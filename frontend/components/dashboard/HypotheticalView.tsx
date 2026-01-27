'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ValorantHypotheticalView } from './ValorantHypotheticalView';
import { LolHypotheticalView } from './LolHypotheticalView';

export function HypotheticalView({ game = "VALORANT" }: { game?: string }) {
  
  return (
    <div className="h-full relative">
       {/* Background accent */}
       <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] mix-blend-screen opacity-20 pointer-events-none ${game === "LoL" ? "bg-[#C89B3C]" : "bg-red-600"}`} />

       <motion.div
        key={game}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 h-full"
      >
          {game === "LoL" ? <LolHypotheticalView /> : <ValorantHypotheticalView />}
      </motion.div>
    </div>
  );
}
