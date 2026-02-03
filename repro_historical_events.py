import asyncio
import logging
import json
import httpx
from app.core.config import settings

# Setup simple logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = settings.GRID_API_KEY
STATE_URL = settings.GRID_API_URL

async def test_events_query():
    # 1. Get a valid historical series ID (Valorant)
    # We'll use a hardcoded one if fetch fails, or search.
    # Searching...
    series_id = None
    async with httpx.AsyncClient() as client:
        # Search query
        query = """
        {
            allSeries(first: 1, filter: {titleId: 6, types: ESPORTS}) {
                edges { node { id } }
            }
        }
        """
        try:
            res = await client.post(
                settings.GRID_CENTRAL_DATA_URL,
                json={"query": query},
                headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
            )
            data = res.json()
            series_id = data['data']['allSeries']['edges'][0]['node']['id']
            print(f"Using Series ID: {series_id}")
        except Exception as e:
            print(f"Failed to fetch series ID: {e}")
            return

    if not series_id:
        return

    # 2. Test fetching 'events' inside 'games' of 'seriesState'
    # This is the user's specific question: "dont the vents og to series state?"
    print("\n--- TEST 1: events field in seriesState ---")
    query_state_events = """
    query GetSeriesStateEvents($seriesId: ID!) {
        seriesState(id: $seriesId) {
            games {
                id
                # TRYING TO QUERY EVENTS HERE
                events {
                    type
                    happenedAt
                }
            }
        }
    }
    """
    
    async with httpx.AsyncClient() as client:
        res = await client.post(
            STATE_URL,
            json={"query": query_state_events, "variables": {"seriesId": series_id}},
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"}
        )
        print(f"Status: {res.status_code}")
        try:
            data = res.json()
            if 'errors' in data:
                print("GraphQL Errors (Expected if field doesn't exist):")
                for err in data['errors']:
                    print(f"- {err['message']}")
            else:
                games = data.get('data', {}).get('seriesState', {}).get('games', [])
                if games and 'events' in games[0]:
                    print(f"SUCCESS! Found {len(games[0]['events'])} events in Series State.")
                else:
                    print("No events found (but no error?).")
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(res.text)

if __name__ == "__main__":
    asyncio.run(test_events_query())
