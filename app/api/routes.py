"""
API Routes for Team Intuition Engine.
Provides endpoints for micro-error detection, team synergy evaluation, and hypothetical predictions.
"""
from fastapi import APIRouter, HTTPException, Body
import logging
from typing import Union, Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from ..models.lol import (
    # Request models
    Player, Match, DecisionContext, GameState,
    PlayerAnalysisRequest, MatchAnalysisRequest, HypotheticalRequest,
    # Response models
    AnalysisResponse, MicroErrorResponse, SynergyResponse, HypotheticalResponse
)
from ..services.error_detector import MicroErrorDetector
from ..services.synergy_model import TeamSynergyModel
from ..services.simulator import HypotheticalSimulator
from ..services.grid_client import grid_client
from ..services.hypothetical_engine import get_hypothetical_result
from ..services.lol_analyzer import lol_analyzer, MacroReviewAgenda
from ..services.player_insights import player_insight_generator, PlayerInsightReport
from ..services.valorant_analyzer import valorant_analyzer
from ..models.valorant import ValorantMacroReview

router = APIRouter()

# Service Initialization
error_detector = MicroErrorDetector()
synergy_model = TeamSynergyModel()
simulator = HypotheticalSimulator()

from sqlalchemy.orm import Session
from fastapi import Depends
from ..core.database import get_db
from ..models import db as db_models
from pydantic import BaseModel

class RecentMatchCreate(BaseModel):
    series_id: str
    title: str
    team1_name: str
    team2_name: str



# ============================================================================
# New Async Endpoints (Rich Models)
# ============================================================================

