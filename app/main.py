"""
Main entry point for the Team Intuition Engine FastAPI application.
This file initializes the FastAPI app and includes the API routes.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as api_router
from .core.config import settings
from .core.database import engine, Base
from .models import db as db_models

# Create database tables
Base.metadata.create_all(bind=engine)


def get_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        description="AI-powered coaching insights for League of Legends. Comprehensive Assistant Coach for esports teams.",
        version="1.0.0",
    )
    
    # Enable CORS for dashboard
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=settings.API_V1_STR)

    @application.get("/")
    async def root():
        return {
            "message": "Welcome to Team Intuition Engine API",
            "docs": "/docs"
        }

    return application

app = get_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

