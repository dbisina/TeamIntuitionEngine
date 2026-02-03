# ⚖️ Notes for Judges

Thank you for reviewing the **Team Intuition Engine**!

To verify our work effectively, please note the following:

## 1. Verified "Moneyball" Statistics
For the most accurate demonstration of our statistical engine, please focus on the following metrics in the **Valorant Dashboard**, which we have successfully engineered to work despite limited historical event data:
*   **ACS (Average Combat Score)**: Correctly calculated from match totals.
*   **Headshot Percentage**: Correctly derived from hit data.
*   **ADR (Average Damage per Round)**: Fully functional.
*   **Match Scores**: Accurate (e.g., 13-9).

*(Note: Metrics like `KAST` and `First Bloods` may appear as 0 for past matches because the GRID `api-op` snapshot API does not provide the historical event playback needed to compute them post-hoc.)*

## 2. Key Innovation: "What If?" Simulator
Don't miss the **Simulator** tab. This is where our AI shines:
*   It takes the current game state (gold, loadouts, map control).
*   It uses a probabilistic model to predict the outcome of alternative decisions.
*   *Example*: "What if Sentinels forced buy instead of saving?"

## 3. Real-Time Capabilities
While we are using historical matches for demonstration, the architecture is fully WebSocket-ready. The **Live Coaching** features are designed to ingest the `series-events` stream in real-time during live play.

Thank you for your time and consideration!
