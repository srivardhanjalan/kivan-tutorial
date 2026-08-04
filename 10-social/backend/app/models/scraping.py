from typing import Optional

from pydantic import BaseModel, Field


class ScrapeRequest(BaseModel):
    """POST /scrape/firecrawl body. The frontend sends the product URL the
    user browsed to; the route forwards it to Firecrawl with the server-side
    key. 2048 is the practical URL ceiling browsers/CDNs honor (the same cap a
    wish's link_url carries), and a fast 422 here beats forwarding an oversized
    URL to Firecrawl only to fail there."""

    url: str = Field(min_length=1, max_length=2048)


class ScrapeResponse(BaseModel):
    """What the proxy returns to the frontend: Firecrawl's own {success, data}
    envelope, narrowed to the two fields the scraper extractor reads. `data`
    carries Firecrawl's markdown/html/metadata payload untouched (a free-form
    dict on purpose: the extractor in scrapers/methods/firecrawl.ts
    owns its shape, so pinning a schema here would just be a second place to
    keep in sync). A failed scrape returns success=false with data=None."""

    success: bool
    data: Optional[dict] = None
