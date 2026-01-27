"""
Team Synergy Modeling Module for Team Intuition Engine.
Uses DeepSeek to evaluate how individual mistakes influence team-wide strategic outcomes.
All predictions flow through AI—no hard-coded rules.
"""
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from ..models.lol import (
    Match, GameState, ObjectiveState, PlayerState,
    MicroError, SynergyMetrics, SynergyAnalysis, MicroErrorImpact,
    SynergyResponse, AnalysisResponse
)
from .deepseek_client import deepseek_client, PromptTemplates

logger = logging.getLogger(__name__)


class TeamSynergyModelInterface(ABC):
    """
    Interface for evaluating team composition and synergy.
    """
    @abstractmethod
    async def evaluate_synergy(
        self,
        match: Match,
        game_state: Optional[GameState] = None,
        micro_errors: Optional[List[MicroError]] = None
    ) -> SynergyResponse:
        pass


class TeamSynergyModel(TeamSynergyModelInterface):
    """
    DeepSeek-powered team synergy evaluation.
    
    Analyzes how individual player performance affects team-wide strategic outcomes:
    - Correlates micro-errors across team members
    - Evaluates team composition synergies (CC chains, damage types, engage/disengage)
    - Measures gold distribution efficiency
    - Tracks vision control patterns
    - Predicts objective sequencing success
    
    Generates interpretable metrics for coaching decisions:
    - Stability Score: Team composure under pressure
    - Pressure Balance: Lane and jungle control differential
    - Objective Control Likelihood: Probability of securing next objective
    - Teamfight Strength: Relative 5v5 power assessment
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def evaluate_synergy(
        self,
        match: Match,
        game_state: Optional[GameState] = None,
        micro_errors: Optional[List[MicroError]] = None
    ) -> SynergyResponse:
        """
        Evaluate team synergy using DeepSeek reasoning.
        
        Args:
            match: Match data including all players
            game_state: Current game state with objectives and positions
            micro_errors: Previously detected individual errors to correlate
            
        Returns:
            SynergyResponse with metrics, analysis, and recommendations
        """
        # Build comprehensive synergy prompt
        user_prompt = self._build_synergy_prompt(match, game_state, micro_errors)
        
        # Get DeepSeek analysis
        response = await self.client.analyze(
            system_prompt=PromptTemplates.TEAM_SYNERGY,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        # Parse response into structured models
        return self._parse_response(response, match.match_id)
    
    def _build_synergy_prompt(
        self,
        match: Match,
        game_state: Optional[GameState],
        micro_errors: Optional[List[MicroError]]
    ) -> str:
        """Build synergy evaluation prompt from match data."""
        prompt_parts = []
        
        # Match overview
        prompt_parts.append(f"""
