"""
Test script to call the macro review endpoint and capture full error.
"""
import asyncio
import traceback
from app.services.grid_client import grid_client
from app.services.valorant_analyzer import valorant_analyzer

async def test_macro_review():
    series_id = "2843071"
    
    print(f"Testing macro review for series {series_id}...")
    
    try:
        # Step 1: Get match data
        print("Step 1: Fetching match data...")
        match = await grid_client.get_match_for_analysis(series_id)
        print(f"  Match fetched: {type(match)}")
        
        # Step 2: Get game state
        print("Step 2: Fetching game state...")
        game_state = await grid_client.get_game_state(series_id)
        print(f"  Game state fetched: {game_state.team_1_name} vs {game_state.team_2_name}")
        print(f"  Score: {game_state.team_1_score}-{game_state.team_2_score}")
        print(f"  Players: {len(game_state.player_states)}")
        
        # Step 3: Generate macro review (THIS IS WHERE IT FAILS)
        print("Step 3: Generating macro review...")
        result = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
        print(f"  Review generated successfully!")
        print(f"  Executive Summary: {result.review.executive_summary[:100]}...")
        
    except Exception as e:
        print(f"\n!!! ERROR !!!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        print(f"\nFull Traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_macro_review())
