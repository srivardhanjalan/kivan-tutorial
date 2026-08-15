import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.dependencies.auth import get_current_user_id
from app.models.scraping import ScrapeRequest, ScrapeResponse

router = APIRouter(prefix="/scrape", tags=["scraping"])

# Firecrawl's scrape endpoint. markdown+html cover everything the extractor
# reads: the title and price from the markdown and metadata, the product photo
# from an og:image or a product <img> in the html (scrapers/methods/firecrawl.ts).
FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"
FIRECRAWL_FORMATS = ["markdown", "html"]
# Firecrawl renders JS and can be slow on a heavy product page; 30s is
# comfortably under App Runner's request ceiling while long enough for a real
# scrape to finish.
FIRECRAWL_TIMEOUT_SECONDS = 30.0


# Sync handler on purpose: FastAPI threadpools it, keeping the blocking
# Firecrawl call off the event loop. The persona war story is the inverse:
# an `async def` body full of blocking calls stalls every other request; a
# plain `def` with an httpx.Client sidesteps that entirely.
@router.post("/firecrawl", response_model=ScrapeResponse)
def scrape_with_firecrawl(
    body: ScrapeRequest, _user_id: str = Depends(get_current_user_id)
):
    """Proxy a single-page scrape through Firecrawl so the API key stays
    server-side. The frontend can't hold the key (a public app bundle is
    readable), so the in-app browser sends the product URL here and this route
    attaches the Bearer key from SSM. Auth-gated like every data route: only a
    signed-in user can spend a scrape. The id is discarded (the gate is the
    point, not who is behind it), the same shape as GET /storefronts.

    A Firecrawl non-200 maps to success=false rather than surfacing their
    status as ours: the caller only needs to know the scrape yielded nothing,
    and falls back to letting the user fill the wish in by hand. A timeout is
    a 504 (the upstream was too slow), and any other transport/parse failure
    is a 502 (a bad upstream answer), so the frontend can tell "try again"
    from "give up and type it in"."""
    try:
        with httpx.Client() as client:
            response = client.post(
                FIRECRAWL_SCRAPE_URL,
                json={"url": body.url, "formats": FIRECRAWL_FORMATS},
                headers={
                    "Authorization": f"Bearer {settings.firecrawl_api_key}",
                    "Content-Type": "application/json",
                },
                timeout=FIRECRAWL_TIMEOUT_SECONDS,
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The scrape timed out. Try again, or add the wish by hand.",
        )
    except httpx.HTTPError:
        # A connection/transport failure to Firecrawl is a bad gateway from
        # the caller's side, never a 500 that reads as our own bug.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach the scraping service.",
        )

    if response.status_code != 200:
        # Firecrawl rejected the page (a 404 product URL, a rate limit, ...):
        # not an error the user can fix, so report an empty scrape and let the
        # add-a-wish flow fall back to manual entry.
        return ScrapeResponse(success=False, data=None)

    payload = response.json()
    return ScrapeResponse(
        success=payload.get("success", False),
        data=payload.get("data"),
    )
