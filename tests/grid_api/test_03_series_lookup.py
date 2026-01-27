
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
URL = "https://api-op.grid.gg/central-data/graphql"

async def test_all_series_by_title(title_id=3, limit=10):
    # This queries series directly for a game title (e.g., LoL=3, VALORANT=6)
    # Using the exact updated query from grid_client.py
    query = f"""
    {{
        allSeries (
            first: {limit},
            filter: {{
                titleId: {title_id}
                types: ESPORTS
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
    
    print(f"Testing Series By Title Endpoint: {URL}")
    print(f"Query (Title ID: {title_id}, Limit: {limit}):\n{query}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            series_data = data.get('data', {}).get('allSeries', {})
            count = series_data.get('totalCount', 0)
            print(f"Response Data (Total Found: {count}):")
            edges = series_data.get('edges', [])
            
            if not edges:
                print("No series found.")
            
            for edge in edges[:5]:
                node = edge['node']
                team1 = node['teams'][0]['baseInfo']['name'] if len(node['teams']) > 0 else "TBD"
                team2 = node['teams'][1]['baseInfo']['name'] if len(node['teams']) > 1 else "TBD"
                print(f"- Series ID: {node['id']} | {team1} vs {team2} | Tournament: {node['tournament']['name']}")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    # Test for LoL (3)
    asyncio.run(test_all_series_by_title(3))
