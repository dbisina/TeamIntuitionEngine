# Team Intuition Engine

AI-powered coaching insights for League of Legends.

## Project Structure

- `app/api`: FastAPI route definitions.
- `app/core`: Configuration and global settings.
- `app/data`: Pydantic models and mock data loader.
- `app/services`: AI logic interfaces and placeholder implementations.
- `app/main.py`: Entry point for the FastAPI application.

## Getting Started

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python -m app.main
   ```

3. Access the API documentation:
   Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

## Dashboards

- **Standard Dashboard**: Access at `/dashboard` for a general overview of team analytics.
- **Junie Assistant Coach**: Access at `/junie-dashboard` for high-level Cloud9-specific coaching insights, macro reviews, and hypothetical scenario simulations.

## API Endpoints

- `POST /api/v1/analyze/player`: Get micro-level analysis for a player.
- `POST /api/v1/review/match`: Evaluate team synergy in a match.
- `POST /api/v1/simulate/decision`: Simulate outcomes for a game decision.

## AI Pipeline

The system uses a clean architecture where AI logic is abstracted behind interfaces in `app/services`. Look for `TODO` markers in the service implementations to see where advanced ML models (PyTorch) should be integrated.
