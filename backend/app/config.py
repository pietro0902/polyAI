from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    # OpenRouter
    openrouter_api_key: str = ""

    # Polymarket
    polymarket_gamma_url: str = "https://gamma-api.polymarket.com"
    polymarket_clob_url: str = "https://clob.polymarket.com"

    # Web Research
    web_research_enabled: bool = True
    web_research_model: str = "perplexity/sonar-pro"

    # App
    log_level: str = "INFO"
    market_poll_interval_minutes: int = 5
    odds_update_interval_minutes: int = 1
    resolution_check_interval_minutes: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
