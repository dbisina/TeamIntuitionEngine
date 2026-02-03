"""
Statistical Analysis Service for Team Intuition Engine.
Computes hackathon-winning metrics: KAST impact, economy analysis, and What If context.
"""
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class KASTImpactStat:
    """KAST impact statistics for a single player."""
    player_name: str
    agent: str
    total_rounds: int
    rounds_with_kast: int
    rounds_without_kast: int
    team_wins_with_kast: int
    team_losses_with_kast: int
    team_wins_without_kast: int
    team_losses_without_kast: int
    
    @property
    def kast_percentage(self) -> float:
        if self.total_rounds == 0:
            return 0.0
        return round((self.rounds_with_kast / self.total_rounds) * 100, 1)
    
    @property
    def loss_rate_without_kast(self) -> float:
        """The key metric: "78% loss rate when player dies without KAST" """
        if self.rounds_without_kast == 0:
            return 0.0
        return round((self.team_losses_without_kast / self.rounds_without_kast) * 100, 1)
    
    @property
    def win_rate_with_kast(self) -> float:
        if self.rounds_with_kast == 0:
            return 0.0
        return round((self.team_wins_with_kast / self.rounds_with_kast) * 100, 1)
    
    def to_insight(self) -> str:
        """Generate hackathon-style insight string."""
        if self.rounds_without_kast == 0:
            return f"{self.player_name} maintained KAST in all {self.total_rounds} rounds - exceptional consistency."
        
        loss_rate = self.loss_rate_without_kast
        if loss_rate >= 70:
            severity = "critically impacts"
        elif loss_rate >= 50:
            severity = "significantly affects"
        else:
            severity = "impacts"
        
        return (
            f"Team loses {loss_rate}% of rounds when {self.player_name} dies without KAST. "
            f"({self.rounds_without_kast}/{self.total_rounds} rounds without KAST). "
            f"Their positioning {severity} team performance."
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "player_name": self.player_name,
            "agent": self.agent,
            "total_rounds": self.total_rounds,
            "rounds_with_kast": self.rounds_with_kast,
            "rounds_without_kast": self.rounds_without_kast,
            "kast_percentage": self.kast_percentage,
            "loss_rate_without_kast": self.loss_rate_without_kast,
            "win_rate_with_kast": self.win_rate_with_kast,
            "insight": self.to_insight()
        }


