/**
 * Global Match Cache for Team Intuition Engine
 * Persists data across component navigation for hackathon reliability
 */

export interface MatchData {
  team1: { name: string; score: number };
  team2: { name: string; score: number };
  winner?: string;
  map?: string;
  player_states?: any[];
}

export interface KASTImpactStat {
  player_name: string;
  agent: string;
  team_name?: string;
  total_rounds: number;
  rounds_with_kast: number;
  rounds_without_kast: number;
  kast_percentage: number;
  loss_rate_without_kast: number;
  win_rate_with_kast: number;
  insight: string;
}

export interface EconomyStats {
  team_name: string;
  total_rounds: number;
  rounds_won?: number;
  rounds_lost?: number;
  win_rate?: number;
  pistol_win_rate: number;
  force_buy_win_rate: number;
  eco_conversion_rate: number;
  bonus_loss_rate: number;
  full_buy_win_rate: number;
  attack_win_rate?: number;
  defense_win_rate?: number;
  insights: string[];
}

export interface CachedSeriesData {
  matchData: MatchData | null;
  kastImpact: KASTImpactStat[];
  economyAnalysis: EconomyStats | null;
  aiReview: any | null;
  fetchedAt: number;
}

// Global in-memory cache (persists across navigation within same session)
const seriesCache: Map<string, CachedSeriesData> = new Map();

// Cache TTL: 30 minutes (for hackathon, keep data fresh-ish but persistent)
const CACHE_TTL_MS = 30 * 60 * 1000;

export function getCachedSeries(seriesId: string): CachedSeriesData | null {
  const cached = seriesCache.get(seriesId);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
    seriesCache.delete(seriesId);
    return null;
  }

  return cached;
}

export function setCachedSeries(seriesId: string, data: Partial<CachedSeriesData>): void {
  const existing = seriesCache.get(seriesId);

  seriesCache.set(seriesId, {
    matchData: data.matchData ?? existing?.matchData ?? null,
    kastImpact: data.kastImpact ?? existing?.kastImpact ?? [],
    economyAnalysis: data.economyAnalysis ?? existing?.economyAnalysis ?? null,
    aiReview: data.aiReview ?? existing?.aiReview ?? null,
    fetchedAt: Date.now(),
  });
}

export function updateCachedReview(seriesId: string, review: any): void {
  const existing = seriesCache.get(seriesId);
  if (existing) {
    existing.aiReview = review;
    existing.fetchedAt = Date.now();
  }
}

export function clearSeriesCache(seriesId?: string): void {
  if (seriesId) {
    seriesCache.delete(seriesId);
  } else {
    seriesCache.clear();
  }
}

// Check if we have valid KAST data (not empty)
export function hasValidKAST(seriesId: string): boolean {
  const cached = getCachedSeries(seriesId);
  return cached !== null && cached.kastImpact.length > 0;
}

// Check if we have valid match data (has real team names)
export function hasValidMatchData(seriesId: string): boolean {
  const cached = getCachedSeries(seriesId);
  if (!cached?.matchData) return false;

  // Check if team names are real (not defaults)
  const t1 = cached.matchData.team1.name;
  const t2 = cached.matchData.team2.name;
  return t1 !== 'Team 1' && t1 !== 'Team A' && t2 !== 'Team 2' && t2 !== 'Team B';
}
