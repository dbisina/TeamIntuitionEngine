"""
LoL Stats Processor for Team Intuition Engine.
Calculates advanced "Moneyball" metrics from raw match data.
"""
import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict

from ..models.lol import (
    Match, GameState, PlayerState, TimelineEvent, 
    ExpandedPlayerStats, LoLTeamMetrics
)

logger = logging.getLogger(__name__)

class LoLStatsProcessor:
    """
    Processor for calculating advanced League of Legends metrics.
    Focuses on efficiency, impact, and objective control.
    """

    def process_match_stats(
        self, 
        match: Match, 
        game_state: Optional[GameState] = None,
        timeline: Optional[List[TimelineEvent]] = None
    ) -> Dict[str, Any]:
        """
        Process a match and return calculated stats for all players and teams.
        """
        # 1. Calculate Player Stats
        player_stats = self._calculate_player_stats(match, game_state)
        
        # 2. Calculate Team Metrics
        team_metrics = self._calculate_team_metrics(match, game_state, timeline)
        
        return {
            "player_stats": player_stats,
            "team_metrics": team_metrics
        }

    def _calculate_player_stats(
        self, 
        match: Match, 
        game_state: Optional[GameState]
    ) -> List[ExpandedPlayerStats]:
        """Calculate detail stats for each player."""
        stats_list = []
        
        # Calculate totals for shares
        total_team_dmg = defaultdict(int)
        total_team_gold = defaultdict(int)
        total_team_kills = defaultdict(int)
        
        if game_state:
            for p in game_state.player_states:
                # Fallback for team name logic if missing in sparse data
                team = p.team_name or ("Blue" if match.players and match.players[0].name == p.player_name else "Red")
                total_team_dmg[team] += p.damage_dealt
                total_team_gold[team] += p.gold
                total_team_kills[team] += p.kills

        # Iterate through players (prefer game_state for recent data, fallback to match.players)
        # We need to map match players to game_state players if possible
        
        if game_state:
            players_to_process = game_state.player_states
        else:
            # Create mock PlayerStates from match.players for fallback processing
            players_to_process = []
            for p in match.players:
                # Mock state from match summary
                p_state = PlayerState(
                    player_name=p.name,
                    champion=p.champion,
                    team_name=p.team,
                    role=p.role,
                    gold=p.stats.gold_earned if p.stats else 0,
                    level=18, # Assume max level used for simple review
                    vision_score=p.stats.vision_score if p.stats else 0,
                    kills=p.stats.kills if p.stats else 0,
                    deaths=p.stats.deaths if p.stats else 0,
                    assists=p.stats.assists if p.stats else 0,
                    damage_dealt=p.stats.total_damage_dealt_to_champions if p.stats else 0,
                    # Fallbacks for required fields
                    acs=0.0, kast=0.0, adr=0.0
                )
                # Inject raw stats back into p_state dynamically if needed or rely on above
                p_state.cs = p.stats.total_minions_killed if p.stats else 0
                players_to_process.append(p_state)

        for p_state in players_to_process:
            team = p_state.team_name or "Unknown"
            
            # Core Stats
            duration_min = max(1, match.duration_seconds / 60)
            
            # Handle potential missing attributes safely
            cs = getattr(p_state, 'cs', 0)
            cs_min = cs / duration_min 
            gold = getattr(p_state, 'gold', 0)
            gold_min = gold / duration_min
            level = getattr(p_state, 'level', 1)
            xp_min = (level * 1000) / duration_min # Rough estimate linear xp
            
            kills = getattr(p_state, 'kills', 0)
            deaths = getattr(p_state, 'deaths', 0)
            assists = getattr(p_state, 'assists', 0)
            
            kda_val = (kills + assists) / max(1, deaths)
            kda_str = f"{kills}/{deaths}/{assists}"
            
            # Impact Stats
            team_kills = max(1, total_team_kills[team])
            # If totals are 0, re-agg from this list (since we skipped the first pass if game_state was None)
            if team_kills == 1 and not game_state: 
                 # Quick sum for this fallback path
                 team_kills = sum(ps.kills for ps in players_to_process if ps.team_name == team)
                 total_team_dmg[team] = sum(ps.damage_dealt for ps in players_to_process if ps.team_name == team)
                 total_team_gold[team] = sum(ps.gold for ps in players_to_process if ps.team_name == team)
                 team_kills = max(1, team_kills)

            kp_percent = ((kills + assists) / team_kills) * 100
            
            dmg_dealt = getattr(p_state, 'damage_dealt', 0)
            team_dmg = max(1, total_team_dmg[team])
            dmg_share = (dmg_dealt / team_dmg) * 100
            
            team_gold = max(1, total_team_gold[team])
            gold_share = (gold / team_gold) * 100
            
            # Moneyball / Proprietary Stats (Calculated heuristics)
            
            # Survival Rating: Penalize deaths, reward KAST-like behavior
            # Simple heuristic: KDA * 10 + Level * 5 - Deaths * 15
            survival = (kda_val * 10) + (level * 2) - (deaths * 5)
            survival = max(0, min(100, survival)) # Clamp 0-100
            
            # Laning Score: Heuristic based on Gold/XP vs Time
            # Baseline: 350 GPM is average. 
            laning_score = (gold_min / 350) * 50 + (xp_min / 400) * 50
            laning_score = max(0, min(100, laning_score))
            
            vis_score = getattr(p_state, 'vision_score', 0)

            stats = ExpandedPlayerStats(
                player_name=p_state.player_name,
                champion=p_state.champion,
                role=p_state.role,
                team_name=team,
                kda=kda_str,
                cs_per_min=round(cs_min, 1),
                gold_per_min=round(gold_min, 1),
                xp_per_min=round(xp_min, 1),
                kp_percent=round(kp_percent, 1),
                dmg_share=round(dmg_share, 1),
                gold_share=round(gold_share, 1),
                vision_score_per_min=round(vis_score / duration_min, 2),
                isolated_deaths=int(deaths * 0.3), # Mock heuristic: 30% of deaths are isolated
                forward_percentage=30.0 + (5.0 if p_state.role in ['Top', 'Mid'] else 0.0), # Mock
                objective_participation=kp_percent * 0.8, # Correlation heuristic
                laning_score=round(laning_score, 1),
                survival_rating=round(survival, 1)
            )
            stats_list.append(stats)
            
        return stats_list

    def _calculate_team_metrics(
        self,
        match: Match,
        game_state: Optional[GameState],
        timeline: Optional[List[TimelineEvent]]
    ) -> LoLTeamMetrics:
        """Calculate aggregated team metrics."""
        
        metrics = LoLTeamMetrics()
        
        # Use game_state if available, else derive from match
        if game_state:
             # Just use final game state for "current" metrics as a proxy
             duration = max(1, match.duration_seconds/60)
             metrics.gold_diff_15 = int(game_state.gold_difference * (15 / duration)) if duration > 15 else game_state.gold_difference
             
             obj = game_state.objective_state
             total_drags = sum(obj.dragons_secured.values())
             secured_drags = obj.dragons_secured.get('blue', 0) # Default to Blue/Team1 perspective
             metrics.dragon_control_rate = (secured_drags / max(1, total_drags)) * 100
             
             total_vis = sum(p.vision_score for p in game_state.player_states if p.team_name == "Blue" or p.team_name == match.players[0].name)
        else:
             # Fallback to match summary data
             duration = max(1, match.duration_seconds/60)
             # Rough heuristic for gold diff since we don't have timeline
             # We can sum gold by team
             blue_gold = sum(p.stats.gold_earned for p in match.players if p.team == 'blue')
             red_gold = sum(p.stats.gold_earned for p in match.players if p.team == 'red')
             gold_diff = blue_gold - red_gold
             metrics.gold_diff_15 = int(gold_diff * (15 / duration))
             
             # Vision
             total_vis = sum(p.stats.vision_score for p in match.players if p.team == 'blue')
             if total_vis == 0:
                 # Try first team name found
                 first_team = match.players[0].team
                 total_vis = sum(p.stats.vision_score for p in match.players if p.team == first_team)

        metrics.vision_score_per_minute = round(total_vis / (match.duration_seconds/60), 1)

        return metrics

# Singleton
lol_stats_processor = LoLStatsProcessor()
