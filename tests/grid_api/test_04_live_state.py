
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
# Using api.grid.gg/live-data-feed/series-state/graphql (HTTP)
URL = "https://api-op.grid.gg/live-data-feed/series-state/graphql"

async def test_series_state(series_id):
    query = """
    query GetSeriesState($seriesId: ID!) {
        seriesState(id: $seriesId) {
            id
            title
            startedAt
            games {
                id
                sequenceNumber
                started
                finished
                teams {
                    id
                    name
                    side
                    players {
                        id
                        name
                        role
                        championId
                        state {
                            ... on GamePlayerStateLol {
                                gold
                                level
                                alive
                                stats {
                                    kills
                                    deaths
                                    assists
                                }
                            }
                        }
                    }
                }
                clock {
                    currentSeconds
                }
            }
        }
    }
    """
    
    print(f"Testing Series State Endpoint: {URL}")
    print(f"Target Series ID: {series_id}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query, "variables": {"seriesId": series_id}},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            series = data.get('data', {}).get('seriesState', {})
            
            if not series:
                print("Series State is null. ID might be invalid or not live/available.")
                return

            print(f"Series ID: {series.get('id')}")
            print(f"Title: {series.get('title')}")
            
            games = series.get('games', [])
            print(f"Games Count: {len(games)}")
            
            if games:
                latest_game = games[-1]
                print(f"Latest Game Clock: {latest_game.get('clock', {}).get('currentSeconds')}s")
                teams = latest_game.get('teams', [])
                for team in teams:
                    print(f"Team: {team['name']} ({team['side']})")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    series_id = "2833796" 
    asyncio.run(test_series_state(series_id))