## Match Information
- Match ID: {match.match_id}
- Duration: {match.duration_seconds // 60}m {match.duration_seconds % 60}s
- Winner: {match.winner_side} side

## Team Composition (5 Players)
""")
        
        # Player details
        for i, player in enumerate(match.players, 1):
            stats_str = ""
            if player.stats:
                stats_str = f" | KDA: {player.stats.kda}, CS/min: {player.stats.cs_per_min}, Vision: {player.stats.vision_score}"
            prompt_parts.append(f"{i}. {player.name} ({player.role}) - {player.champion} [{player.rank}]{stats_str}")
        
        # Game state if available
        if game_state:
            prompt_parts.append(f"""
## Current Game State
- Timestamp: {game_state.timestamp // 60}m {game_state.timestamp % 60}s
- Phase: {game_state.game_phase}
- Gold Difference: {'+' if game_state.gold_difference >= 0 else ''}{game_state.gold_difference}
""")
            
            # Objective state
            if game_state.objective_state:
                obj = game_state.objective_state
                prompt_parts.append(f"""
## Objective State
- Dragons: Blue {obj.dragons_secured.get('blue', 0)} - Red {obj.dragons_secured.get('red', 0)}
- Dragon Soul: {obj.dragon_soul or 'None'}
- Baron: {'Alive' if obj.baron_alive else 'Dead'}
- Elder: {'Available' if obj.elder_dragon_alive else 'Not spawned'}
""")
        
        # Micro-errors for correlation analysis
        if micro_errors:
            prompt_parts.append("\n## Individual Micro-Errors Detected")
            for error in micro_errors:
                prompt_parts.append(f"- [{error.affected_player}] {error.error_type}: {error.description} (confidence: {error.confidence:.0%})")
                if error.cascading_effects:
                    prompt_parts.append(f"  Cascading effects: {', '.join(error.cascading_effects[:2])}")
        
        prompt_parts.append("""
## Analysis Request
Evaluate team synergy considering:
1. How do individual errors correlate and compound across the team?
2. What is the team's stability under pressure?
3. Who controls map pressure and objectives?
4. How strong is the team in 5v5 fights?

Provide:
- synergy_metrics (stability_score, pressure_balance, objective_control_likelihood, teamfight_strength)
- analysis with detailed reasoning for each metric
- communication_indicators (observable patterns)
- micro_error_impact (how individual errors affect team)
- recommendations (specific coaching advice)

Respond with valid JSON.
""")
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, response: dict, match_id: str) -> SynergyResponse:
        """Parse DeepSeek response into SynergyResponse model."""
        
        # Parse synergy metrics
        raw_metrics = response.get("synergy_metrics", {})
        metrics = SynergyMetrics(
            stability_score=float(raw_metrics.get("stability_score", 0.5)),
            pressure_balance=float(raw_metrics.get("pressure_balance", 0.0)),
            objective_control_likelihood=float(raw_metrics.get("objective_control_likelihood", 0.5)),
            teamfight_strength=float(raw_metrics.get("teamfight_strength", 0.5))
        )
        
        # Parse analysis reasoning
        analysis = None
        raw_analysis = response.get("analysis", {})
        if raw_analysis:
            try:
                analysis = SynergyAnalysis(
                    stability_reasoning=raw_analysis.get("stability_reasoning", "No analysis available"),
                    pressure_reasoning=raw_analysis.get("pressure_reasoning", "No analysis available"),
                    objective_reasoning=raw_analysis.get("objective_reasoning", "No analysis available"),
                    teamfight_reasoning=raw_analysis.get("teamfight_reasoning", "No analysis available")
                )
            except Exception as e:
                logger.warning(f"Failed to parse analysis: {e}")
        
        # Parse micro-error impact
        micro_error_impact = None
        raw_impact = response.get("micro_error_impact", {})
        if raw_impact:
            try:
                micro_error_impact = MicroErrorImpact(
                    individual_to_team_correlation=float(raw_impact.get("individual_to_team_correlation", 0.5)),
                    most_impactful_errors=raw_impact.get("most_impactful_errors", []),
                    reasoning=raw_impact.get("reasoning", "No impact analysis available")
                )
            except Exception as e:
                logger.warning(f"Failed to parse micro error impact: {e}")
        
        return SynergyResponse(
            status="success",
            synergy_metrics=metrics,
            analysis=analysis,
            communication_indicators=response.get("communication_indicators", []),
            micro_error_impact=micro_error_impact,
            recommendations=response.get("recommendations", []),
            metadata={
                "model": "deepseek-chat",
                "match_id": match_id
            }
        )
    
    # Legacy method for backward compatibility
    def evaluate_synergy_sync(self, match_data: Match) -> AnalysisResponse:
        """Synchronous wrapper for legacy API compatibility."""
        import asyncio
        
        async def _run():
            result = await self.evaluate_synergy(match_data)
            # Convert to legacy format
            return AnalysisResponse(
                status=result.status,
                score=result.synergy_metrics.teamfight_strength,
                insights=[
                    f"Stability: {result.synergy_metrics.stability_score:.0%}",
                    f"Objective Control: {result.synergy_metrics.objective_control_likelihood:.0%}"
                ] + result.communication_indicators[:2],
                recommendations=result.recommendations[:3],
                metadata=result.metadata
            )
        
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(_run())

