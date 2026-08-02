from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Runtime configuration, read from environment variables only (App Runner
    env vars in the cloud, your shell when running `python run.py`) — no
    .env file, so secrets keep exactly the homes the repo sanctions.
    Entries join when the backend first reads them, never in advance.
    """
    aws_region: str = "us-east-1"
    # Matches infra/variables.tf's default so a local backend and a default
    # `terraform apply` point at the same tables out of the box
    environment: str = "production"
    # Required on purpose: a missing key should fail at startup naming the
    # variable, not as a 401/503 on every request
    clerk_secret_key: str
    # The photos bucket name is global (S3 names are unique across all of
    # AWS), so unlike the tables it can't be derived from `environment` — it
    # carries an account-id suffix. infra/s3.tf owns the one true name and
    # App Runner injects it here as PHOTOS_BUCKET_NAME (see apprunner.tf).
    # Empty locally means every photo URL is treated as external and passes
    # through the s3_helpers untouched, so the app still boots without S3.
    photos_bucket_name: str = ""

    @property
    def users_table(self) -> str:
        return f"kivan-{self.environment}-users"

    @property
    def wishlists_table(self) -> str:
        return f"kivan-{self.environment}-wishlists"

    @property
    def wishes_table(self) -> str:
        return f"kivan-{self.environment}-wishes"

    @property
    def life_events_table(self) -> str:
        # Dashed name (not underscored) matches infra/dynamodb.tf and the
        # seed script — the table is reference data those two co-own
        return f"kivan-{self.environment}-life-events"


settings = Settings()
