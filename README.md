# Team Intuition Engine (Junie)

**AI-Powered Analyst & Coach for Competitive Esports**

Team Intuition Engine is a next-generation esports analytics platform that combines real-time official match data from **GRID** with advanced AI agents to provide "Moneyball" style insights, strategic coaching, and hypothetical scenario simulations for League of Legends and VALORANT.

![Dashboard Preview](frontend/public/dashboard-preview.png)

## 🏆 For Judges: Key Features & Innovation

1.  **AI "Moneyball" Analysis**: Instead of just basic KDA, we calculate advanced metrics like **ACS (Average Combat Score)**, **KAST %** (Kill, Assist, Survive, Trade), and **Economy Impact**.
2.  **Hypothetical Simulator**: "What if we took Baron?" "What if Jett didn't peek?" Our engine simulates alternative outcomes using live game state data.
3.  **Real-Time Coaching**: The "Junie" Dashboard provides live, context-aware strategic advice ("Rotate to B", "Save Economy") based on the current flow of the match.
4.  **Multi-Title Support**: Seamlessly handles both **League of Legends** and **VALORANT** using a unified data ingestion pipeline.

---

## ⚠️ Vital Note on Data & Metrics (Why some stats are 0)

Our platform relies on the **GRID Data Portal (`api-op`)** for official esports data. For this hackathon/competition, we are operating under specific API access constraints:

### The Constraints
We have access to the **Series State API** (Snapshots) and **Central Data API** (Historical Metadata), but **FULL Event Stream History** (WebSocket replay for past matches) is limited or unavailable via the straightforward `api-op` HTTP endpoints we are using.

### Impact on Statistics
This technical constraint creates a distinction in the metrics we can calculate for **Historical/Past Matches**:

| Metric | Status | Source / Explanation |
| :--- | :--- | :--- |
| **Score / KDA** | ✅ **Accurate** | Available in the Match Snapshot (Series State). |
| **ACS (Combat Score)** | ✅ **Accurate** | Calculated from `Total Damage` / `Total Rounds`. |
| **Headshot %** | ✅ **Accurate** | Calculated from `Total Headshots` / `Total Kills`. |
| **KAST %** | ⚠️ **Limited** | Requires round-by-round event logs (e.g., "Did player X trade player Y in round 5?"). Without the event stream, this defaults to 0. |
| **First Bloods** | ⚠️ **Limited** | Requires precise timing events of who died first each round. Defaults to 0 without event stream. |

**Note**: In a live production environment with full WebSocket connectivity, these metrics would populate in real-time as events occur.

---

## 🏗️ Architecture

The system is built on a modern, decoupled architecture:
*   **Backend**: Python (FastAPI) - Handles data ingestion, statistical processing, and AI orchestration.
*   **Frontend**: Next.js (React) + TypeScript - A high-performance, responsive dashboard with "Glassmorphism" UI.
*   **AI Engine**: Integrates with LLMs (e.g., DeepSeek/OpenAI) to generate natural language insights from structured data.
*   **Data Source**: **GRID Esports API** (`api-op.grid.gg`).

### Core Services
*   `ValorantStatsProcessor`: Dedicated service for calculating complex competitive metrics.
*   `GRIDClient`: Robust client for handling GraphQL queries and WebSocket connections to GRID.
*   `ValorantAnalyzer`: Orchestrates the flow from Raw Data -> Stats -> AI Insight.

## 🚀 Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   GRID API Key

### Backend Setup
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Configure Environment
# Create .env file with:
# GRID_API_KEY=your_key_here
# GRID_API_URL=https://api-op.grid.gg/live-data-feed/series-state/graphql

# 3. Run the Server
python -m app.main
```

### Frontend Setup
```bash
cd frontend

# 1. Install Node dependencies
npm install

# 2. Run the Development Server
npm run dev
```

access the dashboard at `http://localhost:3000`.

## 🤝 Acknowledgments
Built for the Sky's The Limit hackathon using the incredible official data provided by **GRID**.
