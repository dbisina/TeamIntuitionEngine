"""
Micro-Error Detection Module for Team Intuition Engine.
Uses DeepSeek to dynamically identify player mistakes and their cascading effects.
All predictions flow through AI—no hard-coded rules.
"""
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from ..models.lol import (
    Player, PlayerState, TimelineEvent,
    MicroError, ErrorAssessment, MicroErrorResponse, AnalysisResponse
)
from .deepseek_client import deepseek_client, PromptTemplates

logger = logging.getLogger(__name__)


class MicroErrorDetectorInterface(ABC):
    """
    Interface for detecting micro-level mechanical or tactical errors in player performance.
    """
    @abstractmethod
    async def detect_errors(
        self, 
        player: Player,
        timeline: Optional[List[TimelineEvent]] = None,
        player_states: Optional[List[PlayerState]] = None
    ) -> MicroErrorResponse:
        pass


class MicroErrorDetector(MicroErrorDetectorInterface):
    """
    DeepSeek-powered micro-error detection.
    
    Detects the following error types dynamically:
    1. positioning_error: Overextending, poor teamfight positioning
    2. resource_mismanagement: Wasting summoners, suboptimal item purchases
    3. objective_timing: Missing objective windows, poor recall timing
    4. mechanical_mistake: Missed skillshots, bad trade patterns
    5. vision_failure: Lack of warding, face-checking dangerous areas
    
    Each detection includes confidence scoring and cascading effect analysis.
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def detect_errors(
        self,
        player: Player,
        timeline: Optional[List[TimelineEvent]] = None,
        player_states: Optional[List[PlayerState]] = None
    ) -> MicroErrorResponse:
        """
        Analyze player data using DeepSeek to detect micro-errors.
        
        Args:
            player: Player data including stats and champion
            timeline: List of 30-second aggregated events
            player_states: Snapshots of player state over time
            
        Returns:
            MicroErrorResponse with detected errors and overall assessment
        """
        # Build the analysis prompt with all available data
        user_prompt = self._build_analysis_prompt(player, timeline, player_states)
        
        # Get DeepSeek analysis
        response = await self.client.analyze(
            system_prompt=PromptTemplates.MICRO_ERROR_DETECTION,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        # Parse response into structured models
        return self._parse_response(response, player.name)
    
    def _build_analysis_prompt(
        self,
        player: Player,
        timeline: Optional[List[TimelineEvent]],
        player_states: Optional[List[PlayerState]]
    ) -> str:
        """Build a comprehensive analysis prompt from player data."""
        prompt_parts = []
        
        # Player info
        prompt_parts.append(f"""
## Player Information
- Name: {player.name}
- Role: {player.role}
- Champion: {player.champion}
- Rank: {player.rank}
""")
        
        # Stats if available
        if player.stats:
            prompt_parts.append(f"""
## Performance Stats
- KDA: {player.stats.kda}
- CS/min: {player.stats.cs_per_min}
- Vision Score: {player.stats.vision_score}
- Gold Earned: {player.stats.gold_earned}
""")
        
        # Timeline events if available
        if timeline:
            prompt_parts.append("\n## Timeline Events (30-second windows)")
            for event in timeline[-10:]:  # Last 10 windows for context
                events_str = ", ".join(event.events)
                prompt_parts.append(f"- [{event.window_start}s-{event.window_end}s]: {events_str}")
        
        # Player states if available
        if player_states:
            prompt_parts.append("\n## Player State Snapshots")
            for state in player_states[-5:]:  # Last 5 states
                items_str = ", ".join(state.items) if state.items else "none"
                prompt_parts.append(f"""
- Time: Snapshot
  - Gold: {state.gold}, Level: {state.level}
  - Position: ({state.position.get('x', 0):.1f}, {state.position.get('y', 0):.1f})
  - Ultimate: {'Ready' if state.ultimate_available else 'On Cooldown'}
  - Items: {items_str}
""")
        
        prompt_parts.append("""
## Analysis Request
Identify ALL micro-errors in this player's performance. For each error:
1. Determine the error type
2. Calculate confidence based on available evidence
3. Trace cascading effects on team performance
4. Provide specific, actionable improvement suggestions

Respond with JSON containing "errors" array and "overall_assessment" object.
""")
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, response: dict, player_name: str) -> MicroErrorResponse:
        """Parse DeepSeek response into MicroErrorResponse model."""
        errors = []
        
        # Parse errors from response
        raw_errors = response.get("errors", [])
        for err in raw_errors:
            try:
                micro_error = MicroError(
                    error_type=err.get("error_type", "unknown"),
                    description=err.get("description", "No description provided"),
                    confidence=float(err.get("confidence", 0.5)),
                    affected_player=err.get("affected_player", player_name),
                    timestamp_window=err.get("timestamp_window", "unknown"),
                    cascading_effects=err.get("cascading_effects", []),
                    improvement_suggestion=err.get("improvement_suggestion", "Review gameplay footage")
                )
                errors.append(micro_error)
            except Exception as e:
                logger.warning(f"Failed to parse error: {e}")
                continue
        
        # Parse overall assessment
        assessment = None
        raw_assessment = response.get("overall_assessment", {})
        if raw_assessment:
            try:
                assessment = ErrorAssessment(
                    error_frequency=raw_assessment.get("error_frequency", "moderate"),
                    primary_weakness=raw_assessment.get("primary_weakness", "No primary weakness identified"),
                    improvement_priority=raw_assessment.get("improvement_priority", []),
                    reasoning=raw_assessment.get("reasoning", "Analysis based on available data")
                )
            except Exception as e:
                logger.warning(f"Failed to parse assessment: {e}")
        
        return MicroErrorResponse(
            status="success",
            errors=errors,
            overall_assessment=assessment,
            metadata={
                "model": "deepseek-chat",
                "player_analyzed": player_name
            }
        )
    
    # Legacy method for backward compatibility
    def detect_errors_sync(self, player_data: Player) -> AnalysisResponse:
        """Synchronous wrapper for legacy API compatibility."""
        import asyncio
        
        async def _run():
            result = await self.detect_errors(player_data)
            # Convert to legacy format
            return AnalysisResponse(
                status=result.status,
                score=1.0 - (len(result.errors) * 0.1),  # Simple scoring
                insights=[err.description for err in result.errors[:3]],
                recommendations=[err.improvement_suggestion for err in result.errors[:3]],
                metadata=result.metadata
            )
        
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(_run())

