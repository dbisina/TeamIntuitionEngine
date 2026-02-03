"""
Quick trace of what get_macro_review and enhanced-review actually return.
"""
import asyncio
import json

async def trace():
    from app.services.grid_client import grid_client
    from app.services.valorant_analyzer import valorant_analyzer
    
    series_id = "2843071"
    
    print("[1] Fetching match and game_state...")
    match = await grid_client.get_match_for_analysis(series_id)
    game_state = await grid_client.get_game_state(series_id)
    print(f"    Match type: {type(match)}")
    print(f"    GameState type: {type(game_state)}")
    
    print("\n[2] Calling generate_macro_review_from_grid...")
    result = await valorant_analyzer.generate_macro_review_from_grid(match, game_state)
    print(f"    Result type: {type(result)}")
    print(f"    Result has 'review': {hasattr(result, 'review')}")
    print(f"    Result has 'dict': {hasattr(result, 'dict')}")
    print(f"    Result has 'model_dump': {hasattr(result, 'model_dump')}")
    
    print("\n[3] Calling result.dict()...")
    try:
        d = result.dict()
        print(f"    dict() keys: {list(d.keys())}")
        if 'review' in d:
            print(f"    d['review'] type: {type(d['review'])}")
            print(f"    d['review'] keys: {list(d['review'].keys()) if isinstance(d['review'], dict) else 'not a dict'}")
    except Exception as e:
        print(f"    dict() failed: {e}")
    
    print("\n[4] Calling result.model_dump()...")
    try:
        d = result.model_dump()
        print(f"    model_dump() keys: {list(d.keys())}")
    except Exception as e:
        print(f"    model_dump() failed: {e}")
    
    # Check what the frontend expects
    print("\n[5] Frontend expects: data.review with fields:")
    print("    - executive_summary")
    print("    - key_takeaways")
    print("    - critical_rounds")
    print("    - team_metrics")
    print("    - training_recommendations")
    
    # Now check if result.review has these
    if hasattr(result, 'review'):
        r = result.review
        print(f"\n[6] result.review has:")
        print(f"    - executive_summary: {hasattr(r, 'executive_summary')}")
        print(f"    - key_takeaways: {hasattr(r, 'key_takeaways')}")
        print(f"    - critical_rounds: {hasattr(r, 'critical_rounds')}")
        print(f"    - team_metrics: {hasattr(r, 'team_metrics')}")
        print(f"    - training_recommendations: {hasattr(r, 'training_recommendations')}")

if __name__ == "__main__":
    asyncio.run(trace())
