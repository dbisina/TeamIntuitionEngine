"""
DeepSeek API Client for Team Intuition Engine.
Provides structured AI reasoning for micro-error detection, team synergy, and hypothetical predictions.
All coaching decisions flow through this client—no hard-coded rules.
"""
import json
import logging
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI
from ..core.config import settings

logger = logging.getLogger(__name__)


class DeepSeekClient:
    """
    Async client for DeepSeek API using OpenAI-compatible interface.
    Handles structured prompts and parses JSON responses for coaching insights.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            timeout=60.0
        )
        self.model = settings.DEEPSEEK_MODEL
        logger.info(f"DeepSeek Client initialized with model: {self.model}")
    
    async def analyze(self, system_prompt: str, user_prompt: str, 
                      response_schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a structured analysis request to DeepSeek.
        
        Args:
            system_prompt: Defines the AI's role and output format
            user_prompt: The specific data/scenario to analyze
            response_schema: Optional JSON schema hint for structured output
            
        Returns:
            Parsed JSON response from DeepSeek
        """
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"} if response_schema else None
            )
            
            content = response.choices[0].message.content
            return self._parse_json_response(content)
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise
    
    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON from response, handling markdown code blocks."""
        content = content.strip()
        
        # Handle markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            return {"raw_response": content, "parse_error": True}


# Prompt templates for structured AI reasoning
class PromptTemplates:
    """
    Prompt engineering templates for DeepSeek.
    Each template is designed to elicit structured JSON responses for coaching insights.
    """
    
    MICRO_ERROR_DETECTION = """You are an expert League of Legends analyst specializing in micro-level player performance analysis.

Your task is to identify mechanical and tactical mistakes that impact team performance. Analyze the provided player data, timeline events, and state snapshots.

For each error detected, you MUST provide:
1. error_type: One of ["positioning_error", "resource_mismanagement", "objective_timing", "mechanical_mistake", "vision_failure"]
2. description: Clear explanation of what went wrong
3. confidence: 0.0-1.0 score of how certain you are this is an error
4. timestamp_window: When the error occurred
5. cascading_effects: List of downstream impacts on team performance
6. improvement_suggestion: Specific, actionable coaching advice

Respond with valid JSON in this format:
{
    "errors": [...],
    "overall_assessment": {
        "error_frequency": "low|moderate|high",
        "primary_weakness": "...",
        "improvement_priority": ["...", "..."],
        "reasoning": "..."
    }
}"""

    TEAM_SYNERGY = """You are an expert League of Legends coach analyzing team coordination and synergy.

Your task is to evaluate how individual player performance affects team-wide strategic outcomes. Consider:
- How individual errors correlate across team members
- Team composition strengths and weaknesses
- Objective control patterns
- Communication quality indicators

Provide these metrics (all 0.0-1.0 except pressure_balance which is -1.0 to 1.0):
- stability_score: Team's ability to maintain composure under pressure
- pressure_balance: Negative = enemy pressure, Positive = team pressure
- objective_control_likelihood: Probability of securing next major objective
- teamfight_strength: Relative 5v5 fighting power

Respond with valid JSON including metrics, analysis reasoning, and recommendations."""

    HYPOTHETICAL_PREDICTION = """You are an expert League of Legends strategic analyst.

Your task is to predict outcomes for hypothetical scenarios. Given the current game state (player positions, gold, levels, cooldowns, objectives, vision), analyze what would happen if the team executes a specific decision.

For each scenario:
1. Calculate success_probability (0.0-1.0)
2. Describe expected_outcome
3. List risk_factors that could cause failure
4. Provide optimal_execution steps
5. Offer alternative_recommendation if success probability < 0.5

Always explain your reasoning based on the specific game state data provided.

Respond with valid JSON including primary scenario analysis, alternative scenario, and final recommendation."""


# Singleton instance for dependency injection
deepseek_client = DeepSeekClient()
