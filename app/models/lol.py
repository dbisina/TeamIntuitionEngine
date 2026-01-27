"""
Pydantic data models for the Team Intuition Engine.
Defines schemas for players, matches, game state, and AI analysis responses.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Core Game Entities
# ============================================================================

class PlayerStats(BaseModel):
    """Statistical performance data for a player."""
    kda: float
    cs_per_min: float
    vision_score: float
    gold_earned: int


class Player(BaseModel):
    """Data model representing a League of Legends player."""
    name: str
    role: str
    champion: str
    rank: str
    stats: Optional[PlayerStats] = None


class Match(BaseModel):
    """Data model representing a League of Legends match."""
    match_id: str
    players: List[Player]
    duration_seconds: int
    winner_side: str  # 'blue' or 'red'


# ============================================================================
# Game State Models (for DeepSeek Analysis)
# ============================================================================

class TimelineEvent(BaseModel):
    """30-second window aggregated event for timeline analysis."""
    window_start: int  # Timestamp in seconds
    window_end: int
    events: List[str]  # e.g., "KILL", "TOWER_DESTROYED", "DRAGON_SECURED"
    description: Optional[str] = None


class PlayerState(BaseModel):
    """Snapshot of player state at a moment in time."""
    player_name: str
    champion: str
    team_name: Optional[str] = None  # Added: Team affiliation
    role: str
    gold: int
    level: int
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    vision_score: float
    ultimate_available: bool = True
    items: List[str] = Field(default_factory=list)
    summoner_spells: Dict[str, bool] = Field(default_factory=lambda: {"flash": True, "other": True})
    
    # Core KDA Stats - REQUIRED for analysis
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    
    # Raw GRID Stats
    headshots: int = 0
    damage_dealt: int = 0
    total_shots: int = 0  # For headshot % calculation
    
    # Calculated/Advanced Stats
    acs: float = 0.0  # Average Combat Score
    kast: float = 0.0  # Kill/Assist/Survive/Trade %
    adr: float = 0.0  # Average Damage per Round
    headshot_pct: float = 0.0
    clutch_wins: int = 0  # 1vX wins
    first_bloods: int = 0
    first_deaths: int = 0
    multikills: int = 0  # 3k+
    
    alive: bool = True
    respawn_timer: int = 0




class ObjectiveState(BaseModel):
    """Current state of map objectives."""
    dragons_secured: Dict[str, int] = Field(default_factory=lambda: {"blue": 0, "red": 0})
    dragon_soul: Optional[str] = None  # "infernal", "mountain", "ocean", "cloud", or None
    towers_standing: Dict[str, List[str]] = Field(
        default_factory=lambda: {
            "blue": ["top_t1", "top_t2", "top_t3", "mid_t1", "mid_t2", "mid_t3", "bot_t1", "bot_t2", "bot_t3"],
            "red": ["top_t1", "top_t2", "top_t3", "mid_t1", "mid_t2", "mid_t3", "bot_t1", "bot_t2", "bot_t3"]
        }
    )
    inhibitors_down: Dict[str, List[str]] = Field(default_factory=lambda: {"blue": [], "red": []})
    baron_alive: bool = True
    baron_timer: Optional[int] = None
    elder_dragon_alive: bool = False
    elder_timer: Optional[int] = None
    herald_alive: bool = True
    herald_timer: Optional[int] = None


class GameState(BaseModel):
    """Complete game state for comprehensive analysis."""
    timestamp: int  # Current game time in seconds
    game_phase: str = "mid"  # "early", "mid", "late"
    
    # Metadata
    team_1_name: Optional[str] = None
    team_2_name: Optional[str] = None
    team_1_score: int = 0
    team_2_score: int = 0
    winner: Optional[str] = None
    map_name: Optional[str] = None
    
    player_states: List[PlayerState] = Field(default_factory=list)
    objective_state: ObjectiveState = Field(default_factory=ObjectiveState)
    recent_timeline: List[TimelineEvent] = Field(default_factory=list)
    gold_difference: int = 0  # Positive = blue advantage


# ============================================================================
# Analysis Request Models
# ============================================================================

class PlayerAnalysisRequest(BaseModel):
    """Request for micro-error detection on a single player."""
    player: Player
    timeline: List[TimelineEvent] = Field(default_factory=list)
    player_states: List[PlayerState] = Field(default_factory=list)


class MatchAnalysisRequest(BaseModel):
    """Request for team synergy evaluation."""
    match: Match
    game_state: Optional[GameState] = None
    include_micro_errors: bool = True


class DecisionContext(BaseModel):
    """Contextual information for simulating game decisions."""
    current_timestamp: int
    game_state: str  # e.g., 'early', 'mid', 'late'
    player_location: str
    nearby_objectives: List[str]
    available_actions: List[str]


class HypotheticalRequest(BaseModel):
    """Request for what-if scenario prediction."""
    scenario_description: str
    game_state: GameState
    proposed_action: str
    alternative_actions: List[str] = Field(default_factory=list)


# ============================================================================
# AI Analysis Response Models
# ============================================================================

class MicroError(BaseModel):
    """Detected micro-level mistake with cascading effects."""
    error_type: str  # "positioning_error", "resource_mismanagement", "objective_timing", etc.
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    affected_player: str
    timestamp_window: str
    cascading_effects: List[str] = Field(default_factory=list)
    improvement_suggestion: str


class ErrorAssessment(BaseModel):
    """Overall assessment of detected errors."""
    error_frequency: str  # "low", "moderate", "high"
    primary_weakness: str
    improvement_priority: List[str] = Field(default_factory=list)
    reasoning: str


class MicroErrorResponse(BaseModel):
    """Response containing detected micro-errors and assessment."""
    status: str = "success"
    errors: List[MicroError] = Field(default_factory=list)
    overall_assessment: Optional[ErrorAssessment] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SynergyMetrics(BaseModel):
    """Quantified team synergy evaluation metrics."""
    stability_score: float = Field(ge=0.0, le=1.0)  # Team composure under pressure
    pressure_balance: float = Field(ge=-1.0, le=1.0)  # Negative = enemy pressure
    objective_control_likelihood: float = Field(ge=0.0, le=1.0)
    teamfight_strength: float = Field(ge=0.0, le=1.0)


class SynergyAnalysis(BaseModel):
    """Detailed reasoning for synergy metrics."""
    stability_reasoning: str
    pressure_reasoning: str
    objective_reasoning: str
    teamfight_reasoning: str


class MicroErrorImpact(BaseModel):
    """How individual errors impact team performance."""
    individual_to_team_correlation: float = Field(ge=0.0, le=1.0)
    most_impactful_errors: List[str] = Field(default_factory=list)
    reasoning: str


class SynergyResponse(BaseModel):
    """Response containing team synergy evaluation."""
    status: str = "success"
    synergy_metrics: SynergyMetrics
    analysis: Optional[SynergyAnalysis] = None
    communication_indicators: List[str] = Field(default_factory=list)
    micro_error_impact: Optional[MicroErrorImpact] = None
    recommendations: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScenarioOutcome(BaseModel):
    """Predicted outcome for a single scenario."""
    scenario: str
    success_probability: float = Field(ge=0.0, le=1.0)
    expected_outcome: str
    risk_factors: List[str] = Field(default_factory=list)
    optimal_execution: List[str] = Field(default_factory=list)
    reasoning: Optional[str] = None


class HypotheticalResponse(BaseModel):
    """Response containing hypothetical scenario predictions."""
    status: str = "success"
    primary_scenario: ScenarioOutcome
    alternative_scenario: Optional[ScenarioOutcome] = None
    recommendation: str  # Which scenario is recommended
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning_summary: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Legacy AnalysisResponse for backward compatibility
class AnalysisResponse(BaseModel):
    """Standardized response for AI-powered analysis results (legacy)."""
    status: str
    score: float
    insights: List[str]
    recommendations: List[str]
    metadata: dict = Field(default_factory=dict)

