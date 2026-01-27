"""
Macro Game Review Generator for Team Intuition Engine.
Generates structured "Game Review Agenda" from match data.
Analyzes critical decision points, objective control, and strategic moments.
"""
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from .deepseek_client import deepseek_client, PromptTemplates
from ..models.lol import Match, GameState, TimelineEvent, PlayerState

logger = logging.getLogger(__name__)


# ============================================================================
# Response Models
# ============================================================================

class CriticalMoment(BaseModel):
    """A critical decision point in the match."""
    timestamp: int = Field(description="Game time in seconds")
    timestamp_formatted: str = Field(description="Formatted time like '24:15'")
    event_type: str = Field(description="FIGHT, OBJECTIVE, DEATH, ROTATION")
    description: str
    decision_made: str
    outcome: str
    alternative_decision: Optional[str] = None
    impact_score: float = Field(ge=0, le=1, description="How impactful 0-1")


class ObjectiveAnalysis(BaseModel):
    """Analysis of objective control patterns."""
    objective_type: str = Field(description="DRAGON, BARON, TOWER, HERALD")
    secured_count: int
    contested_count: int
    success_rate: float
    key_issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class DeathAnalysis(BaseModel):
    """Analysis of death patterns."""
    total_deaths: int
    isolated_deaths: int = Field(description="Deaths without team nearby")
    pre_objective_deaths: int = Field(description="Deaths within 60s of objective")
    death_locations: List[str] = Field(description="Common death areas")
    preventable_deaths: int
    death_cost_gold: int = Field(description="Estimated gold lost from deaths")


class EconomyAnalysis(BaseModel):
    """Analysis of team economy and resources."""
    average_gold_diff: int
    power_spike_timing: List[str] = Field(description="When team hit item spikes")
    economy_management: str = Field(description="GOOD, AVERAGE, POOR")
    key_purchases: List[str]
    missed_opportunities: List[str]


class MacroReviewAgenda(BaseModel):
    """Complete structured Game Review Agenda for coaches."""
    status: str = "success"
    match_id: str
    duration_formatted: str
    winner: str
    
    # Executive Summary
    executive_summary: str = Field(description="2-3 sentence match overview")
    key_takeaways: List[str] = Field(description="Top 3-5 actionable insights")
    
    # Detailed Analysis Sections
    critical_moments: List[CriticalMoment] = Field(
        description="Key decision points to review"
    )
    objective_analysis: List[ObjectiveAnalysis] = Field(
        description="Objective control breakdown"
    )
    death_analysis: DeathAnalysis
    economy_analysis: EconomyAnalysis
    
    # Recommendations
    priority_review_points: List[str] = Field(
        description="What coach should focus VOD review on"
    )
    training_recommendations: List[str] = Field(
        description="Practice/scrimmage focus areas"
    )
    
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MacroReviewPrompts:
    """Specialized prompts for macro review generation."""
    
    MACRO_REVIEW = """You are an elite esports coach analyst generating a Game Review Agenda.

Your task: Analyze this League of Legends match data and produce a structured review agenda that highlights:
1. Critical macro-level decision points
2. Team-wide strategic patterns and errors
3. Objective control analysis
4. Economy and resource management
5. Actionable coaching insights

Be specific with timestamps because coaches use this for VOD review.
Focus on MACRO level decisions, not mechanical micro-plays.
Every insight should be actionable - something a coach can work on with the team.

Respond in this exact JSON structure:
{
    "executive_summary": "2-3 sentence match overview",
    "key_takeaways": ["insight1", "insight2", "insight3"],
    "critical_moments": [
        {
            "timestamp": 1455,
            "timestamp_formatted": "24:15",
            "event_type": "FIGHT|OBJECTIVE|DEATH|ROTATION",
            "description": "What happened",
            "decision_made": "What team decided to do",
            "outcome": "Result of the decision",
            "alternative_decision": "What could have been done instead",
            "impact_score": 0.8
        }
    ],
    "objective_analysis": [
        {
            "objective_type": "DRAGON|BARON|TOWER|HERALD",
            "secured_count": 2,
            "contested_count": 4,
            "success_rate": 0.5,
            "key_issues": ["issue1", "issue2"],
            "recommendations": ["rec1", "rec2"]
        }
    ],
    "death_analysis": {
        "total_deaths": 15,
        "isolated_deaths": 6,
        "pre_objective_deaths": 4,
        "death_locations": ["top river", "enemy jungle"],
        "preventable_deaths": 8,
        "death_cost_gold": 4500
    },
    "economy_analysis": {
        "average_gold_diff": -1500,
        "power_spike_timing": ["First item at 12:00 (2 min late)"],
        "economy_management": "GOOD|AVERAGE|POOR",
        "key_purchases": ["note about purchases"],
        "missed_opportunities": ["could have bought X earlier"]
    },
    "priority_review_points": ["timestamp or topic to review in VOD"],
    "training_recommendations": ["specific practice focus"]
}"""


