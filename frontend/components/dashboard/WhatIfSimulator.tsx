'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatIfSimulatorProps {
  seriesId: string;
  initialRound?: number;
  onClose: () => void;
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

const PRESET_SCENARIOS = [
  { label: 'Save weapons', scenario: 'What if we saved our weapons instead of attempting the retake?' },
  { label: 'Full retake', scenario: 'What if we attempted a coordinated 5-man retake with all utility?' },
  { label: 'Exit kills', scenario: 'What if we played for exit kills and damage instead of site?' },
  { label: 'Force buy', scenario: 'What if we force bought instead of saving for a full buy?' },
];

export function WhatIfSimulator({ seriesId, initialRound, onClose }: WhatIfSimulatorProps) {
  const [scenario, setScenario] = useState('');
  const [roundNumber, setRoundNumber] = useState<number | undefined>(initialRound);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!scenario.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/grid/what-if/${seriesId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, round_number: roundNumber }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setResult(data.analysis);
      } else {
        setError(data.detail || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to analysis service');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (presetScenario: string) => {
    setScenario(presetScenario);
    setResult(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-950 border border-cyan-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🔮</span> What If Analysis
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Explore alternative decisions and their probabilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Round Selector */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Round Number (optional)</label>
          <input
            type="number"
            value={roundNumber || ''}
            onChange={(e) => setRoundNumber(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 22"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Preset Scenarios */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Quick Scenarios</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => selectPreset(preset.scenario)}
                className="px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-full text-sm text-gray-300 hover:bg-cyan-900/30 hover:border-cyan-500/50 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Input */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Your Scenario</label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="e.g., What if we had saved on round 22 instead of attempting the 3v5 retake on C-site?"
            rows={3}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !scenario.trim()}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-semibold text-white mb-6 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>🎯 Analyze Scenario</>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Situation */}
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Round {result.round_number} • Score: {result.score_state}</div>
                <div className="text-white font-medium">{result.situation}</div>
              </div>

              {/* Probability Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-red-900/30 to-gray-900 rounded-lg border border-red-500/30">
                  <div className="text-sm text-gray-400 mb-1">Action Taken</div>
                  <div className="text-white font-medium mb-2">{result.action_taken}</div>
                  <div className="text-3xl font-bold text-red-400">
                    {(result.action_probability * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">success probability</div>
                  <div className="mt-2 text-xs text-gray-500">{result.expected_value_taken}</div>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-900/30 to-gray-900 rounded-lg border border-green-500/30">
                  <div className="text-sm text-gray-400 mb-1">Alternative</div>
                  <div className="text-white font-medium mb-2">{result.alternative_action}</div>
                  <div className="text-3xl font-bold text-green-400">
                    {(result.alternative_probability * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-400">success probability</div>
                  <div className="mt-2 text-xs text-gray-500">{result.expected_value_alternative}</div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="p-4 bg-gradient-to-br from-cyan-900/30 to-gray-900 rounded-lg border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-cyan-400">💡</span>
                  <span className="text-sm font-medium text-cyan-300">Recommendation</span>
                </div>
                <div className="text-white">{result.recommendation}</div>
              </div>

              {/* Reasoning */}
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Tactical Analysis</div>
                <div className="text-gray-300 text-sm leading-relaxed">{result.reasoning}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default WhatIfSimulator;
