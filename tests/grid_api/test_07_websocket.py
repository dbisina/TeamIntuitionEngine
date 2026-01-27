
import asyncio
import os
import json
import websockets
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GRID_API_KEY")
# Reverting to api.grid.gg as per documentation example
BASE_URL = "wss://api.grid.gg/live-data-feed/series"

async def test_websocket_connection(series_id="2833796"):
    uri = f"{BASE_URL}/{series_id}?key={API_KEY}&useConfig=true"
    print(f"Connecting to: {uri.replace(API_KEY, 'HIDDEN_KEY')}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!")
            
            # Send configuration (optional but good for testing)
            config = {
                "rules": [
                    {
                        "eventTypeMatcher": {"actor": "*", "action": "*", "target": "*"},
                        "exclude": False,
                        "includeFullState": False 
                    }
                ]
            }
            # Docs say: "Send the configuration JSON as a text message... after connecting"
            # It implies we need useConfig=true in URL to enforce it, but we can try sending it anyway 
            # or just listen.
            
            print("Listening for events (ctrl+c to stop)...")
            
            # Listen for a few messages
            for i in range(5):
                message = await websocket.recv()
                data = json.loads(message)
                print(f"\nMessage {i+1}:")
                print(f"Type: {data.get('type')}")
                print(f"Action: {data.get('action')}")
                actor = data.get('actor', {})
                print(f"Actor: {actor.get('type')} (ID: {actor.get('id')})")
                
                # If it's a state snapshot, it might be huge
                if "seriesState" in data:
                    print("Contains full series state snapshot.")
                
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    # Test Loop ID for League of Legends is 3
    asyncio.run(test_websocket_connection("3"))
