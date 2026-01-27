"""
Database models for Team Intuition Engine.
"""
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from ..core.database import Base

class RecentMatch(Base):
    """
    Stores history of connected matches/series for quick access.
    """
    __tablename__ = "recent_matches"

    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(String, unique=True, index=True)
    title = Column(String) # e.g. "League of Legends", "Valorant"
    team1_name = Column(String)
    team2_name = Column(String)
    match_time = Column(DateTime, default=datetime.utcnow)
    
    # Optional metadata
    winner = Column(String, nullable=True)
    score = Column(String, nullable=True)
