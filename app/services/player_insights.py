"""
Player Insight Generator for Team Intuition Engine.
Generates personalized, data-backed insights linking player behavior to team outcomes.
Example: "When Zeus dies before level 6, T1's win rate drops 34%"
"""
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from .deepseek_client import deepseek_client
from ..models.lol import Match, GameState, PlayerState, Player

logger = logging.getLogger(__name__)


# ============================================================================
# Response Models
# ============================================================================

class PlayerImpactInsight(BaseModel):
    """A specific insight about player impact on team outcomes."""
    trigger: str = Field(description="When X happens...")
    outcome: str = Field(description="...Y is the result")
    probability: float = Field(ge=0, le=1, description="How often this occurs")
    impact_direction: str = Field(description="POSITIVE or NEGATIVE")
    severity: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    evidence: str = Field(description="Data supporting this insight")
    recommendation: str = Field(description="What to do about it")


class StatisticalOutlier(BaseModel):
    """A statistical anomaly in player performance."""
    metric: str
    player_value: float
    expected_value: float
    deviation: str = Field(description="How far from expected, e.g. '2.3x higher'")
    interpretation: str


class PlayerInsightReport(BaseModel):
    """Complete player insight report for coaching."""
    status: str = "success"
    player_name: str
    role: str
    champion_pool: List[str] = Field(default_factory=list)
    
    # Impact Analysis
    positive_impacts: List[PlayerImpactInsight] = Field(
        description="When player does X, team benefits"
    )
    negative_impacts: List[PlayerImpactInsight] = Field(
        description="When player does X, team suffers"
    )
    
    # Statistical Profile
    statistical_outliers: List[StatisticalOutlier] = Field(
        description="Stats that stand out"
    )
    
    # Patterns
    recurring_mistakes: List[str] = Field(
        description="Mistakes that appear repeatedly"
    )
    recurring_strengths: List[str] = Field(
        description="Consistent strengths"
    )
    
    # Actionable
    priority_improvements: List[str] = Field(
        description="Top 3 things to work on"
    )
    coaching_notes: List[str] = Field(
        description="Notes for coaching staff"
    )
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PlayerInsightPrompts:
    """Prompts for player insight generation."""
    
    PLAYER_INSIGHT = """You are an elite esports analyst creating a Player Impact Report.

Your task: Analyze this player's data and generate insights that link their behavior to team-wide outcomes.

The format coaches want:
- "When [PLAYER] does [X], the team [OUTCOME] [Y%] of the time"
- "This player's [METRIC] is [DEVIATION] compared to role average"

Be specific and data-backed. Every insight must be actionable.

Respond in this exact JSON structure:
{
    "positive_impacts": [
        {
            "trigger": "When Zeus gets first blood",
            "outcome": "T1 wins the game",
            "probability": 0.78,
            "impact_direction": "POSITIVE",
            "severity": "HIGH",
            "evidence": "7/9 games with Zeus first blood resulted in wins",
            "recommendation": "Prioritize early ganks top side"
        }
    ],
    "negative_impacts": [
        {
            "trigger": "When Faker dies before level 6",
            "outcome": "T1 loses lane priority and first dragon",
            "probability": 0.82,
            "impact_direction": "NEGATIVE",
            "severity": "CRITICAL",
            "evidence": "9/11 early deaths led to dragon loss",
            "recommendation": "Ward enemy jungle paths, track jungler"
        }
    ],
    "statistical_outliers": [
        {
            "metric": "Vision score",
            "player_value": 45.2,
            "expected_value": 28.0,
            "deviation": "1.6x higher",
            "interpretation": "Exceptional vision control for this role"
        }
    ],
    "recurring_mistakes": [
        "Overextends without vision in enemy jungle",
        "Uses flash aggressively before major objectives"
    ],
    "recurring_strengths": [
        "Excellent teamfight positioning",
        "High CS per minute even when behind"
    ],
    "priority_improvements": [
        "Work on death timing - avoid dying 60s before objectives",
        "Improve back timing to catch item power spikes"
    ],
    "coaching_notes": [
        "This player responds well to specific timestamp-based feedback",
        "Consider pairing with a shotcaller for better macro decisions"
    ]
}"""


