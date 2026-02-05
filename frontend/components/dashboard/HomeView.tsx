'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  Zap,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  Crosshair,
  Eye,
  Coins,
  Activity,
  Trophy
} from 'lucide-react';

export function HomeView({ onSelectGame }: { onSelectGame: (game: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-start p-6 relative z-10 overflow-y-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12 space-y-4"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          Team Intuition
        </h1>
        <p className="text-slate-400 text-lg uppercase tracking-[0.3em] font-medium">
          Elite Coaching Operating System
        </p>
        <p className="text-slate-500 text-sm max-w-2xl mx-auto">
          AI-powered esports analytics platform delivering real-time insights,
          performance metrics, and strategic recommendations for professional teams.
        </p>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-10"
      >
        <FeatureCard icon={Brain} label="AI Analysis" value="DeepSeek" color="text-purple-400" />
        <FeatureCard icon={Activity} label="Real-Time" value="GRID Data" color="text-cyan-400" />
        <FeatureCard icon={Target} label="Precision" value="Moneyball" color="text-emerald-400" />
        <FeatureCard icon={TrendingUp} label="Insights" value="Actionable" color="text-amber-400" />
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-12">

        {/* League of Legends Card */}
        <motion.button
          onClick={() => onSelectGame('LoL')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="group relative h-[350px] w-full rounded-[28px] overflow-hidden text-left shadow-[0_0_60px_-15px_rgba(200,155,60,0.3)] transition-all duration-500 border border-[#C89B3C]/20"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#091428] via-[#0A1428] to-[#0F1F38] opacity-90" />
          <div className="absolute inset-0 bg-[url('/assets/lol-card.png')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

          {/* Stats Preview */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-xs text-[#C89B3C]">
              <Coins className="w-3 h-3" /> Gold Tracking
            </div>
            <div className="flex items-center gap-2 text-xs text-[#C89B3C]">
              <Eye className="w-3 h-3" /> Vision Control
            </div>
            <div className="flex items-center gap-2 text-xs text-[#C89B3C]">
              <Trophy className="w-3 h-3" /> Objective Analysis
            </div>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <div className="flex items-center gap-3 mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
              <span className="px-3 py-1 bg-[#C89B3C]/20 text-[#C89B3C] border border-[#C89B3C]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                MOBA
              </span>
              <span className="text-slate-300 text-xs font-mono">GRID WARPED</span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-2 group-hover:text-[#C89B3C] transition-colors duration-300">
              League of Legends
            </h2>
            <p className="text-slate-400 group-hover:text-white transition-colors duration-300 mb-4">
              Summoner's Rift Analytics
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">Role Impact</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">CS/min</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">KP%</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">Dragon Control</span>
            </div>
          </div>
        </motion.button>

        {/* VALORANT Card */}
        <motion.button
          onClick={() => onSelectGame('VALORANT')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -8, scale: 1.02 }}
          className="group relative h-[350px] w-full rounded-[28px] overflow-hidden text-left shadow-[0_0_60px_-15px_rgba(255,70,85,0.3)] transition-all duration-500 border border-[#FF4655]/20"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F1923] via-[#1A242D] to-[#0F1923] opacity-90" />
          <div className="absolute inset-0 bg-[url('/assets/valorant-card.png')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity duration-500" />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

          {/* Stats Preview */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-xs text-[#FF4655]">
              <Crosshair className="w-3 h-3" /> KAST Analysis
            </div>
            <div className="flex items-center gap-2 text-xs text-[#FF4655]">
              <Shield className="w-3 h-3" /> Economy Tracking
            </div>
            <div className="flex items-center gap-2 text-xs text-[#FF4655]">
              <Target className="w-3 h-3" /> First Blood Rate
            </div>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <div className="flex items-center gap-3 mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
              <span className="px-3 py-1 bg-[#FF4655]/20 text-[#FF4655] border border-[#FF4655]/30 rounded-full text-xs font-bold uppercase tracking-wider">
                FPS
              </span>
              <span className="text-slate-300 text-xs font-mono">GRID SERIES STATE</span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-2 group-hover:text-[#FF4655] transition-colors duration-300">
              VALORANT
            </h2>
            <p className="text-slate-400 group-hover:text-white transition-colors duration-300 mb-4">
              Tactical Shooter Intelligence
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">KAST Impact</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">ACS/ADR</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">Economy</span>
              <span className="px-2 py-1 bg-white/10 rounded text-[10px] text-slate-300">What-If AI</span>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Platform Capabilities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-5xl mb-12"
      >
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">
          Platform Capabilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CapabilityCard
            icon={Brain}
            title="AI-Powered Analysis"
            description="DeepSeek AI processes match data to identify patterns, mistakes, and strategic opportunities invisible to the human eye."
            color="purple"
          />
          <CapabilityCard
            icon={BarChart3}
            title="Moneyball Metrics"
            description="Advanced statistics that correlate with winning. KAST impact, role efficiency, and economy patterns that matter."
            color="emerald"
          />
          <CapabilityCard
            icon={Zap}
            title="Real-Time Intelligence"
            description="Live data integration with GRID Esports API for instant analysis during scrims and matches."
            color="amber"
          />
        </div>
      </motion.div>

      {/* Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-5xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-2xl p-6 border border-white/10"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-black text-white">2</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Games Supported</div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-400">GRID</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Data Source</div>
          </div>
          <div>
            <div className="text-3xl font-black text-purple-400">DeepSeek</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">AI Engine</div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">Live</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Analysis Mode</div>
          </div>
        </div>
      </motion.div>

      {/* Footer spacing */}
      <div className="h-20"></div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="glass-panel p-4 rounded-xl border border-white/5 text-center hover:border-white/10 transition-colors">
      <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Capability Card Component
function CapabilityCard({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: string }) {
  const colors: Record<string, string> = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const c = colors[color] || colors.purple;

  return (
    <div className={`p-6 rounded-2xl border ${c.split(' ').slice(1).join(' ')} bg-gradient-to-br from-white/5 to-transparent`}>
      <div className={`w-12 h-12 rounded-xl ${c.split(' ')[1]} flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${c.split(' ')[0]}`} />
      </div>
      <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
