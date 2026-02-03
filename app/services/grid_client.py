import logging
import json
from typing import Any, Dict, List, Optional, AsyncGenerator
import httpx
import websockets
from datetime import datetime

from ..core.config import settings
from ..models.lol import (
    Player, PlayerStats, PlayerState, Match,
    TimelineEvent, ObjectiveState, GameState
)

logger = logging.getLogger(__name__)


class GRIDClient:
    """
    Client for GRID's Data API (Central & Live).
    
    Features:
    - GraphQL for Series State & Central Data (HTTP)
    - WebSockets for Series Events (Live Streaming)
    
    URLs:
    - Series State (HTTP): https://api-op.grid.gg/live-data-feed/series-state/graphql
    - Series Events (WS): wss://api-op.grid.gg/live-data-feed/series/{SERIES_ID}?key={AUTH_KEY}
    - Central Data (HTTP): https://api-op.grid.gg/central-data/graphql
    """
    
    def __init__(self):
        self.api_key = settings.GRID_API_KEY
        # Series State - GraphQL over HTTP
        self.state_url = settings.GRID_API_URL  # https://api-op.grid.gg/live-data-feed/series-state/graphql
        # Series Events - WebSocket (using api-op)
        self.events_ws_url = "wss://api-op.grid.gg/live-data-feed/series"
        # Central Data - GraphQL over HTTP
        self.central_data_url = settings.GRID_CENTRAL_DATA_URL
        
        logger.info(f"GRID Client initialized. State: {self.state_url}, Events WS: {self.events_ws_url}")

    async def get_series_state(self, series_id: str) -> Dict[str, Any]:
        """
        Fetch current state of a series (match) from GRID via GraphQL HTTP.
        
        The state updates as actions happen during an ongoing series.
        State remains accessible after the series is finished.
        
        Args:
            series_id: GRID series identifier
            
        Returns:
            Raw GRID series state data
        """
        # Query using proper inline fragments for game-specific types
        # Note: title.name causes errors, SeriesTeamState fragments not supported consistently
        query = """
        query GetSeriesState($seriesId: ID!) {
            seriesState(id: $seriesId) {
                id
                format
                started
                finished
                startedAt
                games {
                    id
                    sequenceNumber
                    started
                    finished
                    map { name }
                    clock { currentSeconds }
                    teams {
                        ... on GameTeamStateValorant {
                            id
                            name
                            side
                            won
                            score
                            kills
                            deaths
                            players {
                                ... on GamePlayerStateValorant {
                                    id
                                    name
                                    character { id name }
                                    kills
                                    killAssistsGiven
                                    deaths
                                    alive
                                    money
                                    loadoutValue
                                    currentHealth
                                    currentArmor
                                    headshots
                                    damageDealt
                                }
                            }
                        }
                        ... on GameTeamStateLol {
                            id
                            name
                            side
                            won
                            score
                            kills
                            deaths
                            netWorth
                            players {
                                ... on GamePlayerStateLol {
                                    id
                                    name
                                    character { id name }
                                    kills
                                    killAssistsGiven
                                    deaths
                                    alive
                                    money
                                    currentHealth
                                    experiencePoints
                                    visionScore
                                }
                            }
                        }
                    }
                    segments {
                        id
                        type
                        sequenceNumber
                        started
                        finished
                    }
                }
            }
        }
        """

        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.state_url,
                    json={"query": query, "variables": {"seriesId": series_id}},
                    headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"GRID Series State API error: {e}")
            raise

    async def connect_to_series_stream(self, series_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Connect to the live series event stream via WebSocket.
        
        WebSocket URL: wss://api.grid.gg/live-data-feed/series/{SERIES_ID}?key={AUTH_KEY}
        Available up to 2 hours after the series ends.
        
        Args:
            series_id: GRID series identifier
            
        Yields:
            Real-time event messages (JSON)
        """
        uri = f"{self.events_ws_url}/{series_id}?key={self.api_key}"
        
        try:
            async with websockets.connect(uri) as websocket:
                logger.info(f"Connected to event stream for series {series_id}")
                
                # Send configuration to receive all events
                config = {
                    "rules": [{"eventTypeMatcher": {"actor": "*", "action": "*", "target": "*"}, "exclude": False}]
                }
                await websocket.send(json.dumps(config))
                
                async for message in websocket:
                    yield json.loads(message)
                    
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            raise

    async def get_series_events(self, series_id: str) -> Dict[str, Any]:
        """
        [DEPRECATED] Use connect_to_series_stream() for live events.
        Series Events are WebSocket only, not HTTP.
        """
        logger.warning("get_series_events (HTTP) is deprecated. Use connect_to_series_stream (WS) for live events.")
        return {"data": {"seriesEvents": {"events": []}}}

    
    async def get_game_state(self, series_id: str) -> GameState:
        """
        Fetch and transform GRID data into our GameState model.
        
        Args:
            series_id: GRID series identifier
            
        Returns:
            GameState ready for DeepSeek analysis
        """
        # Fetch data from GRID
        state_data = await self.get_series_state(series_id)
        events_data = await self.get_series_events(series_id)
        
        # Transform to our models
        return self._transform_to_game_state(state_data, events_data)

    async def get_titles(self) -> Dict[str, Any]:
        """Query GRID for available titles."""
        query = """
        query Titles {
            titles {
                id
                name
            }
        }
        """
        return await self._execute_central_query(query)

    async def get_tournaments(self, title_ids: List[str]) -> Dict[str, Any]:
        """Query GRID for tournaments in specific titles."""
        query = """
        query Tournaments($titleIds: [ID!]) {
            tournaments(filter: { title: { id: { in: $titleIds } } }) {
                totalCount
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
        """
        return await self._execute_central_query(query, {"titleIds": title_ids})

    async def get_series(self, tournament_id: str) -> Dict[str, Any]:
        """Query GRID for series in a specific tournament."""
        # Note: tournamentId is passed as ID! in GraphQL, which can be string or int
        # The filter uses in: [ID!]
        query = """
        query AllSeries($tournamentId: ID!) {
            allSeries(
                filter: { tournament: { id: { in: [$tournamentId] }, includeChildren: { equals: true } } }
                orderBy: StartTimeScheduled
            ) {
                totalCount
                edges {
                    node {
                        id
                        startTimeScheduled
                        teams {
                            baseInfo {
                                id
                                name
                            }
                        }
                    }
                }
                pageInfo {
                    endCursor
                    hasNextPage
                }
            }
        }
        """
        return await self._execute_central_query(query, {"tournamentId": tournament_id})

    async def get_all_series_by_title(
        self, 
        title_id: int, 
        hours: int = 168, 
        limit: int = 50,
        team_name: Optional[str] = None,
        start_time: Optional[str] = None,
        cursor: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Query GRID for all series in a specific title (game).
        
        Args:
            title_id: GRID title ID (6=VALORANT, 3=LoL, 2=CS, 1=Dota2)
            hours: Hours to look back (kept for API compatibility)
            limit: Max number of series to return (max 50)
            team_name: Optional team name to filter by (partial match)
            start_time: Optional ISO timestamp to filter series after this time
            cursor: Optional pagination cursor
            status: Optional status to filter by ('ongoing')
            
        Returns:
            GRID response with series data
        """
        # Build filter based on parameters
        filters = [f"titleId: {title_id}", "types: ESPORTS"]
        
        if start_time:
            filters.append(f'startTimeScheduled: {{ gte: "{start_time}" }}')
        
        filter_str = ", ".join(filters)
        
        # Add pagination cursor if provided
        after_clause = f', after: "{cursor}"' if cursor else ""
        
        query = f"""
        {{
            allSeries (
                first: {limit}{after_clause},
                filter: {{
                    {filter_str}
                }}
                orderBy: StartTimeScheduled
                orderDirection: DESC
            ) {{
                totalCount
                pageInfo {{
                    hasPreviousPage
                    hasNextPage
                    startCursor
                    endCursor
                }}
                edges {{
                    node {{
                        id
                        startTimeScheduled
                        title {{
                            id
                        }}
                        tournament {{
                            id
                            name
                        }}
                        teams {{
                            baseInfo {{
                                id
                                name
                            }}
                        }}
                    }}
                }}
            }}
        }}
        """
        
        result = await self._execute_central_query(query)
        
        # Filter Logic for Client-Side parameters (Team Name, Status)
        edges = result.get("data", {}).get("allSeries", {}).get("edges", [])
        
        if team_name or status:
            filtered_edges = []
            now = datetime.utcnow()
            
            for edge in edges:
                node = edge.get("node", {})
                teams = node.get("teams", [])
                
                # Check status filter 'ongoing'
                if status == 'ongoing':
                    # Must be started (start time in past)
                    # Note: 'won' field not available on allSeries, so we can only filter by time
                    # The GraphQL query already filters for startTime <= now
                    start_str = node.get("startTimeScheduled")
                    if not start_str:
                        continue
                        
                    try:
                        dt = datetime.fromisoformat(start_str.replace("Z", "+00:00")).replace(tzinfo=None)
                        if dt > now:
                            continue # Future match
                    except:
                        continue # Invalid time
                
                # Check team filter
                if team_name:
                    team_name_lower = team_name.lower()
                    match_found = False
                    for team in teams:
                        team_nm = team.get("baseInfo", {}).get("name", "").lower()
                        if team_name_lower in team_nm:
                            match_found = True
                            break
                    if not match_found:
                        continue
                
                filtered_edges.append(edge)
                
            result["data"]["allSeries"]["edges"] = filtered_edges
        
        return result

    async def _execute_central_query(self, query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a GraphQL query against GRID Central Data API."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.central_data_url,
                    json={"query": query, "variables": variables or {}},
                    headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
                    timeout=60.0
                )
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            logger.error(f"GRID Central Data API timed out after 60s")
            return {"errors": [{"message": "Request timed out"}]}
        except Exception as e:
            logger.error(f"GRID Central Data API error: {e}")
            return {"errors": [{"message": str(e)}]}

    def _transform_to_game_state(
        self, 
        state_data: Dict[str, Any], 
        events_data: Dict[str, Any]
    ) -> GameState:
        """Transform GRID data into our GameState model."""
        
        # Extract series state
        series = state_data.get("data", {}).get("seriesState", {})
        games = series.get("games", [])
        
        # Get current/latest game
        current_game = games[-1] if games else {}
        
        # Extract game time
        clock = current_game.get("clock", {})
        timestamp = clock.get("currentSeconds", 0)
        
        # Determine game phase
        if timestamp < 900:  # 15 min
            game_phase = "early"
        elif timestamp < 1800:  # 30 min
            game_phase = "mid"
        else:
            game_phase = "late"
        
        # Transform player states
        player_states = []
        game_teams = current_game.get("teams", [])
        blue_gold = 0
        red_gold = 0
        
        # Extract Team Names - PRIORITIZE series-level teams (more reliable)
        series_teams = series.get("teams", [])
        team_1_name = "Team 1"
        team_2_name = "Team 2"
        winner = None
        team_1_score = 0
        team_2_score = 0
        
        # Use series-level teams if available (has actual team names)
        if len(series_teams) >= 1:
            team_1_name = series_teams[0].get("name", "Team 1")
            team_1_score = series_teams[0].get("score", 0)
            if series_teams[0].get("won"):
                winner = team_1_name
        if len(series_teams) >= 2:
            team_2_name = series_teams[1].get("name", "Team 2")
            team_2_score = series_teams[1].get("score", 0)
            if series_teams[1].get("won"):
                winner = team_2_name
        
        # Fallback to game-level teams if series-level not available
        if team_1_name == "Team 1" and len(game_teams) >= 1:
            team_1_name = game_teams[0].get("name", "Team 1")
        if team_2_name == "Team 2" and len(game_teams) >= 2:
            team_2_name = game_teams[1].get("name", "Team 2")
        
        # Build team name mapping for player assignment
        # Map game_teams to the correct series-level team names
        teams = game_teams  # Use game_teams for player iteration

        # Create a mapping from game team index/side to the actual team names
        # This ensures player.team_name matches team_1_name/team_2_name
        team_name_map = {}
        for i, team in enumerate(teams):
            game_team_name = team.get("name", "Unknown")
            team_side = team.get("side", "").lower()

            # Match by index (first team = team_1, second = team_2)
            if i == 0:
                team_name_map[game_team_name] = team_1_name
            elif i == 1:
                team_name_map[game_team_name] = team_2_name
            else:
                team_name_map[game_team_name] = game_team_name

        for team in teams:
            team_side = team.get("side", "").lower()
            game_team_name = team.get("name", "Unknown")
            # Use the mapped name that matches series-level team names
            team_name = team_name_map.get(game_team_name, game_team_name)
            players = team.get("players", [])
            
            for player in players:
                # NEW GRID structure: fields are directly on player, not nested in state
                # For VALORANT: character { id name }, kills, killAssistsGiven, deaths, alive, money, etc.
                character = player.get("character", {})
                
                # Get stats directly from player (new structure)
                kills = player.get("kills", 0)
                deaths = player.get("deaths", 0)
                assists = player.get("killAssistsGiven", 0)
                
                # Get advanced VALORANT stats
                headshots = player.get("headshots", 0)
                damage_dealt = player.get("damageDealt", 0)
                
                # Gold/money - in new structure it's "money" directly on player
                gold = player.get("money", 0)
                if team_side == "blue":
                    blue_gold += gold
                else:
                    red_gold += gold
                
                # Get character/champion name
                champion_name = character.get("name", "Unknown")
                if not champion_name or champion_name == "Unknown":
                    champion_name = str(player.get("championId", "Unknown"))
                
                # Calculate ADR (Average Damage per Round) - use extracted team scores
                total_rounds = (team_1_score + team_2_score) or 1
                adr = damage_dealt / max(total_rounds, 1)

                
                # Headshot % - estimate from kills (real calculation needs total shots)
                # GRID gives headshots count, estimate HS% as headshots/kills ratio
                headshot_pct = (headshots / max(kills, 1)) * 100 if kills > 0 else 0.0
                
                player_state = PlayerState(
                    player_name=player.get("name", "Unknown"),
                    team_name=team_name,
                    champion=champion_name,
                    role=player.get("role", "Unknown"),
                    gold=gold,
                    level=player.get("experiencePoints", 0) // 100 or 1,  # Approx level from XP
                    position={"x": 0.0, "y": 0.0},  # Position not always available
                    vision_score=float(player.get("visionScore", 0)),
                    ultimate_available=True,  # Not easily available in new structure
                    items=[],  # Items require separate query
                    alive=player.get("alive", True),
                    respawn_timer=0,
                    # Core KDA stats from GRID
                    kills=kills,
                    deaths=deaths,
                    assists=assists,
                    # Advanced stats from GRID (real data only)
                    headshots=headshots,
                    damage_dealt=damage_dealt,
                    adr=adr,
                    headshot_pct=headshot_pct
                    # Note: first_bloods, multikills, clutch_wins, kast, acs
                    # not available from GRID Series State API - requires WebSocket events
                )
                player_states.append(player_state)



        
        # Transform objective state
        objectives = current_game.get("objectives", {})
        dragons = objectives.get("dragons", [])
        towers = objectives.get("towers", [])
        barons = objectives.get("barons", [])
        
        blue_dragons = len([d for d in dragons if d.get("team") == "blue"])
        red_dragons = len([d for d in dragons if d.get("team") == "red"])
        
        objective_state = ObjectiveState(
            dragons_secured={"blue": blue_dragons, "red": red_dragons},
            baron_alive=len(barons) == 0,  # Simplified - if no barons taken, it's alive
        )
        
        # Transform timeline events
        timeline = self._transform_events(events_data)
        
        # Map Name extraction
        map_name = current_game.get("map", {}).get("name", "Summoner's Rift")
        
        return GameState(
            timestamp=timestamp,
            game_phase=game_phase,
            # [NEW] Metadata
            team_1_name=team_1_name,
            team_2_name=team_2_name,
            # [FIX] Extract Round Score from Game Teams (not Series Score or missing fields)
            team_1_score=game_teams[0].get("score", 0) if len(game_teams) > 0 else 0,
            team_2_score=game_teams[1].get("score", 0) if len(game_teams) > 1 else 0,
            winner=winner,
            map_name=map_name,
            
            player_states=player_states,
            objective_state=objective_state,
            recent_timeline=timeline[-10:],  # Last 10 events
            gold_difference=blue_gold - red_gold
        )
    
    def _transform_events(self, events_data: Dict[str, Any]) -> List[TimelineEvent]:
        """Transform GRID events into TimelineEvent models."""
        raw_events = events_data.get("data", {}).get("seriesEvents", {}).get("events", [])
        
        # Map GRID event types to our event types
        event_type_map = {
            "team-killed-player": "KILL",
            "team-completed-destroyTower": "TOWER_DESTROYED",
            "team-killed-dragon": "DRAGON_SECURED",
            "team-killed-baron": "BARON_SECURED",
            "team-killed-herald": "HERALD_SECURED",
        }
        
        # Group events into 30-second windows
        windows: Dict[int, List[str]] = {}
        
        for event in raw_events:
            event_type = event.get("type", "")
            happened_at = event.get("happenedAt", 0)
            
            # Map to our event type
            mapped_type = event_type_map.get(event_type, event_type.upper().replace("-", "_"))
            
            # Calculate window (30-second intervals)
            window_start = (happened_at // 30) * 30
            
            if window_start not in windows:
                windows[window_start] = []
            windows[window_start].append(mapped_type)
        
        # Convert to TimelineEvent models
        timeline = []
        for window_start in sorted(windows.keys()):
            timeline.append(TimelineEvent(
                window_start=window_start,
                window_end=window_start + 30,
                events=windows[window_start]
            ))
        
        return timeline
    
    async def get_match_for_analysis(self, series_id: str) -> Match:
        """
        Fetch GRID data and create a Match object for synergy analysis.
        
        Args:
            series_id: GRID series identifier
            
        Returns:
            Match object with player data
        """
        state_data = await self.get_series_state(series_id)
        
        # Extract series state
        series = state_data.get("data", {}).get("seriesState", {})
        games = series.get("games", [])
        current_game = games[-1] if games else {}
        
        # Build players list
        players = []
        teams = current_game.get("teams", [])
        winner_side = "blue"  # Default
        
        for team in teams:
            for player in team.get("players", []):
                state = player.get("state", {})
                stats = state.get("stats", {})
                
                kills = stats.get("kills", 0)
                deaths = stats.get("deaths", 1)
                assists = stats.get("assists", 0)
                
                players.append(Player(
                    name=player.get("name", "Unknown"),
                    role=player.get("role", "Unknown"),
                    champion=str(player.get("championId", "Unknown")),
                    rank="Pro",  # Pro matches don't have rank
                    stats=PlayerStats(
                        kda=(kills + assists) / max(deaths, 1),
                        cs_per_min=stats.get("minionKills", 0) / 10.0,  # Approximate
                        vision_score=float(stats.get("wardsPlaced", 0)),
                        gold_earned=state.get("goldEarned", 0)
                    )
                ))
        
        clock = current_game.get("clock", {})
        duration = clock.get("currentSeconds", 1800)
        
        return Match(
            match_id=series_id,
            players=players,
            duration_seconds=duration,
            winner_side=winner_side
        )


# Singleton instance
grid_client = GRIDClient()

