from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Runtime configuration, read from the environment (App Runner env vars in
    the cloud, your shell or a local .env when running `python run.py`).
    Entries join when the backend first reads them, never in advance.
    """
    aws_region: str = "us-east-1"
    # Matches infra/variables.tf's default so a local backend and a default
    # `terraform apply` point at the same tables out of the box
    environment: str = "production"
    # Required on purpose: a missing key should fail at startup naming the
    # variable, not as a 401/503 on every request
    clerk_secret_key: str

    @property
    def users_table(self) -> str:
        return f"kivan-{self.environment}-users"


settings = Settings()
