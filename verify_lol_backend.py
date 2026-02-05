import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock, patch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock settings and imports before they happen
with patch.dict('os.environ', {'DEEPSEEK_API_KEY': 'fake_key', 'DEEPSEEK_BASE_URL': 'https://api.deepseek.com', 'DEEPSEEK_MODEL': 'deepseek-chat'}):
    # Now import app modules
    from app.models.lol import (
        Match, Player, PlayerStats, GameState, TimelineEvent, 
        EnhancedLoLMacroReview, DecisionContext
    )
    from app.services.lol_analyzer import lol_analyzer
    from app.services.lol_stats_processor import lol_stats_processor
    from app.services.simulator import HypotheticalSimulator

async def verify_backend():
    print(">>> Starting LoL Backend Verification...")
    
    # 1. Create Dummy Match Data
    match = Match(
        match_id="TEST_MATCH_1",
        game_version="14.2",
        duration_seconds=1800, # 30 mins
        winner_side="blue",
        players=[
            Player(
                puuid="p1", 
                name="Faker", 
                champion="Ahri", 
                role="MID", 
                rank="Challenger",
                team="blue",
                stats=PlayerStats(
                    kills=5, deaths=2, assists=10, 
                    total_minions_killed=250, gold_earned=13000, vision_score=40,
                    total_damage_dealt_to_champions=25000, total_damage_taken=15000
                )
            ),
            Player(
                puuid="p2", 
                name="Zeus", 
                champion="Aatrox", 
                role="TOP", 
                rank="Challenger",
                team="blue",
                stats=PlayerStats(
                    kills=3, deaths=1, assists=5, 
                    total_minions_killed=220, gold_earned=11000, vision_score=25,
                    total_damage_dealt_to_champions=20000, total_damage_taken=20000
                )
            )
        ]
    )
    
    # 2. Verify Stats Processor
    print("\n[1] Verifying Stats Processor...")
    stats_data = lol_stats_processor.process_match_stats(match)
    
    # Check Team Metrics
    metrics = stats_data['team_metrics']
    assert metrics.vision_score_per_minute > 0, "Vision Score should be calculated"
    # Assuming dragon_control_rate is a field in LoLTeamMetrics
    assert hasattr(metrics, 'dragon_control_rate'), "Dragon Control Rate missing"
    print(f"   > Team metrics calculated: {metrics}")
    
    # Check Player Stats
    p_stats = stats_data['player_stats']
    assert len(p_stats) == 2, "Should have 2 players"
    # ExpandedPlayerStats uses 'kda' as string "7.50" or similar based on analyzer logic
    # Checking if it exists. Note: stats_processor might return dicts OR objects.
    # The error showed LoLTeamMetrics object, so p_stats items are likely ExpandedPlayerStats objects.
    assert p_stats[0].kda, "Faker KDA should be present"
    print(f"   > Player stats calculated: {p_stats[0].player_name} KDA={p_stats[0].kda}")

    # 3. Verify Enhanced Analyzer
    print("\n[2] Verifying Enhanced Macro Review...")
    
    # Mock DeepSeek response
    mock_ai_response = {
        "executive_summary": "Great game.",
        "key_takeaways": ["Take bases", "Ward more"],
        "critical_moments": [
            {
                "timestamp": 1200, "timestamp_formatted": "20:00",
                "event_type": "FIGHT", "description": "Baron fight",
                "decision_made": "Engage", "outcome": "Won",
                "impact_score": 0.9
            }
        ],
        "training_recommendations": ["Practice CS"]
    }
    
    # Patch client.analyze
    with patch('app.services.deepseek_client.deepseek_client.analyze', new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_ai_response
        
        enhanced_review = await lol_analyzer.generate_enhanced_review(match)
        
        assert isinstance(enhanced_review, EnhancedLoLMacroReview), "Should return EnhancedLoLMacroReview"
        assert enhanced_review.match_id == "TEST_MATCH_1"
        assert len(enhanced_review.critical_moments) == 1
        assert enhanced_review.team_metrics.vision_score_per_minute == metrics.vision_score_per_minute
        print("   > Enhanced Macro Review generated successfully.")
        print(f"   > Merged AI Summary: {enhanced_review.executive_summary}")
        print(f"   > Merged Stats: {enhanced_review.team_metrics}")

    # 4. Verify Hypothetical Simulator
    print("\n[3] Verifying Hypothetical Simulator...")
    simulator = HypotheticalSimulator()
    
    decision_context = DecisionContext(
        current_timestamp=1200,
        game_state="Dragon Spawning",
        player_location="Mid Lane",
        nearby_objectives=["Dragon"],
        available_actions=["Contest", "Give"]
    )
    
    mock_sim_response = {
        "scenario_analysis": {
            "primary_scenario": {
                "scenario": "Contest",
                "success_probability": 0.7,
                "expected_outcome": "Win fight",
                "reasoning": "Gold lead"
            },
            "alternative_scenario": {
                "scenario": "Give",
                "success_probability": 0.3
            }
        },
        "recommendation": "Contest",
        "reasoning_summary": "Better scaling"
    }

    with patch('app.services.deepseek_client.deepseek_client.analyze', new_callable=AsyncMock) as mock_analyze_sim:
        mock_analyze_sim.return_value = mock_sim_response
        
        sim_result = await simulator.simulate_decision(decision_context)
        
        assert sim_result.primary_scenario.scenario == "Contest"
        assert sim_result.primary_scenario.success_probability == 0.7
        print("   > Simulation result parsed correctly.")
        print(f"   > Recommendation: {sim_result.recommendation}")

    print("\n>>> ALL CHECKS PASSED <<<")

if __name__ == "__main__":
    asyncio.run(verify_backend())