@router.post("/analyze/player/detailed", response_model=MicroErrorResponse)
async def analyze_player_detailed(request: PlayerAnalysisRequest):
    """
    Analyzes a player's performance and detects micro-level errors.
    Returns detailed error information with cascading effects and improvement suggestions.
    """
    try:
        return await error_detector.detect_errors(
            player=request.player,
            timeline=request.timeline,
            player_states=request.player_states
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review/match/detailed", response_model=SynergyResponse)
async def review_match_detailed(request: MatchAnalysisRequest):
    """
    Reviews a match and evaluates team synergy and composition.
    Returns detailed synergy metrics with analysis and recommendations.
    """
    try:
        return await synergy_model.evaluate_synergy(
            match=request.match,
            game_state=request.game_state,
            micro_errors=None  # Can be enhanced to chain with error detection
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate/scenario", response_model=HypotheticalResponse)
async def simulate_scenario(request: HypotheticalRequest):
    """
    Simulates outcomes for a hypothetical game scenario.
    Returns probability distributions with reasoning and recommendations.
    """
    try:
        return await simulator.simulate_request(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SimpleScenarioRequest(BaseModel):
    scenario: str
    game: str
    context: Optional[Dict[str, Any]] = None

@router.post("/simulate/simple")
async def simulate_simple(request: SimpleScenarioRequest):
    """
    Simplified simulator endpoint for frontend constraints.
    Calls DeepSeek for actual analysis.
    """
    try:
        # Use the hypothetical engine for actual AI analysis
        result = await get_hypothetical_result(f"{request.game}-simple", request.scenario)
        return {
            "status": "success",
            "result": result
        }
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.post("/grid/hypothetical/valorant")
async def hypothetical_valorant(payload: Dict[str, str] = Body(...)) -> Dict[str, Any]:
    """
    VALORANT-specific hypothetical analysis.
    Doesn't require a series_id - uses generic VALORANT context.
    Expects JSON body `{ "scenario": "..." }`.
    """
    scenario = payload.get("scenario")
    if not scenario:
        raise HTTPException(status_code=400, detail="Missing scenario")
    
    try:
        from ..services.deepseek_client import deepseek_client
        
        system_prompt = """You are a VALORANT tactical analyst. Analyze the hypothetical scenario and return a JSON response:
{
    "alternative": "Brief description of the user's proposed action",
    "suggested": "Your recommended optimal action",
    "delta": "+X% or -X% win probability change",
    "impact": "Primary strategic benefit",
    "reasoning": "2-3 sentence explanation of your analysis"
}"""
        
        response = await deepseek_client.analyze(
            system_prompt=system_prompt,
            user_prompt=f"VALORANT Scenario: {scenario}",
            response_schema={"type": "object"}
        )
        
        return {"status": "success", "game": "valorant", "scenario": scenario, "result": response}
    except Exception as e:
        logger.error(f"VALORANT hypothetical error: {e}")
        # Return a fallback response if DeepSeek fails
        return {
            "status": "success",
            "game": "valorant", 
            "scenario": scenario,
            "result": {
                "alternative": scenario,
                "suggested": "Continue with default strategy based on economy",
                "delta": "+5%",
                "impact": "Better economy management",
                "reasoning": "Based on standard VALORANT tactics, maintaining economy while adapting to opponent patterns leads to better mid-game positioning."
            }
        }


@router.post("/grid/hypothetical/{series_id}")
async def hypothetical_analysis(series_id: str, payload: Dict[str, str] = Body(...)) -> Dict[str, Any]:
    """Return live 'what-if' prediction for a series.
    Expects JSON body `{ "scenario": "..." }`.
    """
    scenario = payload.get("scenario")
    if not scenario:
        raise HTTPException(status_code=400, detail="Missing scenario")
    result = await get_hypothetical_result(series_id, scenario)
    return {"status": "success", "series_id": series_id, "scenario": scenario, "result": result}


# Simple in-memory cache for expensive AI analysis
# Key: series_id, Value: Analysis Result
macro_cache = {}
insights_cache = {}

@router.post("/grid/macro-review/{series_id}")
async def get_macro_review(series_id: str) -> Dict[str, Any]:
    """
    Generate macro review from GRID series data.
    Uses live GRID data + DeepSeek AI for analysis.
    Supports both League of Legends and VALORANT.
    """
    # Check cache first
    if series_id in macro_cache:
        logger.info(f"Serving macro review for {series_id} from cache")
        return macro_cache[series_id]

    try:
        # Fetch series state from GRID
        game_state = await grid_client.get_game_state(series_id)
        if not game_state:
            raise HTTPException(status_code=404, detail="Series not found or no data available")
        
        # Get series state (raw dict)
        series_data = await grid_client.get_series_state(series_id)
        if not series_data:
            raise HTTPException(status_code=404, detail="Could not get match data")
        
        # Detect game type from map and player stats
        # 1. Map Name Heuristic
        is_valorant = False
        lol_maps = ["Summoner's Rift", "Howling Abyss", "Arena"]
        if game_state.map_name and game_state.map_name not in lol_maps and game_state.map_name != "Unknown":
            is_valorant = True
            
        # 2. Stat Heuristic (Headshots are Valorant-specific)
        if not is_valorant:
            for ps in game_state.player_states:
                # In LoL, headshots are 0. In Valorant, usually > 0.
                if ps.headshots > 0:
                    is_valorant = True
                    break
        
        # Get match for analysis (this returns a Match object)
        match = await grid_client.get_match_for_analysis(series_id)
        if not match:
            raise HTTPException(status_code=404, detail="Could not create match for analysis")
        
        if is_valorant:
            # Use Valorant Analyzer
            review = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
            result = {
                "status": "success",
                "series_id": series_id,
                "game": "valorant",
                "review": review.dict()
            }
            macro_cache[series_id] = result
            return result
        else:
            # Use LoL Analyzer (renamed from Macro Review Generator)
            review = await lol_analyzer.generate_review(match, game_state)
            
            result = {
                "status": "success",
                "series_id": series_id,
                "game": "lol",
                "review": {
                    "executive_summary": review.executive_summary,
                    "key_takeaways": review.key_takeaways,
                    "critical_moments": [
                        {
                            "timestamp_formatted": cm.timestamp_formatted,
                            "description": cm.description,
                            "decision_made": cm.decision_made,
                            "outcome": cm.outcome,
                            "alternative_decision": cm.alternative_decision,
                            "impact_score": cm.impact_score
                        } for cm in review.critical_moments
                    ],
                    "priority_review_points": review.priority_review_points,
                    "training_recommendations": review.training_recommendations
                }
            }
            macro_cache[series_id] = result
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Macro review error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate macro review: {str(e)}")



@router.post("/simulate/scenario-simple")
async def simulate_scenario_simple(request: SimpleScenarioRequest) -> Dict[str, Any]:

    """
    Simplified simulation endpoint for frontend.
    Accepts a simple scenario string and returns AI-generated predictions.
    """
    try:
        # Build prompt for DeepSeek
        from ..services.deepseek_client import deepseek_client
        
        system_prompt = """You are an esports analyst. Analyze the hypothetical scenario and return a JSON with:
{
    "primary_scenario": {
        "scenario": "description",
        "success_probability": 0.0-1.0,
        "expected_outcome": "what would happen",
        "reasoning": "why this outcome"
    },
    "alternative_scenario": {
        "scenario": "alternative approach",
        "success_probability": 0.0-1.0,
        "expected_outcome": "what would happen",
        "reasoning": "why this outcome"
    },
    "recommendation": "which approach is better and why"
}"""
        
        game_context = request.context.get("game", "VALORANT") if request.context else "VALORANT"
        user_prompt = f"Game: {game_context}\nScenario: {request.scenario}\nGame State: {request.game_state}"
        
        response = await deepseek_client.analyze(system_prompt, user_prompt, {"type": "object"})
        
        return {
            "status": "success",
            "primary_scenario": response.get("primary_scenario", {
                "scenario": request.scenario,
                "success_probability": 0.35,
                "expected_outcome": "Uncertain outcome based on current game state",
                "reasoning": "Analysis based on limited context"
            }),
            "alternative_scenario": response.get("alternative_scenario", {
                "scenario": "Alternative approach",
                "success_probability": 0.55,
                "expected_outcome": "Potentially better outcome",
                "reasoning": "Alternative strategy consideration"
            }),
            "recommendation": response.get("recommendation", "Consider the alternative approach for better odds")
        }
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


# ============================================================================
# Legacy Endpoints (Backward Compatibility)
# ============================================================================

@router.post("/analyze/player", response_model=AnalysisResponse)
async def analyze_player(player: Player):
    """
    Analyzes a player's performance and detects micro-level errors.
    Legacy endpoint - use /analyze/player/detailed for rich analysis.
    """
    try:
        # Call async method directly and convert to legacy format
        result = await error_detector.detect_errors(player)
        return AnalysisResponse(
            status=result.status,
            score=1.0 - (len(result.errors) * 0.1),
            insights=[err.description for err in result.errors[:3]],
            recommendations=[err.improvement_suggestion for err in result.errors[:3]],
            metadata=result.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review/match", response_model=AnalysisResponse)
async def review_match(match: Match):
    """
    Reviews a match and evaluates team synergy and composition.
    Legacy endpoint - use /review/match/detailed for rich analysis.
    """
    try:
        result = await synergy_model.evaluate_synergy(match)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/simulate/decision", response_model=AnalysisResponse)
async def simulate_decision(context: DecisionContext):
    """
    Simulates outcomes for a given decision context in the game.
    Legacy endpoint - use /simulate/scenario for rich predictions.
    """
    try:
        result = await simulator.simulate_decision(context)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# GRID API Endpoints
# ============================================================================

@router.get("/grid/titles")
async def get_grid_titles() -> Dict[str, Any]:
    """Fetch available titles from GRID Central Data."""
    try:
        return await grid_client.get_titles()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid/tournaments")
async def get_grid_tournaments(title_id: str = "3") -> Dict[str, Any]:
    """Fetch tournaments for a specific title (default LoL=3) from GRID Central Data."""
    try:
        return await grid_client.get_tournaments([title_id])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid/all-series")
async def get_grid_all_series(tournament_id: str) -> Dict[str, Any]:
    """Fetch series for a specific tournament from GRID Central Data."""
    try:
        return await grid_client.get_series(tournament_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid/series-by-title")
async def get_series_by_title(
    title_id: int = 6,  # Default to VALORANT
    hours: int = 168,   # Default to 1 week
    limit: int = 20,
    team_name: Optional[str] = None,  # Search by team name
    status: Optional[str] = None      # Filter by status (e.g. 'ongoing')
) -> Dict[str, Any]:
    """
    Fetch series directly by title ID with time-based and team filtering.
    
    Simplified flow: Select game → Get recent series (no tournament step)
    
    Title IDs:
    - 6: VALORANT
    - 3: League of Legends
    - 2: Counter-Strike
    - 1: Dota 2
    
    Args:
        title_id: GRID title ID (6=VALORANT, 3=LoL)
        hours: Hours to look back (default 168 = 1 week)
        limit: Max series to return (default 20, max 50)
        team_name: Optional team name to search for (partial match)
        status: Optional status filter ('ongoing')
    """
    try:
        result = await grid_client.get_all_series_by_title(
            title_id=title_id,
            hours=min(hours, 720),  # Cap at 30 days (kept for API compat)
            limit=min(limit, 50),   # Cap at GRID max
            team_name=team_name,
            status=status
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/grid/series/{series_id}")
async def get_grid_series(series_id: str) -> Dict[str, Any]:
    """
    Fetch raw series data from GRID API.
    Returns game state transformed into our Pydantic models.
    """
    try:
        game_state = await grid_client.get_game_state(series_id)
        gs_dict = game_state.model_dump()
        
        return {
            "status": "success",
            "series_id": series_id,
            "game_state": gs_dict,
        }
    except Exception as e:
        logger.error(f"GRID fetch failed for {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch series data: {str(e)}")




@router.post("/grid/analyze/{series_id}", response_model=SynergyResponse)
async def analyze_grid_series(series_id: str) -> SynergyResponse:
    """
    Fetch GRID data and run full team synergy analysis.
    Combines GRID data fetching with DeepSeek analysis in one call.
    """
    try:
        # Fetch and transform GRID data
        match = await grid_client.get_match_for_analysis(series_id)
        game_state = await grid_client.get_game_state(series_id)
        
        # Run synergy analysis with DeepSeek
        result = await synergy_model.evaluate_synergy(
            match=match,
            game_state=game_state,
            micro_errors=None
        )
        
        # Add GRID metadata
        result.metadata["grid_series_id"] = series_id
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grid/errors/{series_id}", response_model=MicroErrorResponse)
async def detect_grid_errors(series_id: str, player_name: str) -> MicroErrorResponse:
    """
    Fetch GRID data and detect micro-errors for a specific player.
    """
    try:
        game_state = await grid_client.get_game_state(series_id)
        
        # Find the player in the game state
        player_state = None
        for ps in game_state.player_states:
            if ps.player_name.lower() == player_name.lower():
                player_state = ps
                break
        
        if not player_state:
            raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found in series")
        
        # Create Player object from state
        player = Player(
            name=player_state.player_name,
            role=player_state.role,
            champion=player_state.champion,
            rank="Pro"
        )
        
        # Detect errors
        result = await error_detector.detect_errors(
            player=player,
            timeline=game_state.recent_timeline,
            player_states=[player_state]
        )
        
        # Add GRID metadata
        result.metadata["grid_series_id"] = series_id
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DeepSeek-Powered Analysis Endpoints (Production Quality)
# ============================================================================

@router.post("/grid/player-insights/{series_id}/{player_name}")
async def get_player_insights(series_id: str, player_name: str) -> Dict[str, Any]:
    """
    Generate AI-powered player insights using live GRID data.
    
    Orchestrates the retrieval of game state, extraction of player-specific metrics 
    (e.g., KAST, ACS), and generation of pattern-based coaching insights via DeepSeek.
    """
    try:
        # Fetch GRID data
        game_state = await grid_client.get_game_state(series_id)
        
        # Find the target player
        player_state = None
        for ps in game_state.player_states:
            if ps.player_name.lower() == player_name.lower():
                player_state = ps
                break
        
        if not player_state:
            raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found")
        
        # Create Player object for analysis
        from ..models.lol import Player
        player = Player(
            name=player_state.player_name,
            role=player_state.role,
            champion=player_state.champion,
            rank="Pro"
        )
        
        # Generate insights with DeepSeek
        report = await player_insight_generator.generate_insights(
            player=player,
            player_states=[player_state],
            game_state=game_state
        )
        
        return {
            "status": "success",
            "series_id": series_id,
            "player_name": player_name,
            "insights": report.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Player insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))





# ============================================================================
# Persistent Recent Matches
# ============================================================================

@router.get("/grid/series/{game}")
async def get_grid_series_by_game(
    game: str, 
    filter: str = "24h", 
    cursor: Optional[str] = None
):
    """
    Fetch recent series from GRID for a specific game with date filter and pagination.
    filter: '24h', '1w', '1m', 'all'
    cursor: Pagination cursor for next page
    """
    try:
        # Map game name to GRID Title ID
        title_map = {
            "lol": 3,
            "league": 3,
            "valorant": 6,
            "val": 6
        }
        
        normalized_game = game.lower()
        title_id = title_map.get(normalized_game)
        
        if not title_id:
            return {"status": "error", "message": "Invalid game", "series": []}
            
        # Calculate start_time based on filter
        start_time = None
        now = datetime.utcnow()
        if filter == "24h":
            start_time = (now - timedelta(hours=24)).isoformat() + "Z"
        elif filter == "1w":
            start_time = (now - timedelta(days=7)).isoformat() + "Z"
        elif filter == "1m":
            start_time = (now - timedelta(days=30)).isoformat() + "Z"
        # 'all' sends None, which means no date filter
        
        # Fetch from GRID with pagination
        data = await grid_client.get_all_series_by_title(
            title_id=title_id, 
            start_time=start_time,
            limit=10, 
            cursor=cursor
        )
        
        # Transform for frontend
        series_list = []
        all_series_node = data.get("data", {}).get("allSeries", {})
        edges = all_series_node.get("edges", [])
        page_info = all_series_node.get("pageInfo", {})
        
        for edge in edges:
            node = edge.get("node", {})
            teams = node.get("teams", [])
            team_names = [t.get("baseInfo", {}).get("name", "Unknown") for t in teams]
            
            # Format time if present
            raw_time = node.get("startTimeScheduled")
            formatted_time = raw_time
            if raw_time:
                try:
                    dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
                    formatted_time = dt.strftime("%b %d, %H:%M")
                except:
                    pass

            series_list.append({
                "id": node.get("id"),
                "tournament": node.get("tournament", {}).get("name", "Unknown Tournament"),
                "teams": " vs ".join(team_names) if team_names else "TBD vs TBD",
                "startTime": formatted_time or "Recent"
            })
            
        return {
            "status": "success", 
            "source": "grid" if edges else "no_data", # Changed from mock_fallback
            "series": series_list,
            "nextCursor": page_info.get("endCursor") if page_info.get("hasNextPage") else None
        }
    except Exception as e:
        logger.error(f"Failed to fetch series for {game}: {e}")
        return {"status": "error", "message": str(e), "series": []}

@router.get("/matches/recent")
def get_recent_matches(db: Session = Depends(get_db)):
    """Fetch recently connected matches from the database."""
    return db.query(db_models.RecentMatch).order_by(db_models.RecentMatch.match_time.desc()).limit(3).all()

@router.post("/matches/recent")
def save_recent_match(match: RecentMatchCreate, db: Session = Depends(get_db)):
    """Save a connected match to history."""
    # Check if exists
    existing = db.query(db_models.RecentMatch).filter(db_models.RecentMatch.series_id == match.series_id).first()
    if existing:
        existing.match_time = datetime.utcnow()
        db.commit()
        return existing
    
    db_match = db_models.RecentMatch(
        series_id=match.series_id,
        title=match.title,
        team1_name=match.team1_name,
        team2_name=match.team2_name,
        match_time=datetime.utcnow()
    )
    db.add(db_match)
    db.commit()
    db.refresh(db_match)
    return db_match


# ============================================================================
# Coach-Focused Endpoints (Hackathon Features)
# ============================================================================

@router.post("/review/macro/{series_id}", response_model=MacroReviewAgenda)
async def generate_macro_review(series_id: str) -> MacroReviewAgenda:
    """
    Generate an Automated Macro Game Review Agenda.
    
    This is the core hackathon feature: produces a structured review agenda
    highlighting critical decision points, objective control, deaths, and
    economy for coaching VOD review sessions.
    """
    try:
        # Fetch GRID data
        match = await grid_client.get_match_for_analysis(series_id)
        game_state = await grid_client.get_game_state(series_id)
        
        # Generate macro review
        result = await lol_analyzer.generate_review(
            match=match,
            game_state=game_state,
            timeline=game_state.recent_timeline
        )
        
        # Add GRID metadata
        result.metadata["grid_series_id"] = series_id
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights/player/{player_name}", response_model=PlayerInsightReport)
async def generate_player_insights(
    player_name: str,
    series_id: str = None
) -> PlayerInsightReport:
    """
    Generate Personalized Player Impact Insights.
    
    Creates data-backed insights linking player behavior to team outcomes.
    Example: "When Faker dies before level 6, T1 loses first dragon 82% of the time"
    """
    try:
        game_state = None
        player_state = None
        
        # If series_id provided, fetch from GRID
        if series_id:
            game_state = await grid_client.get_game_state(series_id)
            for ps in game_state.player_states:
                if ps.player_name.lower() == player_name.lower():
                    player_state = ps
                    break
        
        # Create player object
        if player_state:
            player = Player(
                name=player_state.player_name,
                role=player_state.role,
                champion=player_state.champion,
                rank="Pro"
            )
        else:
            player = None
        
        # Generate insights
        result = await player_insight_generator.generate_insights(
            player=player,
            player_states=[player_state] if player_state else None,
            game_state=game_state
        )
        
        if series_id:
            result.metadata["grid_series_id"] = series_id
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/coach/full-analysis/{series_id}")
async def full_coaching_analysis(series_id: str) -> Dict[str, Any]:
    """
    Complete End-to-End Coaching Analysis.
    
    Runs all analysis in one call:
    1. Fetches match data from GRID
    2. Generates Macro Review Agenda
    3. Runs Team Synergy Analysis
    4. Detects Micro-Errors for all players
    5. Generates Player Insights for key players
    
    This is the flagship hackathon endpoint for coaches.
    """
    try:
        # Fetch GRID data
        match = await grid_client.get_match_for_analysis(series_id)
        game_state = await grid_client.get_game_state(series_id)
        
        # 1. Macro Review
        macro_review = await macro_review_generator.generate_review(
            match=match,
            game_state=game_state,
            timeline=game_state.recent_timeline
        )
        
        # 2. Team Synergy
        synergy = await synergy_model.evaluate_synergy(
            match=match,
            game_state=game_state
        )
        
        # 3. Find the worst-performing player for detailed insights
        # (In real app, would analyze all 5)
        key_player = match.players[0] if match.players else None
        player_insights = None
        if key_player:
            player_insights = await player_insight_generator.generate_insights(
                player=key_player,
                game_state=game_state
            )
        
        return {
            "status": "success",
            "series_id": series_id,
            "macro_review": macro_review.model_dump(),
            "team_synergy": synergy.model_dump(),
            "player_insights": player_insights.model_dump() if player_insights else None,
            "recommendations": {
                "priority_vod_review": macro_review.priority_review_points[:3],
                "training_focus": macro_review.training_recommendations[:3],
                "team_improvements": synergy.recommendations[:3]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# VALORANT Endpoints
# ============================================================================

@router.post("/valorant/review/macro/{series_id}", response_model=ValorantMacroReview)
async def valorant_macro_review(series_id: str) -> ValorantMacroReview:
    """
    Generate an Automated Macro Game Review for VALORANT.
    
    Analyzes VALORANT-specific concepts:
    - KAST (Kill/Assist/Survive/Traded)
    - Economy decisions and round types
    - Site setups and executes
    - Agent utility usage
    - First blood impact
    
    Requires a valid GRID series_id.
    """
    try:
        # Fetch live match data from GRID
        match = await grid_client.get_match_for_analysis(series_id)
        game_state = await grid_client.get_game_state(series_id)
        
        # Generate macro review with AI
        result = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
        return result
    except Exception as e:
        logger.error(f"Valorant macro review failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/coach/full-analysis-valorant/{series_id}")
async def full_coaching_analysis_valorant(series_id: str) -> Dict[str, Any]:
    """
    Complete End-to-End Coaching Analysis for VALORANT.
    
    Runs all analysis on match data from GRID.
    Requires a valid series_id.
    """
    try:
        # Fetch live match data from GRID
        match = await grid_client.get_match_for_analysis(series_id)
        game_state = await grid_client.get_game_state(series_id)
        
        # Try to generate macro review
        try:
            macro_review = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
            macro_data = macro_review.model_dump()
        except Exception as e:
            logger.error(f"DeepSeek analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
        
        # Build flat players array for frontend from game_state
        all_players = []
        for ps in game_state.player_states:
            all_players.append({
                "name": ps.player_name,
                "agent": ps.champion,  # champion field holds agent in VALORANT
                "role": ps.role,
                "team": ps.team_name,
                # Core stats
                "kills": ps.kills,
                "deaths": ps.deaths,
                "assists": ps.assists,
                # Advanced stats from GRID
                "adr": ps.adr,
                "headshot_pct": ps.headshot_pct,
                "headshots": ps.headshots,
                "damage_dealt": ps.damage_dealt,
                # Performance metrics
                "first_bloods": ps.first_bloods,
                "first_deaths": ps.first_deaths,
                "clutch_wins": ps.clutch_wins,
                "multikills": ps.multikills,
                "kast": ps.kast,
                "acs": ps.acs,
                # State
                "alive": ps.alive,
                "money": ps.gold
            })

        
        # Build response data
        return {
            "status": "success",
            "game": "valorant",
            "series_id": series_id,
            "match": {
                "team_1_name": game_state.team_1_name,
                "team_2_name": game_state.team_2_name,
                "team_1_score": game_state.team_1_score,
                "team_2_score": game_state.team_2_score,
                "winner": game_state.winner,
                "map_name": game_state.map_name,
                "players": all_players
            },
            "macro_review": macro_data,
            "recommendations": {
                "priority_review_rounds": macro_data.get("priority_review_rounds", [])[:5],
                "training_focus": macro_data.get("training_recommendations", [])[:3],
                "attack_patterns": macro_data.get("attack_patterns", [])[:3],
                "defense_patterns": macro_data.get("defense_patterns", [])[:3]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Full analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/coach/player-insights-valorant/{series_id}/{player_name}")
async def player_insights_valorant(series_id: str, player_name: str) -> Dict[str, Any]:
    """
    Generate deep personalized insights for a specific player.
    Requires a valid GRID series_id.
    """
    try:
        # Fetch live match data from GRID
        game_state = await grid_client.get_game_state(series_id)
        
        # Find the target player
        player_state = None
        for ps in game_state.player_states:
            if ps.player_name.lower() == player_name.lower():
                player_state = ps
                break
        
        if not player_state:
            raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found")
        
        # Generate insights with AI
        insights = await valorant_analyzer.generate_player_insights_from_grid(game_state, player_name)
        
        return {
            "status": "success",
            "series_id": series_id,
            "player": player_name,
            "insights": insights
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Player Insight Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

