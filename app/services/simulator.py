"""
Hypothetical Outcome Prediction Module for Team Intuition Engine.
Uses DeepSeek to answer 'what-if' coaching questions with AI-driven reasoning.
All predictions flow through AI—no hard-coded rules.
"""
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from ..models.lol import (
    DecisionContext, GameState, PlayerState, ObjectiveState,
    ScenarioOutcome, HypotheticalResponse, HypotheticalRequest, AnalysisResponse
)
from .deepseek_client import deepseek_client, PromptTemplates

logger = logging.getLogger(__name__)


class HypotheticalSimulatorInterface(ABC):
    """
    Interface for simulating 'what-if' scenarios based on specific game decisions.
    """
    @abstractmethod
    async def simulate_decision(
        self,
        context: DecisionContext,
        game_state: Optional[GameState] = None
    ) -> HypotheticalResponse:
        pass


class HypotheticalSimulator(HypotheticalSimulatorInterface):
    """
    DeepSeek-powered hypothetical outcome prediction.
    
    Answers coaching questions like:
    - "What if we contest Baron now?"
    - "What if our ADC split pushes bot while we posture mid?"
    - "What if we trade Dragon for Herald?"
    
    Feature Set for Predictions:
    - Player states (gold, level, items, position, cooldowns)
    - Objective state (dragons, towers, baron/elder timers)
    - Vision map (warded areas, fog of war)
    - Ultimate availability for all 10 players
    - Team compositions and win conditions
    - Recent timeline events (last 2-3 minutes)
    
    Returns probability distributions with full reasoning and alternatives.
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def simulate_decision(
        self,
        context: DecisionContext,
        game_state: Optional[GameState] = None
    ) -> HypotheticalResponse:
        """
        Predict outcomes for a hypothetical scenario using DeepSeek.
        
        Args:
            context: Decision context with location, objectives, and available actions
            game_state: Full game state for comprehensive analysis
            
        Returns:
            HypotheticalResponse with scenario predictions and recommendations
        """
        # Build the simulation prompt
        user_prompt = self._build_simulation_prompt(context, game_state)
        
        # Get DeepSeek prediction
        response = await self.client.analyze(
            system_prompt=PromptTemplates.HYPOTHETICAL_PREDICTION,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        # Parse response into structured models
        return self._parse_response(response, context.available_actions)
    
    async def simulate_request(self, request: HypotheticalRequest) -> HypotheticalResponse:
        """
        Alternative method using HypotheticalRequest model.
        
        Args:
            request: Full request with scenario description and game state
            
        Returns:
            HypotheticalResponse with predictions
        """
        # Build prompt from request
        user_prompt = self._build_request_prompt(request)
        
        # Get DeepSeek prediction
        response = await self.client.analyze(
            system_prompt=PromptTemplates.HYPOTHETICAL_PREDICTION,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        # Parse response
        return self._parse_response(response, [request.proposed_action] + request.alternative_actions)
    
    def _build_simulation_prompt(
        self,
        context: DecisionContext,
        game_state: Optional[GameState]
    ) -> str:
        """Build simulation prompt from decision context."""
        prompt_parts = []
        
        # Decision context
        prompt_parts.append(f"""