@dataclass
class EconomyAnalysis:
    """Economy pattern analysis for a team."""
    team_name: str
    total_rounds: int
    
    # Pistol rounds (1, 13)
    pistol_rounds_played: int
    pistol_rounds_won: int
    
    # Force buys (buying when eco suggests save)
    force_buy_rounds: int
    force_buy_wins: int
    
    # Eco rounds (saving)
    eco_rounds: int
    eco_round_wins: int
    
    # Bonus rounds (after winning eco/force)
    bonus_rounds_after_force_win: int
    bonus_rounds_lost: int  # The "snowball" pattern
    
    # Full buy rounds
    full_buy_rounds: int
    full_buy_wins: int
    
    @property
    def pistol_win_rate(self) -> float:
        if self.pistol_rounds_played == 0:
            return 0.0
        return round((self.pistol_rounds_won / self.pistol_rounds_played) * 100, 1)
    
    @property
    def force_buy_win_rate(self) -> float:
        if self.force_buy_rounds == 0:
            return 0.0
        return round((self.force_buy_wins / self.force_buy_rounds) * 100, 1)
    
    @property
    def eco_conversion_rate(self) -> float:
        """Win rate on eco rounds - upset potential."""
        if self.eco_rounds == 0:
            return 0.0
        return round((self.eco_round_wins / self.eco_rounds) * 100, 1)
    
    @property
    def bonus_loss_rate(self) -> float:
        """How often team loses the bonus round after winning force."""
        if self.bonus_rounds_after_force_win == 0:
            return 0.0
        return round((self.bonus_rounds_lost / self.bonus_rounds_after_force_win) * 100, 1)
    
    @property
    def full_buy_win_rate(self) -> float:
        if self.full_buy_rounds == 0:
            return 0.0
        return round((self.full_buy_wins / self.full_buy_rounds) * 100, 1)
    
    def to_insights(self) -> List[str]:
        """Generate hackathon-style economy insights."""
        insights = []
        
        # Pistol insight
        if self.pistol_win_rate < 40:
            insights.append(
                f"Pistol rounds are a weakness ({self.pistol_rounds_won}/{self.pistol_rounds_played} wins, "
                f"{self.pistol_win_rate}%). Review opening strategies and agent utility usage."
            )
        elif self.pistol_win_rate >= 70:
            insights.append(
                f"Strong pistol round performance ({self.pistol_win_rate}% win rate) - "
                f"setting favorable economy early."
            )
        
        # Force buy pattern (the snowball insight from hackathon example)
        if self.force_buy_win_rate >= 60 and self.bonus_loss_rate >= 50:
            insights.append(
                f"Snowball pattern detected: {self.team_name} wins force-buys "
                f"({self.force_buy_win_rate}%) but loses {self.bonus_loss_rate}% of subsequent bonus rounds. "
                f"Net negative economy impact despite winning eco rounds."
            )
        
        # Eco conversion
        if self.eco_conversion_rate >= 30:
            insights.append(
                f"High eco conversion rate ({self.eco_conversion_rate}%) - "
                f"team can upset on save rounds. Consider playing for picks more often."
            )
        elif self.eco_conversion_rate < 15 and self.eco_rounds > 3:
            insights.append(
                f"Low eco round success ({self.eco_conversion_rate}%). "
                f"Consider coordinated rushes or stacking sites during saves."
            )
        
        # Full buy
        if self.full_buy_win_rate < 50:
            insights.append(
                f"Full buy win rate is concerning ({self.full_buy_win_rate}%). "
                f"Review executes and utility coordination."
            )
        
        return insights
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "team_name": self.team_name,
            "total_rounds": self.total_rounds,
            "pistol_win_rate": self.pistol_win_rate,
            "force_buy_win_rate": self.force_buy_win_rate,
            "eco_conversion_rate": self.eco_conversion_rate,
            "bonus_loss_rate": self.bonus_loss_rate,
            "full_buy_win_rate": self.full_buy_win_rate,
            "insights": self.to_insights()
        }


@dataclass
class WhatIfContext:
    """Context for What If analysis - extracted from actual match data."""
    round_number: int
    score_state: str  # "10-11"
    team_attacking: str
    team_defending: str
    
    # Players alive
    attackers_alive: int
    defenders_alive: int
    
    # Economy state
    attacker_loadout_value: int
    defender_loadout_value: int
    
    # Utility remaining
    attacker_utility_count: int
    defender_utility_count: int
    
    # Spike state
    spike_planted: bool
    spike_location: Optional[str]
    time_remaining: float
    
    # What actually happened
    round_winner: str
    win_condition: str
    
    def to_prompt_context(self) -> str:
        """Generate context string for AI prompt."""
        situation = f"{self.attackers_alive}v{self.defenders_alive}"
        if self.spike_planted:
            situation += f" retake on {self.spike_location}"
        
        return f"""Round {self.round_number} (Score: {self.score_state})
Situation: {situation}
Time remaining: {self.time_remaining:.0f}s
Attacker loadout value: ${self.attacker_loadout_value:,}
Defender loadout value: ${self.defender_loadout_value:,}
Attacker utility remaining: {self.attacker_utility_count}
Defender utility remaining: {self.defender_utility_count}
Spike planted: {self.spike_planted} {f'at {self.spike_location}' if self.spike_planted else ''}

ACTUAL OUTCOME: {self.round_winner} won via {self.win_condition}"""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "round_number": self.round_number,
            "score_state": self.score_state,
            "situation": f"{self.attackers_alive}v{self.defenders_alive}",
            "spike_planted": self.spike_planted,
            "spike_location": self.spike_location,
            "time_remaining": self.time_remaining,
            "attacker_loadout_value": self.attacker_loadout_value,
            "defender_loadout_value": self.defender_loadout_value,
            "round_winner": self.round_winner,
            "win_condition": self.win_condition
        }


