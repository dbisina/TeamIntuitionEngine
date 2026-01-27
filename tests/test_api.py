from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Team Intuition Engine API", "docs": "/docs"}

def test_analyze_player():
    payload = {
        "name": "Faker",
        "role": "Mid",
        "champion": "Azir",
        "rank": "Challenger",
        "stats": {
            "kda": 4.5,
            "cs_per_min": 9.2,
            "vision_score": 15,
            "gold_earned": 16500
        }
    }
    response = client.post("/api/v1/analyze/player", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "insights" in data

def test_review_match():
    payload = {
        "match_id": "EUW1_12345",
        "players": [
            {
                "name": "Faker",
                "role": "Mid",
                "champion": "Azir",
                "rank": "Challenger"
            }
        ],
        "duration_seconds": 1800,
        "winner_side": "blue"
    }
    response = client.post("/api/v1/review/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

def test_simulate_decision():
    payload = {
        "current_timestamp": 1200,
        "game_state": "mid",
        "player_location": "Baron pit",
        "nearby_objectives": ["Baron", "Rift Herald"],
        "available_actions": ["Attack Baron", "Ward Jungle", "Push Mid"]
    }
    response = client.post("/api/v1/simulate/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