class PlayerInsightGenerator:
    """
    Generates personalized player insights linking behavior to team outcomes.
    Focuses on actionable, data-backed feedback for coaching.
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def generate_insights(
        self,
        player: Player,
        match_history: Optional[List[Match]] = None,
        player_states: Optional[List[PlayerState]] = None,
        game_state: Optional[GameState] = None
    ) -> PlayerInsightReport:
        """
        Generate comprehensive player insights.
        
        Args:
            player: Player to analyze
            match_history: Recent matches (if available)
            player_states: Player state snapshots
            game_state: Current game context
            
        Returns:
            PlayerInsightReport with actionable insights
        """
        user_prompt = self._build_insight_prompt(
            player, match_history, player_states, game_state
        )
        
        response = await self.client.analyze(
            system_prompt=PlayerInsightPrompts.PLAYER_INSIGHT,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        return self._parse_response(response, player)
    
    def _build_insight_prompt(
        self,
        player: Player,
        match_history: Optional[List[Match]],
        player_states: Optional[List[PlayerState]],
        game_state: Optional[GameState]
    ) -> str:
        """Build detailed prompt for insight generation."""
        
        sections = [
            f"## Player Profile",
            f"Name: {player.name}",
            f"Role: {player.role}",
            f"Champion: {player.champion}",
            f"Rank: {player.rank}",
        ]
        
        # Add stats if available
        if player.stats:
            sections.extend([
                "",
                "## Current Stats",
                f"KDA: {player.stats.kda:.2f}",
                f"CS/min: {player.stats.cs_per_min:.1f}",
                f"Vision Score: {player.stats.vision_score:.0f}",
                f"Gold Earned: {player.stats.gold_earned:,}",
            ])
        
        # Add player state if available
        if player_states:
            sections.extend([
                "",
                "## Recent State Snapshots"
            ])
            for ps in player_states[-5:]:
                status = "ALIVE" if ps.alive else f"DEAD ({ps.respawn_timer}s)"
                sections.append(
                    f"- {ps.gold}g, Lv{ps.level}, Ult: {'Ready' if ps.ultimate_available else 'CD'}, {status}"
                )
        
        # Add game context if available
        if game_state:
            sections.extend([
                "",
                "## Game Context",
                f"Phase: {game_state.game_phase}",
                f"Team Gold Diff: {game_state.gold_difference:+d}",
            ])
        
        # Add match history summary if available
        if match_history:
            sections.extend([
                "",
                f"## Match History ({len(match_history)} games)"
            ])
            wins = sum(1 for m in match_history if m.winner_side == "blue")  # Simplified
            sections.append(f"Win Rate: {wins}/{len(match_history)}")
        
        sections.extend([
            "",
            "## Analysis Request",
            "Generate a comprehensive Player Impact Report.",
            "Focus on insights that link this player's behavior to team-wide outcomes.",
            "Identify both positive impacts (what they do well) and negative impacts (what hurts the team).",
            "Every insight should be specific, data-referenced, and actionable.",
            "Prioritize insights that coaches can immediately use in practice."
        ])
        
        return "\n".join(sections)
    
    def _parse_response(
        self,
        response: Dict[str, Any],
        player: Player
    ) -> PlayerInsightReport:
        """Parse DeepSeek response into PlayerInsightReport."""
        
        # Parse positive impacts
        positive_impacts = []
        for impact in response.get("positive_impacts", []):
            try:
                positive_impacts.append(PlayerImpactInsight(
                    trigger=impact.get("trigger", ""),
                    outcome=impact.get("outcome", ""),
                    probability=impact.get("probability", 0.5),
                    impact_direction="POSITIVE",
                    severity=impact.get("severity", "MEDIUM"),
                    evidence=impact.get("evidence", ""),
                    recommendation=impact.get("recommendation", "")
                ))
            except Exception as e:
                logger.warning(f"Failed to parse positive impact: {e}")
        
        # Parse negative impacts
        negative_impacts = []
        for impact in response.get("negative_impacts", []):
            try:
                negative_impacts.append(PlayerImpactInsight(
                    trigger=impact.get("trigger", ""),
                    outcome=impact.get("outcome", ""),
                    probability=impact.get("probability", 0.5),
                    impact_direction="NEGATIVE",
                    severity=impact.get("severity", "MEDIUM"),
                    evidence=impact.get("evidence", ""),
                    recommendation=impact.get("recommendation", "")
                ))
            except Exception as e:
                logger.warning(f"Failed to parse negative impact: {e}")
        
        # Parse statistical outliers
        outliers = []
        for outlier in response.get("statistical_outliers", []):
            try:
                outliers.append(StatisticalOutlier(
                    metric=outlier.get("metric", ""),
                    player_value=outlier.get("player_value", 0),
                    expected_value=outlier.get("expected_value", 0),
                    deviation=outlier.get("deviation", ""),
                    interpretation=outlier.get("interpretation", "")
                ))
            except Exception as e:
                logger.warning(f"Failed to parse outlier: {e}")
        
        return PlayerInsightReport(
            status="success",
            player_name=player.name,
            role=player.role,
            champion_pool=[player.champion],
            positive_impacts=positive_impacts,
            negative_impacts=negative_impacts,
            statistical_outliers=outliers,
            recurring_mistakes=response.get("recurring_mistakes", []),
            recurring_strengths=response.get("recurring_strengths", []),
            priority_improvements=response.get("priority_improvements", []),
            coaching_notes=response.get("coaching_notes", []),
            metadata={
                "model": "deepseek-chat"
            }
        )


# Singleton instance
player_insight_generator = PlayerInsightGenerator()
