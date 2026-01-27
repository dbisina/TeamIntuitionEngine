from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Team Intuition Engine"
    API_V1_STR: str = "/api/v1"
    
    # DeepSeek API Configuration
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    
    # GRID API Configuration
    GRID_API_KEY: str = ""
    GRID_API_URL: str = "https://api-op.grid.gg/live-data-feed/series-state/graphql"
    GRID_EVENTS_URL: str = "https://api-op.grid.gg/live-data-feed/series-events/graphql"
    GRID_CENTRAL_DATA_URL: str = "https://api-op.grid.gg/central-data/graphql"
    
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()