class LoLAnalyzer:
    """
    League of Legends-specific analysis engine.
    Generates structured Game Review Agendas for coaching sessions.
    Analyzes matches to identify critical decision points and strategic patterns.
    """
    
    def __init__(self):
        self.client = deepseek_client
    
    async def generate_review(
        self,
        match: Match,
        game_state: Optional[GameState] = None,
        timeline: Optional[List[TimelineEvent]] = None
    ) -> MacroReviewAgenda:
        """
        Generate a comprehensive Game Review Agenda.
        
        Args:
            match: Match data with players and outcome
            game_state: Current/final game state with positions
            timeline: Timeline events from the match
            
        Returns:
            MacroReviewAgenda with structured coaching insights
        """
        user_prompt = self._build_review_prompt(match, game_state, timeline)
        
        response = await self.client.analyze(
            system_prompt=MacroReviewPrompts.MACRO_REVIEW,
            user_prompt=user_prompt,
            response_schema={"type": "object"}
        )
        
        return self._parse_response(response, match)
    
    def _build_review_prompt(
        self,
        match: Match,
        game_state: Optional[GameState],
        timeline: Optional[List[TimelineEvent]]
    ) -> str:
        """Build detailed prompt for macro review generation."""
        
        sections = [
            "## Match Overview",
            f"Match ID: {match.match_id}",
            f"Duration: {match.duration_seconds // 60}:{match.duration_seconds % 60:02d}",
            f"Winner: {match.winner_side} side",
            "",
            "## Players"
        ]
        
        # Add player info
        for player in match.players:
            stats_info = ""
            if player.stats:
                stats_info = f" | KDA: {player.stats.kda:.1f}, CS/min: {player.stats.cs_per_min:.1f}"
            sections.append(f"- {player.name} ({player.role}) - {player.champion}{stats_info}")
        
        # Add game state if available
        if game_state:
            sections.extend([
                "",
                "## Final Game State",
                f"Game Phase: {game_state.game_phase}",
                f"Gold Difference: {game_state.gold_difference:+d}",
            ])
            
            if game_state.objective_state:
                obj = game_state.objective_state
                sections.append(f"Dragons: Blue {obj.dragons_secured.get('blue', 0)} - Red {obj.dragons_secured.get('red', 0)}")
            
            # Player states
            sections.append("")
            sections.append("## Player Final States")
            for ps in game_state.player_states:
                status = "ALIVE" if ps.alive else f"DEAD ({ps.respawn_timer}s)"
                sections.append(
                    f"- {ps.player_name} ({ps.champion}): {ps.gold}g, Lv{ps.level}, {status}"
                )
        
        # Add timeline if available
        if timeline:
            sections.extend([
                "",
                "## Key Timeline Events"
            ])
            for event in timeline[-15:]:  # Last 15 windows
                time_fmt = f"{event.window_start // 60}:{event.window_start % 60:02d}"
                events_str = ", ".join(event.events[:3])
                sections.append(f"- [{time_fmt}] {events_str}")
        
        sections.extend([
            "",
            "## Analysis Request",
            "Generate a comprehensive Game Review Agenda for this match.",
            "Focus on macro decisions, objective control, and team coordination.",
            "Identify at least 3-5 critical moments that should be reviewed.",
            "Provide specific, actionable recommendations for the coaching staff."
        ])
        
        return "\n".join(sections)
    
    def _parse_response(
        self, 
        response: Dict[str, Any],
        match: Match
    ) -> MacroReviewAgenda:
        """Parse DeepSeek response into MacroReviewAgenda."""
        
        # Parse critical moments
        critical_moments = []
        for moment in response.get("critical_moments", []):
            try:
                critical_moments.append(CriticalMoment(
                    timestamp=moment.get("timestamp", 0),
                    timestamp_formatted=moment.get("timestamp_formatted", "0:00"),
                    event_type=moment.get("event_type", "UNKNOWN"),
                    description=moment.get("description", ""),
                    decision_made=moment.get("decision_made", ""),
                    outcome=moment.get("outcome", ""),
                    alternative_decision=moment.get("alternative_decision"),
                    impact_score=moment.get("impact_score", 0.5)
                ))
            except Exception as e:
                logger.warning(f"Failed to parse critical moment: {e}")
        
        # Parse objective analysis
        objective_analysis = []
        for obj in response.get("objective_analysis", []):
            try:
                objective_analysis.append(ObjectiveAnalysis(
                    objective_type=obj.get("objective_type", "UNKNOWN"),
                    secured_count=obj.get("secured_count", 0),
                    contested_count=obj.get("contested_count", 0),
                    success_rate=obj.get("success_rate", 0.0),
                    key_issues=obj.get("key_issues", []),
                    recommendations=obj.get("recommendations", [])
                ))
            except Exception as e:
                logger.warning(f"Failed to parse objective analysis: {e}")
        
        # Parse death analysis
        death_data = response.get("death_analysis", {})
        death_analysis = DeathAnalysis(
            total_deaths=death_data.get("total_deaths", 0),
            isolated_deaths=death_data.get("isolated_deaths", 0),
            pre_objective_deaths=death_data.get("pre_objective_deaths", 0),
            death_locations=death_data.get("death_locations", []),
            preventable_deaths=death_data.get("preventable_deaths", 0),
            death_cost_gold=death_data.get("death_cost_gold", 0)
        )
        
        # Parse economy analysis
        econ_data = response.get("economy_analysis", {})
        economy_analysis = EconomyAnalysis(
            average_gold_diff=econ_data.get("average_gold_diff", 0),
            power_spike_timing=econ_data.get("power_spike_timing", []),
            economy_management=econ_data.get("economy_management", "AVERAGE"),
            key_purchases=econ_data.get("key_purchases", []),
            missed_opportunities=econ_data.get("missed_opportunities", [])
        )
        
        # Format duration
        mins = match.duration_seconds // 60
        secs = match.duration_seconds % 60
        
        return MacroReviewAgenda(
            status="success",
            match_id=match.match_id,
            duration_formatted=f"{mins}:{secs:02d}",
            winner=match.winner_side,
            executive_summary=response.get("executive_summary", "Match analysis complete."),
            key_takeaways=response.get("key_takeaways", []),
            critical_moments=critical_moments,
            objective_analysis=objective_analysis,
            death_analysis=death_analysis,
            economy_analysis=economy_analysis,
            priority_review_points=response.get("priority_review_points", []),
            training_recommendations=response.get("training_recommendations", []),
            metadata={
                "model": "deepseek-chat"
            }
        )


# Singleton instance
lol_analyzer = LoLAnalyzer()