## Decision Context
- Current Time: {context.current_timestamp // 60}m {context.current_timestamp % 60}s
- Game Phase: {context.game_state}
- Player Location: {context.player_location}
- Nearby Objectives: {', '.join(context.nearby_objectives) or 'None'}
""")
        
        # Available actions to evaluate
        prompt_parts.append("\n## Actions to Evaluate")
        for i, action in enumerate(context.available_actions, 1):
            prompt_parts.append(f"{i}. {action}")
        
        # Full game state if available
        if game_state:
            prompt_parts.append(self._format_game_state(game_state))
        
        prompt_parts.append("""
## Prediction Request
For each available action:
1. Calculate success_probability (0.0-1.0)
2. Describe expected_outcome
3. List risk_factors that could cause failure
4. Provide optimal_execution steps if attempting
5. Explain your reasoning based on the game state

Identify the BEST action and provide an alternative if the primary has < 50% success.

Respond with JSON containing:
- scenario_analysis.primary_scenario (the best action)
- scenario_analysis.alternative_scenario (safer option if needed)
- recommendation (which scenario to choose)
- confidence (your confidence in this recommendation)
- reasoning_summary
""")
        
        return "\n".join(prompt_parts)
    
    def _build_request_prompt(self, request: HypotheticalRequest) -> str:
        """Build simulation prompt from HypotheticalRequest."""
        prompt_parts = []
        
        prompt_parts.append(f"""
## Scenario Description
{request.scenario_description}

## Proposed Action
{request.proposed_action}

## Alternative Actions to Consider
""")
        for i, action in enumerate(request.alternative_actions, 1):
            prompt_parts.append(f"{i}. {action}")
        
        # Add game state
        prompt_parts.append(self._format_game_state(request.game_state))
        
        prompt_parts.append("""
## Prediction Request
Evaluate the proposed action and alternatives. Provide:
1. success_probability for each
2. expected_outcome and risk_factors
3. optimal_execution steps
4. Clear recommendation with reasoning

Respond with valid JSON.
""")
        
        return "\n".join(prompt_parts)
    
    def _format_game_state(self, game_state: GameState) -> str:
        """Format game state for prompt inclusion."""
        parts = []
        
        parts.append(f"""
## Full Game State
- Timestamp: {game_state.timestamp // 60}m {game_state.timestamp % 60}s
- Phase: {game_state.game_phase}
- Gold Difference: {'+' if game_state.gold_difference >= 0 else ''}{game_state.gold_difference}
""")
        
        # Player states
        if game_state.player_states:
            parts.append("\n### Player States")
            for ps in game_state.player_states:
                ult_status = "✓" if ps.ultimate_available else "✗"
                alive_status = "Alive" if ps.alive else f"Dead ({ps.respawn_timer}s)"
                parts.append(f"- {ps.player_name} ({ps.champion}, {ps.role}): "
                           f"Lv{ps.level}, {ps.gold}g, Ult:{ult_status}, {alive_status}")
        
        # Objective state
        obj = game_state.objective_state
        parts.append(f"""
### Objectives
- Dragons: Blue {obj.dragons_secured.get('blue', 0)} - Red {obj.dragons_secured.get('red', 0)}
- Dragon Soul: {obj.dragon_soul or 'None'}
- Baron: {'Alive' if obj.baron_alive else f'Dead (timer: {obj.baron_timer}s)' if obj.baron_timer else 'Dead'}
- Elder: {'Available' if obj.elder_dragon_alive else 'Not spawned'}
- Herald: {'Alive' if obj.herald_alive else 'Dead'}
""")
        
        # Recent events
        if game_state.recent_timeline:
            parts.append("\n### Recent Events (last 2-3 minutes)")
            for event in game_state.recent_timeline[-5:]:
                events_str = ", ".join(event.events)
                parts.append(f"- [{event.window_start}s-{event.window_end}s]: {events_str}")
        
        return "\n".join(parts)
    
    def _parse_response(self, response: dict, actions: List[str]) -> HypotheticalResponse:
        """Parse DeepSeek response into HypotheticalResponse model."""
        
        # Get scenario analysis
        scenario_analysis = response.get("scenario_analysis", {})
        
        # Parse primary scenario
        primary_raw = scenario_analysis.get("primary_scenario", {})
        primary_scenario = ScenarioOutcome(
            scenario=primary_raw.get("scenario", actions[0] if actions else "Unknown"),
            success_probability=float(primary_raw.get("success_probability", 0.5)),
            expected_outcome=primary_raw.get("expected_outcome", "Outcome uncertain"),
            risk_factors=primary_raw.get("risk_factors", []),
            optimal_execution=primary_raw.get("optimal_execution", []),
            reasoning=primary_raw.get("reasoning")
        )
        
        # Parse alternative scenario if present
        alternative_scenario = None
        alt_raw = scenario_analysis.get("alternative_scenario", {})
        if alt_raw:
            alternative_scenario = ScenarioOutcome(
                scenario=alt_raw.get("scenario", "Alternative action"),
                success_probability=float(alt_raw.get("success_probability", 0.5)),
                expected_outcome=alt_raw.get("expected_outcome", "Outcome uncertain"),
                risk_factors=alt_raw.get("risk_factors", []),
                optimal_execution=alt_raw.get("optimal_execution", []),
                reasoning=alt_raw.get("reasoning")
            )
        
        return HypotheticalResponse(
            status="success",
            primary_scenario=primary_scenario,
            alternative_scenario=alternative_scenario,
            recommendation=response.get("recommendation", "primary_scenario"),
            confidence=float(response.get("confidence", 0.7)),
            reasoning_summary=response.get("reasoning_summary", "Analysis based on provided game state"),
            metadata={
                "model": "deepseek-chat",
                "actions_evaluated": len(actions)
            }
        )
    
    # Legacy method for backward compatibility
    def simulate_decision_sync(self, context: DecisionContext) -> AnalysisResponse:
        """Synchronous wrapper for legacy API compatibility."""
        import asyncio
        
        async def _run():
            result = await self.simulate_decision(context)
            # Convert to legacy format
            primary = result.primary_scenario
            insights = [
                f"{primary.scenario} has {primary.success_probability:.0%} success rate",
                primary.expected_outcome
            ]
            if primary.risk_factors:
                insights.append(f"Risk: {primary.risk_factors[0]}")
            
            recommendations = primary.optimal_execution[:3]
            if result.alternative_scenario and primary.success_probability < 0.5:
                recommendations.insert(0, f"Consider: {result.alternative_scenario.scenario}")
            
            return AnalysisResponse(
                status=result.status,
                score=primary.success_probability,
                insights=insights,
                recommendations=recommendations,
                metadata=result.metadata
            )
        
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(_run())

