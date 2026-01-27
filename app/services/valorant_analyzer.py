"""
VALORANT Analysis Service for Team Intuition Engine.
Provides AI-powered coaching insights specifically for VALORANT matches.
"""
import logging
from typing import Dict, List, Any, Optional

from .deepseek_client import deepseek_client
from ..models.valorant import (
    ValorantMatch, ValorantPlayerState, ValorantRound,
    ValorantMicroError, ValorantRoundAnalysis, ValorantTeamMetrics,
    ValorantMacroReview
)

logger = logging.getLogger(__name__)


class ValorantPrompts:
    """Specialized prompts for VALORANT analysis."""
    
    MACRO_REVIEW = """You are an elite VALORANT coach analyst generating a Game Review Agenda.

VALORANT-SPECIFIC CONCEPTS:
- KAST: Kill/Assist/Survive/Traded - key performance metric
- Economy: Credits for weapons/abilities, eco rounds, force buys, full buys
- Sites: A, B, C (map dependent), Mid control
- Agents: Duelists (entry), Initiators (info), Controllers (smokes), Sentinels (anchor)
- First Blood: Winning team wins 70%+ when they get first blood
- Round Types: Pistol (crucial), Eco, Force, Full Buy, Bonus

Analyze this VALORANT match and produce a structured review agenda focusing on:
1. Critical rounds (especially pistol rounds and close rounds)
2. Economy decisions and their impact
3. Default setups and executes
4. Utility usage patterns
5. Individual KAST and impact

Respond in this JSON structure:
{
    "executive_summary": "2-3 sentence match overview",
    "key_takeaways": ["insight1", "insight2", "insight3"],
    "critical_rounds": [
        {
            "round_number": 12,
            "round_type": "FULL_BUY",
            "importance": "CRITICAL",
            "summary": "What happened",
            "key_mistakes": ["mistake1", "mistake2"],
            "key_plays": ["play1"],
            "economy_decision": "Correct/Incorrect",
            "economy_recommendation": "What should have been done",
            "site_analysis": "A site take was slow, defender rotated in time"
        }
    ],
    "team_metrics": {
        "pistol_round_win_rate": 0.5,
        "eco_round_win_rate": 0.33,
        "full_buy_win_rate": 0.6,
        "team_kast": 0.72,
        "first_blood_rate": 0.45,
        "first_death_rate": 0.38,
        "trade_efficiency": 0.65,
        "attack_win_rate": 0.55,
        "defense_win_rate": 0.60,
        "preferred_site": "A",
        "utility_usage_rate": 0.80,
        "flash_assist_rate": 0.25,
        "average_eco_damage": 120
    },
    "attack_patterns": ["5-man A execute", "slow mid control"],
    "defense_patterns": ["2-1-2 default", "heavy C site stack"],
    "eco_patterns": ["Force after pistol loss", "Full save rare"],
    "player_errors": [
        {
            "error_type": "POSITIONING",
            "round_number": 12,
            "description": "Played too aggressive without utility",
            "affected_player": "jakee",
            "agent": "Jett",
            "confidence": 0.85,
            "kast_impact": true,
            "round_cost": "Likely cost the round",
            "improvement_suggestion": "Wait for Skye flash before peeking"
        }
    ],
    "priority_review_rounds": [1, 12, 13, 24],
    "training_recommendations": ["Practice A site retakes", "Work on eco damage"]
}"""

    PLAYER_INSIGHT = """You are analyzing a VALORANT player's performance.

VALORANT-SPECIFIC METRICS:
- KAST (Kill/Assist/Survive/Traded) - aim for 70%+
- First Blood Rate - duelists should be high
- Average Damage per Round (ADR) - ~150 is good
- Headshot % - indicates aim quality
- Trading - essential for team success
- Utility usage - Initiators/Controllers judged heavily

Generate insights linking this player's behavior to team outcomes.

Respond in JSON:
{
    "positive_impacts": [
        {
            "trigger": "When jakee gets first blood",
            "outcome": "C9 wins the round",
            "probability": 0.78,
            "evidence": "12/15 rounds with jakee FB won",
            "recommendation": "Set jakee up for opening duels"
        }
    ],
    "negative_impacts": [
        {
            "trigger": "When jakee dies first without trade",
            "outcome": "C9 loses the round",
            "probability": 0.82,
            "evidence": "9/11 untraded deaths led to round loss",
            "recommendation": "Ensure teammate ready to trade"
        }
    ],
    "recurring_mistakes": ["Dry peeking without utility", "Overusing Operator on eco"],
    "recurring_strengths": ["Clutch potential", "Op kills on defense"],
    "priority_improvements": ["Wait for flash before entry", "Better comm on rotate"]
}"""


