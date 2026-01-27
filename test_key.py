import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
URL = "https://api-op.grid.gg/live-data-feed/series-state/graphql"

async def test_key():
    query = """
    query GetSeriesState($seriesId: ID!) {
        seriesState(id: $seriesId) {
            id
            title
        }
    }
    """
    headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        response = await client.post(
            URL,
            json={"query": query, "variables": {"seriesId": "128491"}},
            headers=headers,
            timeout=10.0
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_key())
