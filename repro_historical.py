import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
# State URL (Live Feed)
STATE_URL = "https://api-op.grid.gg/live-data-feed/series-state/graphql"
# Central Data URL (Historical/Metadata)
CENTRAL_URL = "https://api-op.grid.gg/central-data/graphql"

# A series ID that definitely exists in the past. 
# We need to find one. Using one from the tests or a recent one if available.
# Let's try to fetch a recent series ID from Central Data first, then query its state.

async def get_recent_series_id():
    query = """
    {
        allSeries(first: 1, filter: { titleId: 3, types: ESPORTS }) {
            edges {
                node {
                    id
                    startTimeScheduled
                }
            }
        }
    }
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            CENTRAL_URL,
            json={"query": query},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        data = response.json()
        series = data.get("data", {}).get("allSeries", {}).get("edges", [])
        if series:
            return series[0]["node"]["id"]
    return None

async def test_state_endpoint(series_id):
    print(f"Testing Series State for ID: {series_id}")
    query = """
    query GetSeriesState($seriesId: ID!) {
        seriesState(id: $seriesId) {
            id
            started
            finished
            games {
                id
                finished
                teams {
                    score
                    players {
                        name
                        money
                    }
                }
            }
        }
    }
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            STATE_URL,
            json={"query": query, "variables": {"seriesId": series_id}},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        print(f"State Endpoint Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.text[:500]}...") # Print first 500 chars
            data = response.json()
            if data.get("data", {}).get("seriesState"):
                print("SUCCESS: State data found.")
            else:
                print("FAILURE: State data is null/empty.")
        else:
            print("Error requesting state.")

async def main():
    if not API_KEY:
        print("GRID_API_KEY not found in env.")
        return

    # 1. Get a valid recent series ID
    series_id = await get_recent_series_id()
    if not series_id:
        print("Could not fetch any series ID from Central Data.")
        return
    
    print(f"Found Series ID: {series_id}")
    
    # 2. Try to get its state
    await test_state_endpoint(series_id)

if __name__ == "__main__":
    asyncio.run(main())
