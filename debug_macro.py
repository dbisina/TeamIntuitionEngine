import asyncio
import logging
from app.services.grid_client import grid_client
from app.services.valorant_stats_processor import valorant_stats
from app.models.valorant import ValorantMatch, ValorantPlayerState

# Use a known series ID or fetch one
async def get_test_series_id():
    print("Fetching a valid historical series ID...")
    try:
        res = await grid_client.get_all_series_by_title(title_id=6, limit=1) # Valorant
        series_id = res['data']['allSeries']['edges'][0]['node']['id']
        print(f"Found Series ID: {series_id}")
        return series_id
    except Exception as e:
        print(f"Failed to fetch series: {e}")
        return None

async def debug_macro():
    series_id = await get_test_series_id()
    if not series_id:
        return

    print(f"--- Debugging Macro Review for {series_id} ---")
    
    # 1. Fetch Game State (Test grid_client fix)
    try:
        game_state = await grid_client.get_game_state(series_id)
        print("Success: Fetched GameState")
        print(f"Score: {game_state.team_1_score}-{game_state.team_2_score}")
        print(f"Players: {len(game_state.player_states)}")
    except Exception as e:
        print(f"ERROR Fetching GameState: {e}")
        return

    # 2. Simulate Routes.py Conversion Logic
    try:
        print("Converting to ValorantMatch...")
        # Mocking all_players dict logic from routes.py
        all_players = []
        for ps in game_state.player_states:
            all_players.append({
                "name": ps.player_name,
                "agent": ps.champion,
                "role": ps.role, # Added missing field
                "team": ps.team_name,
                "kills": ps.kills,
                "deaths": ps.deaths,
                "assists": ps.assists,
                "damage_dealt": ps.damage_dealt,
                "headshots": ps.headshots
            })

        v_team1_players = [
            ValorantPlayerState(
                player_name=str(p["name"]), 
                agent=str(p["agent"] or "Unknown"),
                role=str(p["role"] or "Unknown"),
                team_side="Attack",
                kills=p["kills"], 
                deaths=p["deaths"], 
                assists=p["assists"], 
                damage_dealt=p["damage_dealt"], 
                headshots=p["headshots"]
            ) 
            for p in all_players if p["team"] == game_state.team_1_name
        ]
        v_team2_players = [
            ValorantPlayerState(
                player_name=str(p["name"]), 
                agent=str(p["agent"] or "Unknown"),
                role=str(p["role"] or "Unknown"),
                team_side="Defense",
                kills=p["kills"], 
                deaths=p["deaths"], 
                assists=p["assists"], 
                damage_dealt=p["damage_dealt"], 
                headshots=p["headshots"]
            ) 
            for p in all_players if p["team"] == game_state.team_2_name
        ]
        
        v_match = ValorantMatch(
            match_id=str(series_id),
            map_name="Bind", # dummy
            team_1="T1", # dummy
            team_2="T2", # dummy
            team_1_score=13,
            team_2_score=9,
            winner="T1",
            team_1_players=v_team1_players,
            team_2_players=v_team2_players,
            total_rounds=22
        )
        print("Success: Created ValorantMatch")

        # 3. Test Processor
        print("Running ValorantStatsProcessor...")
        stats = valorant_stats.process_match_stats(v_match)
        print("Success: Processed Stats")
        print("Sample Player Stats:", list(stats['player_stats'].values())[0])

    except Exception as e:
        print(f"ERROR in Conversion/Processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_macro())
