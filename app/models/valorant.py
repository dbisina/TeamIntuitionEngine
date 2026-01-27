"""
VALORANT-specific models and utilities for Team Intuition Engine.
Extends the base models with VALORANT-specific concepts like rounds, agents, economy.
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class GameType(str, Enum):
    """Supported game types."""
    LOL = "lol"
    VALORANT = "valorant"


# ============================================================================
# VALORANT Player Models
# ============================================================================

class ValorantAgentStats(BaseModel):
    """Agent-specific statistics for a VALORANT player."""
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    first_bloods: int = 0
    first_deaths: int = 0
    headshot_percent: float = 0.0
    average_damage_per_round: float = 0.0
    clutches_won: int = 0
    clutches_attempted: int = 0


class ValorantPlayerState(BaseModel):
    """Snapshot of a VALORANT player's state in a round."""
    player_name: str
    agent: str
    role: str = Field(description="Duelist, Initiator, Controller, Sentinel")
    team_side: str = Field(description="Attack or Defense")
    
    # Combat stats
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    
    # KAST tracking
    kast: bool = Field(default=True, description="Kill/Assist/Survive/Traded this round")
    
    # Economy
    credits: int = 0
    loadout_value: int = 0
    weapon: str = "Classic"
    armor: str = "None"  # None, Light, Heavy
    
    # Abilities
    abilities_remaining: Dict[str, int] = Field(default_factory=dict)
    ultimate_points: int = 0
    ultimate_available: bool = False
    
    # State
    alive: bool = True
    health: int = 100
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})


class ValorantRoundEvent(BaseModel):
    """An event that occurred in a VALORANT round."""
    round_number: int
    timestamp_seconds: float = Field(description="Seconds into the round")
    event_type: str = Field(description="KILL, PLANT, DEFUSE, ABILITY_USE, etc.")
    actor: Optional[str] = None
    target: Optional[str] = None
    weapon: Optional[str] = None
    ability: Optional[str] = None
    location: Optional[str] = None  # A Site, B Site, Mid, etc.


class ValorantRound(BaseModel):
    """Complete state and outcome of a single round."""
    round_number: int
    round_type: str = Field(description="PISTOL, ECO, FORCE, FULL_BUY, BONUS")
    
    # Teams
    attack_team: str
    defense_team: str
    
    # Economy state at round start
    attack_economy: int = Field(description="Total team economy")
    defense_economy: int = Field(description="Total team economy")
    
    # Outcome
    winner: str
    win_condition: str = Field(description="ELIMINATION, SPIKE_DEFUSE, SPIKE_DETONATE, TIME")
    
    # Key events
    first_blood: Optional[str] = None
    first_blood_victim: Optional[str] = None
    spike_planted: bool = False
    plant_location: Optional[str] = None
    
    # Player states at round end
    player_states: List[ValorantPlayerState] = Field(default_factory=list)
    events: List[ValorantRoundEvent] = Field(default_factory=list)


class ValorantMatch(BaseModel):
    """Complete VALORANT match data."""
    match_id: str
    map_name: str
    game_mode: str = "Competitive"
    
    # Teams
    team_1: str
    team_2: str
    
    # Score
    team_1_score: int
    team_2_score: int
    winner: str
    
    # Players
    team_1_players: List[ValorantPlayerState] = Field(default_factory=list)
    team_2_players: List[ValorantPlayerState] = Field(default_factory=list)
    
    # Rounds
    rounds: List[ValorantRound] = Field(default_factory=list)
    
    # Aggregate stats
    total_rounds: int = 0
    overtime_rounds: int = 0


# ============================================================================
# VALORANT Analysis Response Models
# ============================================================================

class ValorantMicroError(BaseModel):
    """A micro-level mistake in VALORANT."""
    error_type: str = Field(description="POSITIONING, UTILITY, ECO, TIMING, AIM, COMMS")
    round_number: int
    description: str
    affected_player: str
    agent: str
    confidence: float = Field(ge=0, le=1)
    
    # VALORANT-specific impact
    kast_impact: bool = Field(description="Did this error affect KAST?")
    round_cost: str = Field(description="How likely this cost the round")
    improvement_suggestion: str


class ValorantRoundAnalysis(BaseModel):
    """Analysis of a critical round in VALORANT."""
    round_number: int
    round_type: str
    importance: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    
    # What happened
    summary: str
    key_mistakes: List[str]
    key_plays: List[str]
    
    # Economy impact
    economy_decision: str = Field(description="Was eco decision correct?")
    economy_recommendation: Optional[str] = None
    
    # Site setup/execution
    site_analysis: Optional[str] = None


class ValorantTeamMetrics(BaseModel):
    """Team-wide performance metrics for VALORANT."""
    # Round stats
    pistol_round_win_rate: float
    eco_round_win_rate: float
    full_buy_win_rate: float
    
    # Combat stats
    team_kast: float = Field(description="Team-wide KAST percentage")
    first_blood_rate: float
    first_death_rate: float
    trade_efficiency: float = Field(description="How often deaths are traded")
    
    # Site stats
    attack_win_rate: float
    defense_win_rate: float
    preferred_site: Optional[str] = None
    
    # Utility usage
    utility_usage_rate: float
    flash_assist_rate: float
    
    # Economy
    average_eco_damage: float = Field(description="Damage dealt on eco rounds")


class ValorantMacroReview(BaseModel):
    """Macro Game Review for VALORANT match."""
    status: str = "success"
    match_id: str
    map_name: str
    final_score: str
    winner: str
    
    # Executive summary
    executive_summary: str
    key_takeaways: List[str]
    
    # Round-by-round critical moments
    critical_rounds: List[ValorantRoundAnalysis] = Field(default_factory=list)
    
    # Team performance
    team_metrics: Optional[ValorantTeamMetrics] = None
    
    # Patterns detected
    attack_patterns: List[str] = Field(default_factory=list)
    defense_patterns: List[str] = Field(default_factory=list)
    eco_patterns: List[str] = Field(default_factory=list)
    
    # Micro errors
    player_errors: List[ValorantMicroError] = Field(default_factory=list)
    
    # Recommendations
    priority_review_rounds: List[int] = Field(description="Rounds to VOD review")
    training_recommendations: List[str]
    
    metadata: Dict[str, Any] = Field(default_factory=dict)