class ValorantStatsAnalyzer:
    """
    Statistical analysis engine for VALORANT matches.
    Computes hackathon-winning quantitative insights.
    """
    
    def calculate_kast_impact(
        self,
        rounds: List[Dict[str, Any]],
        players: List[Dict[str, Any]],
        team_name: str
    ) -> List[KASTImpactStat]:
        """
        Calculate KAST impact for each player on the team.
        
        Returns the key hackathon metric:
        "Team loses X% of rounds when [Player] dies without KAST"
        """
        # Initialize player tracking for ALL players (no team filtering)
        player_stats = {}
        for player in players:
            name = player.get("player_name", player.get("name", "Unknown"))
            player_stats[name] = {
                "agent": player.get("agent", player.get("champion", "Unknown")),
                "team_name": player.get("team_name", ""),
                "total_rounds": 0,
                "rounds_with_kast": 0,
                "rounds_without_kast": 0,
                "team_wins_with_kast": 0,
                "team_losses_with_kast": 0,
                "team_wins_without_kast": 0,
                "team_losses_without_kast": 0
            }
        
        # Process each round
        for round_data in rounds:
            round_winner = round_data.get("winner", "")
            team_won = round_winner == team_name
            
            player_states = round_data.get("player_states", [])
            for ps in player_states:
                name = ps.get("player_name", ps.get("name", ""))
                if name not in player_stats:
                    continue
                
                stats = player_stats[name]
                stats["total_rounds"] += 1
                
                # Check KAST (Kill/Assist/Survive/Traded)
                had_kast = ps.get("kast", False)
                if not had_kast:
                    # Infer KAST from kills/assists/alive
                    had_kast = (
                        ps.get("kills", 0) > 0 or
                        ps.get("assists", 0) > 0 or
                        ps.get("alive", False) or
                        ps.get("traded", False)
                    )
                
                if had_kast:
                    stats["rounds_with_kast"] += 1
                    # Check if THIS player's team won
                    player_team = stats.get("team_name")
                    player_team_won = round_winner == player_team
                    
                    if player_team_won:
                        stats["team_wins_with_kast"] += 1
                    else:
                        stats["team_losses_with_kast"] += 1
                else:
                    stats["rounds_without_kast"] += 1
                    # Check if THIS player's team won
                    player_team = stats.get("team_name")
                    player_team_won = round_winner == player_team
                    
                    if player_team_won:
                        stats["team_wins_without_kast"] += 1
                    else:
                        stats["team_losses_without_kast"] += 1
        
        # Convert to KASTImpactStat objects
        results = []
        for name, stats in player_stats.items():
            if stats["total_rounds"] > 0:
                results.append(KASTImpactStat(
                    player_name=name,
                    agent=stats["agent"],
                    total_rounds=stats["total_rounds"],
                    rounds_with_kast=stats["rounds_with_kast"],
                    rounds_without_kast=stats["rounds_without_kast"],
                    team_wins_with_kast=stats["team_wins_with_kast"],
                    team_losses_with_kast=stats["team_losses_with_kast"],
                    team_wins_without_kast=stats["team_wins_without_kast"],
                    team_losses_without_kast=stats["team_losses_without_kast"]
                ))
        
        # Sort by impact (highest loss rate without KAST first)
        results.sort(key=lambda x: x.loss_rate_without_kast, reverse=True)
        return results
    
    def calculate_economy_analysis(
        self,
        rounds: List[Dict[str, Any]],
        team_name: str
    ) -> EconomyAnalysis:
        """
        Calculate economy patterns for a team.
        
        Detects patterns like: "Won force buy but lost bonus round = net negative"
        """
        # Initialize counters
        pistol_played = 0
        pistol_won = 0
        force_buy_rounds = 0
        force_buy_wins = 0
        eco_rounds = 0
        eco_wins = 0
        bonus_after_force = 0
        bonus_lost = 0
        full_buy_rounds = 0
        full_buy_wins = 0
        
        prev_round_type = None
        prev_round_won = False
        
        for round_data in rounds:
            round_num = round_data.get("round_number", 0)
            round_type = round_data.get("round_type", "FULL_BUY").upper()
            winner = round_data.get("winner", "")
            team_won = winner == team_name
            
            # Pistol rounds (1 and 13)
            if round_num in [1, 13]:
                pistol_played += 1
                if team_won:
                    pistol_won += 1
                prev_round_type = "PISTOL"
                prev_round_won = team_won
                continue
            
            # Classify round by type
            if round_type in ["ECO", "SAVE"]:
                eco_rounds += 1
                if team_won:
                    eco_wins += 1
            elif round_type in ["FORCE", "FORCE_BUY"]:
                force_buy_rounds += 1
                if team_won:
                    force_buy_wins += 1
            elif round_type in ["FULL_BUY", "FULL", "BUY"]:
                full_buy_rounds += 1
                if team_won:
                    full_buy_wins += 1
            elif round_type == "BONUS":
                # This is a bonus round after winning eco/force
                if prev_round_type in ["ECO", "FORCE", "FORCE_BUY"] and prev_round_won:
                    bonus_after_force += 1
                    if not team_won:
                        bonus_lost += 1
            
            # Track for bonus detection
            if round_type in ["ECO", "FORCE", "FORCE_BUY"]:
                prev_round_type = round_type
                prev_round_won = team_won
            else:
                prev_round_type = round_type
                prev_round_won = team_won
        
        return EconomyAnalysis(
            team_name=team_name,
            total_rounds=len(rounds),
            pistol_rounds_played=pistol_played,
            pistol_rounds_won=pistol_won,
            force_buy_rounds=force_buy_rounds,
            force_buy_wins=force_buy_wins,
            eco_rounds=eco_rounds,
            eco_round_wins=eco_wins,
            bonus_rounds_after_force_win=bonus_after_force,
            bonus_rounds_lost=bonus_lost,
            full_buy_rounds=full_buy_rounds,
            full_buy_wins=full_buy_wins
        )
    
    def extract_what_if_context(
        self,
        round_data: Dict[str, Any],
        team_1_name: str,
        team_2_name: str,
        team_1_score: int,
        team_2_score: int
    ) -> WhatIfContext:
        """
        Extract detailed context from a specific round for What If analysis.
        """
        round_number = round_data.get("round_number", 0)
        attack_team = round_data.get("attack_team", team_1_name)
        defense_team = round_data.get("defense_team", team_2_name)
        
        # Count players alive and loadout values
        attackers_alive = 0
        defenders_alive = 0
        attacker_loadout = 0
        defender_loadout = 0
        attacker_utility = 0
        defender_utility = 0
        
        for ps in round_data.get("player_states", []):
            team_side = ps.get("team_side", "")
            if ps.get("alive", True):
                loadout = ps.get("loadout_value", 0)
                utility = sum(ps.get("abilities_remaining", {}).values()) if isinstance(ps.get("abilities_remaining"), dict) else 0
                
                if team_side == "Attack" or ps.get("team_name") == attack_team:
                    attackers_alive += 1
                    attacker_loadout += loadout
                    attacker_utility += utility
                else:
                    defenders_alive += 1
                    defender_loadout += loadout
                    defender_utility += utility
        
        # Default to 5v5 if no player states
        if attackers_alive == 0 and defenders_alive == 0:
            attackers_alive = 5
            defenders_alive = 5
        
        return WhatIfContext(
            round_number=round_number,
            score_state=f"{team_1_score}-{team_2_score}",
            team_attacking=attack_team,
            team_defending=defense_team,
            attackers_alive=attackers_alive,
            defenders_alive=defenders_alive,
            attacker_loadout_value=attacker_loadout,
            defender_loadout_value=defender_loadout,
            attacker_utility_count=attacker_utility,
            defender_utility_count=defender_utility,
            spike_planted=round_data.get("spike_planted", False),
            spike_location=round_data.get("plant_location"),
            time_remaining=round_data.get("time_remaining", 100.0),
            round_winner=round_data.get("winner", "Unknown"),
            win_condition=round_data.get("win_condition", "ELIMINATION")
        )


# Singleton instance
valorant_stats_analyzer = ValorantStatsAnalyzer()
