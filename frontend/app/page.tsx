'use client';

import { useState } from 'react';
import { 
  Home, 
  Sparkles,
  ListVideo, 
  BrainCircuit,
  ArrowLeft
} from 'lucide-react';
import { MinimalistDock } from '@/components/ui/minimal-dock';
import { LandingView } from '@/components/dashboard/LandingView';
import { HomeView } from '@/components/dashboard/HomeView';
import { InitializationView } from '@/components/dashboard/InitializationView';
import { InsightsView } from '@/components/dashboard/InsightsView';
import { MacroReviewView } from '@/components/dashboard/MacroReviewView';
import { HypotheticalView } from '@/components/dashboard/HypotheticalView';
import { AnimatePresence, motion } from 'framer-motion';

// Navigation Stages
enum NavStage {
  LANDING = 'LANDING',
  HOME = 'HOME',    // Game Selection Cards
  INIT = 'INIT',    // Connection Screen (Series ID)
  DASHBOARD = 'DASHBOARD'
}

type View = 'insights' | 'macro' | 'simulate';

export default function App() {
  const [stage, setStage] = useState<NavStage>(NavStage.LANDING);
  const [activeView, setActiveView] = useState<View>('insights');
  const [game, setGame] = useState<string>('VALORANT');
  const [seriesId, setSeriesId] = useState<string>('');

  const dockItems = [
    { id: 'insights', icon: Sparkles, label: 'Insights' },
    { id: 'macro', icon: ListVideo, label: 'Macro' },
    { id: 'simulate', icon: BrainCircuit, label: 'Simulate' },
  ];

  // Step 1: User selects game from Cards
  const handleGameSelect = (selectedGame: string) => {
    setGame(selectedGame);
    setStage(NavStage.INIT);
  };

  // Step 2: User connects to a series
  const handleConnect = (id: string) => {
    setSeriesId(id);
    setStage(NavStage.DASHBOARD);
    setActiveView('insights');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white selection:bg-cyan-500/30 font-sans">
      
      {/* Cinematic Background (Always Present) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:50px_50px]"></div>
        {/* Animated Orbs */}
        <div className="absolute top-0 -left-10 w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 -right-10 w-[500px] h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content Router */}
      <main className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: LANDING */}
          {stage === NavStage.LANDING && (
            <motion.div 
                key="landing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.8 }}
                className="h-full w-full"
            >
                <LandingView onEnter={() => setStage(NavStage.HOME)} />
            </motion.div>
          )}

          {/* STAGE 2: HOME (GAME SELECTION) */}
          {stage === NavStage.HOME && (
            <motion.div 
                key="home"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="h-full w-full relative"
            >
                <button 
                    onClick={() => setStage(NavStage.LANDING)}
                    className="absolute top-8 left-8 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-50"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <HomeView onSelectGame={handleGameSelect} />
            </motion.div>
          )}

          {/* STAGE 3: INITIALIZATION (CONNECT) */}
          {stage === NavStage.INIT && (
            <motion.div 
                key="init"
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
                className="h-full w-full relative"
            >
                 <InitializationView 
                    game={game}
                    onConnect={handleConnect}
                    onBack={() => setStage(NavStage.HOME)}
                 />
            </motion.div>
          )}

          {/* STAGE 4: DASHBOARD */}
          {stage === NavStage.DASHBOARD && (
            <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="h-full w-full pb-24 pt-6 px-4 md:px-8 relative"
            >
                {/* Dashboard Back Button */}
                 <button 
                    onClick={() => setStage(NavStage.HOME)}
                    className="absolute top-6 left-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Disconnect
                </button>

                <div className="h-full pt-12">
                   {activeView === 'insights' && <InsightsView game={game} seriesId={seriesId} />}
                   {activeView === 'macro' && <MacroReviewView game={game} seriesId={seriesId} />}
                   {activeView === 'simulate' && <HypotheticalView game={game} seriesId={seriesId} />}
                </div>

                {/* DOCK NAVIGATION (Only visible in Dashboard) */}
                <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
                    <div className="pointer-events-auto">
                        <MinimalistDock 
                            activeId={activeView}
                            game={game}
                            items={[
                                { 
                                    id: 'insights', 
                                    label: 'Insights', 
                                    icon: <Sparkles className="w-6 h-6" />, 
                                    onClick: () => setActiveView('insights') 
                                },
                                { 
                                    id: 'macro', 
                                    label: 'Macro', 
                                    icon: <ListVideo className="w-6 h-6" />, 
                                    onClick: () => setActiveView('macro') 
                                },
                                { 
                                    id: 'simulate', 
                                    label: 'Simulate', 
                                    icon: <BrainCircuit className="w-6 h-6" />, 
                                    onClick: () => setActiveView('simulate') 
                                }
                            ]}
                        />
                    </div>
                </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
