
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
URL = "https://api-op.grid.gg/central-data/graphql"

async def test_series_by_tournament(tournament_id="756928"): # LEC Winter 2024
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
        }
    }
    """
    
    print(f"Testing Series By Tournament Endpoint: {URL}")
    print(f"Target Tournament ID: {tournament_id}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query, "variables": {"tournamentId": tournament_id}},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            series_data = data.get('data', {}).get('allSeries', {})
            count = series_data.get('totalCount', 0)
            print(f"Response Data (Count: {count}):")
            edges = series_data.get('edges', [])
            
            if not edges:
                print("No series found for this tournament.")
                
            for edge in edges[:5]:
                node = edge['node']
                team1 = node['teams'][0]['baseInfo']['name'] if len(node['teams']) > 0 else "TBD"
                team2 = node['teams'][1]['baseInfo']['name'] if len(node['teams']) > 1 else "TBD"
                print(f"- Series ID: {node['id']} | {team1} vs {team2}")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    # LEC Winter 2024 ID from test_02
    asyncio.run(test_series_by_tournament("756928"))
