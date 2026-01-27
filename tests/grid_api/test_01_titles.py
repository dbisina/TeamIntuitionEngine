
import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
URL = "https://api-op.grid.gg/central-data/graphql"

async def test_titles():
    query = """
    query Titles {
        titles {
            id
            name
        }
    }
    """
    
    print(f"Testing Titles Endpoint: {URL}")
    print(f"Query:\n{query}")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get('errors'):
                print("GraphQL Errors:", data.get('errors'))
            
            grid_data = data.get('data')
            if not grid_data:
                print("No data in response:", data)
                return

            titles = grid_data.get('titles', [])
            print("Response Data (First 3 titles):")
            for title in titles[:3]:
                print(f"- {title['name']} (ID: {title['id']})")
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_titles())
