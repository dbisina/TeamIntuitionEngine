
import asyncio
import os
import json
import websockets
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
# Events are WebSocket only (api-op returns 404, using api.grid.gg)
BASE_URL = "wss://api.grid.gg/live-data-feed/series"

async def test_series_events(series_id="3"):
    uri = f"{BASE_URL}/{series_id}?key={API_KEY}"
    print(f"Testing Series Events (WebSocket): {BASE_URL}")
    print(f"Connecting to: {uri.replace(API_KEY, 'HIDDEN_KEY')}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            
            # Send configuration 
            config = {
                "rules": [{"eventTypeMatcher": {"actor": "*", "action": "*", "target": "*"}, "exclude": False}]
            }
            await websocket.send(json.dumps(config))
            print("Sent config. Listening for events...")
            
            # Try to read a few messages
            # Note: For finished series (like ID 3), this might close immediately.
            for i in range(3):
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    print(f"Message received: {data.get('type')}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for message (expected if no live events)")
                    break
                except websockets.exceptions.ConnectionClosed:
                    print("Connection closed by server (expected if series finished)")
                    break
                    
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    # Test Loop ID for League of Legends is 3
    # Use 2833796 for a recent finished match (will likely close immediately too)
    series_id = "3"
    asyncio.run(test_series_events(series_id))
