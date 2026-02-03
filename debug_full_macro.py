"""
Comprehensive debug script to trace the entire Macro Review flow.
"""
import asyncio
import traceback
import sys

async def test_full_macro_flow():
    series_id = "2843071"
    
    print("=" * 60)
    print(f"COMPREHENSIVE MACRO REVIEW DEBUG - Series {series_id}")
    print("=" * 60)
    
    # Step 1: Test imports
    print("\n[STEP 1] Testing imports...")
    try:
        from app.services.grid_client import grid_client
        from app.services.valorant_analyzer import valorant_analyzer
        from app.models.valorant import ValorantMatch, ValorantPlayerState, EnhancedMacroReview
        print("  [OK] All imports successful")
    except Exception as e:
        print(f"  [FAIL] Import failed: {e}")
        traceback.print_exc()
        return
    
    # Step 2: Fetch match data
    print("\n[STEP 2] Fetching match data from GRID...")
    try:
        match = await grid_client.get_match_for_analysis(series_id)
        print(f"  [OK] Match fetched: {type(match)}")
    except Exception as e:
        print(f"  [FAIL] Match fetch failed: {e}")
        traceback.print_exc()
        return
    
    # Step 3: Fetch game state
    print("\n[STEP 3] Fetching game state from GRID...")
    try:
        game_state = await grid_client.get_game_state(series_id)
        print(f"  [OK] Game state fetched")
        print(f"    Teams: {game_state.team_1_name} vs {game_state.team_2_name}")
        print(f"    Score: {game_state.team_1_score}-{game_state.team_2_score}")
        print(f"    Players: {len(game_state.player_states)}")
        print(f"    Map: {game_state.map_name}")
    except Exception as e:
        print(f"  [FAIL] Game state fetch failed: {e}")
        traceback.print_exc()
        return
    
    # Step 4: Test generate_macro_review_from_grid
    print("\n[STEP 4] Generating macro review...")
    try:
        result = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
        print(f"  [OK] Review generated: {type(result)}")
        
        # Check result structure
        if hasattr(result, 'review'):
            print(f"    - review: OK (type: {type(result.review)})")
            if hasattr(result.review, 'executive_summary'):
                summary = str(result.review.executive_summary)[:100]
                print(f"      executive_summary: {summary}...")
        else:
            print(f"    - review: MISSING")
            
        if hasattr(result, 'kast_impact'):
            print(f"    - kast_impact: OK ({len(result.kast_impact)} players)")
        else:
            print(f"    - kast_impact: MISSING")
            
        if hasattr(result, 'economy_analysis'):
            print(f"    - economy_analysis: OK (type: {type(result.economy_analysis)})")
        else:
            print(f"    - economy_analysis: MISSING")
            
    except Exception as e:
        print(f"  [FAIL] Review generation failed: {e}")
        traceback.print_exc()
        return
    
    # Step 5: Test serialization (what the endpoint does)
    print("\n[STEP 5] Testing response serialization...")
    try:
        response_data = {
            "review": result.review.model_dump() if hasattr(result.review, 'model_dump') else result.review,
            "kast_impact": [k.model_dump() if hasattr(k, 'model_dump') else k for k in result.kast_impact],
            "economy_analysis": result.economy_analysis.model_dump() if result.economy_analysis and hasattr(result.economy_analysis, 'model_dump') else result.economy_analysis,
            "what_if_candidates": result.what_if_candidates if hasattr(result, 'what_if_candidates') else []
        }
        print(f"  [OK] Serialization successful")
        print(f"    Keys: {list(response_data.keys())}")
        print(f"    review type: {type(response_data['review'])}")
        print(f"    kast_impact count: {len(response_data['kast_impact'])}")
        
        # Check if 'review' has required fields
        review = response_data['review']
        required_fields = ['executive_summary', 'key_takeaways', 'team_metrics', 'training_recommendations']
        for field in required_fields:
            if field in review:
                print(f"    review.{field}: OK")
            else:
                print(f"    review.{field}: MISSING")
                
    except Exception as e:
        print(f"  [FAIL] Serialization failed: {e}")
        traceback.print_exc()
        return
    
    print("\n" + "=" * 60)
    print("ALL STEPS PASSED - Macro Review should work!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_macro_flow())
