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
    # Same required-at-startup discipline as clerk_secret_key: the scrape proxy
    # is useless without it, so a missing key should fail loudly at boot naming
    # the variable, not as a 500 on the first scrape. Injected from SSM as
    # FIRECRAWL_API_KEY (see infra/apprunner.tf); locally it comes from your
    # shell (firecrawl.dev → API keys).
    firecrawl_api_key: str
    # The photos bucket name is global (S3 names are unique across all of
    # AWS), so unlike the tables it can't be derived from `environment` — it
    # carries an account-id suffix. infra/s3.tf owns the one true name and
    # App Runner injects it here as PHOTOS_BUCKET_NAME (see apprunner.tf).
    # Empty locally means every photo URL is treated as external and passes
    # through the s3_helpers untouched, so the app still boots without S3.
    photos_bucket_name: str = ""
    # The SQS queue the producers publish notification events to (step 11).
    # infra/sqs.tf owns the one true URL and apprunner.tf injects it here as
    # NOTIFICATIONS_QUEUE_URL. Empty locally (and in tests) on purpose: the
    # publish helpers short-circuit to a no-op when it is unset, so an action
    # that fans out a notification still succeeds without a queue.
    notifications_queue_url: str = ""

    @property
    def users_table(self) -> str:
        return f"kivan-{self.environment}-users"

    @property
    def wishlists_table(self) -> str:
        return f"kivan-{self.environment}-wishlists"

    @property
    def wishlist_owners_table(self) -> str:
        # Dashed name matches infra/dynamodb.tf (aws_dynamodb_table.wishlist_owners)
        return f"kivan-{self.environment}-wishlist-owners"

    @property
    def wishes_table(self) -> str:
        return f"kivan-{self.environment}-wishes"

    @property
    def life_events_table(self) -> str:
        # Dashed name (not underscored) matches infra/dynamodb.tf and the
        # seed script — the table is reference data those two co-own
        return f"kivan-{self.environment}-life-events"

    @property
    def storefronts_table(self) -> str:
        return f"kivan-{self.environment}-storefronts"

    @property
    def brands_table(self) -> str:
        # The real-store directory the in-app browser opens; reference data
        # seeded by infra/scripts/seed_brands.py, read by GET /brands
        return f"kivan-{self.environment}-brands"

    @property
    def products_table(self) -> str:
        return f"kivan-{self.environment}-products"

    @property
    def notifications_table(self) -> str:
        # In-app notifications the Lambda consumer writes and the /notifications
        # routes read; TTL-reaped after 90 days (see infra/dynamodb.tf)
        return f"kivan-{self.environment}-notifications"

    @property
    def notification_settings_table(self) -> str:
        # Per-user mute preferences; dashed name matches infra/dynamodb.tf
        return f"kivan-{self.environment}-notification-settings"

    @property
    def events_table(self) -> str:
        return f"kivan-{self.environment}-events"

    @property
    def event_hosts_table(self) -> str:
        # Dashed name matches infra/dynamodb.tf (aws_dynamodb_table.event_hosts)
        return f"kivan-{self.environment}-event-hosts"

    @property
    def event_invitees_table(self) -> str:
        return f"kivan-{self.environment}-event-invitees"

    @property
    def event_wishlists_table(self) -> str:
        return f"kivan-{self.environment}-event-wishlists"

    @property
    def followers_table(self) -> str:
        return f"kivan-{self.environment}-followers"

    @property
    def wishlist_loves_table(self) -> str:
        # Dashed name matches infra/dynamodb.tf (aws_dynamodb_table.wishlist_loves)
        return f"kivan-{self.environment}-wishlist-loves"


settings = Settings()
