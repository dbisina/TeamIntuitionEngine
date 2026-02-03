import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.valorant import ValorantMatch, ValorantRound, ValorantPlayerState
from app.services.valorant_stats_processor import valorant_stats

def create_mock_match():
    # Create 2 rounds of data
    # Team 1: "Sentinels"
    # Team 2: "Loud"
    
    # Round 1: Pistol, Sentinels win (Elimination)
    # TenZ gets 2 kills
    p1 = ValorantPlayerState(player_name="TenZ", agent="Jett", role="Duelist", team_side="Attack", kills=2, deaths=0, assists=0, loadout_value=800)
    p2 = ValorantPlayerState(player_name="Sacy", agent="Sova", role="Initiator", team_side="Attack", kills=1, deaths=0, assists=1, loadout_value=800)
    p3 = ValorantPlayerState(player_name="Less", agent="Viper", role="Controller", team_side="Defense", kills=0, deaths=1, assists=0, loadout_value=800)
    
    r1 = ValorantRound(
        round_number=1, 
        round_type="PISTOL", 
        attack_team="Sentinels", 
        defense_team="Loud",
        winner="Sentinels",
        win_condition="ELIMINATION",
        player_states=[p1, p2, p3],
        attack_economy=4000,
        defense_economy=4000
    )
    
    # Round 2: Eco for Loud, Full buy for Sentinels. Sentinels win.
    p1_r2 = ValorantPlayerState(player_name="TenZ", agent="Jett", role="Duelist", team_side="Attack", kills=1, deaths=0, assists=0, loadout_value=3900)
    p3_r2 = ValorantPlayerState(player_name="Less", agent="Viper", role="Controller", team_side="Defense", kills=0, deaths=1, assists=0, loadout_value=1200) # Eco
    
    r2 = ValorantRound(
        round_number=2, 
        round_type="ANTI_ECO", # Or just FORCE/FULL
        attack_team="Sentinels", 
        defense_team="Loud",
        winner="Sentinels",
        win_condition="ELIMINATION",
        player_states=[p1_r2, p3_r2],
        attack_economy=20000,
        defense_economy=6000 # Eco
    )

    return ValorantMatch(
        match_id="test_match",
        map_name="Ascent",
        team_1="Sentinels",
        team_2="Loud",
        team_1_score=2,
        team_2_score=0,
        winner="Sentinels",
        team_1_players=[p1, p2], # Incomplete list for test
        team_2_players=[p3],
        rounds=[r1, r2],
        total_rounds=2
    )

def test_stats():
    match = create_mock_match()
    
    print("\n--- Testing Player Stats (ACS) ---")
    stats = valorant_stats.process_match_stats(match)
    player_stats = stats["player_stats"]
    
    tenz = player_stats["TenZ"]
    print(f"TenZ Stats: K={tenz.kills}, D={tenz.deaths}, A={tenz.assists}")
    print(f"TenZ ACS: {tenz.average_damage_per_round} (Expected: ~ >200)")
    
    if tenz.average_damage_per_round > 0:
        print("PASS: ACS calculated")
    else:
        print("FAIL: ACS is zero")

    print("\n--- Testing KAST ---")
    kast = valorant_stats.calculate_kast(match, "TenZ")
    print(f"TenZ KAST: {kast.kast_percentage}%")
    print(f"Detail: {kast.rounds_with_kast}/{kast.total_rounds} rounds")
    
    if kast.kast_percentage == 100.0:
        print("PASS: KAST is 100% (2 kills in 2 rounds)")
    else:
        print(f"FAIL: KAST {kast.kast_percentage} != 100%")

    print("\n--- Testing Economy ---")
    eco = valorant_stats.calculate_economy_stats(match, "Sentinels")
    print(f"Pistol Win Rate: {eco.pistol_win_rate}%")
    
    if eco.pistol_win_rate == 100.0: # Won round 1
        print("PASS: Pistol WR Correct")
    else:
        print(f"FAIL: Pistol WR {eco.pistol_win_rate}%")

if __name__ == "__main__":
    test_stats()
