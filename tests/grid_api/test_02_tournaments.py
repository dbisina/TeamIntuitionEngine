
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
URL = "https://api-op.grid.gg/central-data/graphql"

async def test_tournaments(title_id="3"): # Default to LoL
    query = """
    query Tournaments($titleIds: [ID!]) {
        tournaments(filter: { title: { id: { in: $titleIds } } }) {
            totalCount
            edges {
                node {
                    id
                    name
                }
            }
        }
    }
    """
    
    variables = {"titleIds": [title_id]}
    
    print(f"Testing Tournaments Endpoint: {URL}")
    print(f"Query:\n{query}")
    print(f"Variables: {variables}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query, "variables": variables},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            tournaments = data.get('data', {}).get('tournaments', {})
            count = tournaments.get('totalCount', 0)
            print(f"Response Data (Count: {count}):")
            edges = tournaments.get('edges', [])
            for edge in edges[:3]:
                t = edge['node']
                print(f"- {t['name']} (ID: {t['id']})")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    # Test for LoL (3)
    asyncio.run(test_tournaments("3"))