class ValorantAnalyzer:
    """
    VALORANT-specific analysis engine.
    Generates coaching insights tailored to VALORANT gameplay.
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def generate_macro_review(
        self,
        match: ValorantMatch
    ) -> ValorantMacroReview:
        """
        Generate a comprehensive Macro Game Review for a VALORANT match.
        
        Args:
            match: VALORANT match data
            
        Returns:
            ValorantMacroReview with structured coaching insights
        """
        user_prompt = self._build_match_prompt(match)
        
        response = await self.client.analyze(
            system_prompt=ValorantPrompts.MACRO_REVIEW,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        return self._parse_macro_review(response, match)
    
    def _build_match_prompt(self, match: ValorantMatch) -> str:
        """Build detailed prompt for VALORANT match analysis."""
        
        sections = [
            "## VALORANT Match Overview",
            f"Match ID: {match.match_id}",
            f"Map: {match.map_name}",
            f"Final Score: {match.team_1} {match.team_1_score} - {match.team_2_score} {match.team_2}",
            f"Winner: {match.winner}",
            f"Total Rounds: {match.total_rounds}",
            "",
            f"## {match.team_1} Players"
        ]
        
        for player in match.team_1_players:
            kda = f"{player.kills}/{player.deaths}/{player.assists}"
            sections.append(
                f"- {player.player_name} ({player.agent}) - {kda} | Weapon: {player.weapon}"
            )
        
        sections.append(f"")
        sections.append(f"## {match.team_2} Players")
        
        for player in match.team_2_players:
            kda = f"{player.kills}/{player.deaths}/{player.assists}"
            sections.append(
                f"- {player.player_name} ({player.agent}) - {kda} | Weapon: {player.weapon}"
            )
        
        # Add round summaries
        if match.rounds:
            sections.append("")
            sections.append("## Key Rounds")
            for round in match.rounds[:10]:  # Limit to 10 rounds
                fb_info = f" (FB: {round.first_blood})" if round.first_blood else ""
                spike_info = f" | Spike: {round.plant_location}" if round.spike_planted else ""
                sections.append(
                    f"- R{round.round_number} [{round.round_type}]: "
                    f"{round.winner} won via {round.win_condition}{fb_info}{spike_info}"
                )
        else:
            sections.append("")
            sections.append("## Round Data Unavailable")
            sections.append("Detailed round-by-round history is not available for this legacy match.")
            sections.append("Please analyze based on the Player KDA, Economy, and Team Scores provided above.")
        
        sections.extend([
            "",
            "## Analysis Request",
            "Generate a comprehensive VALORANT Macro Review.",
            "Focus on economy decisions, site setups, and individual impact.",
            "Identify key performance indicators from the stats provided.",
            "Highlight KAST impact and trading patterns.",
            "If round history is missing, infer patterns from player statistics (e.g. high First Bloods, high deaths)."
        ])
        
        return "\n".join(sections)
    
    def _parse_macro_review(
        self,
        response: Dict[str, Any],
        match: ValorantMatch
    ) -> ValorantMacroReview:
        """Parse DeepSeek response into ValorantMacroReview."""
        
        # Parse critical rounds
        critical_rounds = []
        for round_data in response.get("critical_rounds", []):
            try:
                critical_rounds.append(ValorantRoundAnalysis(
                    round_number=round_data.get("round_number", 0),
                    round_type=round_data.get("round_type", "UNKNOWN"),
                    importance=round_data.get("importance", "MEDIUM"),
                    summary=round_data.get("summary", ""),
                    key_mistakes=round_data.get("key_mistakes", []),
                    key_plays=round_data.get("key_plays", []),
                    economy_decision=round_data.get("economy_decision", ""),
                    economy_recommendation=round_data.get("economy_recommendation"),
                    site_analysis=round_data.get("site_analysis")
                ))
            except Exception as e:
                logger.warning(f"Failed to parse round analysis: {e}")
        
        # Parse team metrics
        team_metrics = None
        try:
            metrics_data = response.get("team_metrics") or {}
            team_metrics = ValorantTeamMetrics(
                pistol_round_win_rate=metrics_data.get("pistol_round_win_rate", 0.5),
                eco_round_win_rate=metrics_data.get("eco_round_win_rate", 0.3),
                full_buy_win_rate=metrics_data.get("full_buy_win_rate", 0.5),
                team_kast=metrics_data.get("team_kast", 0.7),
                first_blood_rate=metrics_data.get("first_blood_rate", 0.45),
                first_death_rate=metrics_data.get("first_death_rate", 0.45),
                trade_efficiency=metrics_data.get("trade_efficiency", 0.5),
                attack_win_rate=metrics_data.get("attack_win_rate", 0.5),
                defense_win_rate=metrics_data.get("defense_win_rate", 0.5),
                preferred_site=metrics_data.get("preferred_site"),
                utility_usage_rate=metrics_data.get("utility_usage_rate", 0.7),
                flash_assist_rate=metrics_data.get("flash_assist_rate", 0.2),
                average_eco_damage=metrics_data.get("average_eco_damage", 100)
            )
        except Exception as e:
            logger.warning(f"Failed to parse team metrics: {e}")
            # Fallback metrics
            team_metrics = ValorantTeamMetrics(
                pistol_round_win_rate=0.5, eco_round_win_rate=0.3, full_buy_win_rate=0.5,
                team_kast=0.0, first_blood_rate=0.0, first_death_rate=0.0,
                trade_efficiency=0.0, attack_win_rate=0.5, defense_win_rate=0.5,
                utility_usage_rate=0.0, flash_assist_rate=0.0, average_eco_damage=0
            )
        
        # Parse player errors
        player_errors = []
        for error in response.get("player_errors", []):
            try:
                player_errors.append(ValorantMicroError(
                    error_type=error.get("error_type", "UNKNOWN"),
                    round_number=error.get("round_number", 0),
                    description=error.get("description", ""),
                    affected_player=error.get("affected_player", ""),
                    agent=error.get("agent", ""),
                    confidence=error.get("confidence", 0.5),
                    kast_impact=error.get("kast_impact", False),
                    round_cost=error.get("round_cost", ""),
                    improvement_suggestion=error.get("improvement_suggestion", "")
                ))
            except Exception as e:
                logger.warning(f"Failed to parse player error: {e}")
        
        return ValorantMacroReview(
            status="success",
            match_id=match.match_id,
            map_name=match.map_name,
            final_score=f"{match.team_1_score}-{match.team_2_score}",
            winner=match.winner,
            executive_summary=response.get("executive_summary", "Match analysis complete."),
            key_takeaways=response.get("key_takeaways", []),
            critical_rounds=critical_rounds,
            team_metrics=team_metrics,
            attack_patterns=response.get("attack_patterns", []),
            defense_patterns=response.get("defense_patterns", []),
            eco_patterns=response.get("eco_patterns", []),
            player_errors=player_errors,
            priority_review_rounds=response.get("priority_review_rounds", []),
            training_recommendations=response.get("training_recommendations", []),
            metadata={
                "model": "deepseek-chat",
                "game": "valorant"
            }
        )
    
    async def generate_player_insights(self, match: ValorantMatch, player_name: str) -> Dict[str, Any]:
        """
        Generate personalized behavioral insights for a specific player.
        Focuses on recurring patterns (Category 1 Req).
        """
        # specialized prompt construction
        player_data = next((p for p in match.team_1_players if p.player_name.lower() == player_name.lower()), None)
        if not player_data:
             # try team 2
            player_data = next((p for p in match.team_2_players if p.player_name.lower() == player_name.lower()), None)
        
        if not player_data:
            return {"error": "Player not found"}

        user_prompt = f"""
        Analyze Player: {player_data.player_name} ({player_data.agent})
        KDA: {player_data.kills}/{player_data.deaths}/{player_data.assists}
        Role: {player_data.role}
        
        MATCH CONTEXT:
        Map: {match.map_name}
        Score: {match.team_1_score}-{match.team_2_score}
        Winner: {match.winner}
        
        Analyze their impact on round wins/losses.
        Did their first deaths lead to loss?
        Did their multi-kills lead to wins?
        """
        
        response = await self.client.analyze(
            system_prompt=ValorantPrompts.PLAYER_INSIGHT,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        return response

    async def generate_macro_review_from_grid(
        self,
        match: Any,
        game_state: Any
    ) -> ValorantMacroReview:
        """
        Generate macro review from GRID data.
        Converts GRID Match/GameState to ValorantMatch and runs analysis.
        """
        # Convert GRID data to ValorantMatch format
        team_1_players = []
        team_2_players = []
        
        for ps in game_state.player_states:
            player = ValorantPlayerState(
                player_name=ps.player_name,
                agent=ps.champion,  # GRID uses champion field for agent
                role=ps.role,
                team_side="Attack" if ps.team_name == game_state.team_1_name else "Defense",
                kills=ps.kills,
                deaths=ps.deaths,
                assists=ps.assists,
                weapon="Vandal",  # Default weapon
                alive=ps.alive
            )
            if ps.team_name == game_state.team_1_name:
                team_1_players.append(player)
            else:
                team_2_players.append(player)
        
        # Build ValorantMatch from GRID data
        valorant_match = ValorantMatch(
            match_id=str(game_state.timestamp),
            map_name=game_state.map_name if hasattr(game_state, 'map_name') and game_state.map_name else "Unknown",
            team_1=game_state.team_1_name or "Team 1",
            team_2=game_state.team_2_name or "Team 2",
            team_1_score=game_state.team_1_score,
            team_2_score=game_state.team_2_score,
            winner=game_state.winner or (game_state.team_1_name if game_state.team_1_score > game_state.team_2_score else game_state.team_2_name),
            team_1_players=team_1_players,
            team_2_players=team_2_players,
            total_rounds=game_state.team_1_score + game_state.team_2_score
        )
        
        return await self.generate_macro_review(valorant_match)

    async def generate_player_insights_from_grid(
        self,
        game_state: Any,
        player_name: str
    ) -> Dict[str, Any]:
        """
        Generate player insights from GRID game state.
        Converts to ValorantMatch format and runs analysis.
        """
        # Convert GRID data to ValorantMatch format
        team_1_players = []
        team_2_players = []
        
        for ps in game_state.player_states:
            player = ValorantPlayerState(
                player_name=ps.player_name,
                agent=ps.champion,
                role=ps.role,
                team_side="Attack" if ps.team_name == game_state.team_1_name else "Defense",
                kills=ps.kills,
                deaths=ps.deaths,
                assists=ps.assists,
                weapon="Vandal",
                alive=ps.alive
            )
            if ps.team_name == game_state.team_1_name:
                team_1_players.append(player)
            else:
                team_2_players.append(player)
        
        valorant_match = ValorantMatch(
            match_id=str(game_state.timestamp),
            map_name=game_state.map_name if hasattr(game_state, 'map_name') and game_state.map_name else "Unknown",
            team_1=game_state.team_1_name or "Team 1",
            team_2=game_state.team_2_name or "Team 2",
            team_1_score=game_state.team_1_score,
            team_2_score=game_state.team_2_score,
            winner=game_state.winner or (game_state.team_1_name if game_state.team_1_score > game_state.team_2_score else game_state.team_2_name),
            team_1_players=team_1_players,
            team_2_players=team_2_players,
            total_rounds=game_state.team_1_score + game_state.team_2_score
        )
        
        return await self.generate_player_insights(valorant_match, player_name)


# Singleton instance
valorant_analyzer = ValorantAnalyzer()
